const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 5001;
const uploadedVideoDir = 'uploaded_videos'

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


app.post('/upload', upload.single('video'), (req, res) => {
  res.json({ message: 'Video uploaded successfully!' });
});


app.post('/query', (req, res) => {
  const keywords = req.body.keywords;
  console.log('Query keywords:', keywords);

  let videoName = 'test.mp4'
  const videoPath = `http://localhost:${port}/videos/${videoName}`;

  // hardcoded data for timestamps and texts
  const timestamps = ['00:00:05', '00:00:10', '00:00:15'];
  const texts = [
    "text1",
    "text2",
    "text3"
  ];

  res.json({
    videoPath: videoPath,
    timestamps: timestamps,
    texts: texts
  });

  // // Check if the video file exists
  // const fs = require('fs');
  // if (fs.existsSync(videoPath)) {
  //   res.json({
  //     videoPath: videoPath,
  //     timestamps: timestamps,
  //     texts: texts
  //   });
  // } else {
  //   res.status(404).send('Video not found');
  // }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
