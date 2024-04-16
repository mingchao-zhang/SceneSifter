CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS video_listing;

CREATE TABLE video_listing (
    id SERIAL PRIMARY KEY,
    video_name TEXT,
    start_time INT, /* start_time is in seconds */
    end_time INT, /* end_time is also in seconds */
    description_type TEXT,  /* either "speech" or "image" */
    description TEXT,
    description_embedding vector(512),
);