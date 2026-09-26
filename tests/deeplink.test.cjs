const assert = require('node:assert/strict');
const test = require('node:test');
const { notificationPath } = require('../lib/deeplink.ts');

const ID = '3f29cd70-06ac-4d73-80a8-ac47ef410a6e';

test('notification routes map to app screens', () => {
  assert.equal(notificationPath(`/content/${ID}`, 'client'), `/content/${ID}`);
  assert.equal(notificationPath(`/approvals/${ID}`, 'client'), `/approvals/${ID}`);
  assert.equal(notificationPath(`/chat/${ID}/`, 'staff'), `/chat/${ID}`);
});

test('older plural paths still open the right screen', () => {
  assert.equal(notificationPath(`/shootings/${ID}`, 'client'), `/shooting/${ID}`);
  assert.equal(notificationPath(`/tasks/${ID}`, 'staff'), `/task/${ID}`);
});

test('staff-only screens are never opened for clients', () => {
  assert.equal(notificationPath(`/task/${ID}`, 'client'), null);
  assert.equal(notificationPath(`/announcements/${ID}`, 'client'), null);
  assert.equal(notificationPath(`/announcements/${ID}`, 'staff'), `/announcements/${ID}`);
});

test('unknown or malformed routes open nothing', () => {
  assert.equal(notificationPath('/plan', 'client'), null);
  assert.equal(notificationPath('/content/not-an-id', 'client'), null);
  assert.equal(notificationPath(undefined, 'staff'), null);
  assert.equal(notificationPath('https://evil.example/content/' + ID, 'staff'), null);
});
