const express = require('express');
const request = require('supertest');
const { createRateLimiter } = require('../src/middleware/rateLimit');
const { errorHandler } = require('../src/middleware/error');

// The wired-up limiters skip under NODE_ENV=test (so the rest of the suite is
// deterministic). Here we build a tiny app with a fresh limiter that does NOT
// skip, to prove the limiting + 429 error shape actually work.
function buildApp(max) {
  const app = express();
  const limiter = createRateLimiter({ windowMs: 60 * 1000, max });
  app.get('/ping', limiter, (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('rate limiter', () => {
  it('allows requests up to the limit, then 429s', async () => {
    const app = buildApp(3);

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await request(app).get('/ping');
      expect(ok.status).toBe(200);
    }

    const blocked = await request(app).get('/ping');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toMatch(/too many/i);
  });

  it('sets standard RateLimit headers', async () => {
    const app = buildApp(1000);
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('ratelimit-limit');
  });
});
