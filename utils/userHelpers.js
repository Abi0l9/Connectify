const { GraphQLError } = require("graphql");
const User = require("../models/User");

const handleEmptyFields = (args) => {
  Object.entries(args).forEach(([key, val]) => {
    if (val === "")
      throw new GraphQLError(`'${key}' field cannot be empty`, {
        extensions: {
          code: "BAD_USER_INPUT",
          invalidArg: key,
        },
      });
  });
};

const getAllUsers = async (args = {}) => {
  const users = await User.find({});

  return users.map((user) => {
    const id = user._id.toString();

    return {
      id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      gender: user.gender,
      phone: user.phone,
      hobbies: user.hobbies,
      feed: user.feed,
      messages: user.messages,
      desired_name: user.desired_name,
      notification: user.notification,
      city: user.city,
      country: user.country,
    };
  });
};

const getUserByField = async (fieldName, value) => {
  const users = await getAllUsers();
  const fields = users.length && Object.keys(users[0]);

  if (fields.includes(fieldName)) {
    const result = users.filter((user) => {
      if (fieldName === "name") {
        return lowerCase(user[fieldName]).includes(lowerCase(value));
      } else if (fieldName === "phone") {
        return user[fieldName] === value;
      } else if (fieldName === "email") {
        return lowerCase(user[fieldName]) === lowerCase(value);
      }
    });
    return result;
  } else {
    throw new GraphQLError(`'${fieldName}' does not exist in schema`, {
      extensions: {
        code: "BAD_USER_INPUT",
        invalidArg: fieldName,
      },
    });
  }
};

const getUserById = async (id) => {
  const users = await getAllUsers();
  return users.find((user) => user.id === id);
};

const lowerCase = (input) => input.toLowerCase();

module.exports = {
  handleEmptyFields,
  getAllUsers,
  lowerCase,
  getUserByField,
  getUserById,
};
