import uWS from "uWebSockets.js";
import http from "http";
import querystring from "querystring";
import { URL } from "url";
import { Socket } from "./Socket";

export class RequestWrapper {
  private _url: string;
  private _path: string;
  private _query: querystring.ParsedUrlQuery;
  private _method: string;
  private _headers: http.IncomingHttpHeaders = {};
  private _params: {[name: string]: string};

  public socket = new Socket(false, true);

  constructor(
    private req: uWS.HttpRequest,
    private res: uWS.HttpResponse,
    private _originalUrl: string,
    private parameterNames: string[]
  ) {
  }

  get ip () {
    return Buffer.from(this.res.getRemoteAddressAsText()).toString();
  }

  get headers (): http.IncomingHttpHeaders {
    if (!this._headers) {
      this.req.forEach((k, v) => {
        console.log({ k, v });
        this._headers[k] = v;
      });
    }
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

  get method(): string {
    if (!this._method) this._method = this.req.getMethod().toUpperCase();
    return this._method;
  }

  get query (): querystring.ParsedUrlQuery {
    if(!this._query) this._query = querystring.parse(this.req.getQuery());
    return this._query;
  }

  get originalUrl () {
    return this.url;
  }

  get url () {
    if (!this._url) {
      this._url = this._originalUrl;

      const query = this.req.getQuery();
      if (query) { this._url += `?${query}`; }
    }

    return this._url;
  }

  get path(): string {
    if (!this._path) {
      const parsedURL = new URL(`http://server${this.url}`);
      this._path = parsedURL.pathname;
    }
    return this._path;
  }

  header(name: string) {
    return this.req.getHeader(name);
  }
}
