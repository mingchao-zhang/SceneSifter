// needed to import both transformers and the postgresql client
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { pipeline, layer_norm } from '@xenova/transformers';
const { Client } = require("pg");

// get database meta data
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PropertiesReader = require('properties-reader');
const properties = PropertiesReader(__dirname + '/application.properties.ini');


async function texts_to_vectors(extractor, texts) {
    // compute sentence embeddings
    let embeddings = await extractor(texts, { pooling: 'mean' });
    // normalize
    const matryoshka_dim = 512;
    embeddings = layer_norm(embeddings, [embeddings.dims[1]])
    .slice(null, [0, matryoshka_dim])
    .normalize(2, -1)
    .tolist()

    return embeddings
}

async function textToVector(extractor, text) {
    let embeddings = await texts_to_vectors(extractor, [text])
    return embeddings[0];
}

async function appendVectorsToIntervals(extractor, intervals) {
    // 1. get all descriptions from video listing items
    const descriptions = []
    for (let i = 0; i < intervals.length; ++i) {
        let interval = intervals[i];
        descriptions.push(interval.description)
    }
    // 2. text to vectors
    let embeddings = await texts_to_vectors(extractor, descriptions)
    // 3. insert generated vectors to intervals
    for (let i = 0; i < intervals.length; ++i) {
        intervals[i]['description_embedding'] = embeddings[i]
    }
}

export default class PostgresService {
    client; // database handle
    extractor; // convert texts to vectors

    constructor() {}

    async connect() {
        this.extractor = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', {
            quantized: false, // Comment out this line to use the quantized version
        });
        this.client = new Client({
            host: properties.get('DATABASE_HOST'),
            port: properties.get('DATABASE_PORT'),
            database: properties.get('DATABASE_NAME'),
            user: properties.get('DATABASE_USER'),
            password: properties.get('DATABASE_PASSWORD')
        })
        await this.client.connect();
        console.log("Connected to the PostgreSql database.");
    }

    // intervals is a list of json objects that look like the following
    // [
    //     {"video_name": "Video 1",
    //      "start_time": '0', 
    //      "end_time": '5',
    //      "description": 'random text number 1'
    //     },
    //     {
    //     "video_name": "Video 2",
    //     "start_time": '10', 
    //     "end_time": '3600',
    //     "description": 'This is the second video.'
    //    }
    // ]
    async insert(intervals, callback) {
        // 1. for each interval, convert the description field to a vector and add it to the interval
        await appendVectorsToIntervals(this.extractor, intervals)

        // 2. generate the query string
        let value_string = ""
        for (let i = 0; i < intervals.length; ++i) {
            let interval = intervals[i];
            let sub_string = '('
            sub_string += `'${interval['video_name']}', `
            sub_string += `'${interval['start_time']}', `
            sub_string += `'${interval['end_time']}', `
            sub_string += `'${interval['description']}', `
            sub_string += `ARRAY [${interval['description_embedding']}]`
            sub_string += '),\n'
            value_string += sub_string
        }
        value_string = value_string.slice(0, -2);
        let queryStr = "INSERT INTO video_listing (video_name, start_time, end_time, description, description_embedding) VALUES \n" + value_string

        // 3. execute the query string
        const res = await this.client.query(queryStr);
        callback();
    }

    async search(text, topItemLimit, callback) {
        let vector = await textToVector(this.extractor, text)
        let queryStr = `SELECT video_name, description, start_time, end_time,
                        1 - (description_embedding <=> '[${vector}]') AS similarity
                        FROM video_listing 
                        ORDER BY description_embedding <=> '[${vector}]'
                        LIMIT ${topItemLimit}`
        const res = await this.client.query(queryStr)

        let videoIntervals = [];
        for (let i = 0; i < res.rows.length; i++) {
            const row = res.rows[i];

            videoIntervals.push(
                {"video_name": row.video_name, 
                "start_time": row.start_time,
                "end_time": row.end_time,
                "description": row.description,
                "similarity": row.similarity 
            });
        }
        callback(null, videoIntervals);
    }

    async selectAll(callback) {
        let queryStr = 'SELECT * FROM video_listing'
        const res = await this.client.query(queryStr)
        let videoIntervals = [];
        for (let i = 0; i < res.rows.length; i++) {
            const row = res.rows[i];

            videoIntervals.push(
                {"video_name": row.video_name, 
                "start_time": row.start_time,
                "end_time": row.end_time,
                "description": row.description
            });
        }
        callback(null, videoIntervals);
    }
}


// Example:
/*
let testIntervals = [
    {"video_name": "Video 1",
    "start_time": 0, 
     "end_time": 5,
     "description": 'random text number 1'
    },
    {
    "video_name": "Video 2",
    "start_time": 65, 
    "end_time": 75,
    "description": 'This is the second video.'
   },
   {
    "video_name": "Video 3",
    "start_time": 0, 
    "end_time": 3600,
    "description": 'This is the third video.'
   }
]


let service = new PostgresService();
await service.connect();
await service.insert(testIntervals, ()=> {
    console.log("Inserted")
});
await service.search("This is the first video.", 2, (intervals) => {
    console.log("Search results: ", intervals);
});
*/
