import uWS from "uWebSockets.js";
import http from "http";
import querystring from "querystring";
import { URL } from "url";

export class RequestWrapper {
  private _url: string;
  private _path: string;
  private _query: querystring.ParsedUrlQuery;
  private _method: string;
  private _headers: http.IncomingHttpHeaders;
  private _params: {[name: string]: string};

  constructor(
    private req: uWS.HttpRequest,
    private parameterNames: string[]
  ) {
  }

  get headers (): http.IncomingHttpHeaders {
    if (!this._headers) this.req.forEach((k, v) => this._headers[k] = v);
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
    if (!this._method) this._method = this.req.getMethod();
    return this._method;
  }

  get query (): querystring.ParsedUrlQuery {
    if(!this._query) this._query = querystring.parse(this.req.getQuery());
    return this._query;
  }

  get url () {
    if (!this._url) this._url = this.req.getUrl();
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
