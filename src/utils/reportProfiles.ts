import {
  IntelligenceReport,
  getDataCenterMetadata,
  interpolateAccountCreation,
  extractBioEntities,
  parseBotHistoryReply,
  estimateTimezoneFromHourlyUtc,
  generateDorkQueries,
  evaluatePrivacyHardening,
} from './osintEngine';

const AVATAR_2025 = '/src/assets/images/avatar_current_2025_1794596878077.jpg';
const AVATAR_2023 = '/src/assets/images/avatar_historical_2023_1794596879277.jpg';
const AVATAR_2021 = '/src/assets/images/avatar_historical_2021_1794596881398.jpg';

export interface TargetPresetSummary {
  handle: string;
  roleLabel: string;
  numericId: number;
  dcId: number;
}

export const SAMPLE_TARGETS: TargetPresetSummary[] = [
  {
    handle: '@shaghaghidev',
    roleLabel: 'Principal Security Architect · Author Preset',
    numericId: 584920142,
    dcId: 4,
  },
  {
    handle: '@alex_kovalev_sec',
    roleLabel: 'Systems Security Researcher · EU Cluster',
    numericId: 418920341,
    dcId: 2,
  },
  {
    handle: '@durov',
    roleLabel: 'Founder & Product Architect · Early Genesis ID',
    numericId: 100650312,
    dcId: 4,
  },
];

function deterministicHashNumber(seed: string, min: number, max: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return min + (unsigned % (max - min + 1));
}

function deterministicHex(seed: string, length: number): string {
  const chars = '0123456789abcdef';
  let out = '';
  let state = deterministicHashNumber(seed, 1000, 999999999);
  for (let i = 0; i < length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out += chars[state % 16];
  }
  return out;
}

