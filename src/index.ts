import uWS from "uWebSockets.js";
import { Application } from "./Application";

export default function (app: uWS.TemplatedApp) {
  return new Application(app);
}

export { Application };
export { IncomingMessage } from "./IncomingMessage";
export { ServerResponse } from "./ServerResponse";
export { Socket } from "./Socket";
