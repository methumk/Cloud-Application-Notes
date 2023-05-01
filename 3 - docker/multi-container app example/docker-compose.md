# Docker Compose
Used to define and launch multi container application through a compose.yml file

Can be launched with command

    docker-compose up

## Notes
Our compose.yml specified build for images we build. If we wanted to run images from images from DockerHub we could use ``image`` directive instead of ``build``
We did not use any custom networks (other than bridge network created automatically by compose) or volumes
These can could be attached to specified container using service-level ``networks`` and ``volumes`` directives

Compose more info: https://docs.docker.com/compose/