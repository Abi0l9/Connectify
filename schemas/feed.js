const Feed = require("../models/Feed");

const typeDefs = `
  type Query {
    testFeed: Int!
  }

  type Feed {
    id: ID!
  }
`;

const resolvers = {
  Query: {
    testFeed: () => 2,
  },
};

module.exports = { typeDefs, resolvers };
