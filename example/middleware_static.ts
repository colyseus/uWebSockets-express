import path from "path";
import express from "express";
import expressify from "../src";
import uWS from "uWebSockets.js";

const PORT = 8080;

const app = expressify(uWS.App());
app.use('/', express.static(path.join(__dirname, "static")));

app.listen(PORT, () => console.log("Listening on", PORT));