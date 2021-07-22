const express = require('express')
const app = express()
const port = 3000

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  let names = ["Alex", "Smith", "Daniel", "James", "Arno", "Elisa", "Kaile", "Julia", "Jana"]

  res.locals.name = names[Math.floor(names.length * Math.random())]
  res.locals.age = 15 + Math.floor(Math.random() * 30)

  res.render("index.ejs", res.locals)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
