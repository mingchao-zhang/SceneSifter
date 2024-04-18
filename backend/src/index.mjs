import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import fs from 'fs';

import getTranscription from './stt.mjs'; // speech to text
import vid2imgDesc from './itt.mjs'; // vid to img to text

const app = express();
const port = 5001;
const uploadedVideoDir = path.join(process.cwd(), 'uploaded_videos');
if (!fs.existsSync(uploadedVideoDir)) {
  fs.mkdirSync(uploadedVideoDir, { recursive: true });
}

// Set up infrastructure
app.use(cors()); // Enable CORS. Without this, the frontend will get an err response
app.use(express.json()); // Middleware to parse JSON bodies
// because both frontend and backend are local, we can set up a video endpoint for the
// frontend to access uploaded videos instead of sending uploaded videos back to the frontend
app.use('/videos', express.static(uploadedVideoDir));

// Setup file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadedVideoDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Set up PostgresService
import PostgresService from './postgres_service.mjs';
const pgService = new PostgresService();
await pgService.connect();

// Set up ChatService
import ChatService from "./chatgpt.mjs";
const chatService = new ChatService();

/*
1. store the uploaded videos to the local directory, backend/uploaded_videos
2. extract speech and create video intervals
3. insert video intervals to postgresql database
4. add the extracted speech to the chatservice
*/
app.post('/upload', upload.single('video'), (req, res) => {
  let videoPath = req.file.path;
  let allText = '';
  const stt = getTranscription(videoPath).then(sentences => {
    // prepare sentences for insertions
    for (const sentence of sentences) {
      sentence['video_name'] = req.file.originalname;
      sentence['start_time'] = Math.floor(sentence['start_time']);
      sentence['end_time'] = Math.floor(sentence['end_time']);
      allText += sentence['description'];
      // single quotes would have problems when constructing the insert query;
      // TODO: need to think about a more elegant way
      sentence['description'] = sentence['transcript'].replace(/'/g, "''");
    }

    pgService.insert(sentences, 'speech', (e, v) => {
      chatService.addToContext(allText);
      console.log(chatService.context)
      console.log('speech info inserted');
      return;
    })
  }); // TODO: catch potential error?

  const itt = vid2imgDesc(videoPath, 5).then(entries => {
    for (const entry of entries) {
      entry['video_name'] = req.file.originalname;
      entry['description'] = entry['description'].replace(/'/g, "''");
    }

    pgService.insert(entries, 'image', (e, v) => {
      console.log('image info inserted');
      return;
    });
  }).catch(err => { 
    console.error(err); 
    throw err;
  });

  Promise.all([stt, itt]).then(() => res.json({ message: `${req.file.originalname} uploaded successfully!` }));
});


/* This is what the return value of this function to the frontend looks like:
[
  {
    videoName: 'children_new_billionaires.mp4',
    videoPath: 'http://localhost:5001/videos/children_new_billionaires.mp4',
    startTimes: [ 63 ]
    descriptions: ['hi my name is logan fisher i am the see fo and the director of marketing and i supply']
  },
  {
    videoName: 'test.mp4',
    videoPath: 'http://localhost:5001/videos/test.mp4',
    startTimes: [ 34, 55 ],
    descriptions: [
      "i'm a kid who never really grew up i love to dance rock climb and spend time with my dog cherry",
      'feel for you to reach out and introduce yourself'
    ]
  }
]
*/
app.post('/query', (req, res) => {
  // after postgresql returns similar video intervals, prepare them for the frontend response
  function processIntervals(intervals) {
    // group intervals by the video_name field
    let videoGroups = {}
    for (const interval of intervals) {
      let videoName = interval['video_name']
      if (!videoGroups[videoName]) {
        videoGroups[videoName] = [interval]
      } else {
        videoGroups[videoName].push(interval)
      }
    }
    // for each key, aggregate the startTimes and the descriptions
    let videos = []
    for (let videoName in videoGroups) {
      let startTimes = []
      let descriptions = []
      for (const interval of videoGroups[videoName]) {
        startTimes.push(interval.start_time)
        descriptions.push(interval.description)
      }
      videos.push({
        'videoName': videoName,
        'videoPath': `http://localhost:${port}/videos/${videoName}`,
        'startTimes': startTimes,
        'descriptions': descriptions
      })
    }
    return videos
  }

  const query = req.body.keywords;
  const topResultNum = 5;
  // if the query is a question, use the chat service to get an answer first
  const lastChar = query[query.length - 1];
  if (lastChar === '?') {
    chatService.query(query, (e, answer) => {
      console.log("Chat service answer: ", answer)
      pgService.search(answer, topResultNum, (e, intervals) => {
        res.json({videos: processIntervals(intervals)});
      });
    })
  } else {
    pgService.search(query, topResultNum, (e, intervals) => {
      res.json({videos: processIntervals(intervals)});
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
