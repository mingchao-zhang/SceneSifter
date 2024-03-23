CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS video_listing;

CREATE TABLE video_listing (
    id SERIAL PRIMARY KEY,
    video_name TEXT,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    description TEXT,
    description_embedding vector(512)
);