import EventEmitter from "events";
import http, { OutgoingMessage } from "http";
import uWS, { RecognizedString } from "uWebSockets.js";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { response } from "express";
import { mixin } from "./utils";

const res = {};

const kOutHeaders = Symbol.for('kOutHeaders')

for (const key of Object.getOwnPropertyNames(response)) {
  if (typeof response[key] === 'function') {
    res[key] = response[key];

  } else {
    res[key] = response[key];
  }
}

export class ServerResponse extends OutgoingMessage {
  public statusCode: number = 200;
  public aborted: boolean;

  protected _headerSent?: boolean;
  protected outputData: any[];
  protected outputSize?: number;

  constructor(
    public res: uWS.HttpResponse,
    public req: any,
    public app: any,
  ) {
    super();

    for (const key in res) {
      this[key] = res[key].bind(this);
    }

    this.write = (data: any) => {
      this.outputData.push({ data, encoding: 'utf-8', callback: () => { } });
      this.outputSize += data.length;
      return true;
    }

    this.end = (chunk?: string, encoding?: BufferEncoding) => {

      if (this.writableEnded) { return; }

      let body = chunk;
      if (encoding) {
        body = Buffer.from(chunk, encoding).toString();
      }

      // write status + headers
      this.writeHead(this.statusCode || this.statusCode, this[kOutHeaders]);

      // write response
      this.res.cork(() => {
        this.outputData.forEach((chunk) => {
          this.res.write(chunk.data);
        });

        this.res.end(body);
      });

      this.finished = true;
      this.emit('finish');

      return this;
    }

    this.setHeader = (name: string, value: string) => {
      let headers = this[kOutHeaders];

      if (!headers) {
        this[kOutHeaders] = headers = { __proto__: null };
      }

      headers[name.toLowerCase()] = value;

      return this;
    }

    // @ts-ignore
    this.writeHead = (code: number, headers: { [name: string]: string | string[] } = this[kOutHeaders]) => {
      // try {
      //   throw new Error("writeHead!!");
      // } catch (error) {
      //   console.log(error.stack);
      // }

      if (this._headerSent) {
        console.warn("writeHead: headers were already sent.")
        return;
      }

      // write status
      this.res.cork(() => {
        this.res.writeStatus(`${code} ${ReasonPhrases[StatusCodes[code]]}`);

        // write headers
        for (const name in headers) {
          if (Array.isArray(headers[name])) {
            for (const headerValue of headers[name]) {
              this.res.writeHeader(name, headerValue?.toString());
            }
          } else {
            this.res.writeHeader(name, headers[name]?.toString());
          }
        }
      });

      this._headerSent = true;
    };

  }

}
