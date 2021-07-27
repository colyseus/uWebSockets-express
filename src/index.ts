import uWS from "uWebSockets.js";
import express, { NextFunction } from "express";

import pathToRegexp from "path-to-regexp";

import { RequestWrapper } from "./Request";
import { ResponseWrapper } from "./Response";

function getUrlParameters (url: string) {
  return (url.match(/:([a-zA-Z0-9\_]+)/gi) || []).map((param) => param.substr(1));
}

function onAbort(req: RequestWrapper, res: ResponseWrapper) {
  req.socket.readable = false;
  res.socket.writable = false;
  res.aborted = true;
}

type RequestHandler = (req: RequestWrapper, res: ResponseWrapper, next?: NextFunction) => void;
type MiddlewareList = Array<{ regexp?: RegExp, handler: RequestHandler }>;

const rootRegexpPath = pathToRegexp("/", [], { end: false, strict: false });

export default function (app: uWS.TemplatedApp) {
  const middlewares: MiddlewareList = [];

  function use(handler: RequestHandler)
  function use(path: string, handler: RequestHandler)
  function use(path: string, router: express.Router)
  function use(path: string, ...handlers: Array<express.Router | RequestHandler>)
  function use(path: string, any: any)
  function use(any: any)
  function use(pathOrHandler: string | RequestHandler, ...handlersOrRouters: Array<RequestHandler | express.Router>) {
    [pathOrHandler, ...handlersOrRouters].forEach((handlerOrRouter) => {
      if (typeof (pathOrHandler) === "function") {
        middlewares.push({ handler: pathOrHandler });

      } else if ((handlerOrRouter as express.Router)?.stack?.length > 0) {
        convertExpressRouter(pathOrHandler as string, handlerOrRouter as express.Router);

      } else if (typeof (pathOrHandler) === "string" && typeof (handlerOrRouter) === "function") {
        middlewares.push({
          regexp: pathToRegexp(pathOrHandler, [], { end: false, strict: false }),
          handler: handlerOrRouter as RequestHandler
        });
      }
    })
  }

  function convertExpressRouter (baseUrl: string, router: express.Router) {
    const localMiddlewares: MiddlewareList = [];
    const routesBound = new Set<RegExp>();

    // add route middleware to change `baseUrl` of request
    const basePathRegexp = pathToRegexp(baseUrl, [], { end: false, strict: false });
    localMiddlewares.push({
      regexp: basePathRegexp,
      handler: (req, res, next) => {
        req.baseUrl = baseUrl;
        next();
      }
    });

    router.stack.forEach((layer, i) => {
      if (!layer.route) {
        if (layer.name === "router") {
          // nested route!
          let childPath = baseUrl;

          const matches = layer.regexp.toString().match(/\/([a-zA-Z_\-0-9]+)\\\//i);
          if (matches && matches[1]) {
            childPath += `/${matches[1]}`;
          }

          convertExpressRouter(childPath, layer.handle);

        } else {
          // FIXME:
          // layer.regexp may conflict with other registered paths outside this router.
          // (resulting in the middleware being called in routes that it shouldn't)

          // avoid conflict for "/" path. Use base route regexp instead.
          const regexp = (rootRegexpPath.toString() === layer.regexp.toString())
            ? basePathRegexp
            : layer.regexp

          // middleware
          localMiddlewares.push({ regexp, handler: layer.handle, });
        }

      } else {
        let path: string = layer.route.path;
        const stack = layer.route.stack;
        const method = stack[0].method;
        // const handle = stack[0].handle;

        any(method, `${baseUrl}${path}`, ...stack.map((s) => s.handle));

        //
        // WORKAROUND: bind routes ending with / twice,
        // this allows to respond to "/path" AND "/path/"
        //
        if (path.lastIndexOf("/") === path.length - 1) {
          path = path.substr(0, path.length - 1);
          any(method, `${baseUrl}${path}`, ...stack.map((s) => s.handle));
        }

        routesBound.add(layer.regexp);
      }
    });

    localMiddlewares.forEach((mid) => {
      if (!routesBound.has(mid.regexp)) {
        any("any", `${baseUrl}/*`);
      }
    });

    middlewares.push(...localMiddlewares);
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

  function any(
    method: "del" | "put" | "get" | "post" | "patch" | "options" | "head" | "any",
    path: string,
    ...handlers: RequestHandler[]
  ) {
    // latest handler is the actual route handler
    const numHandlers = handlers.length;
    const handler = handlers[numHandlers - 1];

    // previous handlers are middlewares
    if (numHandlers > 1) {
      for (let i = 0; i < numHandlers - 1; i++) {
        middlewares.push({
          regexp: pathToRegexp(path),
          handler: handlers[i]
        })
      }
    }

    app[method](path, async (res, req) => {
      const url = req.getUrl();
      const request = new RequestWrapper(req, res, url, getUrlParameters(path));
      const response = new ResponseWrapper(res);

      res.onAborted(onAbort.bind(this, request, response));

      // read body data!
      if (request.headers['content-length']) {
        try {
          await request['readBody']();
        } catch (e) {
          console.warn("uWebSockets-express: failed reading request body at", url);
        }
      }

      let currentHandler: number = 0;

      const handlers = [...middlewares];

      // handler may not have been provided (root middleware request)
      if (handler) {
        handlers.push({ handler });
      }

      const next = () => {
        // skip if aborted.
        if (response.aborted) { return; }

        const handler = handlers[currentHandler++];

        // skip if reached the end.
        // force to end the response.
        if (!handler) {
          response.end();
          return;
        }

        if (handler.regexp) {
          if (handler.regexp.exec(url)) {
            handler.handler(request, response, next);

          } else {
            next();
          }

        } else {
          handler.handler(request, response, next);
        }
      }

      next();
    });
  }

  function get(path: string, ...handlers: RequestHandler[]) {
    return any("get", path, ...handlers);
  }

  function post(path: string, ...handlers: RequestHandler[]) {
    return any("post", path, ...handlers);
  }

  function patch(path: string, ...handlers: RequestHandler[]) {
    return any("patch", path, ...handlers);
  }

  function options(path: string, ...handlers: RequestHandler[]) {
    return any("options", path, ...handlers);
  }

  function put(path: string, ...handlers: RequestHandler[]) {
    return any("put", path, ...handlers);
  }

  function del(path: string, ...handlers: RequestHandler[]) {
    return any("del", path, ...handlers);
  }

  function head(path: string, ...handlers: RequestHandler[]) {
    return any("head", path, ...handlers);
  }

  function bind404fallback() {
    // fallback route to mimic express behaviour.
    any("any", "/*", (req, res) => {
      res.status(404).end(`Cannot ${req.method} ${req.path}`);
    });
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
