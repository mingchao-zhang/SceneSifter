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


### Vosk (STT model)
Download a model (I tried with `vosk-model-en-us-0.22-lgraph`) from https://alphacephei.com/vosk/models and unpack as `stt_model` in the current folder.

Consider integrating it into the docker image.


### References
* Header background image: <a href="https://stocksnap.io/photo/colorful-bokeh-FSOBBNPKKZ">Photo</a> by <a href="https://stocksnap.io/author/hdwallpapers">HD Wallpapers</a> on <a href="https://stocksnap.io">StockSnap</a>
* [TV icon](https://pixabay.com/illustrations/tv-ancient-appliance-retro-screen-7794355/)