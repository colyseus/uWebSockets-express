import uWS from "uWebSockets.js";
import EventEmitter from "events";
import express, { NextFunction, Router, application } from "express";

import { IncomingMessage } from "./IncomingMessage.js";
import { ServerResponse } from "./ServerResponse.js";
import { mixin } from "./utils.js";

function onAbort(req: IncomingMessage, res: ServerResponse) {
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
      const req = new IncomingMessage(uwsRequest, uwsResponse, this);
      const res = new ServerResponse(uwsResponse, req, this);

      uwsResponse.onAborted(onAbort.bind(undefined, req, res));

      // read body data first!
      try {
        await req._readBody();
      } catch (e: any) {
        // keep body-read failures request-scoped (see issue #43);
        // res.end() is a no-op if the client already aborted
        res.statusCode = (e?.code === "ERR_REQUEST_BODY_TIMEOUT") ? 408 : 500;
        res.end();
        return;
      }

      // @ts-ignore
      this.handle(req, res);
    });
  }

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

