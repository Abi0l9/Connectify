const Feed = require("../models/Feed");
const User = require("../models/User");
const {
  handleEmptyFields,
  handleInvalidID,
  now,
  handleUnknownError,
} = require("../utils/userHelpers");

const typeDefs = `
  type Feed {
    id: ID!
    content: String!
    poster: String!
    time: String!
    media: String
  }

  type Query {
    testFeed: Int!
  }

  type Mutation {
    createFeed(content: String!, media:String): Feed
  }
`;

const resolvers = {
  Query: {
    testFeed: () => 2,
  },
  Mutation: {
    createFeed: async (_, args, context) => {
      handleEmptyFields(args);
      const { content, media } = args;
      const userId = handleInvalidID(context);

      const feed = {
        content,
        time: now(),
        poster: userId,
        media: media ? media : null,
      };

      const newFeed = new Feed(feed);

      try {
        await newFeed.save();
      } catch (error) {
        handleUnknownError(error);
      }

      return newFeed;
    },
  },
};

module.exports = { typeDefs, resolvers };
