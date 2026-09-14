const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('Notifications API', () => {
  it('requires auth to list notifications', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('notifies the target user on follow', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: target, cookie: targetCookie } = await makeUserWithSession();

    await request(app).post(`/api/users/${target.id}/follow`).set('Cookie', cookie);

    const res = await request(app).get('/api/notifications').set('Cookie', targetCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('follow');
    expect(res.body.data[0].isRead).toBe(false);
    expect(res.body.unreadCount).toBe(1);
  });

  it('notifies the video owner on like, but not on a self-like', async () => {
    const { cookie: ownerCookie, user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', ownerCookie);
    const selfRes = await request(app).get('/api/notifications').set('Cookie', ownerCookie);
    expect(selfRes.body.data).toHaveLength(0);

    const { cookie: likerCookie } = await makeUserWithSession();
    await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', likerCookie);

    const res = await request(app).get('/api/notifications').set('Cookie', ownerCookie);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('like');
    expect(res.body.data[0].video.id).toBe(video.id);
  });

  it('notifies the video owner on comment', async () => {
    const { cookie: ownerCookie, user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);
    const { cookie: commenterCookie } = await makeUserWithSession();

    await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', commenterCookie)
      .send({ content: 'nice' });

    const res = await request(app).get('/api/notifications').set('Cookie', ownerCookie);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('comment');
  });

  it('does not double-notify when liking an already-liked video', async () => {
    const { cookie: ownerCookie, user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);
    const { cookie: likerCookie } = await makeUserWithSession();

    await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', likerCookie);
    await request(app).post(`/api/videos/${video.id}/like`).set('Cookie', likerCookie);

    const res = await request(app).get('/api/notifications').set('Cookie', ownerCookie);
    expect(res.body.data).toHaveLength(1);
  });

  it('marks all notifications read', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: target, cookie: targetCookie } = await makeUserWithSession();
    await request(app).post(`/api/users/${target.id}/follow`).set('Cookie', cookie);

    const before = await request(app).get('/api/notifications').set('Cookie', targetCookie);
    expect(before.body.unreadCount).toBe(1);

    await request(app).post('/api/notifications/read-all').set('Cookie', targetCookie);

    const after = await request(app).get('/api/notifications').set('Cookie', targetCookie);
    expect(after.body.unreadCount).toBe(0);
    expect(after.body.data[0].isRead).toBe(true);
  });
});
