const uWS = require("uWebSockets.js");
const expressify = require("uwebsockets-express").default;

const uwsApp = uWS.App();
const app = expressify(uwsApp);

const port = 3000;

app.get("/", (req, res) => {
  res.send('Hello World!')
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
