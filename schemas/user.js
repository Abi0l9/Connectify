const User = require("../models/User");

const typeDefs = `
  type Query {
    test: Int!
  }
`;

const resolvers = {
  Query: {
    test: () => 1,
  },
};

module.exports = { typeDefs, resolvers };
