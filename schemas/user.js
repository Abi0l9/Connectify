const { GraphQLError } = require("graphql");
const User = require("../models/User");

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
    id: ID!
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
  }

  type Mutation {
    createUser(name: String!, email: String!, gender: String!, password: String! ): User
    findUser(name: String!): User
    allUsers: [User]
  }
`;

const resolvers = {
  Query: {
    testUser: () => 1,
    clearUsers: async () => {
      await User.deleteMany();
      return "cleared";
    },
  },
  Mutation: {
    createUser: async (_, args) => {
      //handles any empty field
      Object.entries(args).forEach(([key, val]) => {
        if (val === "")
          throw new GraphQLError(`'${key}' field cannot be empty`, {
            extensions: {
              code: "BAD_USER_INPUT",
              invalidArg: key,
            },
          });
      });
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
