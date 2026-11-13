export interface DcMetadata {
  dcId: number;
  label: string;
  location: string;
  region: string;
  ipv4: string;
  asn: string;
}

export interface CreationEstimate {
  isoDate: string;
  displayDate: string;
  confidence: string;
  milestoneBracket: string;
}

export interface BioExtractedEntities {
  urls: string[];
  emails: string[];
  handles: string[];
}

export interface WebPreviewVerification {
  url: string;
  httpStatus: number;
  publicWebResolvable: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

export interface HistoricalUsernameRecord {
  username: string;
  observedAt: string;
  sourceBot: string;
}

export interface HistoricalNameRecord {
  displayName: string;
  observedAt: string;
  sourceBot: string;
}

export interface AvatarForensicItem {
  index: number;
  photoId: string;
  imageUrl: string;
  localPath: string;
  mediaType: 'image/jpeg' | 'video/mp4';
  uploadedUtc: string;
  dcId: number;
  dimensions: string;
  fileSizeBytes: number;
  md5: string;
  sha256: string;
  phash: string;
  exifSummary: Record<string, string>;
  reverseSearchUrls: {
    yandex: string;
    googleLens: string;
    tineye: string;
  };
}

export interface BotInterrogationLog {
  botHandle: string;
  responded: boolean;
  latencyMs: number;
  rawReply: string;
  extractedUsernames: HistoricalUsernameRecord[];
  extractedNames: HistoricalNameRecord[];
}

export interface CommonGroupRecord {
  id: number;
  title: string;
  handle: string;
  memberCount: number;
  userMessageCount: number;
  topicCategory: string;
}

export interface TopInteractedPeer {
  peerId: number;
  handle: string;
  displayName: string;
  replyCount: number;
  sharedGroup: string;
}

export interface TimezoneAnalysis {
  estimatedOffset: string;
  sleepWindowUtc: string;
  peakHourUtc: number;
  activeWindowUtc: string;
  confidenceScore: string;
}

export interface CrossPlatformProfile {
  username: string;
  platform: string;
  url: string;
  sourceTool: 'httpx Async Probe' | 'GitHub REST API';
  category: string;
  httpStatus: number;
  claimedStatus: 'Verified' | 'Claimed';
  extraMeta: string;
}

export interface GithubCommitLeak {
  username: string;
  repoName: string;
  commitSha: string;
  authorName: string;
  authorEmail: string;
  commitMessage: string;
  timestampUtc: string;
}

export interface DorkQueryRecord {
  id: string;
  username: string;
  category:
    | 'Telegram Search Index'
    | 'Direct Telegram Surface'
    | 'External Web Mentions'
    | 'Code & Paste Leaks';
  engine: 'Lyzem' | 'TGStat' | 'Telemetr' | 'Telegago (CSE)' | 'Google Dork';
  title: string;
  query: string;
  url: string;
}

export interface PrivacyChecklistItem {
  id: string;
  severity: 'High Exposure' | 'Medium Exposure' | 'Low Exposure' | 'Hardened';
  vector: string;
  observation: string;
  remediation: string;
}

export interface PrivacyHardeningAssessment {
  score: number;
  grade: string;
  exposedCount: number;
  checklist: PrivacyChecklistItem[];
}

export interface IntelligenceReport {
  generatedAtUtc: string;
  targetInput: string;
  entity: {
    username: string;
    numericId: number;
    accessHash: string;
    firstName: string;
    lastName: string;
    bio: string;
    phone: string | null;
    statusSummary: string;
    lastSeenUtc: string;
    dc: DcMetadata;
    creation: CreationEstimate;
    flags: {
      premium: boolean;
      verified: boolean;
      bot: boolean;
      scam: boolean;
      fake: boolean;
      restricted: boolean;
    };
    bioEntities: BioExtractedEntities;
  };
  webPreview: WebPreviewVerification;
  avatars: AvatarForensicItem[];
  botLogs: BotInterrogationLog[];
  historicalUsernames: HistoricalUsernameRecord[];
  historicalNames: HistoricalNameRecord[];
  socialGraph: {
    commonGroups: CommonGroupRecord[];
    sampledMessagesCount: number;
    hourlyHistogramUtc: number[];
    timezone: TimezoneAnalysis;
    topPeers: TopInteractedPeer[];
  };
  crossPlatformProfiles: CrossPlatformProfile[];
  githubLeaks: GithubCommitLeak[];
  dorks: DorkQueryRecord[];
  privacyHardening: PrivacyHardeningAssessment;
}

export const DC_MAP: Record<number, DcMetadata> = {
  1: {
    dcId: 1,
    label: 'DC1 · Miami, US',
    location: 'Miami, Florida, United States',
    region: 'Americas Primary (US-East)',
    ipv4: '149.154.175.50',
    asn: 'AS62041 (Telegram Messenger Inc)',
  },
  2: {
    dcId: 2,
    label: 'DC2 · Amsterdam, NL',
    location: 'Amsterdam, Netherlands',
    region: 'Europe / EMEA Primary Cluster',
    ipv4: '149.154.167.51',
    asn: 'AS62041 (Telegram Messenger Inc)',
  },
  3: {
    dcId: 3,
    label: 'DC3 · Miami, US',
    location: 'Miami, Florida, United States',
    region: 'Americas Secondary Cluster',
    ipv4: '149.154.175.100',
    asn: 'AS62041 (Telegram Messenger Inc)',
  },
  4: {
    dcId: 4,
    label: 'DC4 · Amsterdam, NL',
    location: 'Amsterdam, Netherlands',
    region: 'Europe / EMEA High-Density Cluster',
    ipv4: '149.154.167.91',
    asn: 'AS62041 (Telegram Messenger Inc)',
  },
  5: {
    dcId: 5,
    label: 'DC5 · Singapore, SG',
    location: 'Singapore',
    region: 'Asia-Pacific (APAC)',
    ipv4: '91.108.56.130',
    asn: 'AS62041 (Telegram Messenger Inc)',
  },
};

export const ID_CREATION_MILESTONES: ReadonlyArray<{ id: number; timestampSec: number; label: string }> = [
  { id: 100_000, timestampSec: 1376438400, label: 'Aug 2013 Genesis' },
  { id: 1_000_000, timestampSec: 1382227200, label: 'Oct 2013 (1M)' },
  { id: 10_000_000, timestampSec: 1393286400, label: 'Feb 2014 (10M)' },
  { id: 50_000_000, timestampSec: 1416009600, label: 'Nov 2014 (50M)' },
  { id: 100_000_000, timestampSec: 1431216000, label: 'May 2015 (100M)' },
  { id: 200_000_000, timestampSec: 1456790400, label: 'Mar 2016 (200M)' },
  { id: 350_000_000, timestampSec: 1491955200, label: 'Apr 2017 (350M)' },
  { id: 500_000_000, timestampSec: 1516406400, label: 'Jan 2018 (500M)' },
  { id: 750_000_000, timestampSec: 1547510400, label: 'Jan 2019 (750M)' },
  { id: 1_000_000_000, timestampSec: 1570233600, label: 'Oct 2019 (1.0B)' },
  { id: 1_300_000_000, timestampSec: 1595030400, label: 'Jul 2020 (1.3B)' },
  { id: 1_650_000_000, timestampSec: 1611532800, label: 'Jan 2021 (1.65B)' },
  { id: 2_100_000_000, timestampSec: 1633824000, label: 'Oct 2021 (2.1B)' },
  { id: 5_000_000_000, timestampSec: 1643673600, label: 'Feb 2022 (5.0B 64-bit)' },
  { id: 5_600_000_000, timestampSec: 1663200000, label: 'Sep 2022 (5.6B)' },
  { id: 6_200_000_000, timestampSec: 1684540800, label: 'May 2023 (6.2B)' },
  { id: 6_800_000_000, timestampSec: 1704844800, label: 'Jan 2024 (6.8B)' },
  { id: 7_400_000_000, timestampSec: 1725148800, label: 'Sep 2024 (7.4B)' },
  { id: 8_100_000_000, timestampSec: 1749945600, label: 'Jun 2025 (8.1B)' },
  { id: 8_800_000_000, timestampSec: 1775001600, label: 'Apr 2026 (8.8B)' },
];

const BANNED_BOT_NOISE_HANDLES = new Set([
  'username',
  'user',
  'users',
  'sangmata_bot',
  'sangmata_beta_bot',
  'usinfobot',
  'creationdatebot',
  'telegram',
  'support',
  'donate',
  'channel',
  'group',
  'admin',
  'botfather',
  'none',
  'null',
  'empty',
  'no_username',
]);

const BANNED_INSTRUCTION_PHRASES = [
  'no data available',
  'history for user',
  'send me a user id',
  'forward a message',
  'click here',
  'subscribe to',
  'sponsored',
  'advertisement',
  'user id:',
  'usernames:',
  'names:',
];

export function validateTelegramUsername(raw: string): { valid: boolean; cleaned: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, cleaned: '', error: 'Enter a Telegram @username to run the 7-module exposure audit.' };
  }
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(withoutAt)) {
    return {
      valid: false,
      cleaned: withoutAt,
      error: 'Telegram usernames must be 4–32 characters, start with a letter, and contain only letters, digits, or underscores.',
    };
  }
  return { valid: true, cleaned: withoutAt };
}

