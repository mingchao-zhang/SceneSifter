import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pv = require('./process_video.cjs');

const fs = require('fs');
const vosk = require('vosk');
const { Readable } = require('stream');
const wav = require('wav');
const path = require('path')
const MODEL_PATH = path.join(process.cwd(), 'model');

/**
 * Group words into sentences.
 * @param {Array.<vosk.WordResult>} words 
 * @param {Number} pauseBound - The minimal seconds of pause between sentences.
 * @return {Array} A list of {startTime, endTime, text}
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
                startTime: start,
                endTime: end,
                text: s,
            });
            s = word.word;
            start = word.start;
            end = word.end;
        }
    })
    if (start != 0 && s != '') {
        sentences.push({
            startTime: start,
            endTime: end,
            text: s,
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
        console.log(words);
        console.log("===============================");
        let sentences = groupWords(words, 0.5);
        console.log(sentences);
        // callback(sentences);
    });

    fs.createReadStream(file, { 'highWaterMark': 4096 }).pipe(wfReader).on('finish',
        function (err) {
            model.free();
        });
}

const stt = async (videoFile, callback) => {
    if (!fs.existsSync(MODEL_PATH)) {
        console.log(MODEL_PATH, "HIII")
        console.log('Please download the model from https://alphacephei.com/vosk/models and unpack as ' + MODEL_PATH + ' in the current folder.')
        process.exit()
    }
    if (process.argv.length > 2) {
        file = process.argv[2];
    }

    const audioFile = await pv.extractMonoPCMWav(videoFile);
    speechToText(audioFile, (res) => {
        console.log(res);
    });
}

// speechToText('mono.wav');
// const videoPath = path.join(process.cwd(), 'test.mp4');
// console.log(videoPath)
// stt(videoPath, () => {})