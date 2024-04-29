# SceneSifter
SceneSifter is a prototype for interactive video information extraction and retrieval, designed to help content creators organize and search video clips. Leveraging speech-to-text, image-to-text, text-to-vector, and vector similarity search technologies, it processes user-supplied videos and returns clickable relevant timestamps from those videos given a fuzzy search request. 

## Directory Structure
```
├── backend
│   ├── model    # Vosk model
│   ├── src
│   │   ├── application.properties.ini    # Properties
│   │   ├── chatgpt.mjs             # ChatGPT service
│   │   ├── index.mjs    
│   │   ├── itt.mjs                 # Image-to-text conversion
│   │   ├── postgres_service.mjs    # Postgres service
│   │   ├── process_video.mjs       # Audio extraction, frame extraction, etc.
│   │   ├── stt.mjs                 # Speech-to-text conversion
│   ├── uploaded_videos        # User-uploaded videos
│   ├── package.json
├── example_videos    # Videos used for testing
├── frontend          # React App
├── sql
│   ├── video_listing.sql       # Database creation
│   ├── video_embedding.csv     # Some dummy data
└── README.md
```

## Prerequisite
### Install FFmpeg
https://ffmpeg.org/download.html

### Setup PostgreSQL
1. Launch a Postgres instance using the docker image with pgvector:
    ```
    mkdir ~/postgres-volume/

    docker run --name postgres \
        -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password \
        -p 5432:5432 \
        -v ~/postgres-volume/:/var/lib/postgresql/data -d ankane/pgvector:latest
    ```

2. Copy the Video listing schema to the container:
    ```
    docker cp sql/video_listing.sql postgres:/home
    ```

3. Create the video listing table from the schema
    ```
    docker exec -it postgres psql -U postgres -c '\i /home/video_listing.sql'
    ```
    
### Vosk
Download a model (I tried with `vosk-model-en-us-0.22-lgraph`) from https://alphacephei.com/vosk/models and unpack as `model` under `backend/`.

Install Vosk with `npm intall vosk`


### Setup API keys

Out of safety concerns, we didn't put our OpenAI key in the config file. To enable the ChatGPT service, you need to pop in your own OpenAI key.

In `backend/src/application.properties.ini`, set
``` 
CHATGPT_API_KEY=<your own key>
```

Same for Hugging Face. To enable image-to-text conversion via the inference API, in `backend/src/application.properties.ini`, set
```
HUGGINGFACE_TOKEN=<your own key>
```


## Usage
To run the backend code:
    ```
    cd backend
    npm start
    ```

To run the frontend code:
    ```
    cd frontend
    npm start
    ```



## References
* Header background image: <a href="https://stocksnap.io/photo/colorful-bokeh-FSOBBNPKKZ">Photo</a> by <a href="https://stocksnap.io/author/hdwallpapers">HD Wallpapers</a> on <a href="https://stocksnap.io">StockSnap</a>
* [TV icon](https://pixabay.com/illustrations/tv-ancient-appliance-retro-screen-7794355/)
