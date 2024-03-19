import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { pipeline, layer_norm } from '@xenova/transformers';
const { Client } = require("pg");
const PropertiesReader = require('properties-reader');

// get the current directory
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// get database meta data
const properties = PropertiesReader(__dirname + '/application.properties.ini');
const pgEndpoint = {
    host: properties.get('DATABASE_HOST'),
    port: properties.get('DATABASE_PORT'),
    database: properties.get('DATABASE_NAME'),
    user: properties.get('DATABASE_USER'),
    password: properties.get('DATABASE_PASSWORD')
};

// test data
let test_intervals = [
    {"video_name": "Video 1",
    "start_time": '2024-03-18 10:00:00', 
     "end_time": '2024-03-18 10:30:00',
     "description": 'This is the first video.'
    },
    {
    "video_name": "Video 2",
    "start_time": '2024-03-18 11:00:00', 
    "end_time": '2024-03-18 11:30:00',
    "description": 'This is the second video.'
   },
   {
    "video_name": "Video 3",
    "start_time": '2024-03-18 12:00:00', 
    "end_time": '2024-03-18 12:30:00',
    "description": 'This is the second video.'
   }
]

async function append_vectors_to_intervals(intervals) {
    // create a feature extraction pipeline
    const extractor = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', {
        quantized: false, // Comment out this line to use the quantized version
    });
    const descriptions = []
    for (let i = 0; i < intervals.length; ++i) {
        let interval = intervals[i];
        descriptions.push(interval.description)
    }
    // compute sentence embeddings
    let embeddings = await extractor(descriptions, { pooling: 'mean' });
    // normalize
    const matryoshka_dim = 512;
    embeddings = layer_norm(embeddings, [embeddings.dims[1]])
    .slice(null, [0, matryoshka_dim])
    .normalize(2, -1)
    .tolist()

    // insert generated vectors to intervals
    for (let i = 0; i < intervals.length; ++i) {
        
        intervals[i]['description_embedding'] = embeddings[i]
    }
}

async function insert(client, intervals) {
    // generate the query string
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
    let query_string = "INSERT INTO video_listing (video_name, start_time, end_time, description, description_embedding) VALUES \n" + value_string
    // execute the query string
    const res = await client.query(query_string);
    console.log(res)
}

async function main() {
    // create a database
    const client = new Client(pgEndpoint);
    await client.connect();
    await append_vectors_to_intervals(test_intervals)

    insert(client, test_intervals)
}
main()