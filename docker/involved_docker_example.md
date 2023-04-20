# Ubuntu image example
    docker run -it --name test-container -e "PORT=8080" -v "$PWD":/home/test -p 34567:8080 ubuntu /bin/bash

        -e "PORT=8080"
            Creates environment variable, can create multiple calling -e over
        -it 
            Two commands, -i and -t. Together allow you to interact with the program in the container from the terminal
        -v $PWD":/home/test
            Bind mounts: Mounts directory from the host machine (specified from command $PWD) into the directory home/test in the container
        -p 34567:8080
            publishes port 8080 on the container to host machine 34567 (reqs made to 34567 on host will be sent to 8080 on container)
        
        Then run the image ubuntu and supply args /bin/bash

    Worked only in WSL, something about powershell didn't like --name or "$PWD"
    Note no git in remote directory (pushed the docker repo)
    Note creating files through host machine (even after docker ran) will show up in container (PWD is bind to home/test)

## Setting up linux
    apt-get update
    apt-get install curl

## installing Node.js
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install nodejs

## installing express
    npm install express


# Running server (test.js)
    Test.js reads env variable PORT, we specified that as 8080 on the container so it will display that when it runs. We can interact with the api on our local machine through localhost:34567. We can now see the get message in the container's terminal.

    Successfully, running software in a docker container and interacting it from the outside world. Runtime dependencies (e.g. Node.js) installed in the container (not on our host machine) our host machine did not need Node.js installed.
    
    Cons: process to get server running was not easily replicated or portable (manual setup to get Node.js installed on container)