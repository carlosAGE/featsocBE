const request = require('supertest');
const createApp = require('../src/app');
const { makeUserWithSession, makeVideo } = require('./helpers');

const app = createApp();

describe('Comments API', () => {
  it('creates a top-level comment and increments the video count', async () => {
    const { user, cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const res = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'nice video' });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('nice video');
    expect(String(res.body.data.author.id)).toBe(user.id);
    expect(res.body.data.parentComment).toBeNull();

    const videoRes = await request(app).get(`/api/videos/${video.id}`);
    expect(videoRes.body.data.commentCount).toBe(1);
  });

  it('requires auth to comment', async () => {
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);
    const res = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .send({ content: 'no auth' });
    expect(res.status).toBe(401);
  });

  it('rejects an empty comment', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);
    const res = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a comment that fails the content filter (400)', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);
    const res = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'what an asshole thing to say' });
    expect(res.status).toBe(400);
  });

  it('creates a reply and flattens it under the top-level comment', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const top = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'top level' });

    const reply = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'a reply', parentCommentId: top.body.data.id });

    expect(reply.status).toBe(201);
    expect(reply.body.data.parentComment).toBe(top.body.data.id);
  });

  it('lists only top-level comments, newest first', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const first = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'first' });
    await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'second' });
    await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'a reply', parentCommentId: first.body.data.id });

    const res = await request(app).get(`/api/videos/${video.id}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.content)).toEqual(['second', 'first']);
  });

  it('lets the author delete their own comment and decrements the count', async () => {
    const { cookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const created = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'delete me' });

    const del = await request(app)
      .delete(`/api/comments/${created.body.data.id}`)
      .set('Cookie', cookie);
    expect(del.status).toBe(204);

    const videoRes = await request(app).get(`/api/videos/${video.id}`);
    expect(videoRes.body.data.commentCount).toBe(0);
  });

  it('forbids deleting someone else\'s comment (403)', async () => {
    const { cookie } = await makeUserWithSession();
    const { cookie: otherCookie } = await makeUserWithSession();
    const { user: owner } = await makeUserWithSession();
    const video = await makeVideo(owner.id);

    const created = await request(app)
      .post(`/api/videos/${video.id}/comments`)
      .set('Cookie', cookie)
      .send({ content: 'mine' });

    const res = await request(app)
      .delete(`/api/comments/${created.body.data.id}`)
      .set('Cookie', otherCookie);
    expect(res.status).toBe(403);
  });
});