export function getDataCenterMetadata(dcId: number): DcMetadata {
  return (
    DC_MAP[dcId] ?? {
      dcId,
      label: `DC${dcId} · Unmapped Cluster`,
      location: 'Unknown Server Region',
      region: 'Unmapped MTProto Edge',
      ipv4: '149.154.160.1',
      asn: 'AS62041 (Telegram Messenger Inc)',
    }
  );
}

export function interpolateAccountCreation(userId: number): CreationEstimate {
  const milestones = ID_CREATION_MILESTONES;
  if (userId <= milestones[0].id) {
    const d = new Date(milestones[0].timestampSec * 1000);
    const iso = d.toISOString().slice(0, 10);
    return {
      isoDate: iso,
      displayDate: 'August 2013',
      confidence: 'High (±14 days · Genesis Cohort)',
      milestoneBracket: `≤ ${milestones[0].id.toLocaleString()}`,
    };
  }

  const last = milestones[milestones.length - 1];
  const prev = milestones[milestones.length - 2];
  if (userId >= last.id) {
    const slope = (last.timestampSec - prev.timestampSec) / (last.id - prev.id);
    const estSec = Math.min(
      Math.floor(last.timestampSec + (userId - last.id) * slope),
      Math.floor(Date.now() / 1000)
    );
    const d = new Date(estSec * 1000);
    const iso = d.toISOString().slice(0, 10);
    return {
      isoDate: iso,
      displayDate: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      confidence: 'Extrapolated (±45 days · 64-bit High-ID Cohort)',
      milestoneBracket: `≥ ${last.id.toLocaleString()}`,
    };
  }

  for (let i = 0; i < milestones.length - 1; i++) {
    const low = milestones[i];
    const high = milestones[i + 1];
    if (userId >= low.id && userId <= high.id) {
      const ratio = (userId - low.id) / (high.id - low.id);
      const interpSec = Math.floor(low.timestampSec + ratio * (high.timestampSec - low.timestampSec));
      const d = new Date(interpSec * 1000);
      const iso = d.toISOString().slice(0, 10);
      return {
        isoDate: iso,
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
        confidence: 'Piecewise Linear Interpolated (±21 days)',
        milestoneBracket: `${low.label} → ${high.label}`,
      };
    }
  }

  return {
    isoDate: '2020-01-01',
    displayDate: 'Jan 2020',
    confidence: 'Approximate',
    milestoneBracket: 'Standard Range',
  };
}

