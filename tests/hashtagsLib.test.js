const { extractHashtags } = require('../src/lib/hashtags');

describe('extractHashtags', () => {
  it('extracts, lowercases, and dedupes hashtags from a caption', () => {
    expect(extractHashtags('having fun #Beach #sunset #Beach')).toEqual(['beach', 'sunset']);
  });

  it('returns an empty array for no hashtags', () => {
    expect(extractHashtags('just a normal caption')).toEqual([]);
  });

  it('returns an empty array for empty/undefined input', () => {
    expect(extractHashtags('')).toEqual([]);
    expect(extractHashtags(undefined)).toEqual([]);
  });

  it('ignores a bare # with no word characters after it', () => {
    expect(extractHashtags('price is # 5')).toEqual([]);
  });
});
