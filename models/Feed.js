const { Schema, model } = require("mongoose");

const UserCommentSchema = Schema({
  id: String,
  name: String,
});

const commentSchema = Schema({
  commentBy: UserCommentSchema,
  content: String,
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
  comments: {
    type: [commentSchema],
    default: function () {
      return !this.comments ? [] : this.comments;
    },
  },
  likes: {
    type: Number,
    default: function () {
      return !this.likes ? 0 : this.likes;
    },
  },
});

const Feed = model("Feed", schema);

module.exports = Feed;
