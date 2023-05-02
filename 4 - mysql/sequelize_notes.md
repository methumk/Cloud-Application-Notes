# Getting Started
We need to install it using npm and have to install MySQL driver

    npm install sequelize mysql2

We can then import the Sequelize library into server code and establish a connection to our DB using connection params specified as env variables. This is defined in `lib_sequelize.js` file. Note: prefix lib_ is supposed to be the dir sequelize file is in, but I want to keep all files in one layer.

    const { Sequelize } = require('sequelize')
    const sequelize = new Sequelize({
        dialect: 'mysql',
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        database: process.env.MYSQL_DB,
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD
    })

Before starting our API server, we'll want to use Sequelize's `sync()` method to make sure our data models are synced with our DB tables. This method returns JS promise, which is object representing the eventual completion or failure of an async operation. We can attach callback to a promise by calling `then()` on it:

    sequelize.sync().then(function () {
        app.listen(...)
    })


# Sequelize Models
Sequelize models are abstraction that represents a table and describes the table it represents.

Creating a model to represent lodgings. Multiple ways of doing this, but will use the  `sequlize.define()` method. It takes two arguments, the model name and a set of **attributes** specifying the schema for the table corresponding to the model, and returns the newly defined model once it's created. Note: in `models_lodgings.js`:

    const Lodging = sequelize.define('lodging', {...})

The model name 'lodging' will be used to determine the name of the table where instances of this model are stored. NOTE: sequelize will automatically pluralize the model name when determining the table name, so it will end up being 'lodgings'.

Second argument of the `define`, specifies attributes representing each column in MySQL Table corresponding to Lodging model. At min, each attribute must specifiy the data type associated with the column, they can also specify column options, like constraints, or indexes. This is what we will provide for the second argument

     {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        street: { type: DataTypes.STRING, allowNull: false },
        city: { type: DataTypes.STRING, allowNull: false },
        state: { type: DataTypes.STRING(2), allowNull: false },
        zip: { type: DataTypes.STRING(5), allowNull: false },
        price: { type: DataTypes.FLOAT, allowNull: false },
    }

Data types:
- STRING maps to VARCHAR(255)
- STRING(n) maps to VARCHAR(n)
- TEXT maps to TEXT in MYSQL
- FLOAT maps to FLOAT in MySQL

`allowNull` option sets not Null constraint on corresponding column, so null values are not allowed.

Also note, that ownerid and id are **NOT** defined here. Not sure why ownerid is not included, cuz DB specifies it as NOT NULL, so he might have forgotten.

# Using Sequelize models to make SQL queries
We now have Sequelize model set up to represent lodgings, we can use this model to perform queries within our API's endpoints.

## Creating Data
Creating database data. We'll update our API's POST /lodgings endpoint to use sequelize to store new lodging in our MySQL DB. We will use async/await mechanism in JS to handle JS promises returned by Sequelize.

We prefix promise returning functions with `await` keyword which suspends operations until the returned promise is fulfilled or rjected.

We have to create a model and then store it in our DB. We'll use the `create()` method which creates and stores.

`create()` requires an object whose field match the attributes specified in the model definition (null fields may be omitted). We'll assume an object is available in req.body, which represents the JSON body of the request sent to the POST /lodgings endpoint:

    const lodging = await Lodging.create(req.body)

We can log this instance out using `toJSOn` method to see what it looks like

    console.log(lodging.toJSON())

`Create` returns data that has already been stored in DB, thus it will have id field representing the ID (auto generated)

    res.status(201).send({
        id: lodging.id
    })

If req.body does not match our schema specified by the lodging model, `create()` will faill and will throw a ValidationError. We can handle this situation by catching the error and responding with 400 status.

    const { ValidationError } = require('sequelize')
    ...
    try {
        const lodging = await Lodging.create(req.body)
        ...
    } catch (e) {
        if (e instanceof ValidationError) {
            res.status(400).send({
            err: e.message
            })
        }else{
            throw e
        }
    }

