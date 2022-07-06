const { json } = require("body-parser");
const express = require("express");
const { default: knex } = require("knex");
const db = require("./knex/db.js");
var cors = require("cors");
const app = express();
const port = 3001;
const multer = require("multer");
const fs = require("fs");

app.use(cors());
app.use(json());
app.use(express.static("public"));

const imageUploadPath = "/Users/ivomujo/Desktop/images/";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imageUploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}_dateVal_${Date.now()}_${file.originalname}`);
  },
});

const imageUpload = multer({ storage: storage });

app.post("/image-upload", imageUpload.array("my-image-file"), (req, res) => {
  console.log(req.file);
  let filename = req.file.filename;
  fs.move(imageUploadPath + filename, imageUploadPath + "test/" + filename);

  console.log("POST request received to /image-upload.");
  console.log("Axios POST body: ", req.body);
  res.send("POST request recieved on server to /image-upload.");
});

// FUNCTIONS
const findZadatciWithNadzadatak = (id, zadatci) => {
  let first = zadatci.findIndex((zadatak) => zadatak.nadzadatak_id == id);
  let last =
    zadatci.length -
    1 -
    zadatci
      .slice()
      .reverse()
      .findIndex((zadatak) => zadatak.nadzadatak_id == id);

  return { first, last };
};

const deleteRjesenje = async (rjesenje_id) => {
  return await db("rjesenje").where({ id: rjesenje_id }).del();
};

const deleteZadatak = async (zadatak_id) => {
  let zadatakDeleted = await db("zadatak").where({ id: zadatak_id }).del();

  const rjesenjaList = await db("rjesenje")
    .where({ zadatak_id: zadatak_id })
    .select("id");

  for (rjesenje of rjesenjaList) {
    deleteRjesenje(rjesenje.id);
  }

  return zadatakDeleted;
};

const deleteNadzadatak = async (nadzadatak_id) => {
  let nadzadatakDeleted = await db("nadzadatak")
    .where({ id: nadzadatak_id })
    .del();

  const zadatakList = await db("zadatak")
    .where({ nadzadatak_id: nadzadatak_id })
    .select();

  for (zadatak of zadatakList) {
    deleteZadatak(zadatak.id);
  }

  return nadzadatakDeleted;
};

// GET ROUTES

app.get("/matura_id", (req, res) => {
  const { godina, sezona, predmet_id, razina } = req.query;

  db("matura")
    .where({
      godina: godina,
      sezona: sezona,
      razina: razina,
      predmet_id: predmet_id,
    })
    .select("id")
    .then((data) =>
      data.length ? res.json(data[0].id) : res.status(500).json("Error")
    )
    .catch((err) => res.status(500).send("error"));
});

app.get("/predmet/all", (req, res) => {
  db.select("id", "predmet")
    .from("predmet")
    .then((data) => {
      if (data.length) {
        let newDict = {};

        data.forEach((item, i) => {
          newDict[item.predmet] = item.id;
        });
        return res.json(newDict);
      }

      res.status(500).json("error");
    })
    .catch((err) => res.status(500).send("error"));
});

app.get("/zadatak_vrsta/all", (req, res) => {
  db.select("id", "zadatak_vrsta")
    .from("zadatak_vrsta")
    .then((data) => {
      if (data.length) {
        let newDict = {};

        data.forEach((item, i) => {
          newDict[item.zadatak_vrsta] = item.id;
        });
        return res.json(newDict);
      }

      res.status(500).json("error");
    })
    .catch((err) => res.status(500).send("error"));
});

app.get("/nadzadatak_vrsta/all", (req, res) => {
  db.select("id", "nadzadatak_vrsta")
    .from("nadzadatak_vrsta")
    .then((data) => {
      if (data.length) {
        let newDict = {};

        data.forEach((item, i) => {
          newDict[item.nadzadatak_vrsta] = item.id;
        });
        return res.json(newDict);
      }

      res.status(500).json("error");
    })
    .catch((err) => res.status(500).send("error"));
});

app.get("/zadatak/all", async (req, res) => {
  const { matura_id } = req.query;

  let zadatci = await db("zadatak")
    .where({ matura_id: matura_id })
    .orderBy("broj_zadatka")
    .select();

  let nadzadatciIds = new Set();

  for (let i = 0; i < zadatci.length; i++) {
    zadatci[i].type = "zadatak";
    nadzadatciIds.add(zadatci[i].nadzadatak_id);
  }

  let nadzadatci = await db("nadzadatak")
    .whereIn("id", Array.from(nadzadatciIds))
    .select();

  let newList = [];
  let lastIndex = 0;

  nadzadatci.forEach((nadzadatak, i) => {
    nadzadatci[i].type = "nadzadatak";

    let { first, last } = findZadatciWithNadzadatak(
      parseInt(nadzadatak.id),
      zadatci
    );
    newList = newList.concat(zadatci.slice(lastIndex, first));
    newList.push(nadzadatak);

    lastIndex = last + 1;
  });

  newList = newList.concat(zadatci.slice(lastIndex, zadatci.length + 1));

  res.json(newList);
});

app.get("/rjesenja", async (req, res) => {
  const { zadatak_id } = req.query;

  let rjesenja = await db("rjesenje")
    .where({ zadatak_id: zadatak_id })
    .orderBy("orderby")
    .select();

  res.json(rjesenja);
});

app.get("/zadatak", async (req, res) => {
  const { zadatak_id } = req.query;

  zadatak = await db("zadatak").where({ id: zadatak_id }).select().first();

  res.json(zadatak);
});

app.get("/nadzadatak/zadatci", async (req, res) => {
  const { nadzadatak_id } = req.query;

  zadatci = await db("zadatak")
    .where({ nadzadatak_id: nadzadatak_id })
    .orderBy("broj_zadatka")
    .select();

  res.json(zadatci);
});

// POST ROUTES

app.post("/zadatak", (req, res) => {
  const {
    vrsta_id,
    matura_id,
    broj_zadatka,
    zadatak_tekst,
    nadzadatak_id,
    broj_bodova,
    primjer,
  } = req.body;

  console.log(slika_path);

  db("zadatak")
    .insert(
      {
        vrsta_id: vrsta_id,
        matura_id: matura_id,
        broj_zadatka: broj_zadatka,
        zadatak_tekst: zadatak_tekst,
        nadzadatak_id: nadzadatak_id,
        broj_bodova: broj_bodova,
        primjer: primjer,
        islocked: false,
        date_created: new Date(),
      },
      ["id"]
    )
    .then((data) => res.json(data[0].id));
});

app.post("/nadzadatak", (req, res) => {
  const {
    vrsta_id,
    matura_id,
    broj_nadzadatka,
    nadzadatak_tekst,
    slika_path,
    audio_path,
  } = req.body;

  db("nadzadatak")
    .insert(
      {
        vrsta_id: vrsta_id,
        matura_id: matura_id,
        broj_nadzadatka: broj_nadzadatka,
        nadzadatak_tekst: nadzadatak_tekst,
        slika_path: slika_path,
        audio_path: audio_path,
        islocked: false,
        date_created: new Date(),
      },
      ["id"]
    )
    .then((id) => {
      id = id[0].id;
      db("zadatak")
        .insert({
          matura_id: matura_id,
          nadzadatak_id: id,
          date_created: new Date(),
        })
        .then((_) => res.json(id));
    });
});

app.post("/rjesenje", (req, res) => {
  const {
    matura_id,
    rjesenje_tekst,
    zadatak_id,
    slika_path,
    slovo,
    tocno,
    broj_bodova,
  } = req.body;

  db("rjesenje")
    .insert(
      {
        matura_id: matura_id,
        rjesenje_tekst: rjesenje_tekst,
        zadatak_id: zadatak_id,
        slovo: slovo,
        tocno: tocno,
        slika_path: slika_path,
        broj_bodova: broj_bodova,
        date_created: new Date(),
      },
      ["id"]
    )
    .then((data) => res.json(data));
});

// PUT ROUTES

app.put("/nadzadatak", (req, res) => {
  const {
    id,
    vrsta_id,
    broj_nadzadatka,
    nadzadatak_tekst,
    slika_path,
    audio_path,
  } = req.body;

  db("nadzadatak")
    .where({ id: id })
    .update({
      vrsta_id: vrsta_id,
      broj_nadzadatka: broj_nadzadatka,
      nadzadatak_tekst: nadzadatak_tekst,
      slika_path: slika_path,
      audio_path: audio_path,
      date_updated: new Date(),
    })
    .then((data) => res.json(data));
});

app.put("/zadatak", (req, res) => {
  const {
    id,
    vrsta_id,
    matura_id,
    broj_zadatka,
    zadatak_tekst,
    slika_path,
    broj_bodova,
    primjer,
  } = req.body;

  db("zadatak")
    .where({ id: id })
    .update({
      vrsta_id: vrsta_id,
      matura_id: matura_id,
      broj_zadatka: broj_zadatka,
      zadatak_tekst: zadatak_tekst,
      slika_path: slika_path,
      broj_bodova: broj_bodova,
      primjer: primjer,
      date_updated: new Date(),
    })
    .then((data) => res.json(data));
});

app.put("/rjesenje", (req, res) => {
  const {
    rjesenje_id,
    rjesenje_tekst,
    slika_path,
    slovo,
    tocno,
    broj_bodova,
    index,
  } = req.body;

  db("rjesenje")
    .where({ id: rjesenje_id })
    .update(
      {
        rjesenje_tekst: rjesenje_tekst,
        slovo: slovo,
        tocno: tocno,
        slika_path: slika_path,
        broj_bodova: broj_bodova,
        orderby: index,
        date_updated: new Date(),
      },
      ["id"]
    )
    .then((data) => res.json(data));
});

app.put("/lock", (req, res) => {
  const { id, table } = req.query;

  db(table)
    .where({ id: id })
    .select("islocked")
    .then((data) => {
      db(table)
        .where({ id: id })
        .update({ islocked: !data[0].islocked })
        .then((data) => res.json(data));
    });
});

// DELETE ROUTES

app.delete("/delete", (req, res) => {
  const { id, type } = req.query;

  db(type)
    .where({ id: id })
    .delete()
    .then((_) => {
      if (type === "nadzadatak") {
        db("zadatak").where({ nadzadatak_id: id }).delete().catch(console.log);
      }
      // TODO DELETE RJESENJA

      res.json("Success");
    })
    .catch((err) => res.status(500).json(err));
});

app.delete("/rjesenje", async (req, res) => {
  const { rjesenje_id } = req.query;

  let rjesenjeDeleted = deleteRjesenje(rjesenje_id);

  if (rjesenjeDeleted) {
    res.json("Success");
  } else {
    res.status(400).json("Error");
  }
});

app.delete("/zadatak", async (req, res) => {
  const { zadatak_id } = req.query;

  let zadatakDeleted = deleteZadatak(zadatak_id);

  if (zadatakDeleted) {
    res.json("Success");
  } else {
    res.status(400).json("Error");
  }
});

app.delete("/nadzadatak", async (req, res) => {
  const { nadzadatak_id } = req.query;

  let nadzadatakDeleted = deleteNadzadatak(nadzadatak_id);

  if (nadzadatakDeleted) {
    res.json("Success");
  } else {
    res.status(400).json("Error");
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
