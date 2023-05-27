const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { merge } = require("lodash");

const jwt = require("jsonwebtoken");

require("./db");

const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");

//User Types and Resolvers
const { typeDefs: UserTypes } = require("./schemas/user");
const { resolvers: UserResolvers } = require("./schemas/user");

//Feed Types and Resolvers
const { typeDefs: FeedTypes } = require("./schemas/feed");
const { resolvers: FeedResolvers } = require("./schemas/feed");

//Network Types and Resolvers
const { typeDefs: NetworkTypes } = require("./schemas/network");
const { resolvers: NetworkResolvers } = require("./schemas/network");
const User = require("./models/User");
const { getUserById } = require("./utils/userHelpers");
const path = require("path");

const start = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/",
  });

  const schema = makeExecutableSchema({
    typeDefs: [UserTypes, FeedTypes, NetworkTypes],
    resolvers: merge(UserResolvers, FeedResolvers, NetworkResolvers),
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  const routes = [
    "/",
    "/friends",
    "/feed",
    "/messages",
    "/login",
    "/sign-up",
    "/profile/*",
  ];

  routes.forEach((route) => {
    app.get(route, (req, res) => {
      res.sendFile(path.join(__dirname, "./build/index.html"));
    });
  });

  app.use(
    "/",
    cors(),
    // express.static("build"),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null;

        if (auth?.startsWith("Bearer ")) {
          const decodedToken = jwt.verify(
            auth.substring(7),
            process.env.SECRET
          );

          const currentUser = await getUserById(decodedToken.userId);

          return { currentUser };
        }
      },
    })
  );

  const PORT = 4000;

  httpServer.listen(PORT, () =>
    console.log(`Server is now running on http://localhost:${PORT}`)
  );
};

start();
