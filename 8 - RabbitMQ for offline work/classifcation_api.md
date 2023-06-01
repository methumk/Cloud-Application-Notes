# Creating a classification API with RabbitMQ
We will take code for file uploading API ( stored in GridFS ). We can then change it so that the API is the producer and it will send a message ID to the RabbitMQ queue (in POST /images endpoint). We will then implement a worker that consumes each message, which will include fetching the image from the DB using that message, classifying the image with tensorflow, then storing the classifications back in the DB

## Producer
Start by modifying the API server to add a message to the RabbitMQ queue for each image that's uploaded. Server first needs to connect to rabbitMQ server, establish channel, ensure proper queue is created. (same way as done in producer/consumer in basic_rabbitMQ_app.md). 

We can assume the existence of a function `getChannel()` to get a reference to an alreayd open channel. Then we can modify POST /images to send a message to the queue using the channel

Important that the message the API sends to the queue contains enough info for the consumer to know what work it needs to perform. Sending raw image data is possible that thats a lot of data for the queue to manage (given file could contain tens of megabytes worht of data)

Insttead we'll wait to send the message to the RabbitMQ server until after image stored in GridFS (`saveImageFile()` is used to store the image into GridFS), once it's stored the functionr eturns the ID of the image

We can send the image ID to the queue, and the consumer will need to fetch it from GridFS before it can do any calssification. Classification will be returned back into the image in GridFS as metadata

We can add these lines after image is successfully stored in GridFS

    const channel = getChannel();
    channel.sendToQueue('images', Buffer.from(id.toString()));

## Consumer
Our consumer will be an image classifcation worker. It follows the "echo" consumer in basic_rabbitMQ_app.md, the only read difference between the two will be what we do with a non-null message

For the consumer, we assume the existence of two functions for working with images stored in GridFS:
1. `getDownloadeStramById()` - will use an image ID to fetch readable stream we can use to read an  image file from GridFS
2. `updateImageTagsById()` - will store an image's classifications (i.e. tags) back into gridFS as metadat for an image with a given ID

To work with data from GridFS, our consumer needs to be connected to our app's MongoDB database, which we'll assume is already done

### Tensorflow library
We'll use ML library tensorflow to perform image classification

To install from NPM

    npm install @tensorflow/tfjs-node

Note, if on MACOS or WIndows you need Python v2.7 installed before installing TensorflowJS.

We could train our own imag classification models, but we'll instead rely on pretrained model that classified images using labels from the ImageNet DB.

We can install this pretrained model ([mobile-net](https://github.com/tensorflow/tfjs-models/tree/master/mobilenet#mobilenet) ) using NPM:

    npm install @tensorflow-models/mobilenet

## Adding Tensorflow to consumer
Import needed packages to classifcation worker

    const tf = require('@tensorflow/tfjs-node')
    const mobilenet = require('@tensorflow-models/mobilenet')

After connecting to our DB and to the RabbitMQ queue, we'll also async load our image classificatiion model:

    const classifier = await mobilenet.load()

Now, we should be able to assume our worker is successfully set up to consume messages from the image queue, we can focus on writing code to handle each non-null message (msg) sent to the consumer function passed to channel.consume()

    const id = msg.content.toString()
    const downloadStream = getDownloadStreamById(id)

We can use the download stream to read the image into a format that can be passed to Tensorflow for classification, easiest way to do this is to store the raw image bytes into a `Buffer` object

### Storing raw image bytes into a buffer object
Read the image file one chunk at a time and store each chunk into an array. The array of chunks can be combined into a single Buffer. To perform this chunk-by-chunk reading, we'll attach a function to the download stream to listen for the stream "data" event, which is fired each time a new chunk of data is read. Our listener function will simply add each new chunk to an array:

    const imageData = [];
    downloadStream.on('data', function (data) {
        imageData.push(data);
    });

### Classifying Image

When all the image data is successfully read, the download stream's end event will be triggered. We can attach a listener to this event that sends the iamge data as a `Buffer` into TS model for classification

    downloadStream.on('end', async function () {
        const img = tf.node.decodeImage(Buffer.concat(imageData))
        const classifications = await model.classify(img)
        ...
    });

We'll want to put the image classifications into a form that's easy to work with later, exatract an array containg the class names of all classifications whose probability is at least 50%

    const tags = classifications
        .filter(classif => classif.probability > 0.5)
        .map(classif => classif.className))

# Launch
We should now have everything ready to launch one or more instances of that worker, and they'll compute and store tags for all images uploaded to our API. We can verify this by making small change to the API's GET /image/{id} endpoint to return the tags field of the images metadata inside the resp body

But this is only the surface of what RabbitMQ can do. More [RabbitMQ tutortials](https://www.rabbitmq.com/getstarted.html)
