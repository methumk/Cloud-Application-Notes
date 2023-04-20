// Server running on docker
const express = require('express');
const app = express();
const port = process.env.PORT || 8000;

app.get('/', function (req, res) {
  console.log("== Got a request!");
  res.status(200).send("Hello from Docker!\n");
});

app.listen(port, function () {
  console.log("== Server running on port", port);
});