import * as fs from 'fs';
import * as pv from './process_video.mjs';
import PropertiesReader from "properties-reader";

// get the current directory
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const properties = PropertiesReader(__dirname + '/application.properties.ini');

async function img2text(filename) {
    const data = fs.readFileSync(filename);
    const token = properties.get('HUGGINGFACE_TOKEN');
    if (token == undefined || token == null) {
        return new Error('Please specify a token used for huggingface models in application.properties.ini');
    } 
    const response = await fetch(
        "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
        {
            headers: { Authorization: `Bearer ${token}` },
            method: "POST",
            body: data,
        }
    );
    const result = await response.json();
    return result;
}

/**
 * @typedef Description
 * @property {Number} start_time
 * @property {Number} end_time
 * @property {string} description
 */
/**
 * Extract images from video and get the descriptions of the images
 * @param {string} videoPath  
 * @param {Number} interval - extract an image every *interval* seconds
 * @returns {Promise<Description[]>}
 */
export default async function vid2imgDesc(videoPath, interval) {
    let videoName = videoPath.replace(/^.*[\\\/]/, '').replace('.mp4', '');
    let imgDir = `tmp/${videoName}/imgs`;
    
    await pv.extractFrames(videoPath, interval, imgDir);
    console.log(videoPath, ": successfully extracted frames");

    const files = fs.readdirSync(imgDir);
    if (files.length == 0) {
        return new Error('no image extracted');
    }

    let results = [];
    let errors = [];

    const tasks = files.map(file => img2text(`${imgDir}/${file}`)
        .then(response => {
            let start = parseInt(file.replace('.jpg', ''));
            if (response[0] != undefined && response[0]['generated_text'] != undefined) {
                let entry = {
                    start_time: start,
                    end_time: start + interval,
                    description: response[0]['generated_text'],
                }
                results.push(entry);    // thread safe?
            } else {
                errors.push(`Error describing image at ${start}s: ${response}`);
            }
            return;
        })
        .catch(err => err)
    );

    await Promise.all(tasks);

    if (errors.length > 0) {
        console.log(errors);
    }
    if (errors.length == files.length) {
        return new Error('image2text failed');
    }
    return results;
}