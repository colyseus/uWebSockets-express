# Changelog

## 2.0.3

- Fix process-wide crash (`ERR_UNHANDLED_ERROR`) when a request body is incomplete or arrives too slowly. The body-read timeout used to emit a bare `'error'` event with no listeners registered, throwing an uncaught exception from a timer — remotely triggerable by advertising a `Content-Length` and withholding the body. Thanks to @pierroo for the detailed report ([#43](https://github.com/colyseus/uWebSockets-express/issues/43))
- `_readBody()` now rejects with a proper `Error` (code: `ERR_REQUEST_BODY_TIMEOUT`) and only emits `'error'` when a listener is registered. Late body chunks arriving after the timeout are ignored.
- Requests whose body read times out are now answered with `408 Request Timeout` instead of crashing or hanging.
- `readBodyMaxTime` is now an **idle** timeout: it resets on every received chunk, so slow-but-progressing uploads are no longer rejected once the total transfer time exceeds the limit.
- Remove stray `console.log` on aborted requests.
