const Feed = require("../models/Feed");
const User = require("../models/User");
const {
  handleEmptyFields,
  handleInvalidID,
  now,
  handleUnknownError,
  getAllUsers,
} = require("../utils/userHelpers");

const FeedFormatter = async () => {
  const feed = await Feed.find({});

  const usersQuery = await getAllUsers();

  const users = usersQuery.map((u) => {
    return {
      id: u.id,
      name: u.name,
    };
  });

  const UsersToFeed = feed?.map((f) => {
    const user = users.find((u) => u.id === f.poster.toString());
    return {
      id: f._id.toString(),
      media: f.media,
      content: f.content,
      poster: user,
      time: f.time,
    };
  });

  return UsersToFeed;
  // .map((f) => {
  // return {
  //   id: f._id.toString(),
  //   media: f.media,
  //   content: f.content,
  //   poster: f.poster,
  //   time: f.time,
  // };
  // });
};

const typeDefs = `

  type Poster {
    id: String
    name: String
  }

  type Feed {
    id: ID!
    content: String
    poster: Poster
    time: String
    media: String
  }

  type Query {
    testFeed: Int!
    getAllFeeds: [Feed]!
    getUserFeeds: [Feed]!
  }

  type Mutation {
    createFeed(content: String!, media:String): User
    deleteFeed(feedId: String!): User
  }
`;

const resolvers = {
  Query: {
    testFeed: () => 2,
    getAllFeeds: async (_, args, context) => {
      handleInvalidID(context);

      const feeds = await FeedFormatter();
      return feeds;
    },
    getUserFeeds: async (_, _args, context) => {
      const userId = handleInvalidID(context);
      const { feed } = await User.findById(userId).populate("feed", {
        id: 1,
        content: 1,
        poster: 1,
        time: 1,
      });

      const userFeeds = feed.filter((f) => f.poster.toString() === userId);

      return userFeeds;
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

      return user;
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

      return user;
    },
  },
};

module.exports = { typeDefs, resolvers };
