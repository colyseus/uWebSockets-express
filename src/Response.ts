import mime from "mime";
import stream from "stream";
import EventEmitter from "events";
import uWS, { RecognizedString } from "uWebSockets.js";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { Socket } from "./Socket";

export class ResponseWrapper extends EventEmitter {
  private _headers: { [name: string]: string } = {};
  private _writes: any[] = [];

  public statusCode: number = 200;
  public socket = new Socket(true, false);
  public headersSent: boolean = false;
  public finished: boolean = false;

  constructor(private res: uWS.HttpResponse) {
    super();
  }

  end(chunk?: string, encoding?: BufferEncoding) {
    if (this.finished) { return; }

    let body = chunk;
    if (encoding) { body = Buffer.from(chunk, encoding).toString(); }

    // write status + headers
    this.writeHead(this.statusCode || this.statusCode, this._headers);

    // dequeue writes
    this._writes.forEach((chunk) => this.res.write(chunk));

    // write response
    this.res.end(body);

    this.socket.writable = false;

    this.finished = true;
    this.emit('finish');

    return this;
  }

  get(name: string) {
    return this._headers[name.toLowerCase()];
  }

  hasHeader(name: string) {
    return (this._headers[name.toLowerCase()] !== undefined);
  }

  getHeader(name: string) {
    this.get(name);
  }

  setHeader(name: string, value: string) {
    this.set(name, value);
  }

  removeHeader(name: string) {
    delete this._headers[name.toLowerCase()];
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  sendStatus(statusCode: number) {
    this.status(statusCode);
    return this;
  }

  vary (field: string) {
    let append = "";

    if (!this._headers['vary']) {
      this._headers['vary'] = "";
      append = field;

    } else {
      append = `, ${field}`;
    }

    this._headers['vary'] += append;
  }

  send(chunk: RecognizedString) {
    switch (typeof chunk) {
      // string defaulting to html
      case 'string':
        if (!this.get('Content-Type')) {
          this.type('html');
        }
        break;
      case 'boolean':
      case 'number':
      case 'object':
        if (chunk === null) {
          chunk = '';
        } else if (Buffer.isBuffer(chunk)) {
          if (!this.get('Content-Type')) {
            this.type('bin');
          }
        } else {
          return this.json(chunk);
        }
        break;
    }

    return this.end(chunk as string);
  }

  // enqueue to write during .end()
  write(chunk: RecognizedString) {
    this._writes.push(chunk);
    return this;
  }

  type(type: string) {
    this.set('Content-Type', mime.getType(type) || type);
    return this;
  }

  json(body: any) {
    this.type('json').end(JSON.stringify(body));
  }

  jsonp(body: any) {
    this.set('Content-Type', "application/javascript");
    this.end(`callback(${JSON.stringify(body)})`);
  }

  location(path: string) {
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location
    this.set("Location", path);
    return this;
  }

  redirect(path: string)
  redirect(code: number, path: string)
  redirect(codeOrPath: number | string, path?: string) {
    if (arguments.length === 1) {
      path = codeOrPath as string;
      codeOrPath = 302;
    }

    this.
      status(codeOrPath as number).
      location(path).
      end();
  }

  set(name: string | object, value?: string) {
    if (typeof(name) === "string") {
      name = name.toLowerCase();
      if (name !== 'content-length') {
        this._headers[name] = value;
      }

    } else {
      for (let _name in name) {
        _name = _name.toLowerCase();
        if (_name !== 'content-length') {
          this._headers[_name] = name[_name];
        }
      }
    }
    return this;
  }

  // alias to "set"
  header(name: string | object, value?: string) {
    return this.set(name, value);
  }

  writeHead(code: number, headers: { [name: string]: string } = this._headers) {
    if (this.headersSent) {
      console.warn("writeHead: headers were already sent.")
      return;
    }

    // write status
    const reason = ReasonPhrases[StatusCodes[code]];
    this.res.writeStatus(`${code} ${reason}`);

    // write headers
    for (const name in headers) {
      this.res.writeHeader(name, headers[name]?.toString());
    }

    this.headersSent = true;
  }

  // express-session [??]
  private _implicitHeader () {
    const code = StatusCodes.OK;
    const reason = ReasonPhrases[StatusCodes[code]];
    this.res.writeStatus(`${code} ${reason}`);
  }
}