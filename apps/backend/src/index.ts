import { ApolloServer } from 'apollo-server';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { prisma } from './prismaClient';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  },
  context: ({ req }) => {
    return { req };
  }
});

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    const { url } = await server.listen(PORT);
    console.log(`🚀 Server ready at ${url}`);
    console.log(`📊 GraphQL Playground available at ${url}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
}); 