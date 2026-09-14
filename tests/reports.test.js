const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('Reports API', () => {
  it('requires auth to report', async () => {
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);
    const res = await request(app)
      .post('/api/reports')
      .send({ targetType: 'video', targetId: video.id, reason: 'spam' });
    expect(res.status).toBe(401);
  });

  it('creates a report against a video', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const res = await request(app)
      .post('/api/reports')
      .set('Cookie', cookie)
      .send({ targetType: 'video', targetId: video.id, reason: 'spam' });

    expect(res.status).toBe(201);
    expect(res.body.data.targetType).toBe('video');
    expect(res.body.data.reason).toBe('spam');
  });

  it('rejects an invalid targetType', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const res = await request(app)
      .post('/api/reports')
      .set('Cookie', cookie)
      .send({ targetType: 'nonsense', targetId: video.id });
    expect(res.status).toBe(400);
  });
});
