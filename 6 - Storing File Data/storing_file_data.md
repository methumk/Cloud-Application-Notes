# Handling multipart form-data (MFD) request bodies
To work with files uploaded to API in MFD request bodies, we can use Express middleware package multer

    npm install --save multer

## Supporting image uploads
Create Multer middleware function called upload that stores uploaded files in a directory on server's filesystem (i.e. the dir uploads/ within the same dir as our servers.js)

    const multer = require('multer')
    const upload = multer({dest: `${__dirname}/uploads`})

Then we can create new `POST /images` endpoint to use the middleware

    app.post('/images', upload.single('image'), (req, rest, next) => {...})

This will incorporate the `upload` middleware before normal middleware function. The `.single('image')` tells the `upload` middleware to expect MFD req body containing a single file in a field called 'image'

When a request comes to our endpoint, if the req contains MFD body, the file in the field named 'image' will be stored in `uploads/' directory as we specified

In normal middleware function for this endpoint, the req object will now have additional field req.file which will provide info about the uploaded file. In addition, non-file fields in MFD will be stored in req.body
From this MFD request:

    POST /images HTTP/1.1
    Host: localhost
    Content-Type: multipart/form-data;boundary="theBoundary"

    --theBoundary
    Content-Disposition: form-data; name="userId"

    1234
    --theBoundary
    Content-Disposition: form-data; name="image"; filename="myImage.jpg"

    <image_binary_data_goes_here>
    --theBoundary--

We would get this in the req.file:

    {
    fieldname: 'image',
    originalname: myImage.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    destination: '.../uploads',
    filename: '286834c7e54cf5f7804fdfc0d20ce47c',
    path: '.../uploads/286834c7e54cf5f7804fdfc0d20ce47c',
    size: 167427
    }

* mimetype: indicates the MIME type of the uploaded files which we can use to determine what kind of content the file contains (JPEG in this case: i.e. MIME type image/jpeg)
* filename: contains random name generated for the uploaded file. This will be the name of the file in the uploads/ directory
* path: indicates teh full path to the uploaded file on the API server machine
* size: indicates the uploaded file size in bytes

The req.body for the same request would hold other fields from multipart req body: `{userId: 1234}` and if we looked in uploads/ directory,m it would contain new file with name corresponding to `req.file.filename`

    $ ls uploads/   
    286834c7e54cf5f7804fdfc0d20ce47c

### Handlind Multer Errors
Errors from Multer middleware will be passed to express middleware stack, this can be handled by registereding new middleware function which takes a 4th err argument

    app.use('*', (err, req, res, next) => {
        console.error(err);
        res.status(500).send({
            err: "An error occurred.  Try again later."
        });
    });

### File type specification
The file stored in the uploads/ dir from Multer func doesn't have a file extension. To fix this, instead of setting dest option when we create Multer middleware, we'll use the storage option to register a *storage engine* with our middleware. This engine will give us more control ove rhow uploaded files are stored. First, create MIME map to file extension

    const imageTypes = {
        'image/jpeg': 'jpg',
        'image/png': 'png'
    };

Now we can create storage enginer with Multer, they have 2 differents storage engines (can also create our own). We are storing files on API server machine's filesystem we'll use *Disk Storage* engine, which we can do through this:

    const upload = multer({
        storage: multer.diskStorage({
            destination: `${__dirname}/uploads`
        })
    });

Our middleware will run same as our old one (save files with random,extensionless name to uploads dir). To change the way files are named we have to pass `filename` option to `multer.diskStorage()`. We can provide a function as the `filename` option, this function gets called every time a new req comes into our POST /images endpoint, and it will be passed arguments representing the request itself, the file being uploaded, and callback function to be called once the name is computed

    multer.diskStorage({
        destination: `${__dirname}/uploads`,
        filename: (req, file, callback) => {...}
    })

We can then generate a random string to represent the filename (using Node's crypto module), and then we'll append appropriate extension and then a null error as the first argument

    const filename = crypto.pseudoRandomBytes(16).toString('hex');
    const extension = imageTypes[file.mimetype];
    callback(null, `${filename}.${extension}`);

This then solves the problem of adding JPEG or PNG extensions to the saved file elements when files POSTed to `/images`. However, other files still can be POSTed and we ideally should reject files that aren't images at this endpoint.


### Rejecting non-image files
We can provide a `fileFilter` function in Multer middleware, this function has same arguments as filename function. This function will accept a file if true is passed into the callback function and rejected if false gets passed in. This will reject files whose MIME type doesn't exist on our imageTypes object

    const upload = multer({
        storage: multer.diskStorage({ ... }),
        fileFilter: (req, file, callback) => {
            callback(null, !!imageTypes[file.mimetype]);
        }
    });

    NOTE: !! is JS trick to coerce value to Boolean. If mimetype is not in our imageTypes object, it will return undefined which, with !! gets converted to false, anything with a value will be converted to true.

This will reject any non-image file sent to POST /images endpoint and req.file will be undefined in that endpoint's middleware

# Making files available to clients
Currently, images uploaded to our API will be stored in the uploads dir with correct file extension and we can also reject non-image files
However, even though the images exist in our uploads dir, but our API can't really do much with them; e.g. it's hard for the API to find the speciifc image and return it to the client

Usually, retrieveing files can be done by storing file info in the API's DB (mongoDB or MySQL) and using that database to help find speciifc images to be sent back to the client

## Function to store image date to DB
Storing image data into our database, which we can use at our POST /images endpoint when we add the files to our upload directory

    async function saveImageInfo(image) {
        const db = getDBReference();
        const collection = db.collection('images');
        const result = await collection.insertOne(image);
        return result.insertedId;
    }

Make sure to change POST /images endpoint to async, as we have an `await` to save the image info. In the middleware function, we can check that the req body contains the image file and the userId field, otherwise send a 400 error

    if (req.file && req.body && req.body.userId) {
      ...
    } else {
        res.status(400).send({
            err: "Request body needs'image' file and 'userId'."
        });
    }

If the req body was valid, we can save info about the store image file into our DB, which we can do with await-ed call to `saveImageInfo()`, which we can wrap in try/catch. In catch we can just pass the error into `next(err)`
In the try block we want to extract relevant info from `req.file` and `req.body` and save it to our DB. If we succeed, we should send the ID of the image entry stored in our DB back to the client

    try {
        <!-- Get relevant image info data -->
        const image = {
            contentType: req.file.mimetype,
            filename: req.file.filename,
            path: req.file.path,
            userId: req.body.userId
        };

        <!-- Save that info to our DB -->
        const id = await saveImageInfo(image);
        res.status(200).send({ id: id });

    } catch (err) {
        next(err);
    }

## Retuning info about an image to the client
We need a function to fetch image's info from our DB based on it's ID (make sure to import ObjectId from mongodb module)

    async function getImageInfoById(id) {
        const db = getDBReference();
        const collection = db.collection('images');
        if (!ObjectId.isValid(id)) {
            return null;
        } else {
            const results = await collection
            .find({ _id: new ObjectId(id) })
            .toArray();
            return results[0];
        }
    }

Then we can create an endpoint to return info about a specific image given it's ID

    app.get('/images/:id', async (req, res, next) => {
        ...
    });

Inside, we can create an await-ed call to GetImageInfoById in a try/catch.

    try {
        ... 
    } catch (err) {
        next(err);
    }

Inside of the try we can make the call to getImageInfoById, if value returned is falsy we can send back 404 error by calling next().

    const image = await getImageInfoById(req.params.id);
    if (image) {
        ... 
    } else {
        next();
    }

If we got something back, we want to send that image info back to the client, before we do that we need to make sure we do two things:
* we want to make sure we *hide* the stored image path from the user (potentially sensitive info),
    * We can do this by removing the path field from the image object before retuning it to client
        `delete image.path`

* and we want to provide client with a URL it can use to download the stored image file itself.
    * To provide a URL, we need to figure out a URL scheme for downloading image files (we can use soemthing that looks like the URL below)
        `/media/images/(imageFilename)`
        * media prefix indicates to the client the URL is associated with static file instead of API endpoint
    * include the image file's URL in resp we send to client
        ``image.url = `/media/images/${image.filename}`;``
        `res.status(200).send(image);`
    * Implement routing functionality to send contents of stored image file when it's requested using the appropriate URL
        * We can use express' static routing functionality to allow client to download images using the URLs (allows us to make all of the files in a specific dir available for direct download via their filename)
        * We can make all of the image files stored in the uploads/ dir available for download with the URL prefix /media/images:
        ``app.use('/media/images', express.static(`${__dirname}/uploads`) )``

# Storing file data in MongoDB's GridFS
Currently, we are storing files on API server's filesystem and making them available back to the client. This is a reasonable way to handle file storage that many APIs do. But there are some reasons to avoid storing files on API server's filesys:
1. You may want your API server machine to only have single purpose (running API server)
2. Traditional filesys often have limit on # of files per dir or other similar restrictions, that may require additional logic to figure out how and where to store files
3. Limited storage space on API server machine

Many possible alternatives to storing files on API server file sys, like *NFS*, *Ceph*, etc. We will be using MongoDB's *GridFS*.

## GridFS
MongoDB mechanism for storing potentially large files directly within MongoDB database. This has many advantages:
1. Unifies data storage when file data is stored alongside other app data in MongoDB (everything stored in MongoDB)
    * Simplifies app architecture, also benefits of requiring same auth to access file data as is needed to access other app data
2. GridFS doesn't suffer from filesys related limitations (e.g. number of files stored in a dir). Resulting in simpler app logic
3. Storing file data in MongoDB makes it easier to outsource app storage to 3rd party device like *MongoDB Atlas*

Some drawbacks of GridFS includes overhead when storing, retrieving files, which can be too great in some situations.

It works by storing binary file data inside normal MongoDB documents. In particular it separates file storage into 2 different collections:
1. files: Collection stores metadata about the files stored in GridFS. Each document in this collection, represents a single file and contains info like the file size, file name, and other user-defined metadata associated with file, such as the content type
2. Chunks: Each document in this collection represents a small, distinct chunk of the binary data for a single file stored in GridFS

File in GridFS has its binary data broken into many chunks (no larger than 255 kB), each chunk stored within single document in the `chunks` collection, while file's metadata stores within singlue document in `files` collection. To retrieve a file, all of its chunk documents fetched and binary data get put back together to get the original file (chunk collection indexed in a way to make retrieval and recosntruction of a file as efficient as possible)

# Using GridFS to store instead of using API server's file sys
We will still let Multer write each image temporarily to the server's file sys, and then we'll remove it once it's stored in GridFS. But a more legant approach might be to implement custom[multer storage engine](https://github.com/expressjs/multer/blob/master/StorageEngine.md) that can put an image directly into GridFS instead

First start by writing function that mirrors `saveImageInfo()`. But instead of storing image's metadata into MongoDB, we'll store image file itself (along w/ metadata) into GridFS. The mechanics of GridFS requires we return a promise:

    function saveImageFile(image) {
        return new Promise((resolve, reject) => {...});
    }

The functions work will be done within the promis's function. First task is to grab a GridFS bucket, which contains both the files and chunks collection for a particular set of files. We'll call our bucket images:

    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

The bucket will be the same way we interact with files in GridFS, similar to the way we normally interact with a collection in MongoDB. After that, we can create an object to represent the metadata we want to store alongside the file, which we get from the iumage argument to the `saveImageFile()` func:

    const metadata = {
        contentType: image.contentType,
        userId: image.userId
    };

## Writing file to GridFS
Before we write the file to GridFS. Note we already stored the file on the API server's file sys (in uploads dir - written by Multer). So we need to read it from there in order to store it in GridFS. Also, the file data must be uploaded into GridFS using a *stream*.

Streams are a simple mechanism for reading/writing data from or to a given location. E.g. file could be read from disk via a stream, or data could be written into HTTP res body using a stream

To upload file to gridFS, we need to use it's bucket's `openUploadStream()` function to create writable stream into which we can send the raw file data. We need to provide the function the filename to be attached to the image being uploaded and an options object where we will put metadata to be attached to the file in GridFS

    const uploadStream = bucket.openUploadStream(
        image.filename,
        { metadata: metadata }
    );

We can write our file into GridFS by writing data into the upload stream. Since our file already lives on API server's filesystem, we can use built-in Node.js fs module to create a readable stream attached to the file. This stream can be directly piped into the writable upload stream.

    fs.createReadStream(image.path).pipe(uploadStream)

This will write all of the data from file on disk to the upload stream; sending it to GridFS. Then we need to attach two event listeners to the stream by chainign calls to `.on()` and to `pipe()`, the first will reject the promise (this is being done within promises's executor function), and second will handle successful completion of the upload by resolving the promise to the MongoDB ID fo the stored file

    .on('error', (err) => {
        reject(err);
    })
    .on('finish', (result) => {
        resolve(result._id);
    });

Back in our POST /images endpoint, we can now replace our call to `saveImageInfo()` with a call to `saveImageFile()`

    const id = await saveImageFile(image)

But before we send a response back to the client from this endpoint. We want to remove the uploaded file from the API server's filesystem, since it's now stored in GridFS (this helps to avoid consuming too much disk space on APi server).

## Removing file on API server
We can use fs module's unlink() function which removes a file. We can wrap the call to `unlink()` within a promise so we can await it:

    function removeUploadedFile(file) {
        return new Promise((resolve, reject) => {
            fs.unlink(file.path, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
            });
        });
    }

We can call this function to remove uploaded file immediately before we send the respons eback from our POST /images endpoint:

    await removeUploadedFile(req.file);

## Minor adjustments

After this, our files and their metadata is stored in GridFS. We now have to make minor adjustments to `getImageInfoById()` which fetches image info by image's id. Specifically, this function has to fetch data using our images gridFS bucket instead of the original images collection we used before.

    const bucket =
    new GridFSBucket(db, { bucketName: 'images' });
    ...
    const results =
    await bucket.find({ _id: new ObjectId(id) }).toArray();


we also have to adapt our `GET /images/{id}` endpoint to account for the fact that the result returned by `getImageInfobyId()` will now slightly be different (it's coming from GridFS instead of our original collection). If we get a valid response back to that endpoint from call `getImageInfobyId()` we'll collate the relevant info into a single response body and send it back to the client (NOTE; the resp from `getImageInfobyId()` is stored in a variable called `image`):

    const responseBody = {
        _id: image._id,
        url: `/media/images/${image.filename}`,
        contentType: image.metadata.contentType,
        userId: image.metadata.userId,
    };
    res.status(200).send(responseBody);

## Files available for download through URL
Next we have to make files avaialbe for download from GridFS via the URLs sent back to the client in the resp above. Files must be downloaded from GridFS using a stream. We can first implement a function to return a readable stream to download a specific file from GridFS based on its filename (filename is the way our API identifies files in their download URLs). We can use GridFS bucket's `openDownloadStreambyName()` to get the readable stream:

    function getImageDownloadStreamByFilename(filename) {
        const db = getDBReference();
        const bucket = new GridFSBucket(db, { bucketName: 'images' });
        return bucket.openDownloadStreamByName(filename);
    }

We can then replace our original static express middle ware for returning file data with an API endpoint:

    app.get('/media/images/:filename', (req, res, next) => { ... });

In this endpoint, we can first grab the download stream for our file based on the specified filename (we will chain function calls onto it)
    
    getImageDownloadStreamByFilename(req.params.filename)

We can then attach a listerner for the file event using `.on()` function. Which will be triggered when the document corresponding to the requested image is successfully retrieved out of the GridFS bucket's files collection. The event listerner we attach here will be passed a single arugment containg the document itself. If this event is triggered, we know the requested file exists, which means we can set the status code and content type for the HTTP resp to send back to the client containg the image file contents.

    .on('file', (file) => {
        res.status(200).type(file.metadata.contentType);
    })

Then we just need another `.on()` listener to check for error event. We have to handle two possibilities:
1. requested file doesn't exist --> error object passed into listener should have `code` field with value `'ENOENT'`; We can call next() to route to 404 handler
2. problem communicating with GridFS --> pass error to next()

    .on('error', (err) => {
        if (err.code === 'ENOENT') {
            next();
        } else {
            next(err);
        }
    })

Then we just have to chain `.pipe()` to it to pipe the readable GridFS download stream into the HTTP response (which itself is a writable stream)

    .pipe(res);

This should then send contents of file stored in GridFS directly into respo body and thus to client. Now if we make GET request for one of the files stored in GridFS using a /media/images/{filename} URL, we should receive a response containg the image itself.

