# Ubuntu image example
    docker run -it --name test-container -e "PORT=8080" -v "$PWD":/home/test -p 34567:8080 ubuntu /bin/bash


    Worked only in WSL, something about powershell didn't like --name or "$PWD"
    