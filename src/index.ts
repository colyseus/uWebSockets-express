import uWS from "uWebSockets.js";
import express from "express";

import { RequestWrapper } from "./Request";
import { ResponseWrapper } from "./Response";

function getUrlParameters (url: string) {
  return (url.match(/:([a-zA-Z0-9\_]+)/gi) || []).map((param) => param.substr(1));
}

function onAbort(url) {
  console.log("ON ABORT!");
  console.warn(url, "request aborted.");
}

export default function (app: uWS.TemplatedApp) {
  const middlewares = [];

  function use(path: string, middlewareOrRouter: Function | express.Router) {
    if ((middlewareOrRouter as express.Router).stack?.length > 0) {
      convertExpressRouter(path, middlewareOrRouter as express.Router);
    }
  }

  function convertExpressRouter (basePath: string, router: express.Router) {
    // console.log("convertExpressRouter!! basePath =>", basePath);

    router.stack.forEach(layer => {
      if (!layer.route && layer.name === "router") {
        // nested route!
        let childPath = basePath;

        const matches = layer.regexp.toString().match(/\/([a-zA-Z_\-0-9]+)\\\//i);
        if (matches && matches[1]) { childPath += `/${matches[1]}`; }

        convertExpressRouter(childPath, layer.handle);

      } else {
        const path = layer.route.path;
        const method = layer.route.stack[0].method;
        const handle = layer.route.stack[0].handle;

        // console.log("register:", {
        //   fullPath: `${basePath}${path}`,
        //   path,
        //   method,
        //   handle
        // });

        any(method, `${basePath}${path}`, handle);
      }
    });
  }

  // const expressApp = express();
  // expressApp.get("path", (req, res) => {
  //   res.sendFile
  //   res.setTimeout
  // });
  // expressApp.listen()

  /**
   * Alias app.delete() = app.del()
   */
  app['delete'] = app['del'];

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
