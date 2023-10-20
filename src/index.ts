import uWS from "uWebSockets.js";
import { Application } from "./Application";

export default function (app: uWS.TemplatedApp, readBodyMaxTime?: number) {
  return new Application(app, readBodyMaxTime);
}

export { Application };
export { IncomingMessage } from "./IncomingMessage";
export { ServerResponse } from "./ServerResponse";
export { Socket } from "./Socket";
