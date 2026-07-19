const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('Posts API', () => {
  it('creates a post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ content: 'hello world' });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('hello world');
    expect(res.body.data.id).toBeDefined();
  });

  it('rejects an empty post with 400', async () => {
    const res = await request(app).post('/api/posts').send({ content: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/validation/i);
  });

  it('lists posts newest first', async () => {
    await request(app).post('/api/posts').send({ content: 'first' });
    await request(app).post('/api/posts').send({ content: 'second' });

    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data[0].content).toBe('second');
  });

  it('gets a post by id', async () => {
    const created = await request(app)
      .post('/api/posts')
      .send({ content: 'find me' });
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

  it('updates a post', async () => {
    const created = await request(app)
      .post('/api/posts')
      .send({ content: 'before' });
    const { id } = created.body.data;

    const res = await request(app)
      .patch(`/api/posts/${id}`)
      .send({ content: 'after' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('after');
  });

  it('deletes a post', async () => {
    const created = await request(app)
      .post('/api/posts')
      .send({ content: 'temp' });
    const { id } = created.body.data;

    const del = await request(app).delete(`/api/posts/${id}`);
    expect(del.status).toBe(204);

    const res = await request(app).get(`/api/posts/${id}`);
    expect(res.status).toBe(404);
  });
});
