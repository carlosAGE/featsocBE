const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');
const User = require('../src/models/User');

const app = createApp();

describe('Push tokens API', () => {
  it('requires auth to register a token', async () => {
    const res = await request(app).post('/api/push-tokens').send({ token: 'ExponentPushToken[abc]' });
    expect(res.status).toBe(401);
  });

  it('registers a token idempotently', async () => {
    const { cookie, user } = await makeUserWithSession();

    await request(app).post('/api/push-tokens').set('Cookie', cookie).send({ token: 'tok-1' });
    await request(app).post('/api/push-tokens').set('Cookie', cookie).send({ token: 'tok-1' });

    const stored = await User.findById(user.id).select('+pushTokens');
    expect(stored.pushTokens).toEqual(['tok-1']);
  });

  it('unregisters a token', async () => {
    const { cookie, user } = await makeUserWithSession();
    await request(app).post('/api/push-tokens').set('Cookie', cookie).send({ token: 'tok-1' });

    const res = await request(app).delete('/api/push-tokens').set('Cookie', cookie).send({ token: 'tok-1' });
    expect(res.status).toBe(200);

    const stored = await User.findById(user.id).select('+pushTokens');
    expect(stored.pushTokens).toEqual([]);
  });

  it('never exposes pushTokens on any user-facing response', async () => {
    const { cookie, user } = await makeUserWithSession();
    await request(app).post('/api/push-tokens').set('Cookie', cookie).send({ token: 'tok-1' });

    const res = await request(app).get(`/api/users/${user.id}`);
    expect(res.body.data.pushTokens).toBeUndefined();
  });
});

describe('Push delivery on notify()', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("sends a push to the recipient's registered token on follow", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: async () => ({ data: [{ status: 'ok' }] }),
    });
    global.fetch = mockFetch;

    const { user: target, cookie: targetCookie } = await makeUserWithSession();
    await request(app).post('/api/push-tokens').set('Cookie', targetCookie).send({ token: 'tok-1' });

    const { cookie: followerCookie } = await makeUserWithSession();
    await request(app).post(`/api/users/${target.id}/follow`).set('Cookie', followerCookie);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    const body = JSON.parse(options.body);
    expect(body[0].to).toBe('tok-1');
    expect(body[0].body).toMatch(/started following you/);
  });

  it('prunes a token Expo reports as DeviceNotRegistered', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] }),
    });

    const { user: owner, cookie: ownerCookie } = await makeUserWithSession();
    await request(app).post('/api/push-tokens').set('Cookie', ownerCookie).send({ token: 'stale-token' });
    const video = await makeVideo(owner.id);

    const { cookie: likerCookie } = await makeUserWithSession();
    await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', likerCookie);

    // notify() awaits the push send inline, so by the time the like request
    // resolves the prune has already happened.
    const stored = await User.findById(owner.id).select('+pushTokens');
    expect(stored.pushTokens).toEqual([]);
  });

  it('does not call fetch when the recipient has no registered token', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    const { user: target } = await makeUserWithSession();
    const { cookie: followerCookie } = await makeUserWithSession();
    await request(app).post(`/api/users/${target.id}/follow`).set('Cookie', followerCookie);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
