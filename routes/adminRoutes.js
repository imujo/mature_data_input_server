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

// GET

router.get("/users", async (req, res) => {
  let users = await db("users").select("username");

  res.json(users);
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
  const { predmet, godina_start, godina_end, sezona, razina, user_id } =
    req.body;

  let predmet_id = await db("predmet")
    .where({ predmet: predmet })
    .select("id")
    .pluck("id");

  let response = await db("user_access_condition").insert({
    user_id: user_id,
    predmet_id: parseInt(predmet_id),
    sezona: sezona,
    razina: razina,
    godina_start: godina_start,
    godina_end: godina_end,
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

module.exports = router;
