const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('Users API', () => {
  const valid = {
    username: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice',
  };

  it('creates a user', async () => {
    const res = await request(app).post('/api/users').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data.username).toBe('alice');
    expect(res.body.data.id).toBeDefined();
  });

  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ ...valid, email: 'nope' });
    expect(res.status).toBe(400);
  });

  it('rejects a short username', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ ...valid, username: 'ab' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate username with 409', async () => {
    await request(app).post('/api/users').send(valid);
    const res = await request(app)
      .post('/api/users')
      .send({ ...valid, email: 'other@example.com' });
    expect(res.status).toBe(409);
  });

  it('lists and fetches users', async () => {
    const created = await request(app).post('/api/users').send(valid);
    const { id } = created.body.data;

    const list = await request(app).get('/api/users');
    expect(list.status).toBe(200);
    expect(list.body.count).toBe(1);

    const one = await request(app).get(`/api/users/${id}`);
    expect(one.status).toBe(200);
    expect(one.body.data.username).toBe('alice');
  });
});
