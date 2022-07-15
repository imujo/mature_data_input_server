const db = require("../knex/db");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const fs = require("fs");
const path = require("path");

const pathToKey = path.join(__dirname, "..", "id_rsa_pub.pem");
const PUB_KEY = fs.readFileSync(pathToKey, "utf8");

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: PUB_KEY,
  algorithms: ["RS256"],
};

const strategy = new JwtStrategy(options, (payload, done) => {
  db("users")
    .where({ id: payload.sub })
    .first()
    .then((user) => {
      user ? done(null, user) : done(null, false);
    })
    .catch((err) => done(err, false));
});

module.exports = (passport) => {
  passport.use(strategy);
};
