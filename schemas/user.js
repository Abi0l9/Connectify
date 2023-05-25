const { GraphQLError } = require("graphql");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();

const {
  lowerCase,
  getAllUsers,
  handleEmptyFields,
  getUserByField,
  getUserById,
  now,
  handleAuthentication,
  handleUnknownError,
  handleLoginInputsVal,
  handleNotFound,
  handleInvalidID,
  getFriendsList,
  getRegCode,
  refreshCode,
} = require("../utils/userHelpers");
const mailer = require("../utils/codeMailer");
const congratsMailer = require("../utils/congratsMailer");
const resendCodeMailer = require("../utils/resendCodeMailer");

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

  type Pendings {
    id: String
    name: String
    desired_name: String
  }

  type Accepted {
    id: String
    name: String
    desired_name: String
  }

  type Requests {
    id: String
    name: String
    desired_name: String
  }

  type Friend {
    id: ID!
    pendings: [Pendings]
    accepted: [Accepted]
    requests: [Requests]
  }

  enum Gender {
    male
    female
  }

  enum RegStatus {
    active
    inactive
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
    confirmationCode: String
    regStatus: RegStatus
    feed: [Feed]!
    network: Network
    friends: Friend
    messages: [Message]!
    notification: [Notification]!
  }

  type Me {
    userId: String!
    token: String!
    name: String!
    desired_name: String!
    image: String
    notification: [Notification]!
  }

  type Query {
    testUser: Int!
    clearUsers: String!
    findUser(name: String, phone: String, email: String): [User]!
    getOneUser(id: String!): User
    allUsers: [User]!
    getMsgs(id: String!): [Message]!
    getConversations( receiverId: String!, msgId: String): Message
    getVerifiedUsers: [User]!
    getFriends: Friend
    getAconversation(receiverId: String!): Message
  }

  type Mutation {
    createUser(name: String!, email: String!, gender: String!, password: String!, phone: String ): User
    confirmUserReg(email: String!, regCode: String!) : User
    resendCode(email: String!) : User
    login(email: String!, password: String!): Me
    updateUser(name: String ,desired_name: String, hobby: String, image: String, city: String, country: String, phone: String ): User
    sendMsg( receiver: String!, content: String!): User
    clearAllMsgs: User
    clearMsgHistory( msgId: String!):[Message]!
    deleteConversation( convoId: String!): User
    deleteOneMessage( convoId: String!, msgId: String!): [Inbox]
    updateMsg( convoId: String!, msgId: String!, update: String!): Inbox
    deleteBatchMessages( convoId: String!, msgIds: [String!]!): Message
    makeFriendRequest(friendId: String!): User
    acceptFriendRequest(friendId: String!): User
    cancelFriendRequest(friendId: String!): User
    declineFriendRequest(friendId: String!): User
    deleteAllFriends: String
  }

  type Subscription {
    userUpdated: User!
    madeFriendRequest: User!
    acceptedFriendRequest: User!
    cancelledFriendRequest: User!
    declinedFriendRequest: User!
    firstMsgBySender: User
    receiverHasMsgHistory: User
    firstMsgToReceiver: User
    senderHasMsgHistory: User
    sentMsg: User
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
    getOneUser: async (_, args, context) => {
      // handleInvalidID(context);
      handleEmptyFields(args);

      const user = await User.findById(args.id);
      return user;
    },
    allUsers: async () => await getAllUsers(),
    getMsgs: async (_, args) => {
      handleEmptyFields(args);

      const { messages } = await getUserById(args.id);
      return messages;
    },
    getConversations: async (_, args, context) => {
      const { receiverId, msgId } = args;
      handleEmptyFields({ receiverId });
      const userId = handleInvalidID(context);

      const { messages } = await getUserById(userId);
      const convo = messages.find(
        ({ sender, receiver }) =>
          (sender.id === userId && receiver.id === receiverId) ||
          (sender.id === receiverId && receiver.id === userId)
      );

      return convo;
    },
    getVerifiedUsers: async (_, _args, context) => {
      handleInvalidID(context);
      const users = await getAllUsers();

      const verified = users.filter((user) => user.regStatus === "active");

      return verified;
    },
    getFriends: async (_, _args, context) => {
      const userId = await handleInvalidID(context);
      const friends = await getFriendsList(userId);

      return friends;
    },
  },
  Mutation: {
    createUser: async (_, args) => {
      //handles any empty field
      handleEmptyFields(args);
      handleLoginInputsVal(args);

      const userExists = await User.findOne({ email: args.email });

      const confirmationCode = getRegCode();

      if (userExists?.regStatus === "inactive") {
        userExists.confirmationCode = confirmationCode;
        await userExists.save();
        await resendCodeMailer(
          userExists.name,
          userExists.email,
          confirmationCode
        );
        await refreshCode();
        throw new GraphQLError(
          "You are yet to verify your account, a new confirmation code has been sent to your email address."
        );
      } else if (userExists?.regStatus === "active") {
        throw new GraphQLError("Error Occured...Can't have multiple accounts");
      }

      const saltRounds = 10;

      const passwordHash = await bcrypt.hash(args.password, saltRounds);
      const friends = {
        requests: [],
        pendings: [],
        accepted: [],
      };

      const user = new User({
        ...args,
        passwordHash,
        friends,
        confirmationCode,
      });

      try {
        await user.save();
        await mailer(args.name, args.email, confirmationCode);
        await refreshCode();
      } catch (error) {
        throw new GraphQLError(error.message);
      }
      return user;
    },
    confirmUserReg: async (_, args) => {
      handleEmptyFields(args);
      const { email, regCode } = args;
      const user = await User.findOne({ email });

      !user && handleNotFound("user with email", email, "not found");

      const confirmationCode = user.confirmationCode;

      if (user.regStatus === "active") {
        throw new GraphQLError("User is already verified.");
      }

      if (confirmationCode !== regCode) {
        throw new GraphQLError("Invalid or expired code");
      }

      user.regStatus = "active";
      try {
        await user.save();
        await congratsMailer(user.name.split(" ")[0], email);
      } catch (e) {
        handleUnknownError(e);
      }
      return user;
    },
    resendCode: async (_, args) => {
      handleEmptyFields(args);
      const { email } = args;
      const user = await User.findOne({ email });

      !user && handleNotFound("user with email", email, "not found");

      if (user.regStatus === "active") {
        throw new GraphQLError("User is already verified.");
      }

      const confirmationCode = getRegCode();

      user.confirmationCode = confirmationCode;

      try {
        await user.save();
        await resendCodeMailer(
          user.name.split(" ")[0],
          email,
          confirmationCode
        );
        await refreshCode();
      } catch (e) {
        handleUnknownError(e);
      }
      return user;
    },
    login: async (_, args) => {
      handleEmptyFields(args);
      handleLoginInputsVal(args);

      const { email, password } = args;
      const user = await User.findOne({ email });
      !user && handleNotFound("Invalid email addresss/ password");

      if (user.regStatus === "inactive") {
        throw new GraphQLError("Please, verify your account to gain access.");
      }

      const passwordCompare = await bcrypt.compare(password, user.passwordHash);

      if (passwordCompare) {
        const userId = user.id;
        const name = user.name;
        const desired_name = user.desired_name;
        const image = user.image;
        const notification = user.notification;
        const userForToken = {
          userId,
        };

        const token = jwt.sign(userForToken, process.env.SECRET);
        return { userId, token, name, image, desired_name, notification };
      }

      handleNotFound("Invalid Email/Password");
    },
    updateUser: async (_, args, context) => {
      // handleEmptyFields(args);
      const userId = handleInvalidID(context);

      const userExists = await getUserById(userId);
      const updated = { ...userExists, ...args };

      if (userExists) {
        try {
          await User.findByIdAndUpdate(userId, args);
        } catch (error) {
          throw new GraphQLError(error.message);
        }
      } else {
        throw new GraphQLError("User does not exist", {
          extensions: {
            code: "NOT_FOUND",
            invalidArgs: userId,
          },
        });
      }

      pubsub.publish("USER_UPDATED", { userUpdated: updated });

      return updated;
    },
    sendMsg: async (_, args, context) => {
      handleEmptyFields(args);

      const { receiver, content } = args;
      const sender = handleInvalidID(context);

      const senderExists = await User.findById(sender);
      const receiverExists = await User.findById(receiver);

      if (!receiverExists) {
        handleNotFound("Receiver with id ", receiver, " not found");
      }

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

          pubsub.publish("SENT_MSG", { sentMsg: receiverExists });

          return senderExists;
        } else if (senderMsgsExists && !receiverMsgsExists) {
          console.log("receiver has no message history...");

          senderMsgsExists.inbox = senderMsgsExists.inbox.concat(newMsg);
          receiverExists.messages = receiverExists.messages.concat(initialMsg);

          await senderExists.save();
          await receiverExists.save();

          pubsub.publish("SENT_MSG", { sentMsg: receiverExists });

          return receiverExists;
        } else if (senderMsgsExists && receiverMsgsExists) {
          console.log("both have message history...");

          senderMsgsExists.inbox = senderMsgsExists.inbox.concat(newMsg);
          receiverMsgsExists.inbox = receiverMsgsExists.inbox.concat(newMsg);

          await senderExists.save();
          await receiverExists.save();

          pubsub.publish("SENT_MSG", { sentMsg: receiverExists });

          return senderExists;
        } else {
          console.log("first message");

          senderExists.messages = senderExists.messages.concat(initialMsg);
          await senderExists.save();

          receiverExists.messages = receiverExists.messages.concat(initialMsg);
          await receiverExists.save();

          pubsub.publish("SENT_MSG", { sentMsg: receiverExists });

          return senderExists;
        }
      } else {
        throw new GraphQLError("Sender/Receiver doesn't exists");
      }
    },
    clearAllMsgs: async (_, args, context) => {
      const userId = handleInvalidID(context);

      const user = await User.findById(userId);
      user.messages = [];
      await user.save();
      return user;
    },
    //clears Inbox but sender and receiver history remains
    deleteConversation: async (_, args, context) => {
      handleEmptyFields(args);

      const userId = handleInvalidID(context);
      const { convoId } = args;

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
    clearMsgHistory: async (_, args, context) => {
      handleEmptyFields(args);

      const userId = handleInvalidID(context);

      const { msgId } = args;

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
    deleteOneMessage: async (_, args, context) => {
      handleEmptyFields(args);

      const userId = handleInvalidID(context);

      const { convoId, msgId } = args;
      const user = await User.findById(userId);
      const message = user.messages.find(
        (msg) => msg._id.toString() === convoId
      );

      const inbox = message.inbox.filter(
        (content) => content._id.toString() !== msgId
      );
      message.inbox = inbox;

      if (inbox.length) {
        await user.save();
        return inbox;
      }
    },
    deleteBatchMessages: async (_, args, context) => {
      handleEmptyFields(args);

      const userId = handleInvalidID(context);

      const { convoId, msgIds } = args;
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
    makeFriendRequest: async (_, args, context) => {
      handleEmptyFields(args);
      const userId = handleInvalidID(context);

      const { friendId } = args;

      const user = await User.findById(userId);
      const friend = await User.findById(friendId);

      if (!friend) {
        handleNotFound("user with id ", friendId, "does not exist.");
      }

      //requests are the ones from others - incomings
      //pendings are for the ones sent by user himself/herself to others - outgoings
      //accepted are the ones removed from requests and added into accepted

      // making a friend adds the user to my pending list and appends it to the
      // other user's request list

      const usersFriendList = user.friends;
      const friendsFriendList = friend.friends;

      const userExistsInFriendsRequestsList = friendsFriendList?.requests?.find(
        (u) => u.id === userId
      );

      const friendExistsInUsersPendingList = usersFriendList?.pendings?.find(
        (f) => f.id === friendId
      );

      const friendExistsInAcceptedList = usersFriendList?.accepted?.find(
        (f) => f.id === friendId
      );

      if (userExistsInFriendsRequestsList && friendExistsInUsersPendingList) {
        console.log("friend is yet to accept your request...");
        //nothing can be done unless he/she accepts the request

        throw new GraphQLError("You can't add an already added user...");
      } else if (friendExistsInAcceptedList) {
        console.log(
          "If you love him/her that much, tell them instead of adding twice..."
        );

        //friend can't be added twice
        throw new GraphQLError("Both of you are already friends...");
      } else if (friendId === userId) {
        console.log(
          "Thats a stupid act, how can you friend your own self?!..."
        );

        throw new GraphQLError("You can't send a request to yourself...");
      } else {
        console.log("are you sure this person knows you?");

        //add to user's pendings list
        usersFriendList.pendings = usersFriendList.pendings.concat({
          id: friend.id,
          name: friend.name,
          desired_name: friend.desired_name,
        });

        //add to user's requests list
        friendsFriendList.requests = friendsFriendList.requests.concat({
          id: user.id,
          name: user.name,
          desired_name: user.desired_name,
        });

        try {
          await user.save();
          await friend.save();
          console.log("request sent");

          pubsub.publish("MADE_FRIEND_REQUEST", {
            madeFriendRequest: user,
          });

          return user;
        } catch (e) {
          handleUnknownError(e);
        }
      }
    },
    acceptFriendRequest: async (_, args, context) => {
      handleEmptyFields(args);
      const userId = handleInvalidID(context);

      const { friendId } = args;

      const user = await User.findById(userId);
      const friend = await User.findById(friendId);

      if (!friend) {
        handleNotFound("user with id ", friendId, "does not exist.");
      }

      const usersFriendList = user.friends;
      const friendsFriendList = friend.friends;

      //friend exists in user's requests list
      const friendExistsInUsersRequestsList = usersFriendList?.requests?.find(
        (f) => f.id === friendId
      );
      const userExistsInFriendsPendingsList = friendsFriendList?.pendings?.find(
        (u) => u.id === userId
      );

      const friendExistsInAcceptedList = usersFriendList?.accepted?.find(
        (f) => f.id === friendId
      );

      if (friendExistsInUsersRequestsList && userExistsInFriendsPendingsList) {
        console.log("you are about to accept a request...");

        // remove friend from requests of user
        usersFriendList.requests = usersFriendList.requests.filter(
          (u) => u.id !== friendExistsInUsersRequestsList.id
        );

        // remove user from pendings of friend
        friendsFriendList.pendings = friendsFriendList?.pendings?.filter(
          (u) => u.id !== userExistsInFriendsPendingsList.id
        );

        //add to accepted for both
        usersFriendList.accepted = usersFriendList.accepted.concat(
          friendExistsInUsersRequestsList
        );

        friendsFriendList.accepted = friendsFriendList.accepted.concat(
          userExistsInFriendsPendingsList
        );

        try {
          await user.save();
          await friend.save();
          console.log("request accepted");

          pubsub.publish("ACCEPTED_FRIEND_REQUEST", {
            acceptedFriendRequest: user,
          });

          return user;
        } catch (e) {
          console.log("got here errrrrrrrrrror");
          handleUnknownError(e);
        }
      } else if (friendExistsInAcceptedList) {
        console.log(
          "If you love him/her that much, tell them instead of adding twice..."
        );

        //friend can't be added twice
        throw new GraphQLError("Both of you are already friends...");
      } else if (friendId === userId) {
        throw new GraphQLError("You can't accept yourself...");
      }
    },
    cancelFriendRequest: async (_, args, context) => {
      handleEmptyFields(args);
      const userId = handleInvalidID(context);

      const { friendId } = args;

      const user = await User.findById(userId);
      const friend = await User.findById(friendId);

      if (!friend) {
        handleNotFound("user with id ", friendId, "does not exist.");
      }

      const usersFriendList = user.friends;
      const friendsFriendList = friend.friends;

      const userExistsInFriendsRequestsList = friendsFriendList?.requests?.find(
        (u) => u.id === userId
      );

      const friendExistsInUsersPendingList = usersFriendList?.pendings?.find(
        (f) => f.id === friendId
      );

      if (userExistsInFriendsRequestsList && friendExistsInUsersPendingList) {
        // remove user from requests of friend
        friendsFriendList.requests = friendsFriendList.requests.filter(
          (u) => u.id !== userExistsInFriendsRequestsList.id
        );

        // remove friend from pendings of user
        usersFriendList.pendings = usersFriendList?.pendings?.filter(
          (f) => f.id !== friendExistsInUsersPendingList.id
        );

        try {
          await user.save();
          await friend.save();

          pubsub.publish("CANCELLED_FRIEND_REQUEST", {
            cancelledFriendRequest: user,
          });

          return user;
        } catch (e) {
          handleUnknownError(e);
        }
      } else {
        const error = {
          name: "BAD_REQUEST",
          message: "Such request cannot be performed.",
        };
        handleUnknownError(error);
      }
    },
    declineFriendRequest: async (_, args, context) => {
      handleEmptyFields(args);
      const userId = handleInvalidID(context);

      const { friendId } = args;

      const user = await User.findById(userId);
      const friend = await User.findById(friendId);

      if (!friend) {
        handleNotFound("user with id ", friendId, "does not exist.");
      }

      const usersFriendList = user.friends;
      const friendsFriendList = friend.friends;

      //friend exists in user's requests list
      const friendExistsInUsersRequestsList = usersFriendList?.requests?.find(
        (f) => f.id === friendId
      );
      const userExistsInFriendsPendingsList = friendsFriendList?.pendings?.find(
        (u) => u.id === userId
      );

      if (friendExistsInUsersRequestsList && userExistsInFriendsPendingsList) {
        // remove friend from requests of user
        usersFriendList.requests = usersFriendList.requests.filter(
          (f) => f.id !== friendExistsInUsersRequestsList.id
        );

        // remove user from pendings of friend
        friendsFriendList.pendings = friendsFriendList?.pendings?.filter(
          (f) => f.id !== userExistsInFriendsPendingsList.id
        );

        try {
          await user.save();
          await friend.save();

          pubsub.publish("DECLINED_FRIEND_REQUEST", {
            declinedFriendRequest: user,
          });

          return user;
        } catch (e) {
          handleUnknownError(e);
        }
      } else {
        const error = {
          name: "BAD_REQUEST",
          message: "Such request cannot be performed.",
        };
        handleUnknownError(error);
      }

      // pubsub.publish("DECLINED_FRIEND_REQUEST", {
      //   declinedFriendRequest: usersFriendList,
      // });

      // return usersFriendList;
    },

    deleteAllFriends: async (_, args, context) => {
      const userId = handleInvalidID(context);
      await User.findByIdAndUpdate(userId, {
        friends: { requests: [], pendings: [], accepted: [] },
      });

      return "deleted";
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
  Subscription: {
    userUpdated: {
      subscribe: () => pubsub.asyncIterator("USER_UPDATED"),
    },
    madeFriendRequest: {
      subscribe: () => pubsub.asyncIterator("MADE_FRIEND_REQUEST"),
    },
    acceptedFriendRequest: {
      subscribe: () => pubsub.asyncIterator("ACCEPTED_FRIEND_REQUEST"),
    },
    cancelledFriendRequest: {
      subscribe: () => pubsub.asyncIterator("CANCELLED_FRIEND_REQUEST"),
    },
    declinedFriendRequest: {
      subscribe: () => pubsub.asyncIterator("DECLINED_FRIEND_REQUEST"),
    },
    sentMsg: {
      subscribe: () => pubsub.asyncIterator("SENT_MSG"),
    },
  },
};

module.exports = { typeDefs, resolvers };
