const { json } = require('body-parser')
const express = require('express')
const { default: knex } = require('knex')
const db = require('./knex/db.js')
const app = express()
const port = 3000



app.get('/', (req, res) => {
    // db.select().from('matura').then(data => res.json(data)).then(console.log)
    res.send('Server')
})


app.get('/matura_id', (req, res) => {
    const {godina, sezona, predmet_id, razina} = req.query

    db.select('id').from('matura').where({
        godina: godina,
        sezona: sezona,
        razina: razina,
        predmet_id: predmet_id
    })
        .then(data => res.json(data[0].id))
})

app.get('/predmet/all', (req, res) => {
    
    db.select('id', 'predmet').from('predmet')
        .then(data => res.json(data))
})



app.listen(port, () => {
console.log(`Example app listening on port ${port}`)
})