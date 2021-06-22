import uWS from "uWebSockets.js";
import assert from "assert";
import expressify from "../src";
import { StatusCodes } from "http-status-codes";
import http from "axios";

const PORT = 9999;
const URL = `http://localhost:${PORT}`;

describe("uWS Express API Compatibility", () => {
  let app: ReturnType<typeof expressify>;
  let server: ReturnType<ReturnType<typeof expressify>['listen']>;

  beforeEach(async () => {
    app = expressify(uWS.App());
    server = app.listen(PORT, () => {});
  });

  afterEach(() => {
    server.close();
  });

  // describe("request", () => {
  //   it("params", async () => {
  //     app.get("/route/:one/:two", (req, res) => {
  //       res.end("response...");
  //     });

  //     const response = await http.get(`${URL}/route/one/two`);
  //     console.log(response.data);

  //     assert.ok("it's okay");
  //   });

  //   it("query", async () => {
  //     app.get("/route/:one/:two", (req, res) => {
  //       // res.json(req)
  //     });

  //     const response = await http.get(`${URL}/route/one/two`);
  //     console.log(response.data);

  //     assert.ok("it's okay");
  //   });
  // });

  describe("response", () => {
    it("respond to fallback route", async () => {
      const response = await http.get(`${URL}/not_found`, { validateStatus: null });
      assert.strictEqual(StatusCodes.NOT_FOUND, response.status);
      assert.strictEqual("Cannot GET /not_found", response.data);

      const response2 = await http.post(`${URL}/not_found2`, {}, { validateStatus: null });
      assert.strictEqual(StatusCodes.NOT_FOUND, response2.status);
      assert.strictEqual("Cannot POST /not_found2", response2.data);
    });

    it("status()", async () => {
      app.get("/status", (req, res) => {
        res.status(StatusCodes.CREATED).end();
      });

      const response = await http.get(`${URL}/status`);
      assert.strictEqual(StatusCodes.CREATED, response.status);
    });

    it("end()", async () => {
      app.get("/end", (req, res) => {
        res.end("Hello world!");
      });

      const response = await http.get(`${URL}/end`);
      assert.strictEqual("Hello world!", response.data);
    });

    it("hasHeader() / removeHeader() / set()", async () => {
      app.get("/headers", (req, res) => {
        assert.strictEqual(false, res.hasHeader("something"));

        res.set("something", "yes!");
        assert.strictEqual(true, res.hasHeader("something"));

        res.removeHeader("something");
        res.set("definitely", "yes!");

        res.end();
      });

      const response = await http.get(`${URL}/headers`);
      assert.strictEqual("yes!", response.headers['definitely']);
      assert.strictEqual(undefined, response.headers['something']);
    });

    it("json()", async () => {
      app.get("/json", (req, res) => {
        res.json({ hello: "world" });
      });

      const response = await http.get(`${URL}/json`);
      assert.strictEqual("application/json", response.headers['content-type']);
      assert.deepStrictEqual({ hello: "world" }, response.data);
    });

    it("redirect()", async () => {
      app.get("/redirected", (req, res) => {
        res.end("final");
      });

      app.get("/redirect", (req, res) => {
        res.redirect("/redirected");
      });

      const response = await http.get(`${URL}/redirect`);
      assert.strictEqual("final", response.data);
    });

  });

});