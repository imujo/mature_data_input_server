const bodyParser = require("body-parser");
const express = require("express");
const { default: knex } = require("knex");
const db = require("./knex/db.js");
var cors = require("cors");
const app = express();
const port = 3001;
const multer = require("multer");
const fs = require("fs");

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("uploads"));

const uploadsPath =
  "/Users/ivomujo/Development/Personal projects/Rjesavanje matura/data_config/data-input-server/uploads/";

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

var upload = multer({ storage: storage });

const changeName = (folder_path, filename) => {
  let index = 0;
  let filenameSplit = filename.split(".");

  let ext = filenameSplit[filenameSplit.length - 1];

  let path = `${folder_path}/file.${ext}`;

  while (fs.existsSync(path)) {
    path = `${folder_path}/file (${index}).${ext}`;
    index++;
  }

  return path;
};

app.post("/file-upload", upload.single("file"), async (req, res) => {
  let tmp_path = req.file.path;
  const { table, matura_id, table_id, type } = req.query;

  let fileData = await db(table).where({ id: table_id }).select(`${type}_path`);
  fileData = fileData[0][`${type}_path`];
  if (fileData) {
    fs.unlinkSync(fileData);
  }

  let target_folder = `uploads/${type}/${table}/${matura_id}`;

  // create folder if doesnt exist
  if (!fs.existsSync(target_folder)) {
    fs.mkdirSync(target_folder, { recursive: true });
  }

  let target_path = changeName(target_folder, req.file.originalname);

  let src = fs.createReadStream(tmp_path);
  let dest = fs.createWriteStream(target_path);
  src.pipe(dest);
  src.on("end", function () {
    fs.unlinkSync(tmp_path);
    let data = {};
    data[`${type}_path`] = target_path;
    db(table)
      .where({ id: table_id })
      .update(data)
      .then(() => res.send("complete"));
  });
  src.on("error", function (err) {
    res.send("error");
  });
});

app.delete("/deleteFile", (req, res) => {
  const { table, table_id, type } = req.query;

  deleteFile(table, table_id, type);
  res.json("success");
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
  deleteFile("rjesenje", rjesenje_id, "slika");
  return await db("rjesenje").where({ id: rjesenje_id }).del();
};

const deleteZadatak = async (zadatak_id) => {
  deleteFile("zadatak", zadatak_id, "slika");

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
  deleteFile("nadzadatak", nadzadatak_id, "slika");
  deleteFile("nadzadatak", nadzadatak_id, "audio");

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

const deleteFile = async (table, table_id, type) => {
  let filePath = await db(table).where({ id: table_id }).select(`${type}_path`);

  if (filePath) {
    filePath = filePath[0][`${type}_path`];
  }

  if (filePath) {
    fs.unlink(filePath, async (msg, err) => {
      let data = {};
      data[`${type}_path`] = null;
      let newFilePath = await db(table)
        .where({ id: table_id })
        .update(data, [`${type}_path`]);
    });
  }
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

app.get("/zadatak_vrsta/all", async (req, res) => {
  const { matura_id } = req.query;

  let predmet_id = await db("matura")
    .where({ id: matura_id })
    .select("predmet_id")
    .pluck("predmet_id");

  let vrsta_id_list = await db("predmet_zadatak_vrsta")
    .where({ predmet_id: predmet_id[0] })
    .select("zadatak_vrsta_id")
    .pluck("zadatak_vrsta_id");

  let data = await db("zadatak_vrsta")
    .whereIn("id", vrsta_id_list)
    .select("id", "zadatak_vrsta");

  let vrste = {};
  if (data.length) {
    data.forEach((item, i) => {
      vrste[item.zadatak_vrsta] = item.id;
    });
  }
  res.json(vrste);
});

app.get("/nadzadatak_vrsta/all", async (req, res) => {
  const { matura_id } = req.query;

  let predmet_id = await db("matura")
    .where({ id: matura_id })
    .select("predmet_id")
    .pluck("predmet_id");

  let vrsta_id_list = await db("predmet_nadzadatak_vrsta")
    .where({ predmet_id: predmet_id[0] })
    .select("nadzadatak_vrsta_id")
    .pluck("nadzadatak_vrsta_id");

  let data = await db("nadzadatak_vrsta")
    .whereIn("id", vrsta_id_list)
    .select("id", "nadzadatak_vrsta");

  let vrste = {};
  if (data.length) {
    data.forEach((item, i) => {
      vrste[item.nadzadatak_vrsta] = item.id;
    });
  }
  res.json(vrste);
});

app.get("/odjeljak/all", async (req, res) => {
  const { matura_id } = req.query;

  let predmet_id = await db("matura")
    .where({ id: matura_id })
    .select("predmet_id")
    .pluck("predmet_id");

  let data = await db("zadatak_odjeljak")
    .where({ predmet_id: predmet_id[0] })
    .select("id", "odjeljak");

  let odjeljci = {};
  if (data.length) {
    data.forEach((item, i) => {
      odjeljci[item.odjeljak] = item.id;
    });
  }
  res.json(odjeljci);
});

app.get("/zadatak/all", async (req, res) => {
  const { matura_id } = req.query;

  let zadatci = await db("zadatak")
    .where({ matura_id: matura_id })
    .orderBy("broj_zadatka")
    .select();

  let nadzadatciIds = [];

  for (let i = 0; i < zadatci.length; i++) {
    zadatci[i].type = "zadatak";
    let nadzadatak_id = zadatci[i].nadzadatak_id;

    if (nadzadatak_id && !nadzadatciIds.includes(nadzadatak_id)) {
      nadzadatciIds.push(nadzadatak_id);
    }
  }
  let nadzadatci = [];

  for (let nadzadatakId of nadzadatciIds) {
    let nadzadatak = await db("nadzadatak")
      .where({ id: nadzadatakId })
      .select();
    nadzadatci.push(nadzadatak[0]);
  }

  nadzadatci.forEach((nadzadatak, i) => {
    nadzadatci[i].type = "nadzadatak";

    let zadatakWithNadzadatakId = zadatci.findIndex((zadatak) => {
      return zadatak.nadzadatak_id == nadzadatak.id;
    });

    zadatci[zadatakWithNadzadatakId] = nadzadatak;

    zadatci = zadatci.filter((zadatak) => {
      return zadatak.nadzadatak_id !== parseInt(nadzadatak.id);
    });
  });

  console.log(zadatci);

  res.json(zadatci);
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
    odjeljak_id,
    task,
  } = req.body;

  console.log(task);

  db("nadzadatak")
    .where({ id: id })
    .update({
      vrsta_id: vrsta_id,
      broj_nadzadatka: broj_nadzadatka,
      nadzadatak_tekst: nadzadatak_tekst,
      slika_path: slika_path,
      audio_path: audio_path,
      odjeljak_id: odjeljak_id,
      task: task,
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
    odjeljak_id,
  } = req.body;

  db("zadatak")
    .where({ id: id })
    .update({
      vrsta_id: vrsta_id,
      matura_id: matura_id,
      broj_zadatka: broj_zadatka ? broj_zadatka : null,
      zadatak_tekst: zadatak_tekst,
      slika_path: slika_path,
      broj_bodova: broj_bodova,
      primjer: primjer,
      odjeljak_id: odjeljak_id,
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