export function extractBioEntities(bioText: string): BioExtractedEntities {
  if (!bioText) {
    return { urls: [], emails: [], handles: [] };
  }
  const emailMatches = bioText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const urlMatches = bioText.match(/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/g) ?? [];
  const handleRegex = /(?<![a-zA-Z0-9._%+-])@([a-zA-Z0-9_]{4,32})/g;
  const handles: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = handleRegex.exec(bioText)) !== null) {
    handles.push(`@${match[1]}`);
  }

  return {
    urls: Array.from(new Set(urlMatches.map((u) => u.replace(/[.,;)]+$/, '')))),
    emails: Array.from(new Set(emailMatches.map((e) => e.toLowerCase()))),
    handles: Array.from(new Set(handles)),
  };
}

export function parseBotHistoryReply(
  rawText: string,
  sourceBot: string
): { usernames: HistoricalUsernameRecord[]; names: HistoricalNameRecord[] } {
  const usernames: HistoricalUsernameRecord[] = [];
  const names: HistoricalNameRecord[] = [];
  const seenU = new Set<string>();
  const seenN = new Set<string>();

  const lines = rawText.split(/\r?\n/);
  let currentSection: 'general' | 'usernames' | 'names' = 'general';
  const dateRegex = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s+\d{1,2}:\d{2})?)/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.includes('username') && lower.includes(':')) {
      currentSection = 'usernames';
      continue;
    } else if (lower.includes('name') && !lower.includes('username') && lower.includes(':')) {
      currentSection = 'names';
      continue;
    }

    if (BANNED_INSTRUCTION_PHRASES.some((phrase) => lower.includes(phrase))) {
      continue;
    }

    const dateMatch = line.match(dateRegex);
    const observedAt = dateMatch ? dateMatch[1] : 'Historical Archive';

    const handleRegex = /@([a-zA-Z0-9_]{4,32})/g;
    let hMatch: RegExpExecArray | null;
    while ((hMatch = handleRegex.exec(line)) !== null) {
      const candidate = hMatch[1];
      const lowC = candidate.toLowerCase();
      if (
        !BANNED_BOT_NOISE_HANDLES.has(lowC) &&
        !lowC.endsWith('bot') &&
        !seenU.has(lowC)
      ) {
        seenU.add(lowC);
        usernames.push({
          username: candidate,
          observedAt,
          sourceBot,
        });
      }
    }

    if (currentSection === 'names' && dateMatch && dateMatch.index !== undefined) {
      const afterDate = line
        .slice(dateMatch.index + dateMatch[0].length)
        .replace(/^[\s:\->[\]().0-9]+/, '')
        .trim();
      if (
        afterDate &&
        !afterDate.startsWith('@') &&
        !afterDate.toLowerCase().includes('http') &&
        !BANNED_BOT_NOISE_HANDLES.has(afterDate.toLowerCase()) &&
        !seenN.has(afterDate)
      ) {
        seenN.add(afterDate);
        names.push({
          displayName: afterDate,
          observedAt,
          sourceBot,
        });
      }
    }
  }

  return { usernames, names };
}

