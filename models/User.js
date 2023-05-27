const { Schema, model, plugin } = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const FriendBaseSchema = Schema({
  id: String,
  name: String,
  desired_name: String,
});

const NotificationContentSchema = Schema({
  contentType: String,
  message: String,
});

const NotificationSchema = Schema({
  count: Number,
  content: [
    {
      type: NotificationContentSchema,
    },
  ],
});

const MakingFriendsSchema = Schema({
  requests: [
    {
      type: FriendBaseSchema,
    },
  ],
  pendings: [
    {
      type: FriendBaseSchema,
    },
  ],
  accepted: [
    {
      type: FriendBaseSchema,
    },
  ],
});

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
    default: function () {
      return this.id;
    },
  },
  gender: String,
  city: String,
  country: String,
  confirmationCode: String,
  regStatus: {
    type: String,
    enum: ["inactive", "active"],
    default: "inactive",
  },
  continent: String,
  image: String,
  phone: {
    type: String,
    required: true,
    unique: true,
    minlength: 8,
  },
  passwordHash: String,
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
      inbox: {
        type: [
          {
            sender: {
              id: String,
              name: String,
            },
            content: String,
            time: String,
          },
        ],
      },
      sender: {
        id: String,
        name: String,
      },
      receiver: {
        id: String,
        name: String,
      },
    },
  ],
  notification: NotificationSchema,
  friends: {
    type: MakingFriendsSchema,
    index: true,
    unique: true,
    sparse: true,
  },
});

// plugin(uniqueValidator);

const User = model("User", schema);

module.exports = User;
