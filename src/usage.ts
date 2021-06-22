import express from "express";
import ws from "uWebSockets.js";
import querystring from "querystring";

const app = ws.App();

app.any('/anything', (res, req) => {
  res.end('Any route with method: ' + req.getMethod());
})

app.get('/user/agent', (res, req) => {
  /* Read headers */
  res.end('Your user agent is: ' + req.getHeader('user-agent') + ' thank you, come again!');
})

app.get('/static/yes', (res, req) => {
  /* Static match */
  res.end('This is very static');
})

app.get('/candy/:kind', (res, req) => {
  /* Parameters */
  res.end('So you want candy? Have some ' + req.getParameter(0) + '!');
  console.log("getQuery =>", querystring.parse(req.getQuery()));
})

app.get('/*', (res, req) => {
  /* Wildcards - make sure to catch them last */
  res.end('Nothing to see here!');
})

app.listen(8000, (token) => {
  if (token) {
    console.log('Listening to port ' + 8000);
  } else {
    console.log('Failed to listen to port ' + 8000);
  }
});

const ex = express();
ex.get("/candy/:kind", (req, res) => {
  console.log("PARAMS =>", req.params);
  console.log("QUERY =>", req.query);
  res.end("Hello!");
});

ex.get("/location", (req, res) => {
  console.log("location...");
  const resp = res.redirect("/candy/mahcandy")

});

ex.listen(8001, () => console.log("Express listening to port 8001"));