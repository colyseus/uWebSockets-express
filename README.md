# uWebSockets.js + Express

Express API compatibility layer for uWebSockets.js.

## Usage

```typescript
import uWS from "uWebSockets.js"
import expressify from "uwebsockets-express"

const uwsApp = uWS.App();
const app = expressify(uwsApp);

// use existing middleware implementations!
app.use(express.json());
app.use('/', serveIndex(path.join(__dirname, ".."), { icons: true, hidden: true }))
app.use('/', express.static(path.join(__dirname, "..")));

// register routes
app.get("/hello", (req, res) => {
  res.json({ hello: "world!" });
});

app.listen(8000);
```

## Compatibility coverage

- ✅ Middleware support
- ✅ Supports existing Express Router instances
- Response API
  - ✅ res.headersSent
  - ✅ res.locals
  - ✅ res.append()
  - ✅ res.clearCookie()
  - ✅ res.cookie()
  - ✅ res.end()
  - ✅ res.get()
  - ✅ res.json()
  - ✅ res.jsonp()
  - ✅ res.location()
  - ✅ res.redirect()
  - ✅ res.render()
  - ✅ res.send()
  - ✅ res.sendFile()
  - ✅ res.sendStatus()
  - ✅ res.set()
  - ✅ res.status()
  - ✅ res.type()
  - ✅ res.vary()
  - ❌ res.app
  - ❌ res.attachment()
  - ❌ res.download()
  - ❌ res.format()
  - ❌ res.links()
- Request API
  - ✅ req.baseUrl
  - ✅ req.body
  - ✅ req.ip
  - ✅ req.method
  - ✅ req.originalUrl
  - ✅ req.params
  - ✅ req.path
  - ✅ req.query
  - ✅ req.accepts()
  - ✅ req.get()
  - ✅ req.param()
  - ❌ req.app
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
  - ❌ req.acceptsCharsets()
  - ❌ req.acceptsEncodings()
  - ❌ req.acceptsLanguages()
  - ❌ req.is()
  - ❌ req.range()
  - ❌ req.pipe()

## Middleware support
- ✅ [express/session](https://github.com/expressjs/session)
- ✅ [express/serve-index](https://github.com/expressjs/serve-index)
- ✅ [express/serve-static](https://github.com/expressjs/serve-static) (`express.static()`)


## Disclaimer

Having an express compatibility layer on top of uWS is going to bring its performance slightly down. This library does not have performance as its only objective.

If you find potential improvements to make it more performant, feel free to send me a pull-request!

## License

MIT
