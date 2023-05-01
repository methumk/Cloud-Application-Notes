# Multi-container example
Simple multi-container application where we have a simulated "database" service running on its own container and we'll modify our API server to make queries to that simulated DB.

SimulatedDB.js will act as our database, and it will respond with same data for the query request. We will run it on it's own container

## Creating Docker image representing DB application
Create a docker image representing the DB application. We do this by creating a Dockerfile (Dockerfile-db) for this server, similar to the one for our API server

Remember to npm init and npm install express ya dufus.


## Modifying API server to communicate with DB
Done in server.js, NOTE: using code from ../own_image/index.js
Modify to read params to connect to DB from env variables; create url for communicating with DB with these vars

Modify how we are getting data

## Build Docker image from our Dockerfiles
Build image with ``Docker build`` command:

    docker build -t book-a-place-api .
    docker build -t book-a-place-db -f Dockerfile-db .

    -t:
        Tag to specify name of image
    
    .:
        Setting build context as current working dir on local machine
    
    -f:
        Specifies name of dockerfile

We have both images created now representing our application's services. We can now launch containers and tie them together with a docker network

## Create network
We'll create the network first:

    docker network create --driver bridge book-a-place-net

    Using bridge driver to create a network called book-a-place-net

## Run our DB image
We can run our database, NOTE: we have to set the port the databse server should listen in on and connecting it to the network we created

    docker run -d				\
        --name book-a-place-db		\
        --network book-a-place-net	\
        -e "PORT=5678"			\
        book-a-place-db

    -d:
        running detached (can't see server logs on terminal)
    --name: 
        name of container
    --network:
        Connect the container to the network
    -e:
        Create environment variable
    book-a-place-db:
        Name of image we are running

NOTE: Not publishing a port (i.e. -p xxxx:yyyy) when running the command. This means that this container is only reachable from other containers if they are connected to the same book-a-place-net network; not from the outside world

## Run our API image
Run our api server connecting it to the network we created, also specifying environment variables to provide the API server with connection params for the DB:

    docker run -d					\
    --name book-a-place-api		\
    --network book-a-place-net		\
    -e "DB_HOST=book-a-place-db"	\
    -e "PORT=8000"				\
    -p 8000:8000					\
    book-a-place-api

NOTE: we can specify the DB_HOST by name as both container are connected to same Docker network. We also publish port 800 of the container to port 8000 of the host so we can make queries to the API server from outside world by sending them to port 8000 on host machine.

We should then be able to make request to the API server and see results from the DB

    http://localhost:8000/lodgings

NOTE: was not able to read data from fetch, but data is being sent