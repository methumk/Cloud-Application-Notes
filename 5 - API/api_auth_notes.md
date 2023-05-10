# Registering users and storing passwords
Passwords and user info given to API in plainttext, but when storing in DB, password is hashed.
Hashing encrypts the password, and when the user logs in again that pass is hashed and checked to see if it matches the hashed value in DB.

We will also salt the password. Password salting is when a unique random string is generated and concatenated to the user's password before it is hashed. (prevents against rainbow table attacks)

Using Node.js package bcrypt.js which does salting and hasing based on crypto cipher Blowfish

    npm install --save bcrypt js

Functions in userpass_bcrypt.js

For the `insertNewUser()` function the user and pass is in the field of the user object, and we'll use bcrypt.js to salt and hash it before storing in DB
We can do both using `hash()` function, which is async and takes pass and length of salt as arguments. Returns promise that resolves to a string that contains hashed pass and generated salt

    const passHash = bcrypt.hash(user.password, 8)

We can then add it to the user document before inserting it to DB

    const userDocument = {
        ...
        password: passwordHash
    };
    const usersCollection = mongoDB.collection('users');
    return usersCollection.insertOne(userDocument);

This will the insert hashed pass into the DB

## GET users/:userID endpoint 
This endpoint returns the entire user document from the DB, which also contains the user's hashed pass.
Security risk to expose even a hashed pass so we'll want to make sure to not include it in our GET response. can specify this with a **projection** to explicity exclude the password field from the MongoDB query in getUserByID()

However, sometimes we might need pass so we can have a bool arg for our function and do this for the projection

    async function getUserByID(userID, includePassword) {
    ...
    }


    const projection = includePassword ? {} : { password: 0 };

Our MongoDB query will look like this

    usersCollection
        .find({ _id: new ObjectId(userID) })
        .project(projection)
        .toArray()

 # Validating passwords to log in users
 Now that the user's hashed pass is stored, we can implement APi to log in. We'll make a function to validate specified user

    async function validateUser(id, password) {...}

We will make sure the given password correspomnse to the one in our DB.

    const user = await getUserByID(id, true);

If this is successful, we want to compare the passwords and als to make sure ID is not invalid (null in this case)
Best practice to return the same error response regardless of whether the specifier user ID or password is invalid making brute-force attacks difficult

User bcrypt `compare()` to do pass comparison: takes plaintext pass and hashed pass from the `hash()` function. It will salt + hash plaintext and comapre the two. Returns boolean promise

    const authenticated = user && await bcrypt.compare(password, user.password);

Simply return the value of authenticated wrapped in promise as this function is marked aync


# Implementing login endpoint
Implement the POST endpoint which clients will send a user's ID and pass in request body

    app.post('/users/login', async function (req, res) {...});

Make sure that req body contains user's ID and pass otherwise 400 (bad request)

    if (req.body && req.body.id && req.body.password) {
        ...  
    } else {
        res.status(400).json({
            error: "Request body needs user ID and password."
        });
    }

If it's properly formatted, then authenticate the user, if that fails then 500 for error logging in

    try {
        const authenticated = await validateUser(req.body.id, req.body.password);
    } catch (err) {
        res.status(500).send({
            error: "Error logging in.  Try again later."
        });
    }

In try block, if successfully auth then send 200, other 401 (unauthorized). We'll eventually put a JWT in 200 response

    try{
        ...
        if (authenticated) {
            res.status(200).send({});
        } else {
            res.status(401).send({
                error: "Invalid authentication credentials"
            });
        }
    }

Last step is to return JWt along with success response

# Generating JWT
We'll be using jsonwebtoken package to create/verify our JWTs

    npm install --save jsonwebtoken

Good idea to keep auth stuff in it's own place so we can reuse auth functions across codebase. I'm doing it in file `auth.js`
Putting key to sign and verify JWT in that file as well, but that's bad practice.

Let's create a function to generate a JWT in `auth.js`

After we have done this, we can use this function in our POST endpoint to generate an auth token using this functgion and include the token in our response back to client.

    ...
    if (authenticated) {
        const token generateAuthToken(req.body.userID);
        res.status(200).send({ token: token });
    }
    ...

Now if we send valid auth request to the POST endpoint, we'll get a valid JWt back


# Using JWT for auth
Now that users can login and we can send JWT as proof of auth, we cna start authorizing our endpoints using JWT

In the `auth.js` file we can create new express midleware called `requireAuthentication()` which will be exported

    function requireAuthentication(req, res, next) {
    ...  
    }
    exports.requireAuthentication = requireAuthentication;

Typically when working with JWTs, common practice is for clients to send JWT token within headers of the request, typically within Authroization hader using the bearer scheme

    Authorization: Bearer <token>

You could also send the JWT in a cookie, cookie generated server side and sent back to the client when the user successfully authenticate to the /users/login endpoint

In express middleware function , we can get request header value from request object using `req.get()`, do this to get the AUthorization header value, make sure it's non-null and split it at the splace to separate bearer scheme string from actual token

## Using JWT verify function
To use our `requireAuthentication()` function we could plug `app.use(requireAuthentication);` and use that function to run every request. But this isn't best approach. At a min, we want users to be able to use our /users/login endpoint **WITHOUT** already being logged in.

To do this, we can specify sequence of middleware functions to be called, in order, for a given route specification
E.g. if we had 2 middleware functions fn1 and fn2 which we wanted to execute in order on HTTP GET request to path /, we could specifiy the route like this

    app.get('/', fn1, fn2);

By doing so, fn1 will be executed first then fn2.
Thus, we can include our `requireAuthentication()` fybctuib ub riyte soecufucatuib fir aby AOU ebdoiubt for which we want to require auth adding it **BEFORE** the normal route handler to ensure it gets called first. E.g. for our GET /users/:userID endpoint we could do this

    app.get(
        '/users/:userID',
        requireAuthentication,
        async (req, res, next) => {...}
    );

This helps to show which endpoints require auth, now if we try to access our GET /users/{userID} endpont we receive an error unless we provide valid auth token


# Making sure GET users/:userID can't be accessed with wrong user
Making the endpoint only allow correct user to authorize their own data
`requireAuthentication()` function sets req.user to ID of logged in user. With any auth endpoint, we can use this value to limit auth.

In the endpoint we could include the following check to restric auth to the specified user

    if (req.user !== req.params.userID) {
        res.status(403).json({
            error: "Unauthorized to access the specified resource"
        });
    } else {
        ...
    }

else clause can be normal endpoint functionality (executing only if logged in user is authorized)
NOTE: we return 403 (forbidden) above, sometimes might be better to return 404 (not found) to hide the existence of specified resource from unauthorized users

Our endpoint is now authenticated and has its authorization restricted. Now to successfully acces the endpoint we will need to provide valid auth token for the user whose data we are requesting.
