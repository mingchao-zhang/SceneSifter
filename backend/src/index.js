import express from 'express';
import multer from 'multer';
import fs from 'fs';

const app = express();
const PORT = 3000;
const VIDEO_DIR = '../../video/'

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, VIDEO_DIR); // set the destination folder for uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + '-' + file.originalname); // set the file name
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100000000 }, // limit file size to 100MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'video/mp4') {
            console.log('yes');
            cb(null, true);
        } else {
            console.log('no');
            cb(null, false);
            return cb(new Error('Only .mp4 allowed!'));
        }
    }
});

app.post('/upload-video', upload.single('video'), (req, res) => {
    // 'video' is the name of our file input field in the HTML form
    console.log(req.body.video);
    // if (req.video) {
    //     // console.log(req.video);
    //     res.send('Video uploaded successfully');
    // } else if (req.error || req.fileValidationError) {
    //     console.error(req.error, req.fileValidationError);
    //     res.send(`Upload error: ${req.error || req.fileValidationError}`);
    // } else {
    //     console.log(req.body); // Check if any data is received at all
    //     res.send('No file uploaded.');
    // }
    res.send("ah");
});
