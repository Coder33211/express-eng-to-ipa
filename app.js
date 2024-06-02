const express = require("express");
const app = express();
const port = process.env.PORT || 3001;

// app.get("/", (req, res) => res.type('html').send(html));

// const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
const server = app.listen(port);

// server.keepAliveTimeout = 120 * 1000;
// server.headersTimeout = 120 * 1000;

app.post("/", (req, res) => {
  res.send(req.body);
});
