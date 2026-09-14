const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession } = require('./helpers');

const app = createApp();

describe('Follow API', () => {
  it('follows a user and increments both counters', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: target } = await makeUserWithSession();

    const res = await request(app)
      .post(`/api/users/${target.id}/follow`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.following).toBe(true);

    const targetRes = await request(app).get(`/api/users/${target.id}`);
    expect(targetRes.body.data.followerCount).toBe(1);
  });

  it('is idempotent — following twice does not double-count', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: target } = await makeUserWithSession();

    await request(app).post(`/api/users/${target.id}/follow`).set('Cookie', cookie);
    await request(app).post(`/api/users/${target.id}/follow`).set('Cookie', cookie);

    const targetRes = await request(app).get(`/api/users/${target.id}`);
    expect(targetRes.body.data.followerCount).toBe(1);
  });

  it('rejects following yourself', async () => {
    const { user, cookie } = await makeUserWithSession();
    const res = await request(app).post(`/api/users/${user.id}/follow`).set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  it('requires auth to follow', async () => {
    const { user: target } = await makeUserWithSession();
    const res = await request(app).post(`/api/users/${target.id}/follow`);
    expect(res.status).toBe(401);
  });

  it('unfollows and decrements both counters', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: target } = await makeUserWithSession();

    await request(app).post(`/api/users/${target.id}/follow`).set('Cookie', cookie);
    const res = await request(app)
      .delete(`/api/users/${target.id}/follow`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.following).toBe(false);

    const targetRes = await request(app).get(`/api/users/${target.id}`);
    expect(targetRes.body.data.followerCount).toBe(0);
  });

  it('is idempotent — unfollowing when not following is a no-op', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: target } = await makeUserWithSession();

    const res = await request(app)
      .delete(`/api/users/${target.id}/follow`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.following).toBe(false);
  });

  it('lists followers and following', async () => {
    const { user: a, cookie: cookieA } = await makeUserWithSession();
    const { user: b } = await makeUserWithSession();

    await request(app).post(`/api/users/${b.id}/follow`).set('Cookie', cookieA);

    const followers = await request(app).get(`/api/users/${b.id}/followers`);
    expect(followers.status).toBe(200);
    expect(followers.body.data).toHaveLength(1);
    expect(followers.body.data[0].username).toBe(a.username);

    const following = await request(app).get(`/api/users/${a.id}/following`);
    expect(following.status).toBe(200);
    expect(following.body.data).toHaveLength(1);
    expect(following.body.data[0].username).toBe(b.username);
  });
});
