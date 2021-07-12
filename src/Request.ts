import uWS from "uWebSockets.js";
import http from "http";
import querystring from "querystring";
import EventEmitter from "events";
import { URL } from "url";
import { Socket } from "./Socket";

export class RequestWrapper extends EventEmitter {
  private _url: string;
  private _path: string;
  private _baseUrl: string = "";
  private _rawquery: string;
  private _query: querystring.ParsedUrlQuery;
  private _method: string;
  private _headers: http.IncomingHttpHeaders = {};
  private _params: {[name: string]: string};
  private _rawbody: any;
  private _bodyData: {[name: string]: string};

  public socket = new Socket(false, true);

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

    if (this._rawquery) {
      this._originalUrl += `?${this._rawquery}`;
    }
  }

  get ip () {
    return Buffer.from(this.res.getRemoteAddressAsText()).toString();
  }

  set body (_body: any) {
    this._rawbody = _body;
  }

  get body () {
    return this._rawbody;
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
    return this.url;
  }

  get url () {
    if (!this._url) {
      this._url = this._originalUrl;
      this._url = this._url.replace(this._baseUrl, "");
    }

    return this._url;
  }

  get path(): string {
    if (!this._path) {
      const parsedURL = new URL(`http://server${this._originalUrl}`);
      this._path = parsedURL.pathname.replace(this._baseUrl, "");
    }
    return this._path;
  }

  header(name: string) {
    return this.req.getHeader(name);
  }

  on(event: string | symbol, listener: (...args: any[]) => void) {
    if (event === 'data' && this._rawbody) {
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
        // this.emit('data', arrayBuffer);

        const chunk = Buffer.from(arrayBuffer);
        body = body ? Buffer.concat([body, chunk]) : chunk;

        if (isLast) {
          this._rawbody = body.toString();
          resolve(this._rawbody !== "");

          // this.emit('end');
          // this.emit('close');
        }
      });
    })
  }

}
