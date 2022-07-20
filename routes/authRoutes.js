const router = require("express").Router();
const passport = require("passport");
const genPassword = require("../lib/passwordUtils").genPassword;
const db = require("../knex/db");
const jwtUtils = require("../lib/jwtUtils");
const passwordUtils = require("../lib/passwordUtils");

// FUNCTIONS

const isAdminMiddleware = (req, res, next) => {
  console.log(req);
  const isAdmin = req.user.type === 1;

  if (isAdmin) {
    next();
  } else {
    res.status(400).json({ isSuccess: false, msg: "You are not an admin" });
  }
};

// ROUTES

router.post("/login", (req, res) => {
  let { username, password } = req.body;
  username = username.toLowerCase();
  console.log("login");

  db("users")
    .where({ username: username })
    .select()
    .first()
    .then((user) => {
      if (!user) {
        res.status(401).json({
          status: 401,
          msg: "Could not find the user",
          user: undefined,
        });
      } else {
        const isValid = passwordUtils.validatePassword(
          password,
          user.hash,
          user.salt
        );

        if (isValid) {
          const tokenObject = jwtUtils.issueJWT(user);

          res.json({
            isSuccess: true,
            msg: "Successfully logged in!",
            user: req.user,
            token: tokenObject.token,
            expiresIn: tokenObject.expires,
          });
        } else {
          res.status(400).json({
            isSuccess: false,
            msg: "Invalid password and/or username",
            user: undefined,
            token: undefined,
            expiresIn: undefined,
          });
        }
      }
    })
    .catch((err) =>
      res.status(400).json({
        isSuccess: false,
        msg: "Could not log in the user",
        user: undefined,
        token: undefined,
        expiresIn: undefined,
      })
    );
});

router.use(passport.authenticate("jwt", { session: false }));

router.post("/register", isAdminMiddleware, (req, res) => {
  let { username, password, firstname, lastname, type } = req.body;
  username = username.toLowerCase();

  const { salt, hash } = genPassword(password);

  const userAlreadyExists = (username) => {
    return db("users")
      .where({ username: username })
      .then((user) => {
        return user.length ? true : false;
      })
      .catch((err) => {
        console.log(err);
        return null;
      });
  };

  userAlreadyExists(username).then((exists) => {
    if (exists) {
      return res.status(400).json({
        isSuccess: false,
        msg: "User with that username already exists.",
        user: undefined,
        token: undefined,
        expiresIn: undefined,
      });
    }

    db("users")
      .insert({
        firstname: firstname,
        lastname: lastname,
        username: username,
        hash: hash,
        salt: salt,
        type: type,
        date_created: new Date(),
      })
      .then(() => {
        db.select()
          .from("users")
          .where({ username: username })
          .first()
          .then((user) => {
            const jwt = jwtUtils.issueJWT(user);

            res.json({
              isSuccess: true,
              msg: "User successfully registered.",
              user: user,
              token: jwt.token,
              expiresIn: jwt.expires,
            });
          });
      })
      .catch((err) =>
        res.status(400).json({
          isSuccess: false,
          msg: "Couldn't register user.",
          user: undefined,
          token: undefined,
          expiresIn: undefined,
          err: err,
        })
      );
  });
});

router.get("/user", (req, res) => {
  let user = req.user;

  delete user.hash;
  delete user.salt;

  res.json(user);
});

module.exports = router;
