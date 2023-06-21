const Feed = require("../models/Feed");
const User = require("../models/User");
const {
  handleEmptyFields,
  handleInvalidID,
  now,
  handleUnknownError,
  getAllUsers,
  handleNotFound,
  getUserById,
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
      likes: f.likes,
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

  type Comment {
    id: ID!
    commentBy: Poster
    content: String
    time: String
    likes: Int
  }

  type Feed {
    id: ID!
    content: String
    poster: Poster
    time: String
    media: String
    comments: [Comment]
    likes: Int
  }

  type Query {
    testFeed: Int!
    getAllFeeds: [Feed]!
    getOneFeed(feedId: String!): Feed
    getUserFeeds: [Feed]!
  }

  type Mutation {
    createFeed(content: String!, media:String): Feed
    deleteFeed(feedId: String!): [Feed]!
    likeFeed( feedId: String!): Feed
    addComment(feedId: String!, content: String!, media:String): Feed
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
    getOneFeed: async (_, args, context) => {
      handleInvalidID(context);

      const { feedId } = args;

      const feeds = await FeedFormatter();
      const feed = feeds.find((fd) => fd.id === feedId);
      return feed;
    },
    getUserFeeds: async (_, _args, context) => {
      const userId = handleInvalidID(context);
      const { feed } = await User.findById(userId).populate("feed", {
        id: 1,
        content: 1,
        poster: 1,
        time: 1,
        likes: 1,
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

      const feed = {
        content,
        time: now(),
        poster: userId,
        media: media ? media : null,
        comments: [],
      };

      const newFeed = new Feed(feed);

      try {
        await newFeed.save();
      } catch (error) {
        handleUnknownError(error);
      }

      return feed;
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
    likeFeed: async (_, args, context) => {
      handleEmptyFields(args);
      const userId = handleInvalidID(context);

      const { feedId } = args;

      const user = await User.findById(userId);
      const feed = await Feed.findById(feedId);

      // check if user has already liked the feed before

      const userAlreadyLikedTheFeed =
        user.likedFeeds.find((fd) => feedId === fd.feedId) || null;

      if (!userAlreadyLikedTheFeed) {
        console.log("first like");
        user.likedFeeds = user.likedFeeds.concat({ feedId });
        feed.likes = feed.likes + 1;
      } else {
        console.log("not first like");
        user.likedFeeds = user.likedFeeds.filter((fd) => feedId !== fd.feedId);
        feed.likes = feed.likes - 1;
      }

      try {
        await feed.save();
        await user.save();
      } catch (e) {
        handleUnknownError(e);
      }

      return feed;
    },
    addComment: async (_, args, context) => {
      handleEmptyFields(args);
      const { feedId, content, media } = args;
      const userId = handleInvalidID(context);

      const feed = await Feed.findById(feedId);
      const { id, name } = await getUserById(userId);

      const comment = {
        content,
        time: now(),
        commentBy: { id, name },
        media: media ? media : null,
      };

      feed.comments = feed.comments.concat(comment);

      try {
        await feed.save();
      } catch (error) {
        handleUnknownError(error);
      }

      return feed;
    },
  },
};

module.exports = { typeDefs, resolvers };
