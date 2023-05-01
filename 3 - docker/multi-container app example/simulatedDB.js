const express = require('express')
const lodgings = require('./lodgings.json')

const app = express()
const port = process.env.PORT || 5678

app.post("/query", function (req, res) {
  console.log('DB POST /query')
  console.log("lodgings: ", lodgings)
  res.status(200).send(lodgings)
})

app.listen(port)