import * as fs from 'fs';
import * as pv from './process_video.mjs';

const TOKEN = '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';

async function img2text(filename) {
    const data = fs.readFileSync(filename);
    const response = await fetch(
        "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
        {
            headers: { Authorization: `Bearer ${TOKEN}` },
            method: "POST",
            body: data,
        }
    );
    const result = await response.json();
    return result;
}

async function vid2imgs(videoPath, interval=5, cb) {
    let videoName = videoPath.replace(/^.*[\\\/]/, '').replace('.mp4', '');
    let imgDir = `../tmp/${videoName}/imgs`;
    
    await pv.extractFrames(videoPath, interval, imgDir);
    console.log(videoPath, ": successfully extracted frames");

    const files = fs.readdirSync(imgDir);
    let pending = files.length;
    let results = [];
    let errors = [];
    for (const file of files) {
        img2text(`${imgDir}/${file}`).then((response) => {
            pending--;
            if (response[0] != undefined && response[0]['generated_text'] != undefined) {
                let entry = {
                    start_time: parseInt(file.replace('.jpg', '')),
                    end_time: start_time + interval,
                    description: response[0]['generated_text'],
                }
                results.push(entry);
            } else {
                errors.push(response);
            }
            if (pending == 0) {
                cb(errors, results);
            }
        });
    }
}

export { vid2imgs };