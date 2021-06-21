import uWS from "uWebSockets.js";
import assert from "assert";
import express from "express";
import httpie from "httpie";
import expressify from "../src";
import { StatusCodes } from "http-status-codes";

const PORT = 9999;
const URL = `http://localhost:${PORT}`;

describe("uWS Express API Compatibility", () => {
  let app: ReturnType<typeof expressify>;
  let server: ReturnType<ReturnType<typeof expressify>['listen']>;

  beforeEach(async () => {
    app = expressify(uWS.App());

    server = app.listen(PORT, () =>
      console.log(">> app.listen() ..."));
  });

  afterEach(() => {
    server.close();
    console.log(">> server.close() ...");
  });

  // describe("request", () => {
  //   it("params", async () => {
  //     app.get("/route/:one/:two", (req, res) => {
  //       res.end("response...");
  //     });

  //     const response = await httpie.get(`${URL}/route/one/two`);
  //     console.log(response.data);

  //     assert.ok("it's okay");
  //   });

  //   it("query", async () => {
  //     app.get("/route/:one/:two", (req, res) => {
  //       // res.json(req)
  //     });

  //     const response = await httpie.get(`${URL}/route/one/two`);
  //     console.log(response.data);

  //     assert.ok("it's okay");
  //   });
  // });

  describe("response", () => {
    it("respond to fallback route", async () => {
      const response = await httpie.get(`${URL}/not_found`);
      assert.strictEqual(StatusCodes.OK, response.statusCode);
      assert.strictEqual("Cannot GET /not_found", response.data);
    });

    it("status()", async () => {
      app.get("/status", (req, res) => {
        res.status(StatusCodes.CREATED).end();
      });

      const response = await httpie.get(`${URL}/status`);
      assert.strictEqual(StatusCodes.CREATED, response.statusCode);
    });

    it("end()", async () => {
      app.get("/end", (req, res) => {
        res.end("Hello world!");
      });

      const response = await httpie.get(`${URL}/end`);
      assert.strictEqual("Hello world!", response.data);
    });

  });

});