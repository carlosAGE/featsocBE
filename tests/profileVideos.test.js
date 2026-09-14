const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('GET /api/users/:id/videos', () => {
  it('lists a user\'s videos newest first (public)', async () => {
    const { user } = await makeUserWithSession();
    await makeVideo(user.id, { caption: 'first' });
    await makeVideo(user.id, { caption: 'second' });

    const res = await request(app).get(`/api/users/${user.id}/videos`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((v) => v.caption)).toEqual(['second', 'first']);
  });

  it('hides a private account\'s videos from a non-follower', async () => {
    const { user: owner, cookie: ownerCookie } = await makeUserWithSession();
    await makeVideo(owner.id, { caption: 'private post' });
    await request(app).patch(`/api/users/${owner.id}`).set('Cookie', ownerCookie).send({ isPrivate: true });

    const anonRes = await request(app).get(`/api/users/${owner.id}/videos`);
    expect(anonRes.status).toBe(200);
    expect(anonRes.body.data).toEqual([]);
    expect(anonRes.body.private).toBe(true);

    const { cookie: strangerCookie } = await makeUserWithSession();
    const strangerRes = await request(app)
      .get(`/api/users/${owner.id}/videos`)
      .set('Cookie', strangerCookie);
    expect(strangerRes.body.data).toEqual([]);
  });

  it('still shows a private account\'s videos to the owner and to followers', async () => {
    const { user: owner, cookie: ownerCookie } = await makeUserWithSession();
    await makeVideo(owner.id, { caption: 'private post' });
    await request(app).patch(`/api/users/${owner.id}`).set('Cookie', ownerCookie).send({ isPrivate: true });

    const ownRes = await request(app).get(`/api/users/${owner.id}/videos`).set('Cookie', ownerCookie);
    expect(ownRes.body.data).toHaveLength(1);

    const { cookie: followerCookie } = await makeUserWithSession();
    await request(app).post(`/api/users/${owner.id}/follow`).set('Cookie', followerCookie);
    const followerRes = await request(app)
      .get(`/api/users/${owner.id}/videos`)
      .set('Cookie', followerCookie);
    expect(followerRes.body.data).toHaveLength(1);
  });
});
