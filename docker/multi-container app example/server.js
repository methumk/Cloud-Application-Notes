var express = require('express')
var app = express()

// Read params for connecting to the DB from env variables
// Then use the params to construct a URL for communicating with the DB
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT || 5678
const dbUrl = `http://${dbHost}:${dbPort}/query`;


let port = process.env.PORT || 8000;



app.use(express.json())

// Gets all lodgings
// Querying our DB to get data
// DB is just another http server, we can query it using a package like isomorphic unfetch
const fetch = require("isomorphic-unfetch");
app.get("/lodgings", function (req, res, next) {
    console.log('GET /lodgings')
    fetch(dbUrl, {
        method: "POST",
        body: "BODY"
    }).then(function (results) {
        console.log("results: ", results)
        res.status(200).json({
            lodgings: results
        });  
    });
});


// Catch all routes that weren't specified above to 404
app.use('*', (req, res) => {
    console.log('CATCH-ALL 404')
	res.status(404).send({
		err: `The requested resource doesn't exist`
	});
});

app.listen(port, (req, res, next) => {
    console.log(`Server listening on port ${port}`)
})
