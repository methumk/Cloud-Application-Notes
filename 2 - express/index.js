// Require express and create express application object
var express = require('express');
var app = express()


// Listening on port 3000
let port = 3000

// Non-Routing Middleware
// These middlewares do things but are not attached to routes for that request, e.g. we want to log info about requests
// We can use the use() function with no route specified; they will be called for every request in the order in which they are registered
// NOTE: ORDER MATTERS, if this was placed above the catch-all 404 middleware we would not get console output
// NOTE: You need to include next or terminate the req-res cycle e.g. with send otherwise the server will hang when it reaches the end of the function
app.use(function (req, res, next) {
	console.log("NON-ROUTE TEST!")
	next();
});

// We can also use exported lambdas or functions in the middleware
var logger = require('./logger')
app.use(logger)



// Middleware for base route
app.get('/', (req, res, next) => {
    res.status(200).send("Hello 1")
})
// NOTE: Doesn't occur cuz first middleware with same route is caught
/* app.get('/', (req, res, next) => {
    res.status(200).send("Hello 2")
}) */


// Parameterized routes allow us to use parameters in the URL
// e.g. /lodgings/{lodgingID}
// We can parameterize a route by including a colon-prefixed identifier (e.g. :anIdentifier)
// route parameters can be found through the req.params object
//      It will contain one entry for each colon-prefixed identifier in the route path, the entry's key is the identifier and the value is particular value specified in the path
//      e.g. /lodgings/12345 --> {lodgingID: "12345"}
app.get('/lodgings/:lodgingID', (req, res, next) => {
    res.status(200).send(`Hello ID: ${req.params['lodgingID']}`)
})


// We can use Regex/string patterns, the * will match any path that the user provides
// Using this we can handle erroneous URLs pretty easily
// The use middleware is called for each request to the specified path regardless of the associated HTTP method
// NOTE: the catch-all route must be specified after other routes, as express match requests against routes in order (e.g. if the above get was below, it would not be matched)
app.use('*', (req, res) => {
    res.status(404).send({err: "The requested resource doesn't exist"})
})


// Start server listening
// Using function, but could also use lambda function: () => {}
app.listen(port, function() {
    console.log(`Server listening on port: ${port}`)
})

// NOTE: doesn't matter if you put middleware below listen
