const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');

// Builds and returns the Express app WITHOUT starting a server or connecting
// to the DB. This separation lets tests import the app and drive it with
// supertest against an in-memory Mongo.
function createApp() {
  const app = express();

  // Behind Azure App Service / Container Apps there's one proxy hop in front
  // of us. Trusting it lets express read the real client IP (req.ip) from
  // X-Forwarded-For, which rate limiting depends on.
  app.set('trust proxy', 1);

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
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(morgan(env.isProd ? 'combined' : 'dev'));
  }

  // Health check — handy for Azure App Service probes.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', env: env.nodeEnv, uptime: process.uptime() });
  });

  // Feature routes live under /api, behind a generous global rate limit.
  app.use('/api', apiLimiter, routes);

  // 404 + centralized error handling (must be last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
