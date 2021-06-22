# uWebSockets.js + Express

Express API compatibility layer for uWebSockets.js.

- Middleware support
- Response API
  - ✅ res.headersSent
  - ✅ res.end()
  - ✅ res.get()
  - ✅ res.json()
  - ✅ res.jsonp()
  - ✅ res.location()
  - ✅ res.redirect()
  - ✅ res.send()
  - ✅ res.sendStatus()
  - ✅ res.set()
  - ✅ res.status()
  - ✅ res.type()
  - ✅ res.vary()
  - ❌ res.app
  - ❌ res.locals
  - ❌ res.append()
  - ❌ res.attachment()
  - ❌ res.cookie()
  - ❌ res.clearCookie()
  - ❌ res.download()
  - ❌ res.format()
  - ❌ res.links()
  - ❌ res.render()
  - ❌ res.sendFile()
- Request API
  - ✅ req.ip
  - ✅ req.method
  - ✅ req.originalUrl
  - ✅ req.params
  - ✅ req.path
  - ✅ req.query
  - ✅ req.get()
  - ✅ req.param()
  - ❌ req.app
  - ❌ req.baseUrl
  - ❌ req.body
  - ❌ req.cookies
  - ❌ req.fresh
  - ❌ req.hostname
  - ❌ req.ips
  - ❌ req.protocol
  - ❌ req.route
  - ❌ req.secure
  - ❌ req.signedCookies
  - ❌ req.stale
  - ❌ req.subdomains
  - ❌ req.xhr
  - ❌ req.accepts()
  - ❌ req.acceptsCharsets()
  - ❌ req.acceptsEncodings()
  - ❌ req.acceptsLanguages()
  - ❌ req.is()
  - ❌ req.range()

## TODO: Test compatibility with

- https://github.com/expressjs/serve-index
- https://github.com/expressjs/serve-static

## Usage

```typescript
import uWS from "uWebSockets.js"
import expressify from "uwebsockets-express"

const app = uWS.App();
const expressApp = expressify(app);

expressApp.get("/hello", (req, res) => {
  res.json({ hello: "world!" });
});
```

## License

MIT