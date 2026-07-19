const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

// Builds and returns the Express app WITHOUT starting a server or connecting
// to the DB. This separation lets tests import the app and drive it with
// supertest against an in-memory Mongo.
function createApp() {
  const app = express();

  // Security & platform middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.includes('*') ? true : env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (!env.isTest) {
    app.use(morgan(env.isProd ? 'combined' : 'dev'));
  }

  // Health check — handy for Azure App Service probes.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', env: env.nodeEnv, uptime: process.uptime() });
  });

  // Feature routes live under /api
  app.use('/api', routes);

  // 404 + centralized error handling (must be last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
