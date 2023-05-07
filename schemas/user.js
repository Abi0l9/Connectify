const { GraphQLError } = require("graphql");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  lowerCase,
  getAllUsers,
  handleEmptyFields,
  getUserByField,
  getUserById,
  now,
  handleAuthentication,
  handleUnknownError,
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
    id: ID!
    inbox: [Inbox]
    receiver: Receiver
    sender: Sender
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
    getConversations(userId: String!, receiverId: String!, msgId: String): Message
  }

  type Mutation {
    createUser(name: String!, email: String!, gender: String!, password: String!, phone: String ): User
    updateUser(id: String, email: String, hobby: String, image: String, city: String, country: String, password: String, phone: String ): User
    sendMsg(sender: String!, receiver: String!, content: String!): User
    clearAllMsgs(userId: String!): User
    clearMsgHistory(userId: String!, msgId: String!):[Message]!
    deleteConversation(userId: String!, convoId: String!): User
    deleteOneMessage(userId: String!, convoId: String!, msgId: String!): String
    updateMsg(userId: String!, convoId: String!, msgId: String!, update: String!): Inbox
    deleteBatchMessages(userId: String!, convoId: String!, msgIds: [String!]!): Message
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
    getConversations: async (_, args) => {
      const { userId, receiverId, msgId } = args;
      handleEmptyFields({ userId, receiverId });

      const { messages } = await getUserById(userId);
      const convo = messages.find(
        ({ sender, receiver }) =>
          (sender.id === userId && receiver.id === receiverId) ||
          (sender.id === receiverId && receiver.id === userId)
      );

      // if (convo && msgId) {
      //   const msg = convo.inbox.find(({ id }) => id === msgId);
      //   console.log(msg);
      //   return msg;
      // }

      return convo;
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

      const initialMsg = {
        sender: { id: senderId, name: senderName },
        receiver: { id: receiverId, name: receiverName },
        inbox: [newMsg],
      };

      if (senderExists && receiverExists) {
        //find message history
        const senderMsgsExists = senderExists.messages.find(
          (message) =>
            (message.sender.id === sender &&
              message.receiver.id === receiver) ||
            (message.receiver.id === sender && message.sender.id === receiver)
        );

        const receiverMsgsExists = receiverExists.messages.find(
          (message) =>
            (message.sender.id === sender &&
              message.receiver.id === receiver) ||
            (message.sender.id === receiver && message.receiver.id === sender)
        );

        if (!senderMsgsExists && receiverMsgsExists) {
          console.log("sender has no message history...");

          senderExists.messages = senderExists.messages.concat(initialMsg);
          receiverMsgsExists.inbox = receiverMsgsExists.inbox.concat(newMsg);

          await senderExists.save();
          await receiverExists.save();

          return senderExists;
        } else if (senderMsgsExists && !receiverMsgsExists) {
          console.log("receiver has no message history...");

          senderMsgsExists.inbox = senderMsgsExists.inbox.concat(newMsg);
          receiverExists.messages = receiverExists.messages.concat(initialMsg);

          await senderExists.save();
          await receiverExists.save();

          return receiverExists;
        } else if (senderMsgsExists && receiverMsgsExists) {
          console.log("both have message history...");

          senderMsgsExists.inbox = senderMsgsExists.inbox.concat(newMsg);
          receiverMsgsExists.inbox = receiverMsgsExists.inbox.concat(newMsg);

          await senderExists.save();
          await receiverExists.save();

          return senderExists;
        } else {
          console.log("first message");

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
    //clears Inbox but sender and receiver history remains
    deleteConversation: async (_, args) => {
      handleEmptyFields(args);

      const { userId, convoId } = args;

      const user = await User.findById(userId);

      try {
        const convo = user.messages.find(
          (msg) => msg._id.toString() === convoId
        );

        convo.inbox = [];

        await user.save();
      } catch (error) {
        handleUnknownError(error);
      }
      return user;
    },
    // clears msg history between 2 users for loggedIn User
    clearMsgHistory: async (_, args) => {
      handleEmptyFields(args);

      const { userId, msgId } = args;

      const user = await User.findById(userId);

      try {
        user.messages = user.messages.filter(
          (msg) => msg._id.toString() !== msgId
        );

        await user.save();
        return user.messages;
      } catch (error) {
        handleUnknownError(error);
      }
    },
    deleteOneMessage: async (_, args) => {
      handleEmptyFields(args);

      const { userId, convoId, msgId } = args;
      const user = await User.findById(userId);
      const message = user.messages.find(
        (msg) => msg._id.toString() === convoId
      );

      message.inbox = message.inbox.filter(
        (content) => content._id.toString() !== msgId
      );

      await user.save();
      return "message deleted";
    },
    deleteBatchMessages: async (_, args) => {
      handleEmptyFields(args);

      const { userId, convoId, msgIds } = args;
      const user = await User.findById(userId);
      const message = user.messages.find(
        (msg) => msg._id.toString() === convoId
      );

      const remMsgs = message.inbox.filter(
        (m) => !msgIds.includes(m._id.toString())
      );
      message.inbox = remMsgs;

      await user.save();
      return message;
    },
    // updateMsg: async (_, args) => {
    //   handleEmptyFields(args);

    //   const { userId, convoId, msgId, update } = args;
    //   const user = await User.findById(userId);
    //   const message = user.messages.find(
    //     (msg) => msg._id.toString() === convoId
    //   );

    //   //trying to update receiver
    //   const { sender, receiver } = message;

    //   if(sender.id !== userId){
    //     const receiver = await User.findById(receiver.id);
    //     const message = receiver.messages.find(
    //       (msg) => msg._id.toString() === convoId
    //     );
    //   }

    //   console.log(receiver);

    //   const target = message?.inbox.find(
    //     (content) => content._id.toString() === msgId
    //   );

    //   if (target?.sender.id !== userId) {
    //     handleAuthentication();
    //   }

    //   target.time = now();
    //   target.content = update;

    //   await user.save();
    //   return target;
    // },
  },
};

module.exports = { typeDefs, resolvers };
