const User = require("../models/User");

export const typeDefs = `
    test: Int!
`;

export const resolvers = {
  test: () => 1,
};
