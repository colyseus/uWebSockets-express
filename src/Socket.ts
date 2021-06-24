import EventEmitter from "events";

export class Socket extends EventEmitter {
  constructor (
    public writable: boolean,
    public readable: boolean,
  ) {
    super();
  }
}