const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const request = require('supertest');

// Real ffmpeg processing runs in these tests (against a tiny generated
// fixture) — only R2 network calls are mocked, so this exercises the actual
// normalize/thumbnail/probe pipeline.
jest.mock('../src/lib/r2Client', () => ({
  uploadFile: jest.fn(async (key) => `https://fake-r2.example.com/${key}`),
  deleteFile: jest.fn(async () => {}),
}));

const createApp = require('../src/app');
const { makeUserWithSession } = require('./helpers');

const app = createApp();

jest.setTimeout(30000);

let fixturePath;
let junkPath;

beforeAll(() => {
  fixturePath = path.join(os.tmpdir(), 'featsoc-test-fixture.mp4');
  const result = spawnSync(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', 'testsrc=duration=2:size=320x240:rate=15',
    '-pix_fmt', 'yuv420p',
    fixturePath,
  ]);
  if (result.status !== 0) {
    throw new Error(`failed to build test fixture: ${result.stderr}`);
  }

  junkPath = path.join(os.tmpdir(), 'featsoc-test-junk.txt');
  fs.writeFileSync(junkPath, 'not a video');
});

afterAll(() => {
  fs.rmSync(fixturePath, { force: true });
  fs.rmSync(junkPath, { force: true });
});

describe('Videos API', () => {
  it('uploads, normalizes, and stores a video as the authenticated user', async () => {
    const { user, cookie } = await makeUserWithSession();

    const res = await request(app)
      .post('/api/videos')
      .set('Cookie', cookie)
      .field('caption', 'hello from a test')
      .attach('file', fixturePath);

    expect(res.status).toBe(201);
    const { data } = res.body;
    expect(data.id).toBeDefined();
    expect(String(data.owner)).toBe(user.id);
    expect(data.caption).toBe('hello from a test');
    expect(data.url).toMatch(/^https:\/\/fake-r2\.example\.com\/videos\/.+\.mp4$/);
    expect(data.thumbnailUrl).toMatch(/^https:\/\/fake-r2\.example\.com\/thumbnails\/.+\.jpg$/);
    expect(data.durationSeconds).toBeGreaterThan(0);
    expect(data.width).toBeGreaterThan(0);
    expect(data.height).toBeGreaterThan(0);
    expect(data.sizeBytes).toBeGreaterThan(0);
    // storage keys are internal, never part of the response contract
    expect(data.key).toBeUndefined();
    expect(data.thumbnailKey).toBeUndefined();
  });

  it('rejects an upload without a session (401)', async () => {
    const res = await request(app).post('/api/videos').attach('file', fixturePath);
    expect(res.status).toBe(401);
  });

  it('rejects a request with no file (400)', async () => {
    const { cookie } = await makeUserWithSession();
    const res = await request(app).post('/api/videos').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  it('rejects an unsupported file type (400)', async () => {
    const { cookie } = await makeUserWithSession();
    const res = await request(app)
      .post('/api/videos')
      .set('Cookie', cookie)
      .attach('file', junkPath);
    expect(res.status).toBe(400);
  });

  it('gets a video by id (public)', async () => {
    const { cookie } = await makeUserWithSession();
    const created = await request(app)
      .post('/api/videos')
      .set('Cookie', cookie)
      .attach('file', fixturePath);

    const res = await request(app).get(`/api/videos/${created.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
  });

  it('returns 404 for a missing video', async () => {
    const res = await request(app).get('/api/videos/64b7f0000000000000000000');
    expect(res.status).toBe(404);
  });

  it('deletes a video as its owner (204)', async () => {
    const { cookie } = await makeUserWithSession();
    const created = await request(app)
      .post('/api/videos')
      .set('Cookie', cookie)
      .attach('file', fixturePath);

    const res = await request(app)
      .delete(`/api/videos/${created.body.data.id}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/videos/${created.body.data.id}`);
    expect(getRes.status).toBe(404);
  });

  it('rejects deletion by a non-owner (403)', async () => {
    const { cookie } = await makeUserWithSession();
    const created = await request(app)
      .post('/api/videos')
      .set('Cookie', cookie)
      .attach('file', fixturePath);

    const { cookie: otherCookie } = await makeUserWithSession();
    const res = await request(app)
      .delete(`/api/videos/${created.body.data.id}`)
      .set('Cookie', otherCookie);
    expect(res.status).toBe(403);
  });
});
