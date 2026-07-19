// Entry point: connect to the DB, then start the HTTP server.
const createApp = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

async function start() {
  try {
    await connectDB();

    const app = createApp();
    const server = app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] listening on port ${env.port} (${env.nodeEnv})`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      // eslint-disable-next-line no-console
      console.log(`\n[server] ${signal} received, shutting down...`);
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] failed to start:', err);
    process.exit(1);
  }
}

start();
