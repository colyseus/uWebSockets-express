import uWS from "uWebSockets.js";
import fs from "fs";
import express from "express";
import path from "path";
import expressify from "../src";

const PORT = 8080;

const app = expressify(uWS.App());
// const app = express();

function render(path, options, fn) {
  fs.readFile(path, 'utf8', function(err, str){
    if (err) return fn(err);
    str = str.replace('{{title}}', options.title);
    str = str.replace('{{message}}', options.message);
    fn(null, str);
  });
}
app.set('view engine', 'html')
app.engine('html', render);

app.use(express.static(path.join(__dirname, "static")));
app.get("/render", (req, res) => {
  res.locals.title = "ABC";
  res.locals.message = "It works!";
  res.render('view', { title: "Rendering" });
});

app.get("/redirect", (req, res) => {
  console.log("Let's redirect back!");
  res.redirect('back');
});

app.listen(PORT, () => console.log(`Listening at ${PORT}`));
