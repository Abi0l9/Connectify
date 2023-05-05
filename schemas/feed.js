const Feed = require("../models/Feed");

const typeDefs = `
  type Query {
    test: Int!
  }
`;

const resolvers = {
  Query: {
    test: () => 2,
  },
};

module.exports = { typeDefs, resolvers };
