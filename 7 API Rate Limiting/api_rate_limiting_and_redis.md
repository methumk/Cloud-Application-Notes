# Implementing rate limiting in an API Server
## Setup
Using basic node.js/express based API server
Install redist package so we can interact with Redis DB
    
    npm install --save redis

Import into server code with `require()`

    const redis = require('redis')

When connection to this DB (like previous DB's), read info about Redis DB into the server from the env

    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT || '6379';

Use it to instantiate Redis client that we'll use for every query to Redis

    const redisClient = redis.createClient({
        url: `redis://${redisHost}:${redisPort}`
    });

Connect client to our Redis server before we start our own API server listening for reqs

    redisClient.connect().then(function () {
        app.listen(port, ...)
    })

Redis client is ready to go

## Rate limiting
Can start implementing rate limiting with token bucket algo.
Start by defining two global constants defining our rate limiting time window (miliseconds), and max # of reqs user can make within that window

    <!-- 5 reqs per minute -->
    const rateLimitWindowMilliseconds = 60000;
    const rateLimitWindowMaxRequests = 5;

Rate limiting will be implemented like an Express middleware function, and it will by asynced

    async function rateLimit(req, res, next) {
        ...
    }   

We could apply the middleware function on per-endpoint basis, like how we did authentication for certain endpoints previously. Most common to just rate limit entire API. Can do this by plugging rate limiting middleware into express app before we register any API endpoints

    app.use(rateLimit)

FIrst thing to do in our rate limiting function is accessing the requesting user's token bucket (stored in Redis under the user's IP address), can be got using Redis client's `hGetAll()` function

    let tokenBucket = await redisClient.hGetAll(req.ip)

This method will return entire hash stored for the specified key (IP address in this case). Hash will contain IP's token bucket info

Every value in Redis hash is stored as a string, so we'll want to covernt # of tokens and timestamp into numeric values to do computations. Additionally, if we haven't previously stored token bucket info for a specific IP address, `hGetAll()` will return empty JS object. In that case, we will want to instantiate the toekn bucket with initial values. We can accomplish this and the parsing into numerical values as follows:

    tokenBucket = {
        tokens: parseFloat(tokenBucket.tokens) ||
            rateLimitWindowMaxRequests,
        last: parseInt(tokenBucket.last) || Date.now()
    }

If we have problem communicating with Redis with `hGetAll()`, it will throw exception, usually return 500 to client, but we will handle it differently. We can just turn rate limiting off by calling `next()` to allow the req to proceed regardless

    let tokenBucket;
    try {
        tokenBucket = await redisClient.hGetAll(req.ip);
    } catch (err) {
        next();
        return;
    }

Rejecting the req would essentially make our API unavailable if rate limiting failed due to a problem with Redis' server (basically the same thing as a DoS attack). Choosing to accept the req, does temporarily increase the risk of a DDos attack (potential APi unavailability) in order to keep our API otherwise available

We should now be able to get the info needed for the token bucket alogirthm

## Implementing token bucket algo
We need to do the folowing:
* Refresh the token bucket with tokens based on elasped time between the previous req and curent one
* Check to see whether the user has at least one token to pay for the current req (Deduct the token if they do)
* Update the token bucket with the timestamp of the current req
* Store the user's updated token bucket back in Redis
* Either allow or reject the user's req based on whether they had enough tokens


### Compuiting timestamp of current req and refresh token bucket
Refreshing token bucket based on elapsed time between the current req and the last one (make sure to limit number of token to the max). Then update the timestamp on token bucket

    const timestamp = Date.now();
    const elapsedMilliseconds = timestamp - tokenBucket.last;
    const refreshRate =
    rateLimitWindowMaxRequests / rateLimitWindowMilliseconds;

    <!-- Main equation (# tokens to add) -->
    tokenBucket.tokens += elapsedMilliseconds * refreshRate;

    <!-- Set the tokens and timestamp -->
    tokenBucket.tokens = Math.min(rateLimitWindowMaxRequests, tokenBucket.tokens);
    tokenBucket.last = timestamp;

### Can user pay for req
If user has at least one token to pay for the req, we deduct that token from their token bucket, save the token bucket back to Redis, and allow the req to proceed by calling next. Otherwise, just save the updated token bucket back to redis and reject the req with 429 (too many reqs) error

    if (tokenBucket.tokens >= 1) {
        tokenBucket.tokens -= 1;
        // Save token bucket back to Redis here...
        next();
    } else {
        // Save token bucket back to Redis here...
        res.status(429).json({
            error: "Too many requests per minute"
        });
    }

Possible to return 503 (service unavalable) in order to avoid giving too much info to an attacker. When rejecting req due to rate limiting, also common to include resp headers letting the client know the max number of reqs per unit of time, etc. (e.g. X-RateLimit-Limit at GitHub)

### Saving user's token bucket back to Redis
Use HSET command to set specific fields of the hash for a given key (the IP)
We need to set the tokens and last field in the hash.

    await redisClient.hSet(ip, [
        ['tokens', tokenBucket.tokens],
        ['last', tokenBucket.last]
    ])

When adding that call to `hSet()` into both the if and else blocks above, our rate limiting middleware is complete. With it already regeistered with Express, we should be able to generate reqs to our API, and ones that exceed the rate limit will be rejected.
