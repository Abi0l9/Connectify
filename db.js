const config = require("./utils/config");
const { connect, set } = require("mongoose");

set("strictQuery", false);

connect(config.MONGODB_URI)
  .then(() => console.log("connected to db"))
  .catch((err) => console.log(err.message));