If we catch error other than ValidationError, re-throw it. To catch this re-thrown exception need to make sure we have an error-handling express middle-ware function within our server set up.

With the POST /lodgings endpoint set up to store data in DB via lodging model, we should now be able to send queries to this endpoint and see data stored in the DB.

NOTE: possible vulnerabilities if we directly use req.body in create as there could be sensitive fields we don't want to allow client to set directly by providing a value in req.body, such as isAdmin flag.

We can add layer of precaution by listing fields we want to permit the client to set in our call to `create()`, additional fields client provides won't be written to DB even if they are part of model.

    const lodging = await Lodging.create(req.body, [
        'name',
        'description',
        'street',
        'city',
        'state',
        'zip',
        'price'
    ])

NOTE: Sequelize automatically performs appropriate escaping on values provided to `create()` which helps to prevent SQL injection attacks

## Reading Data
Working on reading the lodgings to power GET /lodgings endpoint. Make sure to mark the endpoint function as async: 

    app.get('/lodgings', async function (req, res, next) {...})

We can get all data using Sequelize's `findAll()` method

    const lodgings = await Lodging.findAll()

Which is equivalent to the SQL query: `SELECT * FROM lodgings`. After the query comples, the variable lodgings will contain array of all the lodgings store in the DB. We can return it to client

    res.status(200).send({lodgings: lodgings})

NOTE: make sure to set up error-handling in case `findAll` fails (e.g. fail to connect to DB)

### Pagination
To paginate, first get page number for the get lodgings endpoint, and parse it appropriately. 

    let page = parseInt(req.query.page) || 1
    page = page < 1 ? 1 : page

Use the value of page to perform pagination calculations

    const pageSize = 10
    const offset = (page - 1) * pageSize

We can then use the values pageSize, and offset to add to our limit clause

    SELECT * FROM lodgings LIMIT <offset>,<pageSize>

This can be done in Sequelize using the `findALl()` method, providing these arguments:

    const lodgings = await Lodging.findAll({
        limit: pageSize,
        offset: offset
    })

To get total # of pages, we can use `findAndCountAll()` method instead of `findAll()` which gets all data and returns the number fetched (all rows in table). We then do calculation to get total # pages:

    const result = await Lodging.findAndCountAll({
        limit: pageSize,
        offset: offset
    })
        res.status(200).send({
        lodgings: result.rows,
        page: page,
        pageSize: pageSize,
        count: result.count,
        totalPages: Math.ceil(result.count / pageSize)
    })

Again, note that `findAll()` are escaped to mitigate against SQL injection attacks

### More complex data reads
#### Where clause
Can do where clause using `findAll()`, by putting it into the function body

    const corvallisLodgings = Lodging.findAll({
        where: { zip: "97330" }
    })

#### Search by primary key
We can also get a model instance using a primary key (e.g. when we are getting lodgings by ID: GET /lodgings/:id), through the `findByPk()` method.

    const id = req.params.id
    const lodging = await Lodging.findByPk(id)

`findByPk()` can throw exception, error-handle Express middleware should be set up. Also if Id param doesn't represnet valid lodging ID, it will return null (no lodging exists): respond with 404 ('not found'), we can simply invoke next() to get to the middleware function for generating/responding with 404 status.

    if (lodging) {
        res.status(200).send(lodging)
    } else {
        next()
    }


### Updating data
Done through the `update()` method in Sequelize, accepts a where option like `findAll()`, also arguments indicating how to update the data.

    const result = await Lodging.update(req.body, {
        where: { id: id }
    })

To make sure client isn't doing what they shouldn't be, we can specify the fields to be taken from req.body, which ignores ones that are not on the list

    const result = await Lodging.update(req.body, {
        where: { id: id },
        fields: [
            'name',
            'description',
            'street',
            'city',
            'state',
            'zip',
            'price'
        ]
    })

