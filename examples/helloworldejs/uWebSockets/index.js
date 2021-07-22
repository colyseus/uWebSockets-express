const uWS = require("uWebSockets.js");
const expressify = require("uwebsockets-express").default;

const uwsApp = uWS.App();
const app = expressify(uwsApp);

const port = 3000;

//app.set for view engine do not work now
let ejs = require('ejs');

app.get('/', (req, res) => {
  //res.locals do not work now too
  let names = ["Alex", "Smith", "Daniel", "James", "Arno", "Elisa", "Kaile", "Julia", "Jana"]
  ejs.renderFile("./views/index.ejs", {name: names[Math.floor(names.length * Math.random())], age: 15 + Math.floor(Math.random() * 30)}, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result)
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
