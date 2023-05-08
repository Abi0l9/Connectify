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
    content: String
    poster: String
    time: String
    media: String
  }

  type Query {
    testFeed: Int!
    getAllFeeds: [Feed]!
  }

  type Mutation {
    createFeed(content: String!, media:String): Feed
    deleteFeed(feedId: String!): [Feed]!
  }
`;

const resolvers = {
  Query: {
    testFeed: () => 2,
    getAllFeeds: async (_, args, context) => {
      const userId = handleInvalidID(context);

      const { feed } = await User.findById(userId).populate("feed", {
        id: 1,
        content: 1,
        poster: 1,
        time: 1,
      });

      return feed;
    },
  },
  Mutation: {
    createFeed: async (_, args, context) => {
      handleEmptyFields(args);
      const { content, media } = args;
      const userId = handleInvalidID(context);
      const user = await User.findById(userId);

      const feed = {
        content,
        time: now(),
        poster: userId,
        media: media ? media : null,
      };

      const newFeed = new Feed(feed);

      try {
        user.feed = user.feed.concat(newFeed);
        await user.save();
        await newFeed.save();
      } catch (error) {
        handleUnknownError(error);
      }

      return newFeed;
    },
    deleteFeed: async (_, args, context) => {
      handleEmptyFields(args);
      const userId = handleInvalidID(context);

      const user = await User.findById(userId).populate("feed", {
        id: 1,
        content: 1,
        poster: 1,
        time: 1,
      });
      const remFeeds = user.feed.filter((f) => f.id !== args.feedId);
      user.feed = remFeeds;
      try {
        await user.save();
      } catch (e) {
        handleUnknownError(e);
      }

      return remFeeds;
    },
  },
};

module.exports = { typeDefs, resolvers };
