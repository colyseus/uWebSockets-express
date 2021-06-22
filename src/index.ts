import uWS from "uWebSockets.js";
import express from "express";

import { RequestWrapper } from "./Request";
import { ResponseWrapper } from "./Response";

function getUrlParameters (url: string) {
  return (url.match(/:([a-zA-Z\_]+)/gi) || []).map((param) => param.substr(1));
}

function onAbort(url) {
  console.log("ON ABORT!");
  console.warn(url, "request aborted.");
}

export default function (app: uWS.TemplatedApp) {

  const middlewares = [];

  function use() {
  }

  // const expressApp = express();
  // expressApp.get("path", (req, res) => {
  //   res.sendFile
  //   res.setTimeout
  // });
  // expressApp.listen()

  function any(method: "del" | "put" | "get" | "post" | "head" | "any", path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    app[method](path, (res, req) => {
      res.onAborted(onAbort.bind(this, path));

      handler(
        new RequestWrapper(req, res, getUrlParameters(path)), //  as unknown as express.Request
        new ResponseWrapper(res)// as unknown as express.Response
      );
    });
  }

  function get(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("get", path, handler);
  }

  function post(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("post", path, handler);
  }

  function put(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("put", path, handler);
  }

  function del(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("del", path, handler);
  }

  function head(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("head", path, handler);
  }

  let listeningSocket: any = undefined;
  function listen(port?: number, cb?: () => void) {
    // fallback route to mimic express behaviour.
    any("any", "/*", (req, res) => {
      res
        .status(404)
        .end(`Cannot ${req.method.toUpperCase()} ${req.path}`);
    });

    app.listen(port, (listenSocket: any) => {
      listeningSocket = listenSocket;
      cb?.();
    });

    return {
      close() {
        uWS.us_listen_socket_close(listeningSocket);
        listeningSocket = null;
      }
    };
  }

  return {
    raw: app,
    listen,
    use,
    get,
    post,
    put,
    head,
    delete: del,
  };
}
