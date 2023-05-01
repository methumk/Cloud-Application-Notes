var express = require('express')
var app = express()

port = 3000

/* 
    Implementing the following:
        - GET /lodgings: fetches a list of all lodgings
        - POST /lodgings: create a new lodging
        - GET /lodgings/{lodgingID}: fetch data about a single lodging
        - PUT /lodgings{lodgingID}: modifies a single lodging
        - DELETE /lodgings/{lodgingID}: delete a single lodging

    Storing data will be in an in-memory array for now
*/

// Lodgings array
var lodgings = []
// Display curr # of lodgings
app.use((req, res, next) => {
    console.log(`# Lodgings: ${lodgings.length}`)
    for (let i=0; i < lodgings.length; ++i){
        if (lodgings[i]){
            console.log (`Lodging : ${lodgings[i].name}`)
        }else{
            console.log (`Lodging : NULL`)
        }
    }
    next()
})

// Create new lodging with POST
// We said the request bodies would be JSON encoded, so we will have to parse it; we can do this with express
// Whenever a req comes into our server with content-type header set to application/json the middleware will parse the body of that request into a JS object 
    // and it will store the object in the field req.body
// NOTE: no next function call and there is no halting
app.use(express.json())


/* 
    ~ This endpoint will be paginated
        e.g. GET /lodgings?page=2
    ~ If no page specified we return the first one
    ~ We will return pagination info and links relevant to pages (more work to implement pagination cuz can't use DB yet)
        {
            "pageNumber": 1,
            "totalPages": 127,
            "pageSize": 10,
            "totalCount": 1264,
            "lodgings": [ ... ],
            "links": {
                "nextPage": "/lodgings?page=2",
                "lastPage": "/lodgings?page=127"
            }
        }
    ~ Express does auto query parsing through req.query.VARNAME
*/
app.get('/lodgings', (req, res, next) => {
    console.log('GET /lodgings')
    // This uses a page if it is specified or the page is 1 if no page is specified
    let page = parseInt(req.query.page) || 1;

    // Hard coding the lodgings per page
    let numPerPage = 10;

    // Make sure page is 1 through the total # of lodgings
    let lastPage = Math.ceil(lodgings.length/numPerPage);
    lastPage = lastPage < 1 ? 1: lastPage;
    page = page < 1 ? 1 : page;
    page = page > lastPage? lastPage : page;


    // Determine the lodgings to display per page
    let start = (page - 1)*numPerPage;
    let end = start + numPerPage;
    let pageLodgings = lodgings.slice(start, end);


    // Create HATEOAS links; links to next/common pages for easy access
    let links = {};
    if (page < lastPage){
        links.nextPage = `/lodgings?page=${(page + 1)}`;
        links.lastPage = `/lodgings?page=${lastPage}`;
    }

    if (page > 1){
        links.prevPage = `/lodgings?page=${page - 1}`
        links.firstPage = `/lodgings?page?=1`
    }


    // Send the response as a JSON
    res.status(200).json({
        pageNumber: page,
        totalPages: lastPage,
        pageSize: numPerPage,
        totalCount: lodgings.length,
        lodgings: pageLodgings,
        links: links
    });    
});


// Create a lodging
app.post('/lodgings', (req, res) => {
    console.log('POST /lodgings')
    // We have to extract the parsed lodging info from the req body and use it to add a new lodging
    // Also want to do some verification on the info e.g. all info is included
    // For now, all lodgings need a name; error otherwise
    // NOTE: name in the json should look the same as it's used here --> {"name" : ...}
    if (req.body && req.body.name) {
        // We know that the body is parsed and there is a field name
        lodgings.push(req.body)
    }else{
        res.status(400).json({
            err: "Request needs a JSON body with a field name"
        })
    }

    // Respond with 201 (created) and response body that provides the client with the ID of the new lodging resource (index in array)
    // As well as HATEOAS link to that lodging resource
    var id = lodgings.length - 1;
    res.status(201).json({
        id: id,
        links: {
            lodging: `/lodgings/${id}`
        }
    })
})


// Get a certain lodging
app.get('/lodgings/:lodgingID', (req, res, next) => {
    console.log('GET /lodgings/ID')
    // Have to verify that the lodging ID is valid
    // Id is the location in the array
    let lID = parseInt(req.params['lodgingID'])
    if (lodgings[lID]){
        res.status(200).json(lodgings[lID])
    }else{
        // Call next to go to handle all 404 if it's next
        // or could have responded with 404 
        res.status(404).send({
            err: `The requested resource doesn't exist`
        });
    }
})


// Update an existing lodging
app.put('/lodgings/:lodgingID', (req, res, next) => {
    console.log('PUT /lodgings/ID')
    // Client must specify the ENTIRE replacement for the specified resource
    // Body of each req comes to the endpoint with complete info (at min a name)
    let lID = parseInt(req.params['lodgingID'])
    if (lodgings[lID]){
        if (req.body && req.body.name){
            // if specified lodging is valid replace old with new data
            lodgings[lID] = req.body
            res.status(200).json({
                links: {
                    lodging: `/lodgings/${lID}`
                }
            })
        }else{
            res.status(400).json({
                err: "Request needs a JSON body with a name field"
            })
        }
    }else{
        res.status(404).send({
            err: `The requested resource doesn't exist`
        });
    }
})


// Delete a lodging, replace it with null
app.delete('/lodgings/:lodgingID', (req, res, next) => {
    console.log('DELETE /lodgings/ID')
    let lID = parseInt(req.params.lodgingID)
    if (lodgings[lID]){
        lodgings[lID] = null;
        res.status(204).end()
    }else{
        res.status(404).send({
            err: `The requested resource doesn't exist`
        });
    }
})


// Catch all routes that weren't specified above to 404
app.use('*', (req, res) => {
    console.log('CATCH-ALL 404')
	res.status(404).send({
		err: `The requested resource doesn't exist`
	});
});

app.listen(port)