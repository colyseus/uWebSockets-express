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
  public complete: boolean = false;

  // private _url: string;
  // private _path: string;
  private _baseUrl: string = "";
  private _rawquery: string;
  private _query: querystring.ParsedUrlQuery;
  private _params: {[name: string]: string};
  private _remoteAddress: ArrayBuffer;
  private _readableState: any = { pipes: [], endEmitted: false, readable: true };
  private _readBodyMaxTime = 500;
  private _rawbody?: Buffer;
  private _dataEventRegistered = false;

  public aborted: boolean;

  // @ts-ignore
  public socket = new Socket(true, true);

  #_originalUrlParsed: URL;
  private parameterNames: string[] = [];

  constructor(
    private req: uWS.HttpRequest,
    private res: uWS.HttpResponse,
    private app: Application,
    initialData?: {
      headers?: http.IncomingHttpHeaders;
      url?: string;
      method?: string;
      body?: any;
      query?: string;
      remoteAddress?: ArrayBuffer;
    }
  ) {
    super();

    this.headers = initialData?.headers || {};

    if (!initialData?.headers) {
      this.req.forEach((key, value) => this.headers[key] = value);
    }

    this.url = initialData?.url || this.req.getUrl();
    this.method = (initialData?.method || this.req.getMethod()).toUpperCase();

    this._rawquery = initialData?.query || this.req.getQuery();
    this._remoteAddress = initialData?.remoteAddress || this.res.getRemoteAddressAsText();

    // workaround: also consider 'referrer'
    if (this.headers['referer']) {
      this.headers['referrer'] = this.headers['referer'];
    }

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

    // Define 'on' as an own property to prevent Express from shadowing it.
    // Express's app.handle() calls Object.setPrototypeOf(req, this.request),
    // which would otherwise bypass our custom 'on' method defined on the prototype.
    Object.defineProperty(this, 'on', {
      value: (event: string | symbol, listener: (...args: any[]) => void) => {
        if (this._rawbody !== undefined) {
          /**
           * req.body is read synchronously before any middleware runs.
           * Here we mimic triggering 'data' + 'end' + 'close' right when the event is registered.
           *
           * Note: When body-parser rejects due to content-length exceeding limit,
           * it may only register 'end' listener (without 'data'), so we need to handle both cases.
           */
          if (event === 'data') {
            // Mark that 'data' was registered - this tells 'end' handler not to trigger separately
            this._dataEventRegistered = true;
            setImmediate(() => {
              listener(this._rawbody);
              this.emit('end');
              this.emit('close');
              // Mark request as finished AFTER emitting events, so body-parser can read first
              this.complete = true;
              this._readableState.endEmitted = true;
            });
          } else if (event === 'end') {
            // Register the 'end' listener normally so it can be called by emit('end')
            EventEmitter.prototype.on.call(this, event, listener);
            // After a tick, check if 'data' was registered
            // If not (e.g., body-parser rejecting due to size limit), we need to trigger 'end' manually
            // Only do this if there's actual body content - if body is empty (Content-Length: 0),
            // raw-body returns early without registering listeners, so we shouldn't emit either
            setImmediate(() => {
              if (!this._dataEventRegistered && this._rawbody && this._rawbody.length > 0) {
                this.emit('end');
                this.emit('close');
                // Mark request as finished AFTER emitting events
                this.complete = true;
                this._readableState.endEmitted = true;
              }
            });
          } else {
            EventEmitter.prototype.on.call(this, event, listener);
          }
        } else {
          EventEmitter.prototype.on.call(this, event, listener);
        }
        return this;
      },
      writable: true,
      enumerable: false,
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
    if (this._rawbody !== undefined) {
      /**
       * req.body is read synchronously before any middleware runs.
       * Here we mimic triggering 'data' + 'end' + 'close' right when the event is registered.
       *
       * Note: When body-parser rejects due to content-length exceeding limit,
       * it may only register 'end' listener (without 'data'), so we need to handle both cases.
       */
      if (event === 'data') {
        // Mark that 'data' was registered - this tells 'end' handler not to trigger separately
        this._dataEventRegistered = true;
        setImmediate(() => {
          listener(this._rawbody);
          this.emit('end');
          this.emit('close');
          // Mark request as finished AFTER emitting events, so body-parser can read first
          this.complete = true;
          this._readableState.endEmitted = true;
        });
      } else if (event === 'end') {
        // Register the 'end' listener normally so it can be called by emit('end')
        super.on(event, listener);
        // After a tick, check if 'data' was registered
        // If not (e.g., body-parser rejecting due to size limit), we need to trigger 'end' manually
        // Only do this if there's actual body content - if body is empty (Content-Length: 0),
        // raw-body returns early without registering listeners, so we shouldn't emit either
        setImmediate(() => {
          if (!this._dataEventRegistered && this._rawbody && this._rawbody.length > 0) {
            this.emit('end');
            this.emit('close');
            // Mark request as finished AFTER emitting events
            this.complete = true;
            this._readableState.endEmitted = true;
          }
        });
      } else {
        super.on(event, listener);
      }
    } else {
      super.on(event, listener);
    }
    return this;
  }

  public _readBody () {
    return new Promise<boolean>((resolve, reject) => {
      let body: Buffer;
      let settled = false;

      //
      // ensure request is not halted when an invalid content-length is sent by the client
      // https://github.com/endel/uWebSockets-express/issues/9
      //
      const rejectionTimeout = setTimeout(() => {
        settled = true;

        const error = Object.assign(
          new Error(`request body timed out after ${this._readBodyMaxTime}ms of inactivity`),
          { code: "ERR_REQUEST_BODY_TIMEOUT" },
        );

        // bare emit('error') without a listener throws process-wide (see issue #43)
        if (this.listenerCount('error') > 0) {
          this.emit('error', error);
        }

        reject(error);
      }, this._readBodyMaxTime);

      this.res.onData((arrayBuffer, isLast) => {
        if (settled) { return; } // late chunk after timeout

        // idle timeout: slow but progressing uploads stay alive
        rejectionTimeout.refresh();

        this.emit('data', new Uint8Array(arrayBuffer));

        const chunk = Buffer.from(arrayBuffer);
        body = (body && body.length !== 0) ? Buffer.concat([body, chunk]) : Buffer.concat([chunk]);

        if (isLast) {
          settled = true;
          clearTimeout(rejectionTimeout);
          this._rawbody = body;
          this.body = body.toString('utf8');
          this.emit('end');

          // For empty bodies (GET, HEAD, etc.), mark as finished immediately
          // since no middleware will try to read them
          if (body.length === 0) {
            this.complete = true;
            this._readableState.endEmitted = true;
          }

          resolve(body.length > 0);
        }
      });

    })
  }

}
