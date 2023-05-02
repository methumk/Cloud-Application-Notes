# Running MySQL server through Docker

    docker run -d --name mysql-server			\
        --network mysql-net					    \
        -p "3306:3306"						    \
        -e "MYSQL_RANDOM_ROOT_PASSWORD=yes"	    \
        -e "MYSQL_DATABASE=bookaplace"		    \
        -e "MYSQL_USER=bookaplace"			    \
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

### MySQL Terminal - Creating table in our DB
Data stored within tables, so first create table. To do so, we need to create layout of data for that table (i.e. identities, data types, data characteristics: the **schema** of the table)

We will first create table to store lodgings for Book-A-Place API.
We want to store
- ID: unique ID for the lodging
- Name: Lodging's name
- Description: Text description of each lodging
- Street Addr, City, State, Zip: stored as separate fields
- Price: price per night USD
- OwnerID: ID of the user who owns the lodging

We can then create the table and add those fields in:

    CREATE TABLE lodgings(
        id MEDIUMINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        street VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        state CHAR(2) NOT NULL,
        zip CHAR(5) NOT NULL,
        price FLOAT UNSIGNED NOT NULL,
        ownerid MEDIUMINT NOT NULL,
        PRIMARY KEY(id),
        INDEX idx_ownerid (ownerid)
    );

Our `id` columns is the primary key for the table as this uniquely identifies our lodging and we can access lodgings through our API this way as well (GET /lodgings/lodgingID). Using  `AUTO_INCREMENT` so that when we add a new row to the table we get a valid ID for that inserted row

`NOT NULL` constraint is added since those columns are required fields.
The ownerid column is intended to hold the ID of the user who's the owner of this lodging. If we had another table in our DB that corresponded to all the users, we could add a `FOREIGN KEY` constraint to ownerid. Because we don't have that we use the `INDEX` constraint which allows us to perform quick lookups on businesses given the owner ID. 

You can see if the table is created with `show tables;`

    mysql> show tables;
    +----------------------+
    | Tables_in_bookaplace |
    +----------------------+
    | lodgings             |
    +----------------------+
    1 row in set (0.01 sec)

### MySQL Terminal - Inserting values into our table
We have to add a value into each column but leave id as NULL so that auto-increment can automatically assign a value.

    INSERT INTO lodgings VALUES (
        NULL,
        'My Cool Condo',
        'A nice place to stay, downtown near the riverfront.',
        '123 SW 1st St.',
        'Corvallis', 'OR', '97333',
        128.00,
        1
    );

We could also use the `set` clause instead of `values` clause with ther `INSERT INTO` statement to specify column values as unordered, comma-separated list of name = value pairds:

    INSERT INTO lodgings SET
        id = NULL,
        name = 'My Marvelous Mansion',
        description = 'Big, luxurious, and comfy.',
        street = '7200 NW Grandview Dr.',
        city = 'Corvallis',
        state = 'OR',
        zip = '97330',
        price = 256.00,
        ownerid = 2;


### MySQL Terminal - Reading, Updating, deleting data from a table
#### Reading Data
To read data from a table, we use a `select` statement:

    select * from lodgings [WHERE key=value]

This gets all columns from lodgings, and if we wanted to we can add constraints on certain rows with the where clause.

To paginate, we can use the `LIMIT` clause. Usually accompanied by `ORDER BY` clause to ensure constant pagination. The code below will read 10 rows starting with row 20. If we did `limit 10`, then it will give us the first 10 rows.

    SELECT * FROM lodgings ORDER BY id LIMIT 20,10;

#### Updating data
To update data, we use the `update` statement. This statement is accompanied by a where clause which determines which rows the update applies to. The code below updates the price of all rows where the value of the id column is 2.

    UPDATE lodgings SET price = 300.00 WHERE id = 2;

NOTE: The `update` statement can make multiple updates if the where clause matches multiple rows.

#### Deleting data
Use the `DELETE` statement. Similar to an `update` statement, where the `where` clause is used to determine which rows to delete. Below deletes lodgings where id = 2.

    DELETE FROM lodgings WHERE id = 2;

NOTE: similary to `update` statement, `DELETE FROM` can delete multiple rows depending on what the where clause matches.



