import uWS, { RecognizedString } from "uWebSockets.js";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

export class ResponseWrapper {
  private _headers: { [name: string]: string } = {};
  private _status: number = 200;
  private _writes: any[] = [];

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
      console.log(`${code} ${reason}`);
      this.res.writeStatus(`${code} ${reason}`);
    }

    // write headers
    this._writeHeaders();

    // write response
    this.res.end(body);

    return this;
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

  send(chunk: RecognizedString) {
    this.res.write(chunk);
    return this;
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
  }
}