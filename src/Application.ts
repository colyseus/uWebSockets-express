import uWS from "uWebSockets.js";
import EventEmitter from "events";
import express, { NextFunction, application } from "express";

// import pathToRegexp from "path-to-regexp";

import { IncomingMessage } from "./IncomingMessage";
import { ServerResponse } from "./ServerResponse";

function getUrlParameters (url: string) {
  return (url.match(/:([a-zA-Z0-9\_]+)/gi) || []).map((param) => param.substr(1));
}

function onAbort(req: IncomingMessage, res: ServerResponse) {
  req.socket.readable = false;
  res.socket.writable = false;
  res.aborted = true;
}

type RequestHandler = (req: IncomingMessage, res: ServerResponse, next?: NextFunction) => void;
type MiddlewareList = Array<{ regexp?: RegExp, handler: RequestHandler }>;

export type RenderCallback = (e: any, rendered?: string) => void;
type EngineCallback = (path: string, options: object, callback: RenderCallback) => void;

// const rootRegexpPath = pathToRegexp("/", [], { end: false, strict: false });

export class Application extends EventEmitter {
  // middlewares: MiddlewareList = [];

  // engines: {[ext: string]: EngineCallback} = {};
  // settings: {[setting: string]: any} = {};
  // cache: {[id: string]: any} = {};

  protected listeningSocket: any = undefined;

  protected request = express.request;
  protected response = express.response;

  constructor(protected uWSApp: uWS.TemplatedApp) {
    super();

    // Alias app.delete() = app.del()
    uWSApp['delete'] = uWSApp['del'];

    this.init();
  }

  protected init() {
    // perform original express initialization
    application.init.apply(this, arguments);

    this.uWSApp.any("/*", async (uwsResponse, uwsRequest) => {
      const url = uwsRequest.getUrl();

      const req = new IncomingMessage(uwsRequest, uwsResponse, [], this);
      const res = new ServerResponse(uwsResponse, req);

      uwsResponse.onAborted(onAbort.bind(this, req, res));
      // read body data!
      if (req.headers['content-length']) {
        try {
          await req['readBody']();
        } catch (e) {
          console.warn("uWebSockets-express: failed reading request body at", url);
        }
      }

      this.handle(req, res);
    });

    // this.uWSApp[method](path, async (res, req) => {
    //   const url = req.getUrl();
    //   const request = new RequestWrapper(req, res, url, getUrlParameters(path), this);
    //   const response = new ServerResponse(res, request);

    //   console.log({ url, method });

    //   res.onAborted(onAbort.bind(this, request, response));

    //   // read body data!
    //   if (request.headers['content-length']) {
    //     try {
    //       await request['readBody']();
    //     } catch (e) {
    //       console.warn("uWebSockets-express: failed reading request body at", url);
    //     }
    //   }

    //   let currentHandler: number = 0;

    //   const handlers = [...this.middlewares];

    //   // handler may not have been provided (root middleware request)
    //   if (handler) {
    //     handlers.push({ handler });
    //   }

    //   const next = () => {
    //     // skip if aborted.
    //     if (response.aborted || response.finished) { return; }

    //     const handler = handlers[currentHandler++];
    //     console.log("NEXT!", handler, handler?.handler.toString());

    //     // skip if reached the end.
    //     // force to end the response.
    //     if (!handler) {
    //       response.end();
    //       return;
    //     }

    //     if (handler.regexp) {
    //       if (handler.regexp.exec(url)) {
    //         console.log("execute!");
    //         handler.handler(request, response, next);

    //       } else {
    //         console.log("skip; next!");
    //         next();
    //       }

    //     } else {
    //       console.log("execute!");
    //       handler.handler(request, response, next);
    //     }
    //   }

    //   console.log("next!");
    //   next();
    // });

  }

  protected handle(req, res, callback?) {
    (express.application as any).handle.call(this, req, res, callback);
  }

  protected lazyrouter() {
    (express.application as any).lazyrouter.apply(this, arguments);
  }

  public engine(ext: string, fn: EngineCallback) {
    application.engine.apply(this, arguments);
  }

  public set(setting, val) {
    application.set.apply(this, arguments);
    return this;
  }

  public enable(setting: string) {
    return application.enable.call(this, setting);
  }

  public enabled(setting: string) {
    return application.enabled.call(this, setting);
  }

  public render(name: string, options: any, callback: RenderCallback) {
    return application.render.apply(this, arguments);
  }

