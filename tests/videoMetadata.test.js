const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('Video metadata', () => {
  describe('PATCH /api/videos/:id', () => {
    it('lets the owner edit caption and privacy', async () => {
      const { cookie, user } = await makeUserWithSession();
      const video = await makeVideo(user.id, { caption: 'before' });

      const res = await request(app)
        .patch(`/api/videos/${video.id}`)
        .set('Cookie', cookie)
        .send({ caption: 'after #newtag', privacy: 'private' });

      expect(res.status).toBe(200);
      expect(res.body.data.caption).toBe('after #newtag');
      expect(res.body.data.hashtags).toEqual(['newtag']);
      expect(res.body.data.privacy).toBe('private');
    });

    it('requires auth to edit', async () => {
      const { user } = await makeUserWithSession();
      const video = await makeVideo(user.id);
      const res = await request(app).patch(`/api/videos/${video.id}`).send({ caption: 'x' });
      expect(res.status).toBe(401);
    });

    it("forbids editing someone else's video (403)", async () => {
      const { user } = await makeUserWithSession();
      const video = await makeVideo(user.id);
      const { cookie: otherCookie } = await makeUserWithSession();

      const res = await request(app)
        .patch(`/api/videos/${video.id}`)
        .set('Cookie', otherCookie)
        .send({ caption: 'hijacked' });
      expect(res.status).toBe(403);
    });

    it('rejects a caption that fails the content filter', async () => {
      const { cookie, user } = await makeUserWithSession();
      const video = await makeVideo(user.id);
      const res = await request(app)
        .patch(`/api/videos/${video.id}`)
        .set('Cookie', cookie)
        .send({ caption: 'this is bullshit' });
      expect(res.status).toBe(400);
    });
  });

  describe('privacy enforcement', () => {
    it('404s a private video for anyone but the owner', async () => {
      const { cookie, user } = await makeUserWithSession();
      const video = await makeVideo(user.id, { privacy: 'private' });

      const anonRes = await request(app).get(`/api/videos/${video.id}`);
      expect(anonRes.status).toBe(404);

      const ownerRes = await request(app).get(`/api/videos/${video.id}`).set('Cookie', cookie);
      expect(ownerRes.status).toBe(200);
    });

    it('excludes private videos from the "For You" and Following feeds', async () => {
      const { user } = await makeUserWithSession();
      await makeVideo(user.id, { privacy: 'private', caption: 'secret' });
      await makeVideo(user.id, { privacy: 'public', caption: 'public one' });

      const feedRes = await request(app).get('/api/feed');
      expect(feedRes.body.data).toHaveLength(1);
      expect(feedRes.body.data[0].caption).toBe('public one');

      const { cookie: followerCookie } = await makeUserWithSession();
      await request(app).post(`/api/users/${user.id}/follow`).set('Cookie', followerCookie);
      const followingRes = await request(app).get('/api/feed/following').set('Cookie', followerCookie);
      expect(followingRes.body.data).toHaveLength(1);
    });

    it("excludes a private video from the owner's public video list to strangers", async () => {
      const { cookie, user } = await makeUserWithSession();
      await makeVideo(user.id, { privacy: 'private' });
      await makeVideo(user.id, { privacy: 'public' });

      const anonRes = await request(app).get(`/api/users/${user.id}/videos`);
      expect(anonRes.body.data).toHaveLength(1);

      const ownerRes = await request(app).get(`/api/users/${user.id}/videos`).set('Cookie', cookie);
      expect(ownerRes.body.data).toHaveLength(2);
    });
  });
});
