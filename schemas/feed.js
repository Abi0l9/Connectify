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

      console.log(user.feed);

      const newFeed = new Feed(feed);

      try {
        user.feed = user.feed.concat(newFeed);
        await user.save();
        // await newFeed.save();
      } catch (error) {
        handleUnknownError(error);
      }

      return newFeed;
    },
  },
};

module.exports = { typeDefs, resolvers };