export function estimateTimezoneFromHourlyUtc(hourlyCounts: number[]): TimezoneAnalysis {
  if (hourlyCounts.length !== 24 || hourlyCounts.every((c) => c === 0)) {
    return {
      estimatedOffset: 'UTC+00:00',
      sleepWindowUtc: '01:00 – 07:00 UTC',
      peakHourUtc: 14,
      activeWindowUtc: '08:00 – 23:00 UTC',
      confidenceScore: 'Low (Insufficient messages)',
    };
  }

  let minWindowSum = Number.POSITIVE_INFINITY;
  let sleepStartUtc = 0;

  for (let startHr = 0; startHr < 24; startHr++) {
    let sum = 0;
    for (let offset = 0; offset < 6; offset++) {
      sum += hourlyCounts[(startHr + offset) % 24];
    }
    if (sum < minWindowSum) {
      minWindowSum = sum;
      sleepStartUtc = startHr;
    }
  }

  const sleepMidpointUtc = (sleepStartUtc + 3) % 24;
  let rawOffset = 4 - sleepMidpointUtc;
  if (rawOffset < -11) rawOffset += 24;
  if (rawOffset > 14) rawOffset -= 24;

  const sign = rawOffset >= 0 ? '+' : '-';
  const absOff = String(Math.abs(rawOffset)).padStart(2, '0');
  const estimatedOffset = `UTC${sign}${absOff}:00`;

  const sleepEndUtc = (sleepStartUtc + 6) % 24;
  const activeEndUtc = sleepStartUtc;
  const sleepWindowUtc = `${String(sleepStartUtc).padStart(2, '0')}:00 – ${String(sleepEndUtc).padStart(2, '0')}:00 UTC`;
  const activeWindowUtc = `${String(sleepEndUtc).padStart(2, '0')}:00 – ${String(activeEndUtc).padStart(2, '0')}:00 UTC`;

  let peakHourUtc = 0;
  let maxVal = -1;
  for (let h = 0; h < 24; h++) {
    if (hourlyCounts[h] > maxVal) {
      maxVal = hourlyCounts[h];
      peakHourUtc = h;
    }
  }

  const totalMsgs = hourlyCounts.reduce((a, b) => a + b, 0);
  return {
    estimatedOffset,
    sleepWindowUtc,
    peakHourUtc,
    activeWindowUtc,
    confidenceScore: totalMsgs >= 200 ? `High (${totalMsgs} sampled msgs)` : `Moderate (${totalMsgs} sampled msgs)`,
  };
}

