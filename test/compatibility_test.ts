import uWS from "uWebSockets.js";
import path from "path";
import express from "express";
import assert from "assert";
import cors from "cors";
import expressify from "../src";
import { StatusCodes } from "http-status-codes";
import http from "axios";
import rawHttp from 'http';
import url from 'url';

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

    it("append()", async () => {
      app.get("/append", (req, res) => {
        res.append("my-cookie", "hello");
        res.append("my-cookie", "world");
        res.end();
      });

      const response = (await http.get(`${URL}/append`)).headers;
      assert.strictEqual("hello, world", response['my-cookie']);
    })

  });

  describe("request", () => {
    it("app.head()", async () => {
      app.head("/params/:one/:two", (req, res) => {
        res.set("field1", "1");
        res.set("field2", "2");
        res.end();
      });

      const headers = (await http.head(`${URL}/params/one/two`)).headers;
      assert.strictEqual("1", headers.field1);
      assert.strictEqual("2", headers.field2);
    });

    it("params", async () => {
      app.get("/params/:one/:two", (req, res) => {
        res.json({
          one: req.params['one'],
          two: req.params['two'],
        });
      });

      assert.deepStrictEqual({
        one: "one",
        two: "two"
      }, (await http.get(`${URL}/params/one/two`)).data);

      assert.deepStrictEqual({
        one: "another",
        two: "1"
      }, (await http.get(`${URL}/params/another/1`)).data);
    });

    it("query", async () => {
      app.get("/query", (req, res) => {
        res.json(req.query);
      });

      const response = await http.get(`${URL}/query?one=1&two=2&three=3&four=4`);
      assert.deepStrictEqual({
        one: "1",
        two: "2",
        three: "3",
        four: "4"
      }, response.data);
    });

    it("headers", async() => {
      app.get("/headers", (req, res) => {
        res.json(req.headers);
      });

      const response = await http.get(`${URL}/headers`, {headers: {
        one: "1",
        cookie: "mycookie"
      }});

      assert.strictEqual("1", response.data.one);
      assert.strictEqual("mycookie", response.data.cookie);
    });

    it("method / path / url", async () => {
      app.get("/properties", (req, res) => {
        res.json({
          method: req.method,
          path: req.path,
          url: req.url,
        });
      });

      const { data } = (await http.get(`${URL}/properties?something=true`));
      assert.deepStrictEqual({
        method: "GET",
        path: "/properties",
        url: "/properties?something=true",
      }, data);
    });

    it("ip", async () => {
      app.get("/ip", (req, res) => {
        res.json({ ip: req.ip });
      });

      const { data } = (await http.get(`${URL}/ip`));
      assert.strictEqual(39, data.ip.length);
    });

    it("parse small request body", async () => {
      app.post("/small_body", (req, res) => res.end(req.body));

      const { data } = (await http.post(`${URL}/small_body`, "small body"));
      assert.strictEqual("small body", data);
    })

    it("parse large request body", async () => {
      app.post("/large_body", (req, res) => res.end(req.body));

      let largeBody: string = "";
      for (let i = 0; i < 100; i++) {
        largeBody += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(),./;'[]<>?:{}-=_+\"`~";
      }

      const { data } = (await http.post(`${URL}/large_body`, largeBody));
      assert.strictEqual(largeBody, data);
    })
  });

  describe("express.Router compatibility", () => {
    it("should rebuild routes with proper methods", async () => {
      const routes = express.Router();
      routes.get("/one/:param1", (req, res) => res.json({ one: req.params.param1 }));
      routes.post("/two", (req, res) => res.json({ two: "two" }));
      routes.delete("/three", (req, res) => res.json({ three: "three" }));
      routes.put("/four", (req, res) => res.json({ four: "four" }));
      app.use("/routes", routes);

      assert.deepStrictEqual({ one: "param1" }, (await http.get(`${URL}/routes/one/param1`)).data);
      assert.deepStrictEqual({ two: "two" }, (await http.post(`${URL}/routes/two`)).data);
      assert.deepStrictEqual({ three: "three" }, (await http.delete(`${URL}/routes/three`)).data);
      assert.deepStrictEqual({ four: "four" }, (await http.put(`${URL}/routes/four`)).data);
    });

    it("should support nested routes", async () => {
      const root = express.Router();

      const branch1 = express.Router();
      branch1.get("/one", (req, res) => res.json({ one: 1 }));

      const branch2 = express.Router();
      branch2.get("/two", (req, res) => res.json({ two: 2 }));

      const deep = express.Router();
      deep.get("/three", (req, res) => res.json({ deep: true }));
      branch2.use("/deep", deep);

      root.use("/branch1", branch1);
      root.use("/branch2", branch2);

      app.use("/root", root);
      assert.deepStrictEqual({ one: 1 }, (await http.get(`${URL}/root/branch1/one`)).data);
      assert.deepStrictEqual({ two: 2 }, (await http.get(`${URL}/root/branch2/two`)).data);
      assert.deepStrictEqual({ deep: true }, (await http.get(`${URL}/root/branch2/deep/three`)).data);
    });

    it("should attach middleware + handler", async () => {
      const router = express.Router();

      router.get("/with_middleware", (req, res, next) => {
        req['something'] = true;
        next();

      }, (req, res) => {
        res.json({ something: req['something'] });
      })

      app.use("/router", router);

      assert.deepStrictEqual({ something: true }, (await http.get(`${URL}/router/with_middleware`)).data);
    });

    it("should accept Router as last argument for .get()", async () => {
      const router = express.Router();

      router.get("/router", (req, res, next) => {
        req['something'] = true;
        next();

      }, (req, res) => {
        res.json({
          first_middleware: req['first_middleware'],
          something: req['something']
        });
      })

      const middleware = (req, res, next) => {
        req['first_middleware'] = 1;
        next()
      };

      app.use("/router", middleware, router);

      assert.deepStrictEqual({
        first_middleware: 1,
        something: true,
      }, (await http.get(`${URL}/router/router`)).data);
    });

    it("should use middlewares on basePath of router", async () => {
      const router = express.Router();
      router.use(express.static(path.resolve(__dirname, "static")));
      router.get("/api", (req, res) => {
        res.json({ response: true });
      })
      app.use("/router", router);

      assert.deepStrictEqual({ response: true, }, (await http.get(`${URL}/router/api`)).data);
      assert.deepStrictEqual("Hello world", (await http.get(`${URL}/router/index.html`)).data);
    });

    it("urls should always start with /", async () => {
      app.use(express.static(path.resolve(__dirname, "static")));

      const router = express.Router();
      router.get("/", (req, res) => {
        res.json({
          path: req.path,
          url: req.url,
          originalUrl: req.originalUrl,
        });
      })
      app.use("/auth", router);

      assert.deepStrictEqual({
        path: "/",
        url: "/?token=xxx",
        originalUrl: "/auth?token=xxx",
      }, (await http.get(`${URL}/auth?token=xxx`)).data);
    });

  });

  describe("Middlewares", () => {
    it("should support router-level middleware", async () => {
      const root = express.Router();

      root.use(function (req, res, next) {
        res.set("catch-all", "all");
        next();
      });
      root.get("/hello", (req, res) => res.end("hello"));

      app.use("/root", root);

      const response = await http.get(`${URL}/root/hello`);
      assert.strictEqual("hello", response.data);
      assert.strictEqual("all", response.headers['catch-all']);
    });

    it("should run at every request", async () => {
      app.use((req, res, next) => {
        res.set("header1", "one");
        next();
      });

      app.use((req, res, next) => {
        res.set("header2", "two");
        next();
      });

      app.get("/hey", (req, res) => res.end("done"));

      const response = await http.get(`${URL}/hey`);
      assert.strictEqual("done", response.data);
      assert.strictEqual("one", response.headers['header1']);
      assert.strictEqual("two", response.headers['header2']);
    });

    it("should support middlewares at specific segments", async () => {
      app.use((req, res, next) => {
        res.set("catch-all", "all");
        next();
      });

      app.use("/users/:id", (req, res, next) => {
        res.set("token", req.params['id']);
        next();
      });

      app.use("/teams", (req, res, next) => {
        res.set("team", "team");
        next();
      });

      app.get("/users/:id", (req, res) => res.json({ user: req.params.id }));

      const response = await http.get(`${URL}/users/10`);
      assert.deepStrictEqual({ user: "10" }, response.data);
      assert.strictEqual("all", response.headers['catch-all']);
      assert.strictEqual("10", response.headers['token']);
      assert.strictEqual(undefined, response.headers['team']);
    });

    it("should support cors()", async () => {
      app.use(cors());

      app.get("/cors", (req, res) => {
        res.json(req.body);
      });

      const response = await http.options(`${URL}/cors`);
      assert.strictEqual('*', response.headers['access-control-allow-origin']);
    })

    it("should support express.json()", async () => {
      app.use(express.json());
      app.post("/json", (req, res) => res.json(req.body));

      const response = await http.post(`${URL}/json`, { hello: "world" });
      assert.deepStrictEqual({ hello: "world" }, response.data);
    })

    it("should read body as plain text", async () => {
      app.post("/json", (req, res) => res.json(req.body));

      const response = await http.post(`${URL}/json`, { hello: "world" });
      assert.deepStrictEqual('{"hello":"world"}', response.data);
    })

    it("should support urlencoded()", async () => {
      app.use(express.urlencoded());
      app.post("/post_urlencoded", (req, res) => {
        res.json(req.body);
      });

      const response = await http.post(`${URL}/post_urlencoded`, "hello=world&foo=bar", {
        headers: {
          "Content-Type": 'application/x-www-form-urlencoded',
        }
      });

      assert.deepStrictEqual({
        hello: "world",
        foo: "bar",
      }, response.data);
    })

    it("should support json + urlencoded", async () => {
      app.use(express.json());
      app.use(express.urlencoded({ extended: true, limit: "10kb" }));
      app.post("/json_urlencoded", (req, res) => {
        res.json(req.body);
      });

      const response = await http.post(`${URL}/json_urlencoded`, { hello: "world" });

      assert.deepStrictEqual({
        hello: "world",
      }, response.data);
    });

    it("should support attaching middleware + route ", async () => {
      app.use(express.json());

      app.get("/one", (req, res, next) => {
        req['something'] = true;
        next();

      }, (req, res) => {
        // @ts-ignore
        res.json({ something: req['something'] });
      });

      const response = await http.get(`${URL}/one`);

      assert.deepStrictEqual({
        something: true,
      }, response.data);

    })

  });

  describe("Edge cases", () => {

    it("should not error when content-length is 0, but body is present", (done) => {
      app.use(express.json());
      app.post("/content_length", (req, res) => res.json({ success: true }));

      const opts = url.parse(`${URL}/content_length`)
      const data = { "email": "mymail@gmail.com", "password": "test" };

      // @ts-ignore
      opts.method = "POST";
      // @ts-ignore
      opts.headers = {};
      // @ts-ignore
      opts.headers['Content-Type'] = 'application/json';

      rawHttp.request(opts, function (res) {
        res.on("data", (chunk) => {
          assert.strictEqual('{"success":true}', chunk.toString());
          done();
        });
        res.read();
      }).end(JSON.stringify(data));
    });

  });

});