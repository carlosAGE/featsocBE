const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('Feed API', () => {
  describe('GET /api/feed', () => {
    it('lists videos newest first (public, no auth needed)', async () => {
      const { user } = await makeUserWithSession();
      await makeVideo(user.id, { caption: 'first' });
      await makeVideo(user.id, { caption: 'second' });

      const res = await request(app).get('/api/feed');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.data[0].caption).toBe('second');
    });

    it('paginates with a cursor', async () => {
      const { user } = await makeUserWithSession();
      await makeVideo(user.id, { caption: 'first' });
      await makeVideo(user.id, { caption: 'second' });
      await makeVideo(user.id, { caption: 'third' });

      const page1 = await request(app).get('/api/feed?limit=2');
      expect(page1.body.data.map((v) => v.caption)).toEqual(['third', 'second']);
      expect(page1.body.nextCursor).toBeTruthy();

      const page2 = await request(app).get(
        `/api/feed?limit=2&cursor=${encodeURIComponent(page1.body.nextCursor)}`
      );
      expect(page2.body.data.map((v) => v.caption)).toEqual(['first']);
      expect(page2.body.nextCursor).toBeNull();
    });

    it('rejects a malformed cursor', async () => {
      const res = await request(app).get('/api/feed?cursor=not-a-date');
      expect(res.status).toBe(400);
    });

    it('defaults isLiked to false with no viewer, and reflects a real like when authenticated', async () => {
      const { user: owner } = await makeUserWithSession();
      const video = await makeVideo(owner.id);

      const anonRes = await request(app).get('/api/feed');
      expect(anonRes.body.data[0].isLiked).toBe(false);

      const { cookie } = await makeUserWithSession();
      await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', cookie);

      const viewerRes = await request(app).get('/api/feed').set('Cookie', cookie);
      expect(viewerRes.body.data[0].isLiked).toBe(true);
    });
  });

  describe('GET /api/feed/following', () => {
    it('requires auth', async () => {
      const res = await request(app).get('/api/feed/following');
      expect(res.status).toBe(401);
    });

    it('only returns videos from followed users', async () => {
      const { cookie } = await makeUserWithSession();
      const { user: followed } = await makeUserWithSession();
      const { user: stranger } = await makeUserWithSession();

      await makeVideo(followed.id, { caption: 'from followed' });
      await makeVideo(stranger.id, { caption: 'from stranger' });

      await request(app).post(`/api/users/${followed.id}/follow`).set('Cookie', cookie);

      const res = await request(app).get('/api/feed/following').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].caption).toBe('from followed');
    });

    it('returns an empty feed when following no one', async () => {
      const { cookie } = await makeUserWithSession();
      const res = await request(app).get('/api/feed/following').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
