// Mock the Google verifier so tests never call Google's servers.
jest.mock('../src/lib/googleVerify', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

const request = require('supertest');
const createApp = require('../src/app');
const { verifyGoogleIdToken } = require('../src/lib/googleVerify');
const User = require('../src/models/User');

const app = createApp();

const googleProfile = {
  providerId: 'google-sub-123',
  email: 'newuser@example.com',
  emailVerified: true,
  name: 'New User',
  picture: 'https://example.com/pic.png',
};

describe('POST /api/auth/google', () => {
  it('creates a new account and sets a session cookie on first sign-in', async () => {
    verifyGoogleIdToken.mockResolvedValueOnce(googleProfile);

    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'valid-token' });

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.data.email).toBe('newuser@example.com');
    expect(res.body.data.emailVerified).toBe(true);
    expect(res.body.data.username).toBeDefined();
    // passwordHash must never be serialized
    expect(res.body.data.passwordHash).toBeUndefined();

    // httpOnly session cookie is set (web clients)
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.join(';')).toMatch(/featsoc_token=/);
    expect(cookies.join(';')).toMatch(/HttpOnly/i);

    // token is also returned in the body (native clients)
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('returns the same account (created=false) on second sign-in', async () => {
    verifyGoogleIdToken.mockResolvedValue(googleProfile);

    const first = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'valid-token' });
    const second = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'valid-token' });

    expect(first.body.data.id).toBe(second.body.data.id);
    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);
    expect(await User.countDocuments()).toBe(1);
  });

  it('links Google to an existing account with the same email', async () => {
    const existing = await User.create({
      username: 'existing',
      email: 'newuser@example.com',
    });

    verifyGoogleIdToken.mockResolvedValueOnce(googleProfile);
    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(existing.id);
    expect(await User.countDocuments()).toBe(1);
  });

  it('rejects an invalid Google token with 401', async () => {
    verifyGoogleIdToken.mockRejectedValueOnce(new Error('bad token'));

    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'bad-token' });

    expect(res.status).toBe(401);
  });

  it('rejects a missing idToken with 400', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('401s without a session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid session cookie', async () => {
    verifyGoogleIdToken.mockResolvedValueOnce(googleProfile);
    const login = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'valid-token' });
    const cookie = login.headers['set-cookie'];

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('newuser@example.com');
  });

  it('authenticates via the Bearer token from the body (native clients)', async () => {
    verifyGoogleIdToken.mockResolvedValueOnce(googleProfile);
    const login = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'valid-token' });
    const { token } = login.body;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('newuser@example.com');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'] || [];
    // clearing sets the cookie with an expired/empty value
    expect(cookies.join(';')).toMatch(/featsoc_token=/);
  });
});
