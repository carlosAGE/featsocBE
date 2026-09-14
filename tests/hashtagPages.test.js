const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('GET /api/hashtags/:tag/videos', () => {
  it('lists public videos with the given hashtag, newest first', async () => {
    const { user } = await makeUserWithSession();
    await makeVideo(user.id, { caption: 'first #travel', hashtags: ['travel'] });
    await makeVideo(user.id, { caption: 'second #travel', hashtags: ['travel'] });
    await makeVideo(user.id, { caption: 'unrelated #food', hashtags: ['food'] });

    const res = await request(app).get('/api/hashtags/travel/videos');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].caption).toBe('second #travel');
  });

  it('is case-insensitive', async () => {
    const { user } = await makeUserWithSession();
    await makeVideo(user.id, { hashtags: ['travel'] });

    const res = await request(app).get('/api/hashtags/TRAVEL/videos');
    expect(res.body.data).toHaveLength(1);
  });

  it('excludes private videos', async () => {
    const { user } = await makeUserWithSession();
    await makeVideo(user.id, { hashtags: ['travel'], privacy: 'private' });

    const res = await request(app).get('/api/hashtags/travel/videos');
    expect(res.body.data).toHaveLength(0);
  });

  it('returns an empty list for an unused tag', async () => {
    const res = await request(app).get('/api/hashtags/nonexistent/videos');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