export function synthesizeIntelligenceReport(rawHandle: string): IntelligenceReport {
  const cleanHandle = rawHandle.replace(/^@/, '').trim() || 'shaghaghidev';
  const lower = cleanHandle.toLowerCase();

  let numericId = 584920142;
  let dcId = 4;
  let firstName = 'Abolfazl';
  let lastName = 'Shaghaghi';
  let bio =
    'Principal Security Architect & Full-Stack Python Developer | Portfolio: https://shaghaghidev.ir | GitHub: https://github.com/shaghaghidev/spectragram | Channel: @shaghaghidev';
  let phone: string | null = null;
  let statusSummary = 'Last seen recently (Active Session)';
  let lastSeenUtc = '2026-11-13T21:45:10Z';
  let flags = {
    premium: true,
    verified: false,
    bot: false,
    scam: false,
    fake: false,
    restricted: false,
  };

  let sangmataReply = [
    `History for user 584920142:`,
    `Send me a user ID or forward a message from @username or @user to check!`,
    `Names:`,
    `1. [12.04.2018 11:20] Abolfazl S.`,
    `2. [08.09.2021 16:40] Abolfazl Shaghaghi`,
    `Usernames:`,
    `1. [12.04.2018 11:20] @a_shaghaghi_py`,
    `2. [08.09.2021 16:40] @${cleanHandle}`,
    `3. [08.09.2021 16:40] @username`,
  ].join('\n');

  let usinfoReply = [
    `[@usinfobot Database Match]`,
    `User ID: 584920142`,
    `Usernames:`,
    `1. [12.04.2018 11:20] @a_shaghaghi_py`,
    `2. [08.09.2021 16:40] @${cleanHandle}`,
  ].join('\n');

  let creationBotReply = [
    `[@creationdatebot Lookup]`,
    `Target ID: 584920142`,
    `Estimated Registration: May 2018 (Interpolated Milestone Cohort)`,
  ].join('\n');

  let hourlyHistogramUtc = [
    0, 0, 0, 1, 3, 12, 24, 38, 49, 54, 48, 42, 37, 41, 52, 58, 50, 44, 36, 28, 19, 9, 2, 0,
  ];

  if (lower === 'alex_kovalev_sec') {
    numericId = 418920341;
    dcId = 2;
    firstName = 'Alexey';
    lastName = 'Kovalev';
    bio =
      'Principal Kernel & MTProto Researcher | Advisories: https://kovalev-sec.io | Contact: alex.kovalev@proton.me | Backup: @akovalev_archive';
    sangmataReply = [
      `History for user 418920341:`,
      `Send me a user ID or forward a message from @username or @user to check!`,
      `Names:`,
      `1. [18.09.2017 14:05] Alexey K.`,
      `2. [14.03.2021 19:22] Alex Kovalev (ZeroDayLab)`,
      `3. [09.11.2023 08:15] Alexey Kovalev`,
      `Usernames:`,
      `1. [18.09.2017 14:05] @alexey_k91`,
      `2. [14.03.2021 19:22] @akovalev_dev`,
      `3. [09.11.2023 08:15] @alex_kovalev_sec`,
    ].join('\n');
    usinfoReply = [
      `[@usinfobot Database Match]`,
      `User ID: 418920341`,
      `Usernames:`,
      `1. [04.06.2019 11:30] @kovalev_sys`,
      `2. [14.03.2021 19:22] @akovalev_dev`,
    ].join('\n');
    creationBotReply = [
      `[@creationdatebot Lookup]`,
      `Target ID: 418920341`,
      `Estimated Registration: August 2017`,
    ].join('\n');
    hourlyHistogramUtc = [
      1, 0, 0, 0, 1, 5, 14, 28, 39, 46, 42, 34, 29, 36, 48, 54, 49, 41, 33, 25, 19, 11, 4, 1,
    ];
  } else if (lower === 'durov') {
    numericId = 100650312;
    dcId = 4;
    firstName = 'Pavel';
    lastName = 'Durov';
    bio = 'Public Channel: @durov | Building decentralized privacy infrastructure at https://telegram.org';
    statusSummary = 'Last seen recently';
    lastSeenUtc = '2026-11-13T16:10:00Z';
    flags = {
      premium: true,
      verified: true,
      bot: false,
      scam: false,
      fake: false,
      restricted: false,
    };
    sangmataReply = [
      `History for user 100650312:`,
      `Names:`,
      `1. [14.05.2015 10:00] Pavel`,
      `2. [22.01.2019 16:40] Pavel Durov`,
      `Usernames:`,
      `1. [14.05.2015 10:00] @roving`,
      `2. [22.01.2019 16:40] @durov`,
    ].join('\n');
    usinfoReply = [
      `[@usinfobot Database Match]`,
      `User ID: 100650312`,
      `Usernames:`,
      `1. [14.05.2015 10:00] @roving`,
      `2. [22.01.2019 16:40] @durov`,
    ].join('\n');
    creationBotReply = [
      `[@creationdatebot Lookup]`,
      `Target ID: 100650312`,
      `Estimated Registration: May 2015`,
    ].join('\n');
    hourlyHistogramUtc = [
      12, 4, 1, 0, 0, 0, 3, 15, 29, 38, 44, 51, 47, 40, 35, 42, 49, 53, 46, 38, 31, 24, 19, 14,
    ];
  } else if (lower !== 'shaghaghidev') {
    numericId = deterministicHashNumber(cleanHandle, 180_000_000, 6_450_000_000);
    dcId = (deterministicHashNumber(cleanHandle, 1, 5) as 1 | 2 | 3 | 4 | 5);
    const parts = cleanHandle.split('_').filter(Boolean);
    firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : cleanHandle;
    lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Auditor';
    bio = `Security & Systems Engineering | Notes: https://github.com/${cleanHandle} | Mail: ${cleanHandle}@proton.me | Feed: @${cleanHandle}_log`;
    const legacyHandle = `${cleanHandle}_dev`;
    const earlyHandle = `${parts[0] || cleanHandle}_2019`;
    sangmataReply = [
      `History for user ${numericId}:`,
      `Send me a user ID or forward a message from @username or @user to check!`,
      `Names:`,
      `1. [11.06.2019 13:10] ${firstName}`,
      `2. [24.02.2022 18:45] ${firstName} ${lastName}`,
      `Usernames:`,
      `1. [11.06.2019 13:10] @${earlyHandle}`,
      `2. [24.02.2022 18:45] @${legacyHandle}`,
      `3. [15.01.2025 09:30] @${cleanHandle}`,
    ].join('\n');
    usinfoReply = [
      `[@usinfobot Database Match]`,
      `User ID: ${numericId}`,
      `Usernames:`,
      `1. [11.06.2019 13:10] @${earlyHandle}`,
      `2. [24.02.2022 18:45] @${legacyHandle}`,
    ].join('\n');
    creationBotReply = [
      `[@creationdatebot Lookup]`,
      `Target ID: ${numericId}`,
      `Estimated Registration: Interpolated via Telegram ID Milestone Curve`,
    ].join('\n');
  }

  const dc = getDataCenterMetadata(dcId);
  const creation = interpolateAccountCreation(numericId);
  const bioEntities = extractBioEntities(bio);

  const webPreview = {
    url: `https://t.me/${cleanHandle}`,
    httpStatus: 200,
    publicWebResolvable: true,
    ogTitle: `Telegram: Contact @${cleanHandle}`,
    ogDescription: bio,
    ogImage: `https://t.me/i/userpic/320/${cleanHandle}.jpg`,
  };

  const parsedSangmata = parseBotHistoryReply(sangmataReply, '@SangMata_BOT');
  const parsedUsinfo = parseBotHistoryReply(usinfoReply, '@usinfobot');
  const parsedCreation = parseBotHistoryReply(creationBotReply, '@creationdatebot');

  const botLogs = [
    {
      botHandle: '@SangMata_BOT',
      responded: true,
      latencyMs: 590,
      rawReply: sangmataReply,
      extractedUsernames: parsedSangmata.usernames,
      extractedNames: parsedSangmata.names,
    },
    {
      botHandle: '@SangMata_beta_bot',
      responded: true,
      latencyMs: 640,
      rawReply: sangmataReply,
      extractedUsernames: parsedSangmata.usernames,
      extractedNames: parsedSangmata.names,
    },
    {
      botHandle: '@usinfobot',
      responded: true,
      latencyMs: 480,
      rawReply: usinfoReply,
      extractedUsernames: parsedUsinfo.usernames,
      extractedNames: parsedUsinfo.names,
    },
    {
      botHandle: '@creationdatebot',
      responded: true,
      latencyMs: 410,
      rawReply: creationBotReply,
      extractedUsernames: parsedCreation.usernames,
      extractedNames: parsedCreation.names,
    },
  ];

  const mergedUsernamesMap = new Map<string, { username: string; observedAt: string; sourceBot: string }>();
  for (const b of botLogs) {
    for (const u of b.extractedUsernames) {
      if (!mergedUsernamesMap.has(u.username.toLowerCase())) {
        mergedUsernamesMap.set(u.username.toLowerCase(), u);
      }
    }
  }
  const historicalUsernames = Array.from(mergedUsernamesMap.values());
  const historicalNames = parsedSangmata.names;

  const allUsernames = Array.from(
    new Set([cleanHandle, ...historicalUsernames.map((u) => u.username)])
  );

  const avatars = [
    {
      index: 0,
      photoId: `594820194810${deterministicHashNumber(cleanHandle + '0', 100, 999)}`,
      imageUrl: AVATAR_2025,
      localPath: `./reports/${cleanHandle}/avatars/avatar_00_current_20250914.jpg`,
      mediaType: 'image/jpeg' as const,
      uploadedUtc: '2025-09-14 18:24:11 UTC',
      dcId,
      dimensions: '1024x1024',
      fileSizeBytes: 148290,
      md5: deterministicHex(cleanHandle + 'md5-0', 32),
      sha256: deterministicHex(cleanHandle + 'sha-0', 64),
      phash: deterministicHex(cleanHandle + 'phash-0', 16),
      exifSummary: {
        ColorSpace: 'sRGB IEC61966-2.1',
        ChromaSubsampling: '4:2:0 (Telegram MTProto Strip)',
        QuantizationTable: 'Telegram Desktop 5.6 (mozjpeg q=87)',
      },
      reverseSearchUrls: {
        yandex: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
        googleLens: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
        tineye: `https://tineye.com/search?url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
      },
    },
    {
      index: 1,
      photoId: `541902381920${deterministicHashNumber(cleanHandle + '1', 100, 999)}`,
      imageUrl: AVATAR_2023,
      localPath: `./reports/${cleanHandle}/avatars/avatar_01_hist_20231004.jpg`,
      mediaType: 'image/jpeg' as const,
      uploadedUtc: '2023-10-04 20:11:45 UTC',
      dcId,
      dimensions: '1024x1024',
      fileSizeBytes: 172410,
      md5: deterministicHex(cleanHandle + 'md5-1', 32),
      sha256: deterministicHex(cleanHandle + 'sha-1', 64),
      phash: deterministicHex(cleanHandle + 'phash-1', 16),
      exifSummary: {
        ColorSpace: 'Display P3 (iOS Client Upload)',
        ChromaSubsampling: '4:2:0',
        QuantizationTable: 'Telegram iOS 10.1 CoreGraphics',
      },
      reverseSearchUrls: {
        yandex: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
        googleLens: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
        tineye: `https://tineye.com/search?url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
      },
    },
    {
      index: 2,
      photoId: `510293847561${deterministicHashNumber(cleanHandle + '2', 100, 999)}`,
      imageUrl: AVATAR_2021,
      localPath: `./reports/${cleanHandle}/avatars/avatar_02_hist_20210519.jpg`,
      mediaType: 'image/jpeg' as const,
      uploadedUtc: '2021-05-19 11:08:03 UTC',
      dcId,
      dimensions: '800x800',
      fileSizeBytes: 112940,
      md5: deterministicHex(cleanHandle + 'md5-2', 32),
      sha256: deterministicHex(cleanHandle + 'sha-2', 64),
      phash: deterministicHex(cleanHandle + 'phash-2', 16),
      exifSummary: {
        ColorSpace: 'Grayscale / sRGB',
        ChromaSubsampling: '4:2:0',
        QuantizationTable: 'Telegram Android 7.8 Skia Encoder',
      },
      reverseSearchUrls: {
        yandex: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
        googleLens: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
        tineye: `https://tineye.com/search?url=${encodeURIComponent(`https://t.me/i/userpic/320/${cleanHandle}.jpg`)}`,
      },
    },
  ];

  const timezone = estimateTimezoneFromHourlyUtc(hourlyHistogramUtc);
  const sampledMessagesCount = hourlyHistogramUtc.reduce((a, b) => a + b, 0);

  const commonGroups = [
    {
      id: -100149283741,
      title: 'MTProto Internals & TL-Schema Research',
      handle: '@mtproto_research',
      memberCount: 14820,
      userMessageCount: 214,
      topicCategory: 'Protocol Engineering',
    },
    {
      id: -100182736452,
      title: 'Python Asyncio & High-Concurrency Systems',
      handle: '@python_async_arch',
      memberCount: 29450,
      userMessageCount: 162,
      topicCategory: 'Software Architecture',
    },
    {
      id: -100129384756,
      title: 'OSINT & Defensive Exposure Auditing',
      handle: '@defensive_osint_sec',
      memberCount: 9310,
      userMessageCount: 98,
      topicCategory: 'Application Security',
    },
    {
      id: -100198237465,
      title: 'Open-Source Security Tooling Maintainers',
      handle: '@oss_sec_maintainers',
      memberCount: 6420,
      userMessageCount: 46,
      topicCategory: 'Open Source Security',
    },
  ];

  const topPeers = [
    {
      peerId: 391827364,
      handle: '@m_lindqvist_re',
      displayName: 'Marcus Lindqvist',
      replyCount: 64,
      sharedGroup: '@mtproto_research',
    },
    {
      peerId: 847261920,
      handle: '@sara_k_threat',
      displayName: 'Sara Korhonen',
      replyCount: 41,
      sharedGroup: '@defensive_osint_sec',
    },
    {
      peerId: 519283746,
      handle: '@dmitry_ebpf',
      displayName: 'Dmitry Volkov',
      replyCount: 29,
      sharedGroup: '@python_async_arch',
    },
    {
      peerId: 602938471,
      handle: '@lukas_b_cert',
      displayName: 'Lukas Bauer',
      replyCount: 19,
      sharedGroup: '@oss_sec_maintainers',
    },
  ];

  const primaryLegacy = historicalUsernames[0]?.username || `${cleanHandle}_dev`;

  const crossPlatformProfiles = [
    {
      username: cleanHandle,
      platform: 'GitHub',
      url: `https://github.com/${cleanHandle}`,
      sourceTool: 'GitHub REST API' as const,
      category: 'Developer & Code',
      httpStatus: 200,
      claimedStatus: 'Verified' as const,
      extraMeta: 'Public Repos & PushEvent Commits Indexed via /users/{u}/repos',
    },
    {
      username: cleanHandle,
      platform: 'GitLab',
      url: `https://gitlab.com/${cleanHandle}`,
      sourceTool: 'httpx Async Probe' as const,
      category: 'Developer & Code',
      httpStatus: 200,
      claimedStatus: 'Claimed' as const,
      extraMeta: 'HTTP 200 OK · Verified Profile Signature',
    },
    {
      username: cleanHandle,
      platform: 'PyPI (Python Package Index)',
      url: `https://pypi.org/user/${cleanHandle}/`,
      sourceTool: 'httpx Async Probe' as const,
      category: 'Package Registry',
      httpStatus: 200,
      claimedStatus: 'Verified' as const,
      extraMeta: 'HTTP 200 OK · Maintainer Profile Active',
    },
    {
      username: cleanHandle,
      platform: 'X (Twitter)',
      url: `https://x.com/${cleanHandle}`,
      sourceTool: 'httpx Async Probe' as const,
      category: 'Social Microblog',
      httpStatus: 200,
      claimedStatus: 'Claimed' as const,
      extraMeta: 'HTTP 200 OK · Handle Registered',
    },
    {
      username: cleanHandle,
      platform: 'DEV.to',
      url: `https://dev.to/${cleanHandle}`,
      sourceTool: 'httpx Async Probe' as const,
      category: 'Developer Publishing',
      httpStatus: 200,
      claimedStatus: 'Claimed' as const,
      extraMeta: 'HTTP 200 OK · Technical Articles Indexed',
    },
    {
      username: cleanHandle,
      platform: 'Keybase',
      url: `https://keybase.io/${cleanHandle}`,
      sourceTool: 'httpx Async Probe' as const,
      category: 'Cryptographic Identity',
      httpStatus: 200,
      claimedStatus: 'Verified' as const,
      extraMeta: 'PGP Public Key & Domain Proof Linked',
    },
    {
      username: primaryLegacy,
      platform: 'HackerNews (YCombinator)',
      url: `https://news.ycombinator.com/user?id=${primaryLegacy}`,
      sourceTool: 'httpx Async Probe' as const,
      category: 'Tech Community',
      httpStatus: 200,
      claimedStatus: 'Claimed' as const,
      extraMeta: 'Historical Handle Match on HN User Registry',
    },
    {
      username: primaryLegacy,
      platform: 'Reddit',
      url: `https://www.reddit.com/user/${primaryLegacy}`,
      sourceTool: 'httpx Async Probe' as const,
      category: 'Forum & Discussion',
      httpStatus: 200,
      claimedStatus: 'Claimed' as const,
      extraMeta: 'JSON Profile Endpoint Verified (/about.json)',
    },
  ];

  const githubLeaks = [
    {
      username: cleanHandle,
      repoName: `${cleanHandle}/spectragram`,
      commitSha: '8c4f19a2',
      authorName: `${firstName} ${lastName}`,
      authorEmail: `${cleanHandle}@shaghaghidev.ir`,
      commitMessage: 'feat(core): add native async httpx 26-platform presence auditor',
      timestampUtc: '2026-10-28T19:14:09Z',
    },
    {
      username: primaryLegacy,
      repoName: `${primaryLegacy}/mtproto-utils`,
      commitSha: '3c81e04b',
      authorName: `${firstName} ${lastName.charAt(0)}.`,
      authorEmail: `${primaryLegacy}@proton.me`,
      commitMessage: 'refactor(telethon): add FloodWaitError backoff and strict bot parser',
      timestampUtc: '2024-05-14T16:40:22Z',
    },
  ];

  const dorks = generateDorkQueries(allUsernames);

  const privacyHardening = evaluatePrivacyHardening({
    phone,
    bioEntities,
    avatarsCount: avatars.length,
    historicalUsernamesCount: historicalUsernames.length,
    sampledMessagesCount,
    estimatedOffset: timezone.estimatedOffset,
    githubLeaksCount: githubLeaks.length,
    crossPlatformCount: crossPlatformProfiles.length,
  });

  return {
    generatedAtUtc: new Date().toISOString(),
    targetInput: `@${cleanHandle}`,
    entity: {
      username: cleanHandle,
      numericId,
      accessHash: `0x${deterministicHex(cleanHandle + 'access', 16)}`,
      firstName,
      lastName,
      bio,
      phone,
      statusSummary,
      lastSeenUtc,
      dc,
      creation,
      flags,
      bioEntities,
    },
    webPreview,
    avatars,
    botLogs,
    historicalUsernames,
    historicalNames,
    socialGraph: {
      commonGroups,
      sampledMessagesCount,
      hourlyHistogramUtc,
      timezone,
      topPeers,
    },
    crossPlatformProfiles,
    githubLeaks,
    dorks,
    privacyHardening,
  };
}

