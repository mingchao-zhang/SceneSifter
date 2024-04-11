const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 5001;

// Setup file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.use(cors()); // Enable CORS

app.post('/upload', upload.single('video'), (req, res) => {
  res.json({ message: 'Video uploaded successfully!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
