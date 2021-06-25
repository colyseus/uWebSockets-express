import uWS from "uWebSockets.js";
import express, { NextFunction } from "express";

import pathToRegexp from "path-to-regexp";

import { RequestWrapper } from "./Request";
import { ResponseWrapper } from "./Response";

function getUrlParameters (url: string) {
  return (url.match(/:([a-zA-Z0-9\_]+)/gi) || []).map((param) => param.substr(1));
}

function onAbort(req: RequestWrapper) {
  // req.socket.readable = false;
  console.warn("request aborted:", req.url);
}

type RequestHandler = (req: RequestWrapper, res: ResponseWrapper, next?: NextFunction) => void;

export default function (app: uWS.TemplatedApp) {
  const middlewares: Array<{ regexp?: RegExp, handler: RequestHandler }> = [];

  function use(handler: RequestHandler)
  function use(path: string, handler: RequestHandler)
  function use(path: string, router: express.Router)
  function use(path: string, any: any)
  function use(any: any)
  function use(pathOrHandler: string | RequestHandler, handlerOrRouter?: Function | express.Router) {
    if (typeof (pathOrHandler) === "function") {
      middlewares.push({ handler: pathOrHandler });

    } else if ((handlerOrRouter as express.Router)?.stack?.length > 0) {
      convertExpressRouter(pathOrHandler as string, handlerOrRouter as express.Router);

    } else if (typeof(pathOrHandler) === "string" && typeof(handlerOrRouter) === "function") {
      middlewares.push({
        regexp: pathToRegexp(pathOrHandler, [], { end: false, strict: false }),
        handler: handlerOrRouter as RequestHandler
      });
    }
  }

  function convertExpressRouter (basePath: string, router: express.Router) {
    router.stack.forEach(layer => {
      if (!layer.route) {
        if (layer.name === "router") {
          // nested route!
          let childPath = basePath;

          const matches = layer.regexp.toString().match(/\/([a-zA-Z_\-0-9]+)\\\//i);
          if (matches && matches[1]) { childPath += `/${matches[1]}`; }

          convertExpressRouter(childPath, layer.handle);

        } else {
          // middleware
          middlewares.push({
            regexp: layer.regexp,
            handler: layer.handle,
          });
        }

      } else {
        const path = layer.route.path;
        const method = layer.route.stack[0].method;
        const handle = layer.route.stack[0].handle;
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

  function any(method: "del" | "put" | "get" | "post" | "patch" | "options" | "head" | "any", path: string, handler: RequestHandler) {
    app[method](path, async (res, req) => {
      res.onAborted(onAbort.bind(this, req));

      const url = req.getUrl();
      const request = new RequestWrapper(req, res, url, getUrlParameters(path));
      const response = new ResponseWrapper(res);

      // run middlewares
      for (let i = 0; i < middlewares.length; i++) {
        let next: (err?: any) => void;
        const promise = new Promise<void>((resolve, _) => { next = () => { resolve(); }; });

        const middleware = middlewares[i];

        if (middleware.regexp) {
          if (middleware.regexp.exec(url)) {
            middleware.handler(request, response, next);

          } else {
            continue;
          }

        } else {
          middleware.handler(request, response, next);
        }

        await promise;
      }

      // final request handler.
      handler(request, response);
    });
  }

  function get(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("get", path, handler);
  }

  function post(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("post", path, handler);
  }

  function patch(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("patch", path, handler);
  }

  function options(path: string, handler: (req: RequestWrapper, res: ResponseWrapper) => void) {
    return any("options", path, handler);
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

  function bind404fallback() {
    // fallback route to mimic express behaviour.
    any("any", "/*", (req, res) =>
      res.status(404).end(`Cannot ${req.method} ${req.path}`));
  }

  let listeningSocket: any = undefined;
  function listen(port?: number, cb?: () => void) {
    bind404fallback();

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
    patch,
    options,
    put,
    head,
    delete: del,
    bind404fallback,
  };
}
