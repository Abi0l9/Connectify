const { Schema, model } = require("mongoose");

const UserCommentSchema = Schema({
  id: String,
  name: String,
});

const LikesSchema = Schema({
  userId: String,
  likes: Number,
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
  likes: [LikesSchema],
});

const Feed = model("Feed", schema);

module.exports = Feed;
