# SceneSifter

How to set up the database?

`docker cp sql/video_listing.sql postgres:/home`

`docker exec -it postgres psql -U postgres -c '\i /home/video_listing.sql'`