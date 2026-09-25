const assert = require('node:assert/strict');
const test = require('node:test');
const { formatTimecode, parseTimecode, timelineFraction } = require('../lib/timecode.ts');

test('timecodes format as mm:ss, with hours only when needed', () => {
  assert.equal(formatTimecode(0), '00:00');
  assert.equal(formatTimecode(13000), '00:13');
  assert.equal(formatTimecode(13999), '00:13');
  assert.equal(formatTimecode(62000), '01:02');
  assert.equal(formatTimecode(3723000), '1:02:03');
  assert.equal(formatTimecode(null), '--:--');
  assert.equal(formatTimecode(-5), '--:--');
});

test('timecodes parse from seconds, mm:ss and h:mm:ss', () => {
  assert.equal(parseTimecode('13'), 13000);
  assert.equal(parseTimecode('0:13'), 13000);
  assert.equal(parseTimecode('01:02'), 62000);
  assert.equal(parseTimecode('1:02:03'), 3723000);
  assert.equal(parseTimecode('00:13.5'), 13500);
  assert.equal(parseTimecode('1:75'), null);
  assert.equal(parseTimecode('abc'), null);
  assert.equal(parseTimecode(''), null);
});

test('timeline markers are clamped to the track', () => {
  assert.equal(timelineFraction(15000, 60000), 0.25);
  assert.equal(timelineFraction(90000, 60000), 1);
  assert.equal(timelineFraction(1000, null), 0);
  assert.equal(timelineFraction(null, 60000), 0);
});
