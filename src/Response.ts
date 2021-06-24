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

    // this.on('pipe', (stream: stream.Readable) => {
    //   console.log("res.pipe() ...");

    //   stream.on('data', (chunk: Buffer) => {
    //     // this.send(chunk.toString());
    //     console.log("WRITE", chunk.toString());
    //   });

    //   stream.on('end', () => {
    //     console.log('stream.on END');
    //     // this.end();
    //     // this.emit('unpipe');
    //     // this.emit('close');
    //   });

    //   stream.on('error', (err) => {
    //     console.log('stream.on ERROR');
    //     // this.emit('error', err);
    //   });
    // });
  }

  end(chunk?: string, encoding?: BufferEncoding) {
    if (this.finished) { return; }

    let body = chunk;
    if (encoding) { body = Buffer.from(chunk, encoding).toString(); }

    // write status
    if (this.statusCode) {
      const code = this.statusCode;
      const reason = ReasonPhrases[StatusCodes[code]];
      this.res.writeStatus(`${code} ${reason}`);
    }

    // write headers
    this._writeHeaders();

    // dequeue writes
    this._writes.forEach((chunk) => this.res.write(chunk));

    // write response
    this.res.end(body);

    this.socket.writable = false;

    console.log("Response .end!!!");
    this.finished = true;
    this.emit('finish');
    // this.emit('prefinish');

    return this;
  }

  get(name: string) {
    return this._headers[name];
  }

  hasHeader(name: string) {
    return (this._headers[name] !== undefined);
  }

  getHeader(name: string) {
    this.get(name);
  }

  setHeader(name: string, value: string) {
    this.set(name, value);
  }

  removeHeader(name: string) {
    delete this._headers[name];
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

    if (!this._headers['Vary']) {
      this._headers['Vary'] = "";
      append = field;

    } else {
      append = `, ${field}`;
    }

    this._headers['Vary'] += append;
  }

  send(chunk: RecognizedString) {
    this._writes.push(chunk);
    // this.res.write(chunk);
    return this;
  }

  // alias to .send()
  write(chunk: RecognizedString) {
    return this.send(chunk);
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
      // skip content-length
      if (name.toLowerCase() === "content-length") {
        console.log("HEADER", name, value);
        return;
      }

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
      this.res.writeHeader(name, this._headers[name]?.toString());
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