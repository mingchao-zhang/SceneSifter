const { Client } = require("pg");
// const { checkEmbeddingValid } = require("./embeddings_utils.js");
import { pipeline, layer_norm } from '@xenova/transformers';

const PropertiesReader = require('properties-reader');

const properties = PropertiesReader(__dirname + '/application.properties.ini');

const pgEndpoint = {
    host: properties.get('DATABASE_HOST'),
    port: properties.get('DATABASE_PORT'),
    database: properties.get('DATABASE_NAME'),
    user: properties.get('DATABASE_USER'),
    password: properties.get('DATABASE_PASSWORD')
};

async function main() {
    const client = new Client(pgEndpoint);
    await client.connect();

    console.log("Connected to Postgres");

    let id = 0;
    let length = 0;
    let totalCnt = 0;

    do {
        console.log(`Processing rows starting from ${id}`);

        const res = await client.query(
            "SELECT id, description FROM airbnb_listing " +
            "WHERE id >= $1 and description IS NOT NULL ORDER BY id LIMIT 200", [id]);
        length = res.rows.length;
        let rows = res.rows;

        if (length > 0) {
            for (let i = 0; i < length; i++) {
                const description = rows[i].description.replace(/\*|\n/g, ' ');

                id = rows[i].id;

                // Create a feature extraction pipeline
                const embeddingResp = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', {
                    quantized: false, // Comment out this line to use the quantized version
                });

                // if (!checkEmbeddingValid(embeddingResp))
                //     return;

                const embeddings = await embeddingResp([description], { pooling: 'mean' });

                const matryoshka_dim = 512;
                const processedEmbeddings = layer_norm(embeddings, [embeddings.dims[1]])
                    .slice(null, [0, matryoshka_dim])
                    .normalize(2, -1)
                    .tolist();

                // const res = await client.query("UPDATE airbnb_listing SET description_embedding = $1 WHERE id = $2",
                //     ['[' + embeddingResp.data[0].embedding + ']', id]);
                
                console.log(`Current Embeddings: ${processedEmbeddings}`);
                totalCnt++;
            }

            id++;

            console.log(`Processed ${totalCnt} rows`);
        }
    } while (length != 0);

    console.log(`Finished generating embeddings for ${totalCnt} rows`);
    process.exit(0);
}

main();