import uWS from "uWebSockets.js";
import express from "express";
import { Application, ApplicationOptions } from "./Application.js";

export default function (
  app: uWS.TemplatedApp,
  options?: ApplicationOptions
): express.Application {
  // expose as express.Application
  return new Application(app, options) as unknown as express.Application;
}

export { Application };
export { IncomingMessage } from "./IncomingMessage.js";
export { ServerResponse } from "./ServerResponse.js";
export { Socket } from "./Socket.js";