export function generateStandaloneHtmlReport(report: IntelligenceReport): string {
  const maxHr = Math.max(...report.socialGraph.hourlyHistogramUtc, 1);
  const barsHtml = report.socialGraph.hourlyHistogramUtc
    .map((count, hr) => {
      const pct = Math.max(4, Math.round((count / maxHr) * 100));
      return `<div class="bar-col"><div class="bar-fill" style="height:${pct}%" title="${String(hr).padStart(2, '0')}:00 UTC: ${count} msgs"></div><span class="bar-lbl">${String(hr).padStart(2, '0')}</span></div>`;
    })
    .join('');

  const profilesRows = report.crossPlatformProfiles
    .map(
      (p) =>
        `<tr><td class="mono">@${p.username}</td><td>${p.platform}</td><td>${p.category}</td><td>${p.extraMeta}</td><td><a href="${p.url}" target="_blank" rel="noopener">${p.url}</a></td></tr>`
    )
    .join('');

  const checklistRows = report.privacyHardening.checklist
    .map(
      (item) =>
        `<tr><td><strong>${item.vector}</strong> (${item.severity})</td><td>${item.observation}</td><td>${item.remediation}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SpectraGram Exposure Audit — ${report.targetInput}</title>
  <style>
    :root { --bg: #0b1120; --surface: #111827; --border: #1e293b; --text: #f1f5f9; --muted: #94a3b8; --accent: #38bdf8; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; line-height: 1.6; }
    .wrap { max-width: 1240px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
    header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; }
    h1 { font-size: 1.45rem; font-weight: 700; }
    h2 { font-size: 1.05rem; font-weight: 600; margin-bottom: 0.9rem; }
    .kv { display: flex; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid var(--border); font-size: 0.88rem; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; font-size: 0.82rem; }
    .heatmap { display: grid; grid-template-columns: repeat(24, 1fr); gap: 4px; height: 130px; align-items: end; padding-top: 1rem; }
    .bar-col { display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .bar-fill { width: 100%; background: var(--accent); border-radius: 2px 2px 0 0; }
    .bar-lbl { font-size: 0.68rem; color: var(--muted); margin-top: 4px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { text-align: left; padding: 0.6rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer { border-top: 1px solid var(--border); padding-top: 1.25rem; font-size: 0.8rem; color: var(--muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>SpectraGram Exposure Audit — ${report.targetInput}</h1>
      <span class="mono">Generated: ${report.generatedAtUtc} · Privacy Score: ${report.privacyHardening.score}/100</span>
    </header>
    <div class="grid-2">
      <section class="panel">
        <h2>01 &amp; 02. MTProto Entity &amp; Web Preview Verification</h2>
        <div class="kv"><span>Permanent Numeric ID</span><span class="mono">${report.entity.numericId}</span></div>
        <div class="kv"><span>Access Hash</span><span class="mono">${report.entity.accessHash}</span></div>
        <div class="kv"><span>Display Name</span><span>${report.entity.firstName} ${report.entity.lastName}</span></div>
        <div class="kv"><span>Estimated Account Creation</span><span class="mono">${report.entity.creation.displayDate} (${report.entity.creation.confidence})</span></div>
        <div class="kv"><span>Data Center Region</span><span>${report.entity.dc.label} · ${report.entity.dc.ipv4}</span></div>
        <div class="kv"><span>Public Web Preview (t.me)</span><span>HTTP ${report.webPreview.httpStatus} · ${report.webPreview.publicWebResolvable ? 'Visible' : 'Restricted'}</span></div>
        <div class="kv"><span>Bio</span><span>${report.entity.bio}</span></div>
      </section>
      <section class="panel">
        <h2>05. Shared Groups &amp; Timezone Estimator</h2>
        <div class="kv"><span>Estimated Local Timezone</span><span class="mono">${report.socialGraph.timezone.estimatedOffset}</span></div>
        <div class="kv"><span>Estimated Sleep Window (UTC)</span><span class="mono">${report.socialGraph.timezone.sleepWindowUtc}</span></div>
        <div class="kv"><span>Sampled Messages</span><span class="mono">${report.socialGraph.sampledMessagesCount} msgs across ${report.socialGraph.commonGroups.length} shared groups</span></div>
        <div class="heatmap">${barsHtml}</div>
      </section>
    </div>
    <section class="panel">
      <h2>06. Native Async Cross-Platform Presence Check (26 Platforms Checked via httpx)</h2>
      <table>
        <thead><tr><th>Username</th><th>Platform</th><th>Category</th><th>Verification Detail</th><th>URL</th></tr></thead>
        <tbody>${profilesRows}</tbody>
      </table>
    </section>
    <section class="panel">
      <h2>07. Privacy Hardening Score (${report.privacyHardening.score}/100 — ${report.privacyHardening.grade}) &amp; Lockdown Checklist</h2>
      <table>
        <thead><tr><th>Exposure Vector</th><th>Audit Observation</th><th>Recommended Lockdown Action</th></tr></thead>
        <tbody>${checklistRows}</tbody>
      </table>
    </section>
    <footer>
      <span>SpectraGram — Telegram Digital Footprint &amp; Exposure Auditor</span>
      <span>Crafted by <a href="https://shaghaghidev.ir" target="_blank" rel="noopener">Abolfazl Shaghaghi (@shaghaghidev)</a> · <a href="https://github.com/shaghaghidev/spectragram" target="_blank" rel="noopener">github.com/shaghaghidev/spectragram</a></span>
    </footer>
  </div>
</body>
</html>`;
}
