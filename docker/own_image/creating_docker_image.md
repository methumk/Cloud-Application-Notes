# Dockerfiles and own images
    We can build custom docker image through writing specs of the image we want to build in a **dockerfile**

    Using lodgings example

# Dockerfile
    In order to containerize software, it's common to place dockerifle specifying software's runtime env at top level of software's source code repository

    We'll do that for API server, creating file named dockerfile at top level of git repo

    Every Docker image composed of collection of layers and each instruction in a dockerfile essenrtially adds a new layer to the image

    Docker image built with docker file needs to be based on already-existing docker image, this gives docker image builder a starting point to place new layers.
    
    New layers created by the dockerfile are placed on top of the last layer in this base image, which is specified first in the dockerfile using the FROM instruction

    We will be basing image off of official Node.js image (v16) which has node.js and dependencies installed
        ```FROM node:16```

    Next set the working dir for the subsequent instructions in the dockerfile using WORKDIR


    Next we need to install server's runtime dependencies. We want to make the entire source code of our server including package.json and package-lock.json available within the image we're building. We can do this with the COPY instruction, to copy the entire contents of our sorce code dir into dir on the image we specified with the WORKDIR instruction


    NOTE: there will be some files wedon't want to copy into the iumage we're buiilding we can do this through .dockerignore file

    Then we can run our command using RUN, to install our dependencies
        RUN npm install

    Then set up container environment variable
        ```ENV varname=value```
    The value of the variable is gotten through the syntax: ${varname}

    We then want to indicate that containers based on our image will listen on a specified port. We do this through the expose variable

    After that we can use the CMD instruction to specifiy the default command to be run when executing a container from the image
        ```CMD ["command", "goes", "here"]```
    The command is executed from within working dir specified in WORKDIR


## .dockerignore
    Allows us to specify which files to be ignored when copying files to our image with COPY instruction

    We want to make sure node_modules/dir is not copies from our local machine to the image, along with git dir and any debug logs generated:
```        .git
        node_modules
        npm_debug.log
```


# Build the image from dockerfile
    To build the image from our dockerfile we have to run the docker build command
```
    docker buiild -t book-a-place-api .
```

    The -t option tags the image with the name book-a-place-api. When we run docker images, our image will show up with this name

    The . argument sets the **build context** for our image construction to the currect working dir on LOCAL MACHINE.

    The build context is set of files available to Docker as it's building an image. E.g. COPY instructions copy files from build context to the image. The dockerfile is also located at the top level of the build context by default

    After executing command we should see our new image through `docker image ls`



# Running our docker image
    Our image has our server code and dependncies packaged up within it. We now have to map host-machine port to container port exposed in dockerfile (8000)

    Run command:
```
    docker run -d				\
        --name book-a-place-api	\
        -p 8000:8000			\
        book-a-place-api
```

    Running in detached mode means we can't see server logs in terminal, We can use command:
```
    docker container logs book-a-place-api
```

    Have to run it multiple times to see all the outputs