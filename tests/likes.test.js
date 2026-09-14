const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('Likes API', () => {
  it('likes a video and increments its count', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const res = await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ liked: true, likeCount: 1 });
  });

  it('is idempotent — liking twice does not double-count', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', cookie);
    const res = await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', cookie);
    expect(res.body.data.likeCount).toBe(1);
  });

  it('requires auth to like', async () => {
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);
    const res = await request(app).post(`/api/videos/${video.id}/like`);
    expect(res.status).toBe(401);
  });

  it('returns 404 liking a missing video', async () => {
    const { cookie } = await makeUserWithSession();
    const res = await request(app)
      .post('/api/videos/64b7f0000000000000000000/like')
      .set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('unlikes and decrements the count', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', cookie);
    const res = await request(app).delete(`/api/videos/${video.id}/like`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ liked: false, likeCount: 0 });
  });

  it('is idempotent — unliking when not liked is a no-op', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const res = await request(app).delete(`/api/videos/${video.id}/like`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.likeCount).toBe(0);
  });
});
