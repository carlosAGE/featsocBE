const mongoose = require('mongoose');
const { signAuthToken } = require('../src/lib/jwt');
const User = require('../src/models/User');
const Video = require('../src/models/Video');

let counter = 0;

// Creates a real user and returns it along with a Cookie header carrying a
// valid session JWT — the same cookie the Google flow would set. Lets tests
// exercise protected routes without going through Google.
async function makeUserWithSession(overrides = {}) {
  counter += 1;
  const user = await User.create({
    username: overrides.username || `tester${counter}`,
    email: overrides.email || `tester${counter}@example.com`,
    ...overrides,
  });
  const token = signAuthToken(user.id);
  return { user, cookie: [`featsoc_token=${token}`] };
}

// Creates a video directly against the model, bypassing the real
// upload/ffmpeg pipeline (covered separately by videos.test.js), for tests
// that just need "a video that exists".
async function makeVideo(ownerId, overrides = {}) {
  return Video.create({
    owner: ownerId,
    key: `videos/${new mongoose.Types.ObjectId()}.mp4`,
    url: 'https://fake-r2.example.com/videos/fixture.mp4',
    ...overrides,
  });
}

module.exports = { makeUserWithSession, makeVideo };
