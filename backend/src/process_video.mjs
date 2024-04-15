import { exec } from 'child_process';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

const SAMPLE_RATE = 16000;

// Set the path to the FFmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);


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

const encodeTime = (dir, interval) => {
  const files = fs.readdirSync(dir);
  files.forEach((file, index) => {
    console.log(file, index);
    let seconds = index * interval;
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let remainingSeconds = seconds % 60;
    let newFile = `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${String(remainingSeconds).padStart(2, '0')}.mp4`;
    fs.renameSync(`${VIDEO_DIR}/${file}`, `${VIDEO_DIR}/${newFile}`);
  });
}

const chunkVideo = async (inputFile, outputDir, interval) => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  } else {
      // TODO: empty the dir?
  }
  try {
    const command = `ffmpeg -i ${inputFile} \
    -c copy -map 0 \
    -segment_time ${interval} -f segment \
    ${outputDir}/output_%03d.mp4`;

    await runFFmpegCommand(command);
    encodeTime(interval);
    console.log('Video chunking completed.');
  } catch (error) {
    console.error('Failed to chunk video:', error);
  }
};

/**
 * Extract the first frame of each chunk in inputDir
 * @param {string} inputDir - where the video segments live
 * @param {string} outputDir
 */
const extractFirstFrames = async (inputDir, outputDir) => {
  // To extract more frames (e.g. at 0s & 5s):
  //  ffmpeg -i input_chunk.mp4 -vf 'select='eq(t,0)+eq(t,5)'' -vsync vfr output_frame_%02d.jpg
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  try {
    const files = fs.readdirSync(inputDir);
    for (const file of files) {
        const outputFile = file.replace('.mp4', '.jpg');
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
 * @param {*} videoPath 
 * @param {*} outputDir 
 * @returns converted file name
 */
const extractMonoPCMWav = async (videoPath, outputDir='') => {
  if (outputDir == '') {
    outputDir = 'tmp/wav';
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFilename = `${videoPath.replace(/\.mp4$/, '.wav')}`;
  const outputFile = `${outputDir}/${outputFilename.split('/').pop()}`;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioChannels(1)
      .audioCodec('pcm_s16le')
      .audioFrequency(SAMPLE_RATE)
      .output(outputFile)
      .on('end', () => {
        console.log(`Converted ${videoPath} to audio: ${outputFile}`);
        resolve(outputFile);
      })
      .on('error', (err) => {
        console.error('Failed to convert video to audio:', err);
        reject(err);
      })
      .run();
  });
};

const probeVideo = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata);
    });
  });
};

const extractFrame = (videoPath, seconds, outputFilename) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(seconds)
      .frames(1)
      .output(outputFilename)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
};

const extractFrames = async (videoPath, interval, outputDir='') => {
  try {
    if (outputDir == '') {
      outputDir = `tmp/${videoPath.replace(/^.*[\\\/]/, '').replace('.mp4', '')}/imgs`;
    }
    if (!fs.existsSync(outputDir)) { 
      fs.mkdirSync(outputDir, {recursive: true});
    }

    const metadata = await probeVideo(videoPath);
    const duration = metadata.format.duration;
    const frameCount = Math.floor(duration / interval);

    for (let i = 0; i <= frameCount; i++) {
      const seconds = i * interval;
      const outputFilename = `${outputDir}/${seconds}.jpg`;

      await extractFrame(videoPath, seconds, outputFilename);
      console.log('Extracted frame at', outputFilename);
    }
  } catch (error) {
    console.error('Error processing video:', error);
  }
};


export { extractMonoPCMWav, extractFrames };
