const { json } = require('body-parser')
const express = require('express')
const { default: knex } = require('knex')
const db = require('./knex/db.js')
var cors = require('cors')
const app = express()
const port = 3001

app.use(cors())
app.use(json())


const findZadatciWithNadzadatak = (id, zadatci) => { 
    let first = zadatci.findIndex(zadatak => zadatak.nadzadatak_id == id)
    let last = zadatci.length - 1 - zadatci.slice().reverse().findIndex(zadatak => zadatak.nadzadatak_id == id)

    return {first, last}
 }

app.get('/', (req, res) => {
    res.send('Server')
})


app.get('/matura_id', (req, res) => {
    const {godina, sezona, predmet_id, razina} = req.query

    db('matura').where({
        godina: godina,
        sezona: sezona,
        razina: razina,
        predmet_id: predmet_id
    }).select('id')
        .then(data => data.length ? res.json(data[0].id) : res.status(500).json('Error'))
        .catch(err => res.status(500).send("error"))
})

app.get('/predmet/all', (req, res) => {
    
    db.select('id', 'predmet').from('predmet')
        .then(data => {
            if (data.length){
                let newDict = {}

                data.forEach((item, i) =>{
                    newDict[item.predmet] = item.id
                })
                return res.json(newDict)
            }

            res.status(500).json("error")
        })
        .catch(err => res.status(500).send("error"))

})

app.get('/matura/zadatci', async (req, res)=> {
    const {matura_id} = req.query

     let zadatci = await db('zadatak').where({matura_id: matura_id}).orderBy('broj_zadatka').select()
     zadatci.forEach((zadatak, i) => zadatci[i].type = 'zadatak')


     let nadzadatciIds = new Set()
     zadatci.forEach(zadatak => {
        nadzadatciIds.add(zadatak.nadzadatak_id)
     })
     
     let nadzadatci = await db('nadzadatak').whereIn('id', Array.from(nadzadatciIds)).select()
    
    nadzadatci.forEach((_, i) => nadzadatci[i].type = 'nadzadatak')

    let newList = []
    let lastIndex = 0
     nadzadatci.forEach(nadzadatak => {
        let {first, last} = findZadatciWithNadzadatak(parseInt(nadzadatak.id), zadatci)
        newList = newList.concat(zadatci.slice(lastIndex, first))



        let nadzadatakZadatci = nadzadatak
        nadzadatakZadatci.zadatci = zadatci.slice(first, last)
        newList = newList.concat(nadzadatakZadatci)


        lastIndex = last
     })
     newList = newList.concat(zadatci.slice(lastIndex, zadatci.length+1))
    


     res.json(newList)

})

app.put('/zadatak', (req, res) => {
    const {vrsta_id, matura_id, broj_zadatka, zadatak_tekst, slika_path, nadzadatak_id, broj_bodova} = req.body

    db('zadatak').insert({
        vrsta_id: vrsta_id,
        matura_id: matura_id,
        broj_zadatka: broj_zadatka,
        zadatak_tekst: zadatak_tekst,
        slika_path: slika_path,
        nadzadatak_id: nadzadatak_id,
        broj_bodova: broj_bodova,
        date_created: new Date()
    }, ['id']).then(data => res.json(data))
})




app.listen(port, () => {
console.log(`Example app listening on port ${port}`)
})