import uWS from "uWebSockets.js";
import { Application } from "./Application";

export default function (app: uWS.TemplatedApp) {
  return new Application(app);
}
