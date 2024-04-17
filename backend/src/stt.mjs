import * as pv from './process_video.mjs';
import * as fs from 'fs';
import * as path from 'path';
import * as wav from 'wav';
import { Readable } from 'stream';
import * as vosk from 'vosk';

const MODEL_PATH = path.join(process.cwd(), 'model');

/**
 * @typedef Transcription
 * @property {Number} start_time
 * @property {Number} end_time
 * @property {string} transcript
 */

/**
 * Group words into sentences.
 * @param {Array.<vosk.WordResult>} words 
 * @param {Number} pauseBound - The minimal seconds of pause between sentences.
 * @return {Transcription[]}
 */
const groupWords = (words, pauseBound) => {
    let sentences = [];
    let start = 0, end = 0, s = '';
    words.forEach((word, index) => {
        if (index == 0) {
            start = word.start;
            end = word.end;
            s += word.word;
        } else if (word.start - end < pauseBound) {
            end = word.end;
            s += ' ' + word.word;
        } else {
            sentences.push({
                start_time: start,
                end_time: end,
                transcript: s,
            });
            s = word.word;
            start = word.start;
            end = word.end;
        }
    })
    if (start != 0 && s != '') {
        sentences.push({
            start_time: start,
            end_time: end,
            transcript: s,
        });
    }
    return sentences;
};

/**
 * @param {string} file - video file 
 * @returns {Promise<Transcription[]>}
 */
const speechToText = (file) => new Promise((resolve, reject) => {
    vosk.setLogLevel(-1);
    const model = new vosk.Model(MODEL_PATH);
    const wfReader = new wav.Reader();
    const wfReadable = new Readable().wrap(wfReader);

    wfReader.on('format', async ({ audioFormat, sampleRate, channels }) => {
        if (audioFormat != 1 || channels != 1) {
            reject('Audio file must be WAV format mono PCM.');
            return;
        }

        const rec = new vosk.Recognizer({ model: model, sampleRate: sampleRate });
        rec.setWords(true);
        let words = [];

        try {
            for await (const data of wfReadable) {
                if (rec.acceptWaveform(data)) {
                    let r = rec.result().result;
                    if (r != undefined) {
                        words.push(...r);
                    }
                } else {
                    // console.log('par', JSON.stringify(rec.partialResult(), null, 4));
                }
            }

            let r = rec.finalResult().result;
            if (r != undefined) {
                words.push(...r);
            }
            rec.free();
            let sentences = groupWords(words, 0.5);
            resolve(sentences);
        } catch (err) {
            reject(err);
        } finally {
            model.free();
        }
    });

    fs.createReadStream(file, { 'highWaterMark': 4096 }).pipe(wfReader).on('error', reject);
});


/**
 * Extract wav from *videoFile*, then extract transcription
 * @param {*} videoFile 
 * @returns {Promise<Transcription[]>}
 */
export default async function getTranscription(videoFile) {
    if (!fs.existsSync(MODEL_PATH)) {
        console.log('Please download the model from https://alphacephei.com/vosk/models and unpack as ' + MODEL_PATH + ' in the current folder.')
        process.exit();
    }

    try {
        const audioFile = await pv.extractMonoPCMWav(videoFile);
        const transcription = await speechToText(audioFile);
        fs.unlinkSync(audioFile); // Remove the generated audio file
        return transcription;
    } catch (err) {
        console.error(err);
        throw err; // Rethrow the error to be caught by the caller
    }
};
