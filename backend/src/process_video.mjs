import { exec } from 'child_process';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

const SAMPLE_RATE = 16000;

// Set the path to the FFmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);


/**
 * 
 * @param {*} videoPath 
 * @param {*} outputDir 
 * @returns {Promise<string>} converted file name
 */
const extractMonoPCMWav = (videoPath, outputDir='') => {
  if (outputDir == '') {
    outputDir = 'tmp/wav';
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFilename = videoPath.replace(/\.mp4$/, '.wav');
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

const probeVideo = (videoPath) => new Promise((resolve, reject) => {
  ffmpeg.ffprobe(videoPath, (err, metadata) => {
    if (err) reject(err);
    else resolve(metadata);
  });
});

/**
 * Extract a frame at *seconds*
 * @param {string} videoPath 
 * @param {Number} seconds 
 * @param {string} outputFilename 
 */
const extractFrame = (videoPath, seconds, outputFilename) => new Promise((resolve, reject) => {
  ffmpeg(videoPath)
    .seekInput(seconds)
    .frames(1)
    .output(outputFilename)
    .on('end', () => resolve())
    .on('error', (err) => reject(err))
    .run();
});

/**
 * Extract images from a video
 * @param {string} videoPath 
 * @param {Number} interval - extract an image every *interval* seconds
 * @param {string} [outputDir] - a temporary directory that stores the output images 
 */
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
