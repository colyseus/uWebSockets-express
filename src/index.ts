import uWS from "uWebSockets.js";
import { Application, ApplicationOptions } from "./Application.js";

export default function (
  app: uWS.TemplatedApp,
  options?: ApplicationOptions
): Express.Application {
  return new Application(app, options);
}

export { Application };
export { IncomingMessage } from "./IncomingMessage.js";
export { ServerResponse } from "./ServerResponse.js";
export { Socket } from "./Socket.js";
