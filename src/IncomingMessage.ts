import uWS from "uWebSockets.js";
import http from "http";
import querystring from "querystring";
import EventEmitter from "events";
import { URL } from "url";
import { request } from "express";
import { Socket } from "./Socket.js";
import { Application } from "./Application.js";

export class IncomingMessage extends EventEmitter implements http.IncomingMessage {
  public url: string;
  public originalUrl: string; // used by express router
  public method: string;

  // public query: querystring.ParsedUrlQuery;
  public headers: http.IncomingHttpHeaders = {};
  public body: any;
  public finished: boolean = false;

  // private _url: string;
  // private _path: string;
  private _baseUrl: string = "";
  private _rawquery: string;
  private _query: querystring.ParsedUrlQuery;
  private _params: {[name: string]: string};
  private _remoteAddress: ArrayBuffer;
  private _readableState = { pipes: [] };
  private _readBodyMaxTime = 500;
  private _rawbody?: Buffer;

  public aborted: boolean;

  // @ts-ignore
  public socket = new Socket(false, true);

  #_originalUrlParsed: URL;

  constructor(
    private req: uWS.HttpRequest,
    private res: uWS.HttpResponse,
    private parameterNames: string[],
    private app: Application
  ) {
    super();

    this.req.forEach((key, value) => {
      this.headers[key] = value;

      // workaround: also consider 'referrer'
      if (key === "referer") { this.headers['referrer'] = value; }
    });

    this.url = this.req.getUrl();
    this.method = this.req.getMethod().toUpperCase();

    this._rawquery = this.req.getQuery();
    this._remoteAddress = this.res.getRemoteAddressAsText();

    if (this._rawquery) {
      this.url += `?${this._rawquery}`;
    }

    this.#_originalUrlParsed = new URL(`http://server${this.url}`);

    if (this.app.opts?.readBodyMaxTime) {
      this._readBodyMaxTime = this.app.opts.readBodyMaxTime;
    }

    // Define getters as own properties to prevent Express from shadowing them
    // This ensures the getters are called even if Express tries to set them as properties

    Object.defineProperty(this, 'ip', {
      get: () => {
        return Buffer.from(this._remoteAddress).toString();
      },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'params', {
      get: (): { [name: string]: string } => {
        if (!this._params) {
          this._params = {};
          for (let i = 0; i < this.parameterNames.length; i++) {
            const paramName = this.parameterNames[i];
            this._params[paramName] = this.req.getParameter(i);
          }
        }
        return this._params;
      },
      set: (value) => {
        this._params = value;
      },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'query', {
      get: (): querystring.ParsedUrlQuery => {
        if(!this._query) this._query = querystring.parse(this._rawquery);
        return this._query;
      },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'baseUrl', {
      get: () => {
        return this._baseUrl;
      },
      set: (baseUrl) => {
        this._baseUrl = baseUrl;
      },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'path', {
      get: (): string => {
        const path = this.#_originalUrlParsed.pathname.replace(this._baseUrl, "");
        return (!path.startsWith("/"))
          ? `/${path}`
          : path;
      },
      enumerable: true,
      configurable: true
    });
  }

  get(name: string) {
    return this.header(name);
  }

  header(name: string) {
    name = name.toLowerCase();
    return this.headers[name] || undefined;
  }

  accepts(...args: any[]): string | false {
    return request.accepts.apply(this, arguments);
  }

  resume() { return this; }

  on(event: string | symbol, listener: (...args: any[]) => void) {
    if (event === 'data' && this._rawbody !== undefined) {
      /**
       * req.body is synchronously before any middleware runs.
       * here we're mimicking to trigger 'data' + 'end' + 'close' right at the moment the event is registered.
       */
      setImmediate(() => {
        listener(this._rawbody);
        this.emit('end');
        this.emit('close');
      });
    } else {
      super.on(event, listener);
    }
    return this;
  }

  public _readBody () {
    return new Promise<boolean>((resolve, reject) => {
      let body: Buffer;

      //
      // ensure request is not halted when an invalid content-length is sent by the client
      // https://github.com/endel/uWebSockets-express/issues/9
      //
      const rejectionTimeout = setTimeout(() => {
        this.emit('error');
        reject();
      }, this._readBodyMaxTime);

      this.res.onData((arrayBuffer, isLast) => {
        this.emit('data', new Uint8Array(arrayBuffer));

        const chunk = Buffer.from(arrayBuffer);
        body = (body && body.length !== 0) ? Buffer.concat([body, chunk]) : Buffer.concat([chunk]);

        if (isLast) {
          clearTimeout(rejectionTimeout);
          this._rawbody = body;
          this.body = body.toString('utf8');
          this.emit('end');
          resolve(body.length > 0);
        }
      });

    })
  }

}
