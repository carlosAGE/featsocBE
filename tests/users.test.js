const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession } = require('./helpers');

const app = createApp();

describe('Users API', () => {
  const valid = {
    username: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice',
  };

  it('creates a user', async () => {
    const res = await request(app).post('/api/users').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data.username).toBe('alice');
    expect(res.body.data.id).toBeDefined();
  });

  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ ...valid, email: 'nope' });
    expect(res.status).toBe(400);
  });

  it('rejects a short username', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ ...valid, username: 'ab' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate username with 409', async () => {
    await request(app).post('/api/users').send(valid);
    const res = await request(app)
      .post('/api/users')
      .send({ ...valid, email: 'other@example.com' });
    expect(res.status).toBe(409);
  });

  it('lists and fetches users', async () => {
    const created = await request(app).post('/api/users').send(valid);
    const { id } = created.body.data;

    const list = await request(app).get('/api/users');
    expect(list.status).toBe(200);
    expect(list.body.count).toBe(1);

    const one = await request(app).get(`/api/users/${id}`);
    expect(one.status).toBe(200);
    expect(one.body.data.username).toBe('alice');
  });

  it('defaults isFollowing to false with no viewer, true once the viewer follows', async () => {
    const created = await request(app).post('/api/users').send(valid);
    const { id } = created.body.data;

    const anonRes = await request(app).get(`/api/users/${id}`);
    expect(anonRes.body.data.isFollowing).toBe(false);

    const { cookie } = await makeUserWithSession();
    await request(app).post(`/api/users/${id}/follow`).set('Cookie', cookie);

    const viewerRes = await request(app).get(`/api/users/${id}`).set('Cookie', cookie);
    expect(viewerRes.body.data.isFollowing).toBe(true);
  });

  it('defaults isBlocked to false with no viewer, true once the viewer blocks', async () => {
    const created = await request(app).post('/api/users').send(valid);
    const { id } = created.body.data;

    const anonRes = await request(app).get(`/api/users/${id}`);
    expect(anonRes.body.data.isBlocked).toBe(false);

    const { cookie } = await makeUserWithSession();
    await request(app).post(`/api/users/${id}/block`).set('Cookie', cookie);

    const viewerRes = await request(app).get(`/api/users/${id}`).set('Cookie', cookie);
    expect(viewerRes.body.data.isBlocked).toBe(true);
  });

  it('lets a user edit their own profile', async () => {
    const { user, cookie } = await makeUserWithSession();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set('Cookie', cookie)
      .send({ displayName: 'New Name', bio: 'updated bio', avatarUrl: 'https://example.com/a.png' });

    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe('New Name');
    expect(res.body.data.bio).toBe('updated bio');
    expect(res.body.data.avatarUrl).toBe('https://example.com/a.png');
  });

  it('requires auth to edit a profile', async () => {
    const { user } = await makeUserWithSession();
    const res = await request(app).patch(`/api/users/${user.id}`).send({ displayName: 'Nope' });
    expect(res.status).toBe(401);
  });

  it("forbids editing someone else's profile (403)", async () => {
    const { user: target } = await makeUserWithSession();
    const { cookie: otherCookie } = await makeUserWithSession();

    const res = await request(app)
      .patch(`/api/users/${target.id}`)
      .set('Cookie', otherCookie)
      .send({ displayName: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  it('rejects a bio over the length limit', async () => {
    const { user, cookie } = await makeUserWithSession();
    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set('Cookie', cookie)
      .send({ bio: 'x'.repeat(281) });
    expect(res.status).toBe(400);
  });

  it('lets a user toggle their account private', async () => {
    const { user, cookie } = await makeUserWithSession();
    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set('Cookie', cookie)
      .send({ isPrivate: true });
    expect(res.status).toBe(200);
    expect(res.body.data.isPrivate).toBe(true);
  });
});
