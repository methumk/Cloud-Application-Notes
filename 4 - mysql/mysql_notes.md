# Running MySQL server through Docker

    docker run -d --name mysql-server			\
        --network mysql-net					\
        -p "3306:3306"						\
        -e "MYSQL_RANDOM_ROOT_PASSWORD=yes"	\
        -e "MYSQL_DATABASE=bookaplace"		\
        -e "MYSQL_USER=bookaplace"			\
        -e "MYSQL_PASSWORD=hunter2" 			\
        mysql
    -d:
        detached, running in the background
    --name: 
        name of container to be created
    --network: 
        Network we are attaching container to (have to create it first - can do it with bridge network: docker network create --driver bridge network-name)

    --p:
        publish port hostPORT:containerPORT (reqs made to host port will be sent to container port)
    -e:
        Environment Variables

    mysql:
        Name of image we are running

We specify environment variables to initialize the SQL server running in the container:
- MYSQL_RANDOM_ROOT_PASSWORD=yes: 
    Tells the mysql image to automatically generate a random password for the MySQL root superuser
    The password can be accessed via the container's Docker log: ``docker logs mysql-server 2>&1 | grep PASSWORD``
    - Instead of generating random password, you can explicityl set the password using the env variable MYSQL_ROOT_PASSWORD. One of these variables MUST be specified

- MYSQL_DATABASE: Specifies the name of a database to be created when the container starts. One MySQL server can manage many databases. This is an optional env variable

- MYSQL_USER & MYSQL_PASSWORD: These combine to createa a new user with a password. This user is given superuser permissions for the DB spcecified by MYSQL_DATABASE


# Connecting to a MySQL server and running queries
## MySQL Terminal Monitor
Eventually will connect our MySQL server from our Node.js API server, but for now connecting it using the MySQL Terminal Monitor.

WE can run the terminal monitor using the sql docker image, so we don't have to install the terminal monitor directly on dev machine:

    docker run                  \
        --rm                    \
        -it                     \
        --network mysql-net     \
        mysql                   \
        mysql -h mysql-server -u bookaplace -p

    --rm:
        removes container to be deleted not the image it was based after the container is finished running
    
    --it:
        Interactible through the terminal
    
    --network:
        Connect to network (used to send information between different containers)
    
    mysql:
        Name of image we are running

    -h mysql-server:
        specifies the hostname of the MySQL server, we refer to ur MySQL server container by the name we gave it

    -u bookaplace:
        specifies the user with which to connect to the server, the bookaplace user we created above
    
    -p:
        tells the MySQL server to prompt us to enter the user's password

### MySQL Terminal - DB
Once connected, this will open a shell whose command prompt looks like:

    mysql>

we can enter queries to the server through the terminal, queries are writetn in SQL. We could enter a query to see the current MySQL user and the current date:

    mysql> select user(), current_date;
    +-----------------------+--------------+
    | user()                | current_date |
    +-----------------------+--------------+
    | bookaplace@172.20.0.3 | 2023-05-02   |
    +-----------------------+--------------+
    1 row in set (0.01 sec)

To begin storing data, we need to use a DB. We can see what databases are available to us with a `SHOW DATABASES` statement:

    mysql> show databases;
    +--------------------+
    | Database           |
    +--------------------+
    | bookaplace         |
    | information_schema |
    | performance_schema |
    +--------------------+
    3 rows in set (0.03 sec)

This shows the bookaplace database we created when we launched the MySQL docker container. Information scheme and performance schema are system databases.

We can use the bookaplace DB:

    mysql> USE bookaplace;

This means all of our data interactions will be with this DB, to switch DBs we could run another USE statement.
We could have also specified this when starting the terminal monitor:
    
    mysql -h mysql-server -u bookaplace -p bookaplace

### MySQL Terminal - Adding data to DB
Data stored within tables, so first create table. To do so, we need to create layout of data for that table (i.e. identities, data types, data characteristics: the **schema** of the table)


Storing 