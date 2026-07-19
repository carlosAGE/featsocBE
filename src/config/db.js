const mongoose = require('mongoose');
const env = require('./env');

// Connect to MongoDB. Called from src/index.js at startup.
// Tests connect to an in-memory server instead (see tests/setup.js),
// so this module is only used for real runs.
async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    throw new Error('connectDB: no MongoDB URI provided');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  if (!env.isTest) {
    // eslint-disable-next-line no-console
    console.log(`[db] connected to MongoDB (${mongoose.connection.name})`);
  }

  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };
