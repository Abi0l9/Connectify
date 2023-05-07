const { GraphQLError } = require("graphql");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  lowerCase,
  getAllUsers,
  handleEmptyFields,
  getUserByField,
  getUserById,
} = require("../utils/userHelpers");

const typeDefs = `
  type Sender {
    id: String
    name: String
  }

  type Receiver {
    id: String
    name: String
  }

  type Inbox {
    id: ID!
    sender: Sender!
    content: String!
    time: String!
  }

  type Message {
    inbox: [Inbox]!
    receiver: Sender
    sender: Receiver
  }

  type Notification {
    id: ID!
  }

  enum Gender {
    male
    female
  }

  type User {
    id: String
    name: String!
    email: String!
    desired_name: String
    gender: Gender!
    city: String
    country: String
    continent: String
    image: String
    phone: String
    passwordHash: String
    hobbies: [String]!
    feed: Feed
    network: Network
    messages: [Message]!
    notification: [Notification]!
  }

  type Query {
    testUser: Int!
    clearUsers: String!
    findUser(name: String, phone: String, email: String): [User]!
    allUsers: [User]!
    getMsgs(id: String!): [Message]!
  }

  type Mutation {
    createUser(name: String!, email: String!, gender: String!, password: String!, phone: String ): User
    updateUser(id: String, email: String, hobby: String, image: String, city: String, country: String, password: String, phone: String ): User
    sendMsg(sender: String!, receiver: String!, content: String!): User
    clearAllMsgs(userId: String!): User
  }
`;

const resolvers = {
  Query: {
    testUser: () => 1,
    clearUsers: async () => {
      await User.deleteMany();
      return "cleared";
    },
    findUser: async (root, args) => {
      handleEmptyFields(args);
      const name = args.name;
      const phone = args.phone;
      const email = args.email;

      if (name) {
        return await getUserByField("name", name);
      } else if (phone) {
        return await getUserByField("phone", phone);
      } else if (email) {
        return await getUserByField("email", email);
      }
    },
    allUsers: async () => await getAllUsers(),
    getMsgs: async (_, args) => {
      handleEmptyFields(args);

      const { messages } = await getUserById(args.id);
      return messages;
    },
  },
  Mutation: {
    createUser: async (_, args) => {
      //handles any empty field
      handleEmptyFields(args);
      const user = new User(args);

      try {
        await user.save();
      } catch (error) {
        throw new GraphQLError(error.message);
      }
      return user;
    },
    updateUser: async (_, args) => {
      handleEmptyFields(args);
      //editable fields
      const id = args.id;
      const name = args.name;
      const phone = args.phone;
      const email = args.email;
      const city = args.city;
      const country = args.country;
      const image = args.image;
      const password = args.password;
      const hobby = args.hobby;

      const userExists = await getUserById(id);

      if (userExists) {
        try {
          if (phone) {
            await User.findByIdAndUpdate(id, { phone });
            return { ...userExists, phone };
          } else if (name) {
            await User.findByIdAndUpdate(id, { name });
            return { ...userExists, name };
          } else if (email) {
            await User.findByIdAndUpdate(id, { email });
            return { ...userExists, email };
          } else if (city) {
            await User.findByIdAndUpdate(id, { city });
            return { ...userExists, city };
          } else if (country) {
            await User.findByIdAndUpdate(id, { country });
            return { ...userExists, country };
          } else if (hobby) {
            await User.findByIdAndUpdate(id, {
              hobbies: [...new Set(userExists.hobbies.concat(hobby))],
            });
            return {
              ...userExists,
              hobbies: [...new Set(userExists.hobbies.concat(hobby))],
            };
          }
        } catch (error) {
          throw new GraphQLError(error.message);
        }
      } else {
        throw new GraphQLError("User doesn't exist", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: id,
          },
        });
      }
    },
    sendMsg: async (_, args) => {
      handleEmptyFields(args);

      const { sender, receiver, content } = args;
      const senderExists = await User.findById(sender);
      const receiverExists = await User.findById(receiver);

      const { id: senderId, name: senderName } = senderExists;
      const { id: receiverId, name: receiverName } = receiverExists;

      const newMsg = {
        sender: { id: senderId, name: senderName },
        content,
        time: Date().toString(),
      };

      if (senderExists && receiverExists) {
        const senderMsgsExists = senderExists.messages.find(
          (message) =>
            (message.sender === sender && message.receiver === receiver) ||
            (message.receiver === sender && message.sender === receiver)
        );

        const receiverMsgsExists = receiverExists.messages.find(
          (message) =>
            (message.sender === sender && message.receiver === receiver) ||
            (message.sender === receiver && message.receiver === sender)
        );

        if (senderMsgsExists || receiverMsgsExists) {
          senderMsgsExists.inbox = senderMsgsExists.inbox.concat(newMsg);
          receiverMsgsExists.inbox = receiverMsgsExists.inbox.concat(newMsg);

          await senderExists.save();
          await receiverExists.save();

          return senderExists;
        } else {
          const initialMsg = {
            sender: { id: senderId, name: senderName },
            receiver: { id: receiverId, name: receiverName },
            inbox: [newMsg],
          };

          senderExists.messages = senderExists.messages.concat(initialMsg);
          await senderExists.save();

          receiverExists.messages = receiverExists.messages.concat(initialMsg);
          await receiverExists.save();

          return senderExists;
        }
      } else {
        throw new GraphQLError("Sender/Receiver doesn't exists");
      }
    },
    clearAllMsgs: async (_, args) => {
      handleEmptyFields(args);

      const user = await User.findById(args.userId);
      user.messages = [];
      await user.save();
      return user;
    },
  },
};

module.exports = { typeDefs, resolvers };