export function generateDorkQueries(usernames: string[]): DorkQueryRecord[] {
  const uniqueUsernames = Array.from(new Set(usernames.map((u) => u.replace(/^@/, '').trim()).filter(Boolean)));
  const results: DorkQueryRecord[] = [];

  for (const uname of uniqueUsernames) {
    const encoded = encodeURIComponent(uname);
    results.push(
      {
        id: `lyzem-${uname}`,
        username: uname,
        category: 'Telegram Search Index',
        engine: 'Lyzem',
        title: `Lyzem Indexed Messages & Public Groups (@${uname})`,
        query: uname,
        url: `https://lyzem.com/search?q=${encoded}`,
      },
      {
        id: `tgstat-${uname}`,
        username: uname,
        category: 'Telegram Search Index',
        engine: 'TGStat',
        title: `TGStat Channel & Forward Mentions (@${uname})`,
        query: `@${uname}`,
        url: `https://tgstat.com/search?q=${encodeURIComponent('@' + uname)}`,
      },
      {
        id: `telemetr-${uname}`,
        username: uname,
        category: 'Telegram Search Index',
        engine: 'Telemetr',
        title: `Telemetr Channel Catalog & Ad Mentions (@${uname})`,
        query: uname,
        url: `https://telemetr.io/en/channels?channel=${encoded}`,
      },
      {
        id: `telegago-${uname}`,
        username: uname,
        category: 'Telegram Search Index',
        engine: 'Telegago (CSE)',
        title: `Telegago Deep Telegram Custom Search (@${uname})`,
        query: uname,
        url: `https://cse.google.com/cse?cx=006368593537057042503:efxu7xprihg&q=${encoded}`,
      }
    );

    const gDorks: Array<{
      idSuffix: string;
      category: DorkQueryRecord['category'];
      title: string;
      rawQuery: string;
    }> = [
      {
        idSuffix: 'direct-tme',
        category: 'Direct Telegram Surface',
        title: `Indexed t.me Profiles, Posts & Previews (@${uname})`,
        rawQuery: `site:t.me "${uname}"`,
      },
      {
        idSuffix: 'ext-mentions',
        category: 'External Web Mentions',
        title: `External Domains Linking to t.me/${uname}`,
        rawQuery: `intext:"t.me/${uname}" -site:t.me`,
      },
      {
        idSuffix: 'code-paste',
        category: 'Code & Paste Leaks',
        title: `GitHub, GitLab & Pastebin Handle Leaks (@${uname})`,
        rawQuery: `(site:github.com OR site:gitlab.com OR site:pastebin.com) "${uname}"`,
      },
    ];

    for (const d of gDorks) {
      results.push({
        id: `gdork-${d.idSuffix}-${uname}`,
        username: uname,
        category: d.category,
        engine: 'Google Dork',
        title: d.title,
        query: d.rawQuery,
        url: `https://www.google.com/search?q=${encodeURIComponent(d.rawQuery)}`,
      });
    }
  }

  return results;
}

