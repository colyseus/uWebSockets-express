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
  res.finished = true;
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

  private _router: any; 

  constructor(protected uWSApp: uWS.TemplatedApp, private readBodyMaxTime: number = 500) {
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

      const req = new IncomingMessage(uwsRequest, uwsResponse, [], this, this.readBodyMaxTime);
      const res = new ServerResponse(uwsResponse, req, this);

      uwsResponse.onAborted(onAbort.bind(undefined, req, res));

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
  }

  protected handle(req, res, callback?) {
    (express.application as any).handle.call(this, req, res, callback);
  }

  protected lazyrouter() {
    // DISCARDED: original lazyrouter auto-initializes "expressInit", which
    // overrides the prototype of request/response, which we can't let happen
    // (express.application as any).lazyrouter.apply(this, arguments);

    if (!this._router) {
      this._router = express.Router({
        caseSensitive: this.enabled('case sensitive routing'),
        strict: this.enabled('strict routing')
      });

      this._router.use(express.query(this.get('query parser fn')));

      const app = this;
      this._router.use(function expressInit(req, res, next) {
        if (app.enabled('x-powered-by')) res.setHeader('X-Powered-By', 'Express');
        req.res = res;
        res.req = req;
        req.next = next;

        // setPrototypeOf(req, app.request)
        // setPrototypeOf(res, app.response)

        res.locals = res.locals || Object.create(null);

        next();
      });
    }

    return ;
  }

  public engine(ext: string, fn: EngineCallback) {
    application.engine.apply(this, arguments);
  }

  public set(setting, val) {
    return application.set.apply(this, arguments);
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
    return express.application.get.apply(this, arguments);
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

  protected defaultConfiguration() {
    application.defaultConfiguration.apply(this);
  }

}

