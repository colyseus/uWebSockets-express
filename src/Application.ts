import uWS from "uWebSockets.js";
import EventEmitter from "events";
import express, { NextFunction, Router, application } from "express";

import { IncomingMessage } from "./IncomingMessage.js";
import { ServerResponse } from "./ServerResponse.js";
import { mixin } from "./utils.js";

function onAbort(req: IncomingMessage, res: ServerResponse) {
  console.log("onAbort...");
  req.socket.readable = false;
  res.finished = true;
  res.aborted = true;
}

export type RenderCallback = (e: any, rendered?: string) => void;

export type ApplicationOptions = { readBodyMaxTime?: number }
export class Application extends EventEmitter implements express.Application {

  protected listeningSocket: any = undefined;

  protected request = express.request;
  protected response = express.response;

  protected router: Router;

  constructor(protected uWSApp: uWS.TemplatedApp, public opts?: ApplicationOptions) {
    super();

    mixin(this, application);

    // perform original express initialization
    application.init.apply(this, arguments);

    // Alias app.delete() = app.del()
    uWSApp['delete'] = uWSApp['del'];

    this.init();
  }

  protected init() {
    this.uWSApp.any("/*", async (uwsResponse, uwsRequest) => {
      const url = uwsRequest.getUrl();

      const req = new IncomingMessage(uwsRequest, uwsResponse, [], this);
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

  // public engine(ext: string, fn: EngineCallback) {
  //   application.engine.apply(this, arguments);
  // }

  // public set(setting, val) {
  //   return application.set.apply(this, arguments);
  // }

  // public enable(setting: string) {
  //   return application.enable.call(this, setting);
  // }

  // public enabled(setting: string) {
  //   return application.enabled.call(this, setting);
  // }

  // public render(name: string, options: any, callback: RenderCallback) {
  //   return application.render.apply(this, arguments);
  // }

  // public use(handler: RequestHandler)
  // public use(path: string, handler: RequestHandler)
  // public use(path: string, router: express.Router)
  // public use(path: string, ...handlers: Array<express.Router | RequestHandler>)
  // public use(path: string, any: any)
  // public use(any: any)
  // public use(pathOrHandler: string | RequestHandler, ...handlersOrRouters: Array<RequestHandler | express.Router>) {
  //   express.application.use.apply(this, arguments);
  //   return this;
  // }

  // public get(path: string, ...handlers: RequestHandler[]) {
  //   return express.application.get.apply(this, arguments);
  // }

  // public post(path: string, ...handlers: RequestHandler[]) {
  //   express.application.post.apply(this, arguments);
  //   return this;
  // }

  // public patch(path: string, ...handlers: RequestHandler[]) {
  //   express.application.patch.apply(this, arguments);
  //   return this;
  // }

  // public options(path: string, ...handlers: RequestHandler[]) {
  //   express.application.options.apply(this, arguments);
  //   return this;
  // }

  // public put(path: string, ...handlers: RequestHandler[]) {
  //   express.application.put.apply(this, arguments);
  //   return this;
  // }

  // /**
  //  * @deprecated
  //  */
  // public del(path: string, ...handlers: RequestHandler[]) {
  //   return this.delete.apply(this, arguments);
  // }

  // public delete(path: string, ...handlers: RequestHandler[]) {
  //   express.application.delete.apply(this, arguments);
  //   return this;
  // }

  // public head(path: string, ...handlers: RequestHandler[]) {
  //   express.application.head.apply(this, arguments);
  //   return this;
  // }

  // public all(path: string, ...handlers: RequestHandler[]) {
  //   express.application.all.apply(this, arguments);
  //   return this;
  // }

  // @ts-ignore
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

}

