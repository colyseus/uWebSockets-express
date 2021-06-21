# uWebSockets.js + Express

Express API compatibility layer for uWebSockets.js.

- ✅ Request / Response

**Missing features:**

- ❌ Middleware
- ❌ `res.sendFile()`

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