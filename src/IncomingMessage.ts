import uWS from "uWebSockets.js";
import http from "http";
import querystring from "querystring";
import EventEmitter from "events";
import { URL } from "url";
import { Socket } from "./Socket";
import { request } from "express";

const READ_BODY_MAX_TIME = 500;

export class IncomingMessage extends EventEmitter implements http.IncomingMessage {
  public url: string;
  public method: string;

  // public query: querystring.ParsedUrlQuery;

  // private _url: string;
  // private _path: string;
  private _baseUrl: string = "";
  private _rawquery: string;
  private _query: querystring.ParsedUrlQuery;
  private _headers: http.IncomingHttpHeaders = {};
  private _params: {[name: string]: string};
  private _bodydata: any;
  private _rawbody: any;
  private _remoteAddress: ArrayBuffer;
  private _readableState = { pipes: [] };

  public aborted: boolean;

  // @ts-ignore
  public socket = new Socket(false, true);

  #_originalUrlParsed: URL;

  constructor(
    private req: uWS.HttpRequest,
    private res: uWS.HttpResponse,
    private parameterNames: string[],
    private app: any,
  ) {
    super();

    this._headers = {};
    this.req.forEach((key, value) => {
      this._headers[key] = value;

      // workaround: also consider 'referrer'
      if (key === "referer") {
        this._headers['referrer'] = value;
      }
    });

    this.url = this.req.getUrl();
    this.method = this.req.getMethod().toUpperCase();

    this._rawquery = this.req.getQuery();
    this._remoteAddress = this.res.getRemoteAddressAsText();

    if (this._rawquery) {
      this.url += `?${this._rawquery}`;
    }

    this.#_originalUrlParsed = new URL(`http://server${this.url}`);
  }

  get ip () {
    return Buffer.from(this._remoteAddress).toString();
  }

  set body (_body: any) {
    this._bodydata = _body;
  }

  get body () {
    return this._bodydata || this._rawbody;
  }

  get headers (): http.IncomingHttpHeaders {
    return this._headers;
  }

  set params (value) {
    this._params = value;
  }

  get params(): { [name: string]: string } {
    if (!this._params) {
      this._params = {};
      for (let i = 0; i < this.parameterNames.length; i++) {
        const paramName = this.parameterNames[i];
        this._params[paramName] = this.req.getParameter(i);
      }
    }

    return this._params;
  }

  get query (): querystring.ParsedUrlQuery {
    if(!this._query) this._query = querystring.parse(this._rawquery);
    return this._query;
  }

  get baseUrl() {
    return this._baseUrl;
  }

  set baseUrl(baseUrl) {
    this._baseUrl = baseUrl;
  }

  get path(): string {
    const path = this.#_originalUrlParsed.pathname.replace(this._baseUrl, "");
    return (!path.startsWith("/"))
      ? `/${path}`
      : path;
  }

  get(name: string) {
    return this.header(name);
  }

  header(name: string) {
    name = name.toLowerCase();
    return this._headers[name] || this.req.getHeader(name);
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

  protected readBody () {
    return new Promise<boolean>((resolve, reject) => {
      let body: Buffer;

      //
      // ensure request is not halted when an invalid content-length is sent by the client
      // https://github.com/endel/uWebSockets-express/issues/9
      //
      const rejectionTimeout = setTimeout(() => {
        if (body) {
          this._rawbody = body.toString();
          this.headers['content-length'] = String(body.length);
        }
        reject();
      }, READ_BODY_MAX_TIME);

      this.res.onData((arrayBuffer, isLast) => {
        const chunk = Buffer.from(arrayBuffer);
        body = (body && body.length !== 0) ? Buffer.concat([body, chunk]) : chunk;

        if (isLast) {
          clearTimeout(rejectionTimeout);
          this._rawbody = body.toString();
          resolve(this._rawbody !== "");
        }
      });
    })
  }

}
