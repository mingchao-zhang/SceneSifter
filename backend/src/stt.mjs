import * as pv from './process_video.mjs';
import * as fs from 'fs';
import * as path from 'path';
import * as wav from 'wav';
import { Readable } from 'stream';
import * as vosk from 'vosk';

const MODEL_PATH = path.join(process.cwd(), 'model');

/**
 * Group words into sentences.
 * @param {Array.<vosk.WordResult>} words 
 * @param {Number} pauseBound - The minimal seconds of pause between sentences.
 * @return {Array} A list of {start_time, end_time, description}
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
                description: s,
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
            description: s,
        });
    }
    return sentences;
}

const speechToText = async (file, callback) => {
    vosk.setLogLevel(-1);
    const model = new vosk.Model(MODEL_PATH);
    const wfReader = new wav.Reader();
    const wfReadable = new Readable().wrap(wfReader);

    wfReader.on('format', async ({ audioFormat, sampleRate, channels }) => {
        if (audioFormat != 1 || channels != 1) {
            console.error('Audio file must be WAV format mono PCM.');
            process.exit(1);
        }

        const rec = new vosk.Recognizer({ model: model, sampleRate: sampleRate });
        rec.setWords(true);
        let words = [];
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
        callback(sentences);
    });

    fs.createReadStream(file, { 'highWaterMark': 4096 }).pipe(wfReader).on('finish',
        function (err) {
            model.free();
        });
}

export default async function stt(videoFile, callback) {
    if (!fs.existsSync(MODEL_PATH)) {
        console.log('Please download the model from https://alphacephei.com/vosk/models and unpack as ' + MODEL_PATH + ' in the current folder.')
        process.exit()
    }

    pv.extractMonoPCMWav(videoFile)
    .then((audioFile) => {
        speechToText(audioFile, (res) => {
            // remove the generated audioFile after getting the speech
            fs.unlinkSync(audioFile, (err) => {
                if (err) {
                    callback(err)
                } else {
                    callback(null, res)
                }
            });
        });
    })
    .catch(err => {console.err("fail to convert video to wav:", err)});
}
