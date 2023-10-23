import uWS from "uWebSockets.js";
import { Application, ApplicationOptions } from "./Application";

export default function (
  app: uWS.TemplatedApp,
  options?: ApplicationOptions
) {
  return new Application(app, options);
}

export { Application };
export { IncomingMessage } from "./IncomingMessage";
export { ServerResponse } from "./ServerResponse";
export { Socket } from "./Socket";
