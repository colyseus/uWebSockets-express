import uWS from "uWebSockets.js";
import express from "express";
import assert from "assert";
import net from "net";
import expressify from "../src";

const BASE_PORT = 9700;
let currentPort = BASE_PORT;

const READ_BODY_MAX_TIME = 150;

describe("request body read timeout (issue #43)", () => {
  let app: ReturnType<typeof expressify>;
  let server: ReturnType<ReturnType<typeof expressify>['listen']>;
  let uWSApp: uWS.TemplatedApp;
  let port: number;

  beforeEach(async () => {
    port = currentPort++;

    uWSApp = uWS.App();
    app = expressify(uWSApp, { readBodyMaxTime: READ_BODY_MAX_TIME });

    app.use(express.json());
    app.post("/echo", (req, res) => res.json(req.body));
    app.get("/health", (_req, res) => res.json({ status: "ok" }));

    await new Promise<void>((resolve) => {
      server = app.listen(port, () => resolve());
    });
  });

  afterEach(() => server.close());

  function postHeaders(contentLength: number) {
    return [
      "POST /echo HTTP/1.1",
      `Host: 127.0.0.1:${port}`,
      "Content-Type: application/json",
      `Content-Length: ${contentLength}`,
      "",
      "",
    ].join("\r\n");
  }

  /**
   * Sends a raw (possibly malformed) HTTP request and resolves with everything
   * the server wrote back, shortly after the response stops arriving.
   */
  function rawRequest(writeChunks: (socket: net.Socket) => void, guardTime: number) {
    return new Promise<string>((resolve, reject) => {
      let response = "";
      let settle: NodeJS.Timeout;
      const socket = net.createConnection({ host: "127.0.0.1", port }, () => writeChunks(socket));
      socket.on("data", (chunk) => {
        response += chunk.toString();
        clearTimeout(settle);
        settle = setTimeout(() => socket.destroy(), 50);
      });
      socket.on("close", () => resolve(response));
      socket.on("error", reject);
      setTimeout(() => socket.destroy(), guardTime); // in case no response ever arrives
    });
  }

  it("incomplete body should get 408 and not crash the process", async () => {
    const startedAt = Date.now();
    const response = await rawRequest(
      (socket) => socket.write(postHeaders(100) + '{"partial":'),
      READ_BODY_MAX_TIME * 4,
    );

    assert.ok(response.includes("408 Request Timeout"), `expected 408 response, got: "${response}"`);

    // readBodyMaxTime option is honored: 408 must arrive well before the 500ms default
    assert.ok(Date.now() - startedAt < 450, "408 should be sent after ~150ms");

    // server remains operational
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.deepStrictEqual({ status: "ok" }, await health.json());

    const echo = await fetch(`http://127.0.0.1:${port}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    assert.deepStrictEqual({ hello: "world" }, await echo.json());
  });

  it("slow but progressing body should be read successfully", async () => {
    // each chunk arrives within readBodyMaxTime, but the whole body takes longer
    const body = JSON.stringify({ hello: "world", foo: "bar" });
    const interval = READ_BODY_MAX_TIME / 2;
    const CHUNKS = 4;
    const chunkSize = Math.ceil(body.length / CHUNKS);

    const response = await rawRequest((socket) => {
      socket.write(postHeaders(body.length));
      for (let i = 0; i < CHUNKS; i++) {
        setTimeout(() => socket.write(body.slice(i * chunkSize, (i + 1) * chunkSize)), interval * (i + 1));
      }
    }, READ_BODY_MAX_TIME * 6);

    assert.ok(response.includes("200"), `expected 200 response, got: "${response}"`);
    assert.ok(response.includes('"hello":"world"'), `expected echoed body, got: "${response}"`);
  });
});
