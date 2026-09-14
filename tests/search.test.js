const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('GET /api/search', () => {
  it('returns empty results for an empty query', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ users: [], videos: [] });
  });

  it('finds a user by username', async () => {
    await makeUserWithSession({ username: 'skateboardqueen' });

    const res = await request(app).get('/api/search?q=skateboard');
    expect(res.status).toBe(200);
    expect(res.body.data.users.some((u) => u.username === 'skateboardqueen')).toBe(true);
  });

  it('finds a video by caption text', async () => {
    const { user } = await makeUserWithSession();
    await makeVideo(user.id, { caption: 'a really cool skateboard trick' });

    const res = await request(app).get('/api/search?q=skateboard');
    expect(res.status).toBe(200);
    expect(res.body.data.videos.length).toBeGreaterThan(0);
  });

  it('finds a video by hashtag text', async () => {
    const { user } = await makeUserWithSession();
    await makeVideo(user.id, { caption: 'no matching words here', hashtags: ['skateboarding'] });

    const res = await request(app).get('/api/search?q=skateboarding');
    expect(res.body.data.videos.length).toBeGreaterThan(0);
  });

  it('excludes private videos from results', async () => {
    const { user } = await makeUserWithSession();
    await makeVideo(user.id, { caption: 'secret skateboard footage', privacy: 'private' });

    const res = await request(app).get('/api/search?q=skateboard');
    expect(res.body.data.videos).toHaveLength(0);
  });
});
