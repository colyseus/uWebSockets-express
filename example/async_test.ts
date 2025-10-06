import uWS from "uWebSockets.js";
import express from "express";
import expressify from "../src";

// import promisified timers
import { setTimeout } from "timers/promises";

const PORT = 8080;
const app = expressify(uWS.App());

app.get('/', async function asyncGet(req, res) {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  await setTimeout(1000);

  res.header("Content-Type", "application/json");
  res.write(JSON.stringify({ hello: "world" }));
  res.end();
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));