  public use(handler: RequestHandler)
  public use(path: string, handler: RequestHandler)
  public use(path: string, router: express.Router)
  public use(path: string, ...handlers: Array<express.Router | RequestHandler>)
  public use(path: string, any: any)
  public use(any: any)
  public use(pathOrHandler: string | RequestHandler, ...handlersOrRouters: Array<RequestHandler | express.Router>) {
    express.application.use.apply(this, arguments);
    return this;
  }

  public get(path: string, ...handlers: RequestHandler[]) {
    express.application.get.apply(this, arguments);
    return this;
  }

  public post(path: string, ...handlers: RequestHandler[]) {
    express.application.post.apply(this, arguments);
    return this;
  }

  public patch(path: string, ...handlers: RequestHandler[]) {
    express.application.patch.apply(this, arguments);
    return this;
  }

  public options(path: string, ...handlers: RequestHandler[]) {
    express.application.options.apply(this, arguments);
    return this;
  }

  public put(path: string, ...handlers: RequestHandler[]) {
    express.application.put.apply(this, arguments);
    return this;
  }

  /**
   * @deprecated
   */
  public del(path: string, ...handlers: RequestHandler[]) {
    return this.delete.apply(this, arguments);
  }

  public delete(path: string, ...handlers: RequestHandler[]) {
    express.application.delete.apply(this, arguments);
    return this;
  }

  public head(path: string, ...handlers: RequestHandler[]) {
    express.application.head.apply(this, arguments);
    return this;
  }

  public all(path: string, ...handlers: RequestHandler[]) {
    express.application.all.apply(this, arguments);
    return this;
  }

  public listen(port?: number, cb?: () => void) {
    this.uWSApp.listen(port, (listenSocket: any) => {
      this.listeningSocket = listenSocket;
      cb?.();
    });

    const self = this;
    return {
      close() {
        uWS.us_listen_socket_close(self.listeningSocket);
        self.listeningSocket = null;
      }
    };
  }

  // protected convertExpressRouter (baseUrl: string, router: express.Router) {
  //   const localMiddlewares: MiddlewareList = [];
  //   const routesBound = new Set<RegExp>();

  //   // add route middleware to change `baseUrl` of request
  //   const basePathRegexp = pathToRegexp(baseUrl, [], { end: false, strict: false });
  //   localMiddlewares.push({
  //     regexp: basePathRegexp,
  //     handler: (req, res, next) => {
  //       req.baseUrl = baseUrl;
  //       next();
  //     }
  //   });

  //   router.stack.forEach((layer, i) => {
  //     if (!layer.route) {
  //       if (layer.name === "router") {
  //         // nested route!
  //         let childPath = baseUrl;

  //         const matches = layer.regexp.toString().match(/\/([a-zA-Z_\-0-9]+)\\\//i);
  //         if (matches && matches[1]) {
  //           childPath += `/${matches[1]}`;
  //         }

  //         this.convertExpressRouter(childPath, layer.handle);

  //       } else {
  //         // FIXME:
  //         // layer.regexp may conflict with other registered paths outside this router.
  //         // (resulting in the middleware being called in routes that it shouldn't)

  //         // avoid conflict for "/" path. Use base route regexp instead.
  //         const regexp = (rootRegexpPath.toString() === layer.regexp.toString())
  //           ? basePathRegexp
  //           : layer.regexp

  //         // middleware
  //         localMiddlewares.push({ regexp, handler: layer.handle, });
  //       }

  //     } else {
  //       let path: string = layer.route.path;
  //       const stack = layer.route.stack;
  //       const method = stack[0].method;
  //       // const handle = stack[0].handle;

  //       this.any(method, `${baseUrl}${path}`, ...stack.map((s) => s.handle));

  //       //
  //       // WORKAROUND: bind routes ending with / twice,
  //       // this allows to respond to "/path" AND "/path/"
  //       //
  //       if (path.lastIndexOf("/") === path.length - 1) {
  //         path = path.substr(0, path.length - 1);
  //         this.any(method, `${baseUrl}${path}`, ...stack.map((s) => s.handle));
  //       }

  //       routesBound.add(layer.regexp);
  //     }
  //   });

  //   localMiddlewares.forEach((mid) => {
  //     if (!routesBound.has(mid.regexp)) {
  //       this.any("any", `${baseUrl}/*`);
  //     }
  //   });

  //   this.middlewares.push(...localMiddlewares);
  // }

  // protected bind404fallback() {
  //   // fallback route to mimic express behaviour.
  //   this.any("any", "/*", (req, res) => {
  //     res.status(404).end(`Cannot ${req.method} ${req.path}`);
  //   });
  // }

  protected defaultConfiguration() {
    application.defaultConfiguration.apply(this);
  }

}

