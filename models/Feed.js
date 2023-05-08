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
  time: String,
  media: String,
});

const Feed = model("Feed", schema);

module.exports = Feed;
