const { Schema, model } = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const schema = Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
  },
  desired_name: {
    type: String,
    unique: true,
    minlength: 1,
  },
  city: String,
  country: String,
  continent: String,
  phone: String,
  hobbies: [String],
  network: {
    type: Schema.Types.ObjectId,
    ref: "Network",
  },
  feed: [
    {
      type: Schema.Types.ObjectId,
      ref: "Feed",
    },
  ],
  messages: [
    {
      type: Schema.Types.ObjectId,
      content: String,
      time: String,
      sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
  ],
  notification: [{ id: String }],
});

const User = model("User", schema);

module.exports = User;
