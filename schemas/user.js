const { GraphQLError } = require("graphql");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  lowerCase,
  getAllUsers,
  handleEmptyFields,
  getUserByField,
} = require("../utils/userHelpers");

const typeDefs = `
  type Message {
    id: ID!
    content: String!
    time: String!
    sender: String!
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
  }

  type Mutation {
    createUser(name: String!, email: String!, gender: String!, password: String!, phone: String ): User
    updateUser(name: String, email: String, hobbies: [String], image: String, city: String, country: String, password: String, phone: String ): User
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
  },
};

module.exports = { typeDefs, resolvers };
