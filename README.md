# SceneSifter


### PostgreSQL

1. Launch a Postgres instance using the docker image with pgvector:
    ```
    mkdir ~/postgres-volume/

    docker run --name postgres \
        -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password \
        -p 5432:5432 \
        -v ~/postgres-volume/:/var/lib/postgresql/data -d ankane/pgvector:latest
    ```

2. Copy the Video listing schema and data to the container:
    ```
    docker cp sql/video_listing.sql postgres:/home
    ```

3. Create the video listing table from the schema
    ```
    docker exec -it postgres psql -U postgres -c '\i /home/video_listing.sql'
    ```