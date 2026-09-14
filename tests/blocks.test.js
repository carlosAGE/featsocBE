const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('Blocks API', () => {
  it('requires auth to block', async () => {
    const { user: target } = await makeUserWithSession();
    const res = await request(app).post(`/api/users/${target.id}/block`);
    expect(res.status).toBe(401);
  });

  it('rejects blocking yourself', async () => {
    const { user, cookie } = await makeUserWithSession();
    const res = await request(app).post(`/api/users/${user.id}/block`).set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  it('blocks and unblocks idempotently', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: target } = await makeUserWithSession();

    const block = await request(app).post(`/api/users/${target.id}/block`).set('Cookie', cookie);
    expect(block.status).toBe(200);
    expect(block.body.data.blocked).toBe(true);

    const blockAgain = await request(app).post(`/api/users/${target.id}/block`).set('Cookie', cookie);
    expect(blockAgain.status).toBe(200);

    const unblock = await request(app).delete(`/api/users/${target.id}/block`).set('Cookie', cookie);
    expect(unblock.status).toBe(200);
    expect(unblock.body.data.blocked).toBe(false);

    const unblockAgain = await request(app).delete(`/api/users/${target.id}/block`).set('Cookie', cookie);
    expect(unblockAgain.status).toBe(200);
  });

  it('excludes a blocked user\'s videos from the blocker\'s "For You" feed', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: blocked } = await makeUserWithSession();
    await makeVideo(blocked.id, { caption: 'from blocked user' });

    const before = await request(app).get('/api/feed').set('Cookie', cookie);
    expect(before.body.data).toHaveLength(1);

    await request(app).post(`/api/users/${blocked.id}/block`).set('Cookie', cookie);

    const after = await request(app).get('/api/feed').set('Cookie', cookie);
    expect(after.body.data).toHaveLength(0);
  });

  it('excludes a blocked-but-followed user from the Following feed', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: target } = await makeUserWithSession();
    await makeVideo(target.id, { caption: 'from followed-then-blocked user' });

    await request(app).post(`/api/users/${target.id}/follow`).set('Cookie', cookie);
    const before = await request(app).get('/api/feed/following').set('Cookie', cookie);
    expect(before.body.data).toHaveLength(1);

    await request(app).post(`/api/users/${target.id}/block`).set('Cookie', cookie);
    const after = await request(app).get('/api/feed/following').set('Cookie', cookie);
    expect(after.body.data).toHaveLength(0);
  });
});
