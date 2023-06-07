const { Schema, model } = require("mongoose");

const UserCommentSchema = Schema({
  id: String,
  name: String,
});

const commentSchema = Schema({
  commentBy: UserCommentSchema,
  time: String,
  likes: Number,
});

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
  comment: commentSchema,
  likes: Number,
});

const Feed = model("Feed", schema);

module.exports = Feed;
