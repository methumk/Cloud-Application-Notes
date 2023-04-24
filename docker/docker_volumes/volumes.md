# Docker Volumes
A way of having data persistence beyond container's life cycle and sharing between containers.
Managed by Docker so isolated from host machine's core functionality.
Better than bind mount and writing to the container.
Can be easily used to store data on remote machines, cloud providers, etc.

## Creating Docker Volumes

    docker volume create test-vol
test-vol is the name of our Docker volume

## Mounting volume to container
Done using the -v option, similarly to when we were using bind mount.

    docker run                          \
        --rm 
        -v test-vol:/test               \
        alpine sh -c "echo 'Testing string' > /test/testfile"   
    
    --rm: 
        Removes container to be deleted not the image it was based on. Deketes container's writable layer after it finishes running (cuz container deleted)
    -v: 
        Bind mounts: test-vol is mounted at /test
    alpine sh -c:
        Runs the alpine image (light weight linux distro) with commands sh and -c with arguments to print testing string to the given file

This example command runs a container with our newly create test-vol volume mounted at /test. This container writes the string 'Testing string" into the file /test/testfile when it's executed.

Data in test-vol will persist, EVEN WHEN CONTAINER IS DELETED. We can see this when we run this command:

    docker run --rm -v test-vol:/data alpine	  \
    cat /data/testfile

Which gives us the same string that we echoed in before ('Testing String'). NOTE: different directory we mounted our volume into (/data) for this container. 

**Volumes can be mounted to any directory withing a container**

Basically: data exists in volume, mounted to a given directory and you can then access all that data, just in regards to where it was mounted.

# The surface of volumes
You can do much more with data volumes...
These applications will be apparent when we start using Docker to compose an application from different services

