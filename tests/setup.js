// Test-only auth config. Set before any app module loads env.js so the
// values are picked up. These are throwaway values, not real secrets.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use';
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || 'test-google-client-id.apps.googleusercontent.com';
// Low bcrypt cost so password hashing doesn't slow the suite.
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Spins up a throwaway in-memory MongoDB for the whole test run, so tests
// never touch a real database. Collections are cleared between tests.
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});
