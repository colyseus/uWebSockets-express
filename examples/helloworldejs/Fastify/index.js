const app = require('fastify')()

const port = 3000;

let ejs = require('ejs');

app.get('/', (req, res) => {
  let names = ["Alex", "Smith", "Daniel", "James", "Arno", "Elisa", "Kaile", "Julia", "Jana"]
  ejs.renderFile("./views/index.ejs", {name: names[Math.floor(names.length * Math.random())], age: 15 + Math.floor(Math.random() * 30)}, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.type('text/html').send(result)
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
