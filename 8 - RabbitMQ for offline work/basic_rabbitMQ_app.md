# Basic RabbitMQ application
RabbitMQ implements message queue architecture, which consists of producers writing to queue and consumers consuming items in the queue

## Starting the RabbitMQ server
This server will manage the message queues themselves. We will use official RabbitMQ docker image to launch the server

    docker run -d --name rabbitmq-server \
        -p "5672:5672" \
        -p "15672:15672" \
        rabbitmq:3-management

    NOTE: 
        using specialized version of RabbitMQ image with management plugin enables (3-management). This gives access to management portal we can view in our browser accessed at http://localhost:15672. Which required auth, with default username "guest" and password "guest"

        Publishing ports 5672, default RabbitMQ port, and 15672, the management portal port

## Writing application
With the server running, we can start running our application. We first need to install Node.js client library for communicating with RabbitMQ, library called `amqlib` which is named after the communication protocol used by RabbitMQ, AMQP (advanced message queuing protocol)

    npm install --save amqlib

### Writing producers
Set up basic amqplib and setting URL for connecting to RabbitMQ server based on env variable `RABBITMQ_HOST`

    const amqp = require('amqplib');
    const rabbitmqHost = process.env.RABBITMQ_HOST;
    const rabbitmqUrl = `amqp://${rabbitmqHost}`;

Now we can write the main producer code. Functions in amqplib are promise-based so need await-ed calls. ALongside try/catch:

    async function main() {
        try {
            ...
        } catch (err) {
            console.error(err);
        }
    }
    main();

Inside try/catch we'll create communication chanel with RabbitMQ server. This will support most of the functionality for getting things done with RabbitMQ. To create the channel, we first have to establish connection to our RabbitMQ server.

    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

Next, we can make sure queue exists to which to plublish messages with `asserQueue()`, which will create a queue with the specified name if such a queue doesn't already exist. We'll call our queue "echo", and our app will have consumers just echo the producer's message

    await channel.assertQueue('echo');

We can now send some one-word messages to it

    const message = 'The quick brown fox jumped over the lazy dog';

    message.split(' ').forEach((word) => {
        channel.sendToQueue('echo', Buffer.from(word));
    });

NOTE: the mssage is sent to the queue as a byte array, represented by a Buffer object. Because it is sent as a byte array, it can be used to encode anything

After that we can close the connection to our RabbitMQ server after waiting half a second to make sure message sent successfully

    setTimeout(() => { connection.close(); }, 500);

This is all we need for the producer

### Writing Consumer
Most of the code should be same as producer, only diff is that instead of sending messages by calling `channel.sendToQueue()`, consumer makes single call to `channel.consume()`. It serves two purposes:
1. Registeres our consumer with specific queue on the RabbitMQ server, so that the server knows to send messages to this consumer when they come in from producers
2. Provides a callbakc function to be invoked each time the consumer is sent a message from the RabbitMQ server. This function will ne passed a single argument containing an object representing a single message to be processed. The main field of interest in this object is `content` which will contain the raw message content from the producer, as a `Buffer`

Consumer callback can process the message in whatever way it wants. After doing so, it has to send an acknowledgment back to the RabbitMQ server. This lets the server know that hte message was successfulyl processed

If the server doesn't receive an acknowledgement for a given message, it will understand that the message wasn't fully processed and will requeue it

Setting up consumer callback that prints message received from the producer

    channel.consume(queue, (msg) => {
        if (msg) {
            console.log(msg.content.toString());
        }
        channel.ack(msg);
    });

NOTE: our consumer will not close its connection to the RabbitMQ server. With the connection still open, the consumer will continue to receive messages from the server as they're produced.

Now we have code for both producer and consumer in place, we can launch one or more consumers and let them sit to listen for messages. Every time we invoke the producer, the messages it sends will be divvied up between the running consumers. We can also the state of our message queue as operations proceed by RabbitMQ's management portal at http://localhost:15672

