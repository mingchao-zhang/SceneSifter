const { exec } = require('child_process');
const fs = require('fs');

const VIDEO_DIR = './tmp/vid'
const AUDIO_DIR = './tmp/wav'
const IMG_DIR = './tmp/img'

const SAMPLE_RATE = 16000;

const runFFmpegCommand = (command) => new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return reject(error);
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
        }
        resolve(stdout);
    });
});

const encodeTime = (dir = VIDEO_DIR, chunkDuration) => {
    const files = fs.readdirSync(dir);
    files.forEach((file, index) => {
        console.log(file, index);
        let seconds = index * chunkDuration;
        let hours = Math.floor(seconds / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        let remainingSeconds = seconds % 60;
        let newFile = `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${String(remainingSeconds).padStart(2, '0')}.mp4`;
        fs.renameSync(`${VIDEO_DIR}/${file}`, `${VIDEO_DIR}/${newFile}`);
    });
}

const chunkVideo = async (inputFile, outputDir = VIDEO_DIR, chunkDuration) => {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    } else {
        // TODO: empty the dir?
    }
    try {
        const command = `ffmpeg -i ${inputFile} \
        -c copy -map 0 \
        -segment_time ${chunkDuration} -f segment \
        ${outputDir}/output_%03d.mp4`;

        await runFFmpegCommand(command);
        encodeTime(chunkDuration);
        console.log('Video chunking completed.');
    } catch (error) {
        console.error('Failed to chunk video:', error);
    }
};

/**
 * Extract the first frame of each chunk.
 * @param {string} inputDir - where the video segments live
 * @param {string} outputDir
 */
const extractKeyFrames = async (inputDir = VIDEO_DIR, outputDir = IMG_DIR) => {
    // To extract more frames (e.g. at 0s & 5s):
    //  ffmpeg -i input_chunk.mp4 -vf 'select='eq(t,0)+eq(t,5)'' -vsync vfr output_frame_%02d.jpg
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    try {
        const files = fs.readdirSync(inputDir);
        for (const file of files) {
            const outputFile = file.replace('.mp4', '_first_frame.jpg');
            const command = `ffmpeg -i ${inputDir}/${file} -frames:v 1 ${outputDir}/${outputFile}`;
            await runFFmpegCommand(command);
            console.log(`Extracted key frame from ${file}.`);
        }
    } catch (error) {
        console.error('Failed to extract key frames:', error);
    }
};

/**
 * 
 * @param {*} videoFile 
 * @param {*} outputDir 
 * @returns converted file name
 */
const extractMonoPCMWav = async (videoFile, outputDir = AUDIO_DIR) => {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    try {
        const outputFile = videoFile.replace('.mp4', '.wav');
        // convert to 16 bit:
        const command = `ffmpeg -i ${VIDEO_DIR}/${file} \
        -ar ${SAMPLE_RATE} \
        -ac 1 \
        -acodec pcm_s16le \
        ${outputDir}/${outputFile}`;

        await runFFmpegCommand(command);
        console.log(`Converted ${videoFile} to audio.`);
        return `${outputDir}/${outputFile}`;
    } catch (error) {
        console.error('Failed to convert video to audio:', error);
        return null;
    }
};

module.exports = { chunkVideo, extractKeyFrames, extractMonoPCMWav };
