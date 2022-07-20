const bodyParser = require("body-parser");
const express = require("express");
var cors = require("cors");
const app = express();
const port = 3001;
const passport = require("passport");
const authRoutes = require("./routes/authRoutes");
const apiRoutes = require("./routes/apiRoutes");
const adminRoutes = require("./routes/adminRoutes");

require("./auth_config/passport")(passport);

// MIDDLEWARE

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("uploads"));
app.use(passport.initialize());

// ROUTES

app.use("/auth", authRoutes);
app.use("/", apiRoutes);
app.use("/admin", adminRoutes);

// LISTEN

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
