const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession } = require('./helpers');

const app = createApp();

// Create a post as an authenticated user; returns the created post body.
async function createPost(cookie, content) {
  const res = await request(app)
    .post('/api/posts')
    .set('Cookie', cookie)
    .send({ content });
  return res;
}

describe('Posts API', () => {
  it('creates a post as the authenticated user', async () => {
    const { user, cookie } = await makeUserWithSession();

    const res = await createPost(cookie, 'hello world');

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('hello world');
    expect(res.body.data.id).toBeDefined();
    // author is taken from the session, not the body
    expect(String(res.body.data.author)).toBe(user.id);
  });

  it('rejects post creation without a session (401)', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ content: 'no auth' });
    expect(res.status).toBe(401);
  });

  it('ignores any author supplied in the body', async () => {
    const { user, cookie } = await makeUserWithSession();
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', cookie)
      .send({ content: 'spoof', author: '64b7f0000000000000000000' });

    expect(res.status).toBe(201);
    expect(String(res.body.data.author)).toBe(user.id);
  });

  it('rejects an empty post with 400', async () => {
    const { cookie } = await makeUserWithSession();
    const res = await createPost(cookie, '');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/validation/i);
  });

  it('lists posts newest first (public, no auth needed)', async () => {
    const { cookie } = await makeUserWithSession();
    await createPost(cookie, 'first');
    await createPost(cookie, 'second');

    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data[0].content).toBe('second');
  });

  it('gets a post by id (public)', async () => {
    const { cookie } = await makeUserWithSession();
    const created = await createPost(cookie, 'find me');
    const { id } = created.body.data;

    const res = await request(app).get(`/api/posts/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('find me');
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/posts/not-an-id');
    expect(res.status).toBe(400);
  });

  it('returns 404 for a missing post', async () => {
    const res = await request(app).get('/api/posts/64b7f0000000000000000000');
    expect(res.status).toBe(404);
  });

  it('lets the author update their own post', async () => {
    const { cookie } = await makeUserWithSession();
    const created = await createPost(cookie, 'before');
    const { id } = created.body.data;

    const res = await request(app)
      .patch(`/api/posts/${id}`)
      .set('Cookie', cookie)
      .send({ content: 'after' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('after');
  });

  it('forbids updating someone else\'s post (403)', async () => {
    const author = await makeUserWithSession();
    const other = await makeUserWithSession();
    const created = await createPost(author.cookie, 'mine');
    const { id } = created.body.data;

    const res = await request(app)
      .patch(`/api/posts/${id}`)
      .set('Cookie', other.cookie)
      .send({ content: 'hijacked' });
    expect(res.status).toBe(403);
  });

  it('lets the author delete their own post', async () => {
    const { cookie } = await makeUserWithSession();
    const created = await createPost(cookie, 'temp');
    const { id } = created.body.data;

    const del = await request(app)
      .delete(`/api/posts/${id}`)
      .set('Cookie', cookie);
    expect(del.status).toBe(204);

    const res = await request(app).get(`/api/posts/${id}`);
    expect(res.status).toBe(404);
  });

  it('forbids deleting someone else\'s post (403)', async () => {
    const author = await makeUserWithSession();
    const other = await makeUserWithSession();
    const created = await createPost(author.cookie, 'mine');
    const { id } = created.body.data;

    const del = await request(app)
      .delete(`/api/posts/${id}`)
      .set('Cookie', other.cookie);
    expect(del.status).toBe(403);
  });
});
