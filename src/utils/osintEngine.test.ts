import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTelegramUsername,
  getDataCenterMetadata,
  interpolateAccountCreation,
  extractBioEntities,
  parseBotHistoryReply,
  estimateTimezoneFromHourlyUtc,
  generateDorkQueries,
  evaluatePrivacyHardening,
} from './osintEngine';

test('validateTelegramUsername validates and cleans @username strings', () => {
  const valid = validateTelegramUsername('  @shaghaghidev  ');
  assert.equal(valid.valid, true);
  assert.equal(valid.cleaned, 'shaghaghidev');

  const empty = validateTelegramUsername('   ');
  assert.equal(empty.valid, false);
  assert.ok(empty.error);

  const invalidChars = validateTelegramUsername('@123invalidstart');
  assert.equal(invalidChars.valid, false);
});

test('getDataCenterMetadata maps DC1-DC5 to correct geographical regions', () => {
  assert.equal(getDataCenterMetadata(2).location, 'Amsterdam, Netherlands');
  assert.equal(getDataCenterMetadata(1).location, 'Miami, Florida, United States');
  assert.equal(getDataCenterMetadata(5).location, 'Singapore');
});

test('interpolateAccountCreation estimates creation dates accurately across milestones', () => {
  const early = interpolateAccountCreation(50_000);
  assert.equal(early.isoDate, '2013-08-14');

  const mid2018 = interpolateAccountCreation(500_000_000);
  assert.equal(mid2018.isoDate, '2018-01-20');

  const mid2021 = interpolateAccountCreation(1_875_000_000);
  assert.ok(mid2021.isoDate.startsWith('2021-'));
});

test('extractBioEntities extracts URLs, emails, and @handles via Regex', () => {
  const bio = 'Security Architect | Portfolio: https://shaghaghidev.ir | Mail: info@shaghaghidev.ir | Channel: @spectragram_sec';
  const res = extractBioEntities(bio);
  assert.deepEqual(res.emails, ['info@shaghaghidev.ir']);
  assert.deepEqual(res.urls, ['https://shaghaghidev.ir']);
  assert.deepEqual(res.handles, ['@spectragram_sec']);
});

test('parseBotHistoryReply strictly filters out @username, @user, bot handles, and ads', () => {
  const noisyBotReply = `
History for user 418920341:
Send me a user ID or forward a message from @username or @user to check!
Subscribe to @SangMata_BOT and @usinfobot for updates.
Names:
1. [14.03.2021 19:22] Alexey K.
2. [09.11.2023 08:15] Alex Kovalev
Usernames:
1. [14.03.2021 19:22] @akovalev_dev
2. [09.11.2023 08:15] @alex_kovalev_sec
3. [10.11.2023 09:00] @username
  `;
  const parsed = parseBotHistoryReply(noisyBotReply, '@SangMata_BOT');
  assert.equal(parsed.usernames.length, 2);
  assert.deepEqual(
    parsed.usernames.map((u) => u.username),
    ['akovalev_dev', 'alex_kovalev_sec']
  );
  assert.equal(parsed.names.length, 2);
  assert.equal(parsed.names[0].displayName, 'Alexey K.');
});

test('estimateTimezoneFromHourlyUtc detects UTC+02:00 sleep trough accurately', () => {
  const histogram = [
    0, 0, 0, 1, 0,
    8, 16, 28, 35, 42, 38, 30, 25, 29, 44, 52, 48, 39, 31, 24, 18, 12, 6,
    0,
  ];
  const tz = estimateTimezoneFromHourlyUtc(histogram);
  assert.equal(tz.estimatedOffset, 'UTC+02:00');
  assert.equal(tz.peakHourUtc, 15);
});

test('generateDorkQueries builds Telegram search indexes and categorized Google dorks', () => {
  const dorks = generateDorkQueries(['shaghaghidev', 'spectragram']);
  assert.equal(dorks.length, 14);
  assert.ok(dorks.some((d) => d.engine === 'Lyzem' && d.username === 'shaghaghidev'));
  assert.ok(dorks.some((d) => d.category === 'Code & Paste Leaks'));
});

test('evaluatePrivacyHardening computes accurate exposure score and lockdown checklist', () => {
  const result = evaluatePrivacyHardening({
    phone: null,
    bioEntities: { urls: ['https://shaghaghidev.ir'], emails: ['abolfazl@shaghaghidev.ir'], handles: [] },
    avatarsCount: 3,
    historicalUsernamesCount: 2,
    sampledMessagesCount: 420,
    estimatedOffset: 'UTC+03:30',
    githubLeaksCount: 1,
    crossPlatformCount: 6,
  });
  assert.equal(result.score, 20);
  assert.ok(result.checklist.length >= 6);
  assert.ok(result.checklist.some((c) => c.severity === 'Hardened'));
  assert.ok(result.checklist.some((c) => c.id === 'github-email-leak'));
});