`update()` returns array containging a single value indicating the number of rows affected by the update, if it doesn't represent a valuid lodging (e.g. incorrect id argument) then the array should contain value 0. So check that and respond with 404 (not found) or 204 (no content: cuz not including anything in resp body; if we used resp body we would send 200):

    if (result[0] > 0) {
        res.status(204).send()
    } else {
        next()
    }

#### Other update methods
We could modify data directly through model (change values from returned model)

    const lodging = await Lodging.findByPk(id)
    lodging.price -= 50
    await lodging.save()

`save()` forces update to our model instance to be synced with DB. Without calling it, DB will not be updated.

There's also `increment()` and `decrement()` methods to inc/dec numerical fields.

### Deleting data
`destroy()` method which accepts where option and performs SQL DELETE queries. Deletion of a given id would look like this:

    app.delete('/lodgings/:id', async function (req, res, next) {
        const id = req.params.id
        const result = await Lodging.destroy({ where: { id: id }})
        if (result > 0) {
            res.status(204).send()
        } else {
            next()
        }
    })

# Sequlize entity associations
Entitites have associations between them e.g. one-to-one, one-to-many, many-to-many relationships.
In relation DBs, regardless of relationships between different entities, typically will need to store each type of entity in its own table. Associations between entitites represented by **foreign keys** (columns in one table that refer to primary key from a different table). 

Creating reservation entity, which represents a specific time period when a specific user has booked a specific lodgings. This is a one-to-many relationship. Reservation table has FK that points to PK of lodgings table.

    const Reservation = sequelize.define('reservation', {
        start: { type: DataTypes.DATEONLY, allowNull: false },
        end: { type: DataTypes.DATEONLY, allowNull: false },
        userId: { type: DataTypes.INTEGER, allowNull: false }
    })

Note: we don't have to specify an attribute representing FK that will reference lodgings. Sequelize does this automatically when we set up the association.

### Sequelize associations
4 methods for defining associations. These methods are called pairwise on two different model classes to define association between them.
- `hasOne()`
- `hasMany()`
- `belongsTo()`
- `belongsToMany()`

In exampke parent model is A and child model is B:
- one-to-one: `A.hasOne(B)` and `B.belongsTo(A)`
- one-to-many: `A.hasMany(B)` and `B.belongsTo(A)`
- many-to-many: Must create a **junction** table to model them [more info](https://sequelize.org/docs/v6/core-concepts/assocs/#many-to-many-relationships)


## Set up example association
Now we have to set up the association between reservations and lodgings:

    Lodging.hasMany(Reservation, {
        foreignKey: { allowNull: false },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    Reservation.belongsTo(Lodging)

After we run this, Sequelize will auto create a column called lodgingID in reservations table which is a FK referecing the lodgings table. NOTE: we also added options to prevent FK from being null and to add ON DELETE/ON UPDATE to make sure reservations deleted/updated when reference is deleted or updated.

## Example endpoint set up
We can now create the endpoint:

    router.post('/', async function (req, res, next) {
        try {
            const reservation = await Reservation.create(
            req.body,
                [ 'start', 'end', 'userId', 'lodgingId' ]
            )
            res.status(201).send({ id: reservation.id })
        } catch (e) {
            if (e instanceof ValidationError) {
                res.status(400).send({ err: e.message })
            } else {
                throw e
            }
        }
    })

NOTE: router is just express, we HAVE to specify value for lodgingID when we create a reservation.

## Accessing reservations for a specific lodging through an instance of Lodging model.
Two approaches **lazy loading** (only loads lodging's reservations when we need it), and **eager loadging** (load lodging's reservation data immediately, when we first fetch the lodging itself)

### Lazy Loading
We can use **lazy loading** if our Lodging model doesn't already have reservation data loaded:

    const reservations = await lodging.getReservations()

NOTE: that the method we are using is auto created by Sequelize when we set up the relation between lodging and reservation.

### Eager Loading
We can use **eager loading** by adding an `include: Reservation` option when making call to `findAll()`, `findByPk()`, etc

    const lodging = await Lodging.findByPk(id, {
        include: Reservation
    })

This will fetch Reservations tied to that lodging id