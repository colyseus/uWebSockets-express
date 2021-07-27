import uWS from "uWebSockets.js";
import http from "http";
import querystring from "querystring";
import EventEmitter from "events";
import { URL } from "url";
import { Socket } from "./Socket";

export class RequestWrapper extends EventEmitter {
  // private _url: string;
  // private _path: string;
  private _baseUrl: string = "";
  private _rawquery: string;
  private _query: querystring.ParsedUrlQuery;
  private _method: string;
  private _headers: http.IncomingHttpHeaders = {};
  private _params: {[name: string]: string};
  private _bodydata: any;
  private _rawbody: any;

  public socket = new Socket(false, true);

  #_originalUrlParsed: URL;

  constructor(
    private req: uWS.HttpRequest,
    private res: uWS.HttpResponse,
    private _originalUrl: string,
    private parameterNames: string[],
  ) {
    super();

    this._headers = {};
    this.req.forEach((k, v) => { this._headers[k] = v; });

    this._method = this.req.getMethod().toUpperCase();
    this._rawquery = this.req.getQuery();

    // ensure originalUrl has at least "/".
    if (!this._originalUrl) { this._originalUrl = "/"; }

    this.#_originalUrlParsed = new URL(`http://server${this._originalUrl}`);

    if (this._rawquery) {
      this._originalUrl += `?${this._rawquery}`;
    }
  }

  get ip () {
    return Buffer.from(this.res.getRemoteAddressAsText()).toString();
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

  get method(): string { return this._method; }

  get query (): querystring.ParsedUrlQuery {
    if(!this._query) this._query = querystring.parse(this._rawquery);
    return this._query;
  }

  get baseUrl() {
    return this._baseUrl;
  }

  set baseUrl(url) {
    this._baseUrl = url;
  }

  get originalUrl () {
    return this._originalUrl;
  }

  get url () {
    const url = this._originalUrl.replace(this._baseUrl, "");
    return (!url.startsWith("/"))
      ? `/${url}`
      : url;
  }

  get path(): string {
    const path = this.#_originalUrlParsed.pathname.replace(this._baseUrl, "");
    return (!path.startsWith("/"))
      ? `/${path}`
      : path;
  }

  header(name: string) {
    return this.req.getHeader(name);
  }

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

      this.res.onData((arrayBuffer, isLast) => {
        const chunk = Buffer.from(arrayBuffer);
        body = body && body.length !== 0 ? Buffer.concat([body, chunk]) : chunk;

        if (isLast) {
          this._rawbody = body.toString();
          resolve(this._rawbody !== "");
        }
      });
    })
  }

}
