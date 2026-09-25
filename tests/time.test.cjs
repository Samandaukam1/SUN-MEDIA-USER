const assert = require('node:assert/strict');
const test = require('node:test');
const {
  agencyDateKey, agencyDayRange, agencyDateTimeToIso, agencyTimeKey,
  addDaysToKey, monthGrid, weekStartKey, formatAgo,
} = require('../lib/time.ts');

test('agency day changes at Tashkent midnight, including year rollover', () => {
  assert.equal(agencyDateKey('2026-12-31T18:59:59.999Z'), '2026-12-31');
  assert.equal(agencyDateKey('2026-12-31T19:00:00.000Z'), '2027-01-01');
});

test('day query boundaries include midnight and exclude the next day', () => {
  assert.deepEqual(agencyDayRange('2026-09-25'), {
    from: '2026-09-24T19:00:00.000Z',
    to: '2026-09-25T19:00:00.000Z',
  });
});

test('scheduled local time converts to the correct UTC instant', () => {
  const instant = agencyDateTimeToIso('2026-09-25', '00:15');
  assert.equal(instant, '2026-09-24T19:15:00.000Z');
  assert.equal(agencyDateKey(instant), '2026-09-25');
  assert.equal(agencyTimeKey(instant), '00:15');
});

test('calendar arithmetic handles leap days and month boundaries', () => {
  assert.equal(addDaysToKey('2028-02-28', 1), '2028-02-29');
  assert.equal(addDaysToKey('2028-02-29', 1), '2028-03-01');
  assert.equal(addDaysToKey('2027-01-01', -1), '2026-12-31');
});

test('calendar weeks begin on Monday even across month boundaries', () => {
  assert.equal(weekStartKey('2026-11-01'), '2026-10-26');
  assert.equal(weekStartKey('2026-11-02'), '2026-11-02');
  const grid = monthGrid('2026-11-01');
  assert.equal(grid.length, 42);
  assert.equal(grid[0], '2026-10-26');
  assert.equal(grid[41], '2026-12-06');
  assert.equal(new Set(grid).size, 42);
});

test('relative activity labels use the agency day instead of the UTC day', () => {
  assert.equal(formatAgo('2026-09-25T18:50:00Z', new Date('2026-09-25T19:10:00Z')), '20 daq oldin');
  assert.equal(formatAgo('2026-09-25T18:00:00Z', new Date('2026-09-25T19:10:00Z')), 'kecha, 23:00');
});
