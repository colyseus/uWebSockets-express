import mime from "mime";
import uWS, { RecognizedString } from "uWebSockets.js";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

export class ResponseWrapper {
  private _headers: { [name: string]: string } = {};
  private _status: number = 200;
  private _writes: any[] = [];
  public headersSent: boolean = false;

  constructor(private res: uWS.HttpResponse) {
  }

  end(chunk?: string, encoding?: BufferEncoding) {
    let body = chunk;

    if (encoding) {
      body = Buffer.from(chunk, encoding).toString();
    }

    // write status
    if (this._status) {
      const code = this._status;
      const reason = ReasonPhrases[StatusCodes[code]];
      this.res.writeStatus(`${code} ${reason}`);
    }

    // write headers
    this._writeHeaders();

    // write response
    this.res.end(body);

    return this;
  }

  get(name: string) {
    return this._headers[name];
  }

  hasHeader(name: string) {
    return (this._headers[name] !== undefined);
  }

  removeHeader(name: string) {
    delete this._headers[name];
  }

  status(code: number) {
    this._status = code;
    return this;
  }

  sendStatus(statusCode: number) {
    this.status(statusCode);
    return this;
  }

  vary (field: string) {
    let append = "";

    if (!this._headers['Vary']) {
      this._headers['Vary'] = "";
      append = field;

    } else {
      append = `, ${field}`;
    }

    this._headers['Vary'] += append;
  }

  send(chunk: RecognizedString) {
    this.res.write(chunk);
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
      this._headers[name] = value;

    } else {
      for (const _name in name) {
        this._headers[_name] = name[_name];
      }
    }
    return this;
  }

  // alias to "set"
  header(name: string | object, value?: string) {
    return this.set(name, value);
  }

  private _writeHeaders() {
    for (const name in this._headers) {
      this.res.writeHeader(name, this._headers[name]);
    }
    this.headersSent = true;
  }
}