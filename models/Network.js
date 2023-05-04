const { Schema, model, plugin } = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const schema = Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
  },
  users: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

plugin(uniqueValidator);

const Network = model("Network", schema);

module.exports = Network;
