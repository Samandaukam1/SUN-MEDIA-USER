const test = require('node:test');
const assert = require('node:assert/strict');
const { sunCoinWalletSchema, transactionLabel, formatSunCoin } = require('../features/sun-coin/types.ts');

function wallet() {
  return {
    balance: 13,
    transactions: [{
      id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      userId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
      amount: -10,
      type: 'GAME_SPEND',
      source: 'SAFI_PENALTY',
      referenceId: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
      createdAt: '2026-09-30T12:00:00.000Z',
      metadata: { game_session_id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc' },
    }],
    attempt: { gameId: 'safi-penalty', freeAvailable: false, nextFreeAt: '2026-10-01T12:00:00.000Z', cost: 10, activeSession: null },
    campaignAvailable: true,
    rewardKinds: ['SUN_COIN', 'PRO_DAYS'],
    campaign: null,
    proCampaign: null,
  };
}

test('wallet preserves signed ledger debits and references, and knows only which kinds of prize exist', () => {
  const parsed = sunCoinWalletSchema.parse(wallet());
  assert.equal(parsed.balance, 13);
  assert.equal(parsed.transactions[0].amount, -10);
  assert.equal(parsed.transactions[0].metadata.game_session_id, parsed.transactions[0].referenceId);
  assert.equal(parsed.attempt.freeAvailable, false);
  assert.deepEqual(parsed.rewardKinds, ['SUN_COIN', 'PRO_DAYS']);
});

test('reward configuration never survives into the app, even if a server sent it', () => {
  const leaky = { ...wallet(), campaign: { minimumScore: 5, options: [{ amount: 3, minScore: 7, maxScore: 10 }] }, proCampaign: { targetScore: 9, rewardDays: 7 },
    difficulty: 'hard', levels: [{ top: 8 }], rules: [{ score: 9 }] };
  const parsed = sunCoinWalletSchema.parse(leaky);
  for (const key of ['campaign', 'proCampaign', 'difficulty', 'levels', 'rules']) assert.equal(key in parsed, false, key);
});

test('wallet refuses unsafe, fractional or negative available balances', () => {
  for (const balance of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, '13']) {
    assert.equal(sunCoinWalletSchema.safeParse({ ...wallet(), balance }).success, false);
  }
  for (const amount of [0.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
    const data = wallet();
    data.transactions[0].amount = amount;
    assert.equal(sunCoinWalletSchema.safeParse(data).success, false);
  }
});

test('future transaction sources remain readable without coupling wallet to SAFI', () => {
  const data = wallet();
  data.transactions[0].type = 'REFERRAL_REWARD';
  data.transactions[0].source = 'REFERRAL';
  data.transactions[0].amount = 3;
  assert.equal(sunCoinWalletSchema.parse(data).transactions[0].type, 'REFERRAL_REWARD');
  assert.equal(transactionLabel('REFERRAL_REWARD'), 'SUN Coin operatsiyasi');
  assert.equal(formatSunCoin(12345), '12 345 SC');
});
