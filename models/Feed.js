const { Schema, model } = require("mongoose");

const schema = Schema({
  content: {
    type: String,
    required: true,
  },
  poster: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  date: String,
  time: String,
  image: String,
});

const Feed = model("Feed", schema);

module.exports = Feed;
