# Running 3rd Party drupal
    docker run --name drupal-test -p 8080:80 -d drupal

    This pulls drupal automatically if image not insalled,
        --name: gives container a name
        -p 8080:80: forwards traffic on local machine on port 8080 to port 80 on container; port 80 on container is published to port 8080 on host machine
        -d: detached mode (in the background)