export function evaluatePrivacyHardening(params: {
  phone: string | null;
  bioEntities: BioExtractedEntities;
  avatarsCount: number;
  historicalUsernamesCount: number;
  sampledMessagesCount: number;
  estimatedOffset: string;
  githubLeaksCount: number;
  crossPlatformCount: number;
}): PrivacyHardeningAssessment {
  let score = 100;
  const checklist: PrivacyChecklistItem[] = [];

  if (params.phone) {
    score -= 25;
    checklist.push({
      id: 'phone-exposure',
      severity: 'High Exposure',
      vector: 'Public Phone Number Exposed',
      observation: `Phone number (${params.phone}) is visible to MTProto entity lookups.`,
      remediation:
        'Telegram Settings → Privacy and Security → Phone Number → Set "Who can see my phone number" to "Nobody".',
    });
  } else {
    checklist.push({
      id: 'phone-hardened',
      severity: 'Hardened',
      vector: 'Phone Number Redacted',
      observation: 'Phone number is protected and not returned in public MTProto responses.',
      remediation:
        'Keep "Who can see my phone number" set to "Nobody" and "Who can find me by my number" set to "My Contacts".',
    });
  }

  if (params.bioEntities.emails.length > 0 || params.bioEntities.urls.length > 0) {
    score -= 12;
    checklist.push({
      id: 'bio-pii',
      severity: 'Medium Exposure',
      vector: 'External Identifiers in Public Bio',
      observation: `Extracted ${params.bioEntities.emails.length} email(s) and ${params.bioEntities.urls.length} URL(s) from public Bio.`,
      remediation:
        'Telegram Settings → Privacy and Security → Bio → Restrict visibility to "My Contacts" or remove personal emails.',
    });
  }

  if (params.avatarsCount > 1) {
    score -= 15;
    checklist.push({
      id: 'avatar-history',
      severity: 'Medium Exposure',
      vector: `Historical Avatar Trail (${params.avatarsCount} Photos)`,
      observation:
        'Legacy profile pictures remain archived on Telegram servers with exact UTC upload timestamps and pHash fingerprints.',
      remediation:
        'Open your Telegram profile photo gallery and delete outdated historical avatars so only one non-reused image remains.',
    });
  }

  if (params.historicalUsernamesCount > 1) {
    score -= 15;
    checklist.push({
      id: 'username-history',
      severity: 'Medium Exposure',
      vector: `Historical Handle Pivot Trail (${params.historicalUsernamesCount} Handles)`,
      observation:
        'Tracking bots correlated previous @usernames to your permanent Numeric User ID.',
      remediation:
        'Avoid reusing retired Telegram handles on developer or social platforms; numeric IDs permanently link handle history.',
    });
  }

  if (params.githubLeaksCount > 0) {
    score -= 18;
    checklist.push({
      id: 'github-email-leak',
      severity: 'High Exposure',
      vector: `GitHub Commit Author Email Exposure (${params.githubLeaksCount} Commits)`,
      observation:
        'Public PushEvent payloads on matching GitHub accounts leaked personal author email addresses.',
      remediation:
        'Enable "Keep my email addresses private" in GitHub Email Settings and set git config user.email to your noreply address.',
    });
  }

  if (params.crossPlatformCount >= 3) {
    score -= 10;
    checklist.push({
      id: 'cross-platform-reuse',
      severity: 'Medium Exposure',
      vector: `Cross-Platform Handle Reuse (${params.crossPlatformCount} Platforms)`,
      observation:
        'Native async HTTP checks confirmed identical username registration across multiple external services.',
      remediation:
        'Use unique, non-correlatable handles for sensitive Telegram accounts to prevent cross-platform enumeration.',
    });
  }

  if (params.sampledMessagesCount > 20) {
    score -= 10;
    checklist.push({
      id: 'timezone-inference',
      severity: 'Low Exposure',
      vector: `Circadian Activity & Timezone Inference (${params.estimatedOffset})`,
      observation: `Message timestamps across shared groups reveal sleep/wake hours and an estimated ${params.estimatedOffset} offset.`,
      remediation:
        'Use Telegram Scheduled Messages when posting in public supergroups if operational timezone privacy is required.',
    });
  }

  const finalScore = Math.max(5, Math.min(100, score));
  const grade =
    finalScore >= 85
      ? 'A · Strong Hardening'
      : finalScore >= 65
      ? 'B · Moderate Exposure'
      : finalScore >= 45
      ? 'C · Elevated Footprint'
      : 'D · High Public Exposure';

  const exposedCount = checklist.filter((c) => c.severity !== 'Hardened').length;
  return {
    score: finalScore,
    grade,
    exposedCount,
    checklist,
  };
}
