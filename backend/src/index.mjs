import { createRequire } from "module";
const require = createRequire(import.meta.url);
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 5001;
const uploadedVideoDir = 'uploaded_videos'
import PostgresService from './postgres_service.mjs';
import stt from './stt.mjs'; // speech to text
import * as itt from './itt.mjs'; // image to text

// Set up infrastructure
app.use(cors()); // Enable CORS. Without this, the frontend will get an err response
app.use(express.json()); // Middleware to parse JSON bodies
// because both frontend and backend are local, we can set up a video endpoint for the
// frontend to access uploaded videos instead of sending uploaded videos back to the frontend
app.use('/videos', express.static(path.join(process.cwd(), uploadedVideoDir)));

// Setup file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), uploadedVideoDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Set up PostgresService
const pgService = new PostgresService();
await pgService.connect();

/*
1. store the uploaded videos to local
2. extract speech and create video intervals
3. insert video intervals to postgresql database
*/
app.post('/upload', upload.single('video'), (req, res) => {
  let videoPath = req.file.path;
  stt(videoPath, (err, sentences) => {
    // prepare sentences for insertions
    for (const sentence of sentences) {
      sentence['video_name'] = req.file.originalname;
      sentence['start_time'] = Math.floor(sentence['start_time']);
      sentence['end_time'] = Math.floor(sentence['end_time']);
      // single quotes would have problems when constructing the insert query;
      // TODO: need to think about a more elegant way
      sentence['description'] = sentence['description'].replace(/'/g, "''");
    }

    pgService.insert(sentences, 'speech', (e, v) => {
        res.json({ message: 'Video uploaded successfully!' });
    })
  });

  itt.vid2imgs(videoPath, (err, entries) => {
    if (err != null) {
      console.error(err);
    }
    if (entries != undefined) {
      for (const entry of entries) {
        entry['video_name'] = req.file.originalname;
        entry['description'] = entry['description'].replace(/'/g, "''");
      }
    }

    pgService.insert(entries, 'image', (e, v) => {
      console.log('image info inserted');
    });
  })
});


/* This is what the return value to the frontend looks like:
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
  const keywords = req.body.keywords;
  pgService.search(keywords, 5, (e, intervals) => {
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

  res.json({videos: videos})
});
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
