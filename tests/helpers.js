const { signAuthToken } = require('../src/lib/jwt');
const User = require('../src/models/User');

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

module.exports = { makeUserWithSession };
