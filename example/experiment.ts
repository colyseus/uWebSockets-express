import uWS from "uWebSockets.js";
import express from "express";
import path from "path";
import cors from "cors";
import expressify from "../src/";

const app = expressify(uWS.App());
// const app = express();

const router = express.Router();
router.get("/", (req, res) => res.send("OK"));
router.get("/room", (req, res) => res.send("room"));
router.get("/room/call", (req, res) => res.send("room/call"));

const root = express.Router();
root.use(express.static(path.resolve(__dirname, "static")));
root.use("/api", router);

app.use(cors());
app.use(express.json());

app.get('/metrics', async (req, res) => res.send("/metrics"));
app.get('/metrics/ccu', async (req, res) => res.send("/metrics/ccu"));

/**
 * Bind your custom express routes here:
 */
app.get('/', (req, res) => {
  console.log("Reached '/'.");
  res.send("It's time to kick ass and chew bubblegum!");
});

app.get('/test', (_req, res) => {
  return res.status(401).send();
})

app.use('/colyseus', root);

app.listen(8080);
console.log("Listening on 8080");
