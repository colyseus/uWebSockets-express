# uWebSockets.js + Express

Express API compatibility layer for uWebSockets.js.

- ✅ Middlewares
- Response API
  - ❌ res.app
  - ✅ res.headersSent
  - ❌ res.locals
  - ❌ res.append()
  - ❌ res.attachment()
  - ❌ res.cookie()
  - ❌ res.clearCookie()
  - ❌ res.download()
  - ✅ res.end()
  - ❌ res.format()
  - ✅ res.get()
  - ✅ res.json()
  - ✅ res.jsonp()
  - ❌ res.links()
  - ✅ res.location()
  - ✅ res.redirect()
  - ❌ res.render()
  - ✅ res.send()
  - ❌ res.sendFile()
  - ✅ res.sendStatus()
  - ✅ res.set()
  - ✅ res.status()
  - ✅ res.type()
  - ✅ res.vary()

- Request API
  - ❌ req.app
  - ❌ req.baseUrl
  - ❌ req.body
  - ❌ req.cookies
  - ❌ req.fresh
  - ❌ req.hostname
  - ✅ req.ip
  - ❌ req.ips
  - ✅ req.method
  - ✅ req.originalUrl
  - ❌ req.params
  - ✅ req.path
  - ❌ req.protocol
  - ✅ req.query
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
  - ✅ req.get()
  - ❌ req.is()
  - ✅ req.param()
  - ❌ req.range()


## TODO: Test compatibility with

- https://github.com/expressjs/serve-index
- https://github.com/expressjs/serve-static

## Usage

```typescript
import uWS from "uWebSockets.js"
import expressWrapper from "uwebsockets-express"

const app = uWS.App();
const expressApp = expressWrapper(app);

expressApp.get("/hello", (req, res) => {
  res.json({ hello: "world!" });
});
```

## License

MIT