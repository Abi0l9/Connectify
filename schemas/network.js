const Network = require("../models/Network");

const typeDefs = `
  type Query {
    testNetwork: Int!
  }

  type Network {
    id: ID!
  }
`;

const resolvers = {
  Query: {
    testNetwork: () => 3,
  },
};

module.exports = { typeDefs, resolvers };
