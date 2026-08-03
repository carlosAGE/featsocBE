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

describe('POST /api/auth/signup', () => {
  const creds = { email: 'signup@example.com', password: 'supersecret' };

  it('creates an account and returns { token, user } (201)', async () => {
    const res = await request(app).post('/api/auth/signup').send(creds);

    expect(res.status).toBe(201);
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.email).toBe('signup@example.com');
    expect(typeof res.body.token).toBe('string');
    // hash must never be exposed
    expect(res.body.user.passwordHash).toBeUndefined();

    // web cookie is also set
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.join(';')).toMatch(/featsoc_token=/);
  });

  it('lowercases and trims the email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: '  MixedCase@Example.com  ', password: 'supersecret' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('mixedcase@example.com');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/signup').send(creds);
    const res = await request(app).post('/api/auth/signup').send(creds);
    expect(res.status).toBe(409);
  });

  it('rejects an invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'supersecret' });
    expect(res.status).toBe(400);
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'x@example.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('issues a token that authenticates GET /api/auth/me', async () => {
    const signup = await request(app).post('/api/auth/signup').send(creds);
    const { token } = signup.body;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('signup@example.com');
  });
});

describe('POST /api/auth/login', () => {
  const creds = { email: 'login@example.com', password: 'supersecret' };

  async function signup() {
    return request(app).post('/api/auth/signup').send(creds);
  }

  it('logs in with correct credentials and returns { token, user }', async () => {
    await signup();

    const res = await request(app).post('/api/auth/login').send(creds);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('login@example.com');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.join(';')).toMatch(/featsoc_token=/);
  });

  it('is case-insensitive on the email', async () => {
    await signup();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'LOGIN@Example.com', password: creds.password });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    await signup();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'supersecret' });
    expect(res.status).toBe(401);
  });

  it('rejects a social-only account (no password) with 401', async () => {
    await User.create({
      username: 'socialonly',
      email: 'social@example.com',
      authProviders: [{ provider: 'google', providerId: 'g-1' }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'social@example.com', password: 'anything123' });
    expect(res.status).toBe(401);
  });

  it('rejects a missing password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email });
    expect(res.status).toBe(400);
  });

  it('issues a token that authenticates GET /api/auth/me', async () => {
    await signup();
    const login = await request(app).post('/api/auth/login').send(creds);
    const { token } = login.body;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('login@example.com');
  });
});

describe('POST /api/auth/google', () => {
  it('creates a new account and sets a session cookie on first sign-in', async () => {
    verifyGoogleIdToken.mockResolvedValueOnce(googleProfile);

    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'valid-token' });

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.user.email).toBe('newuser@example.com');
    expect(res.body.user.emailVerified).toBe(true);
    expect(res.body.user.username).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();

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

    expect(first.body.user.id).toBe(second.body.user.id);
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
    expect(res.body.user.id).toBe(existing.id);
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
    expect(res.body.user.email).toBe('newuser@example.com');
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
    expect(res.body.user.email).toBe('newuser@example.com');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.join(';')).toMatch(/featsoc_token=/);
  });
});
