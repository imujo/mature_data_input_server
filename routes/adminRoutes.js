const router = require("express").Router();
const db = require("../knex/db");

const passport = require("passport");
router.use(passport.authenticate("jwt", { session: false }));
router.use((req, res, next) => {
  if (req.user.type === 1) {
    next();
  } else {
    res.status(400).json({ isSuccess: false, msg: "You are not an admin" });
  }
});

// FUNCTIONS

// GET

router.get("/user_types", async (req, res) => {
  let data = await db("user_type").select("user_type");

  // let newDict = {};

  // data.forEach((item, i) => {
  //   newDict[item.predmet] = item.id;
  // });
  let types = [];

  data.forEach((type) => {
    types.push(type.user_type);
  });

  console.log(types);

  res.json(types);
});

router.get("/users", async (req, res) => {
  let users = await db("users")
    .orderBy("id")
    .select("id", "firstname", "lastname", "username", "type");

  res.json(users);
});

router.get("/user_type", async (req, res) => {
  const { user_type_id } = req.query;

  let user_type = await db("user_type")
    .where({ id: user_type_id })
    .select("user_type")
    .pluck("user_type");

  res.json(user_type);
});

router.get("/condition/all", async (req, res) => {
  const { user_id } = req.query;
  let conditions = await db("user_access_condition")
    .where({ user_id: user_id })
    .select();

  res.json(conditions);
});

// POST

router.post("/condition", async (req, res) => {
  const { user_id } = req.query;

  let response = await db("user_access_condition").insert({
    user_id: user_id,
    date_created: new Date(),
  });

  if (response) {
    res.json({ isSuccess: true });
  } else {
    res
      .status(400)
      .json({ isSuccess: false, msg: "Condition couldn't be inserted" });
  }
});

// PUT

router.put("/condition", async (req, res) => {
  const { condition_id, predmet, godina_start, godina_end, sezona, razina } =
    req.body;

  console.log("predmet", predmet);

  let predmet_id = await db("predmet")
    .where({ predmet: predmet })
    .select("id")
    .pluck("id");

  console.log("predmet id", predmet_id);
  let response = await db("user_access_condition")
    .where({ id: condition_id })
    .update({
      predmet_id: parseInt(predmet_id),
      sezona: sezona,
      razina: razina,
      godina_start: godina_start,
      godina_end: godina_end,
    });

  if (response) {
    res.json({ isSuccess: true });
  } else {
    res
      .status(400)
      .json({ isSuccess: false, msg: "Condition couldn't be updated" });
  }
});

router.put("/user_type", async (req, res) => {
  const { user_id, type } = req.query;

  let type_id = await db("user_type")
    .where({ user_type: type })
    .select("id")
    .pluck("id");

  let response = await db("users")
    .where({ id: user_id })
    .update({
      type: parseInt(type_id),
    });

  if (response) {
    res.json({ isSuccess: true });
  } else {
    res
      .status(400)
      .json({ isSuccess: false, msg: "Couldn't update user type" });
  }
});

// DELETE
router.delete("/condition", async (req, res) => {
  const { condition_id } = req.query;

  let response = await db("user_access_condition")
    .where({ id: condition_id })
    .del();

  if (response) {
    res.json({ isSuccess: true });
  } else {
    res.status(400).json({ isSuccess: false, msg: "Condition not found" });
  }
});

router.delete("/user", async (req, res) => {
  const { user_id } = req.query;

  let response = await db("users").where({ id: user_id }).del();

  if (response) {
    console.log("User deleted");
    res.json({ isSuccess: true });
  } else {
    res.status(400).json({ isSuccess: false, msg: "Couldn't delete user" });
  }
});

module.exports = router;
