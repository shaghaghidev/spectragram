import React, { useState, useEffect } from 'react';
import {
  IntelligenceReport,
  interpolateAccountCreation,
  getDataCenterMetadata,
  ID_CREATION_MILESTONES,
} from '../utils/osintEngine';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface Props {
  report: IntelligenceReport;
}

export const EntityAndHistoryPanel: React.FC<Props> = ({ report }) => {
  const { entity, webPreview, historicalUsernames, historicalNames, botLogs } = report;
  const [selectedBotIdx, setSelectedBotIdx] = useState<number>(0);
  const [customIdInput, setCustomIdInput] = useState<string>(String(entity.numericId));
  const [customDcInput, setCustomDcInput] = useState<number>(entity.dc.dcId);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setCustomIdInput(String(entity.numericId));
    setCustomDcInput(entity.dc.dcId);
    setSelectedBotIdx(0);
  }, [entity.numericId, entity.dc.dcId]);

  const parsedCustomId = Number(customIdInput.replace(/[^0-9]/g, '')) || entity.numericId;
  const liveCreationEst = interpolateAccountCreation(parsedCustomId);
  const liveDcMeta = getDataCenterMetadata(customDcInput);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const activeFlags = Object.entries(entity.flags)
    .filter(([, val]) => val)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

  const inactiveFlags = Object.entries(entity.flags)
    .filter(([, val]) => !val)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

  const currentBot = botLogs[selectedBotIdx] ?? botLogs[0];

  return (
    <section id="identity-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Modules 1 & 2: MTProto Entity & Public Web Preview Verifier */}
      <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-lg p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <p className="text-xs text-slate-400">
                Modules 01 &amp; 02 · Telethon GetFullUserRequest + httpx / BeautifulSoup4 Web Verifier
              </p>
              <h2 className="text-xl font-semibold text-slate-100 mt-1">
                01. MTProto Entity &amp; Public Web Verification
              </h2>
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              <span>{entity.statusSummary}</span>
            </div>
          </div>

          {/* Core Identity Key-Value Matrix */}
          <div className="mt-4 divide-y divide-slate-800/80 text-sm">
            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-400">Resolved Handle &amp; Display Name</span>
              <span className="text-slate-100 font-medium text-right">
                @{entity.username} · {entity.firstName} {entity.lastName}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-400">Permanent Numeric User ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono tabular-nums text-sky-400 font-medium">
                  {entity.numericId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('numericId', String(entity.numericId))}
                  aria-label="Copy Permanent Numeric User ID"
                  className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                >
                  {copiedKey === 'numericId' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-400">MTProto Access Hash</span>
              <div className="flex items-center gap-2">
                <span className="font-mono tabular-nums text-slate-200 text-xs">
                  {entity.accessHash}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('accessHash', entity.accessHash)}
                  aria-label="Copy MTProto Access Hash"
                  className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                >
                  {copiedKey === 'accessHash' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-400">Estimated Account Creation</span>
              <span className="font-mono tabular-nums text-slate-100 text-right">
                {entity.creation.displayDate} ·{' '}
                <span className="text-xs text-slate-400">{entity.creation.confidence}</span>
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-400">Profile Photo Data Center (dc_id)</span>
              <span className="font-mono tabular-nums text-slate-100 text-right">
                {entity.dc.label} · <span className="text-xs text-slate-400">{entity.dc.ipv4}</span>
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-400">Public Web Preview (https://t.me/{entity.username})</span>
              <a
                href={webPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono tabular-nums text-sky-400 hover:underline inline-flex items-center gap-1 text-xs"
              >
                <span>
                  HTTP {webPreview.httpStatus} ·{' '}
                  {webPreview.publicWebResolvable ? 'OpenGraph Verified' : 'Restricted'}
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-400">Public Phone Number</span>
              <span className="font-mono tabular-nums text-slate-300">
                {entity.phone ?? 'Hidden (Redacted by Privacy Settings)'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-400">MTProto Account Flags</span>
              <span className="text-xs text-slate-300 text-right">
                Active: {activeFlags.length > 0 ? activeFlags.join(' · ') : 'None'} / Cleared:{' '}
                {inactiveFlags.join(' · ')}
              </span>
            </div>
          </div>

          {/* Bio & Regex Extracted Entities */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-300 mb-1.5">
              Bio / About Payload &amp; Regex Entity Extraction
            </p>
            <p className="text-sm text-slate-200 bg-slate-950/80 border border-slate-800/90 rounded p-3 font-mono break-words">
              {entity.bio || 'No public bio text present.'}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Extracted Emails</span>
                <span className="font-mono text-sky-400 break-all">
                  {entity.bioEntities.emails.length > 0
                    ? entity.bioEntities.emails.join(' · ')
                    : 'None'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Extracted URLs</span>
                <div className="space-y-1">
                  {entity.bioEntities.urls.length > 0 ? (
                    entity.bioEntities.urls.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sky-400 hover:underline flex items-center gap-1 break-all"
                      >
                        <span>{u}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))
                  ) : (
                    <span className="text-slate-500">None</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Linked @Handles</span>
                <span className="font-mono text-slate-200">
                  {entity.bioEntities.handles.length > 0
                    ? entity.bioEntities.handles.join(' · ')
                    : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive ID-to-Date & DC Interpolation Calculator */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-medium text-slate-300">
              Interactive Numeric ID-to-Date &amp; Data Center Calculator (2013–2026 Milestones)
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {ID_CREATION_MILESTONES.length} Empirical Milestones
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label htmlFor="calc-numeric-id" className="block text-xs text-slate-400 mb-1">
                Test Any Numeric User ID
              </label>
              <input
                id="calc-numeric-id"
                type="text"
                value={customIdInput}
                onChange={(e) => setCustomIdInput(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="calc-dc-id" className="block text-xs text-slate-400 mb-1">
                Data Center (DC1–5)
              </label>
              <select
                id="calc-dc-id"
                value={customDcInput}
                onChange={(e) => setCustomDcInput(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value={1}>DC1 (Miami US)</option>
                <option value={2}>DC2 (Amsterdam EU)</option>
                <option value={3}>DC3 (Miami US)</option>
                <option value={4}>DC4 (Amsterdam EU)</option>
                <option value={5}>DC5 (Singapore APAC)</option>
              </select>
            </div>
            <div className="sm:col-span-4 bg-slate-950/90 border border-slate-800 rounded px-3 py-1.5 text-xs">
              <div className="font-mono tabular-nums text-sky-400 font-medium">
                Est: {liveCreationEst.isoDate}
              </div>
              <div className="text-slate-400 truncate" title={liveDcMeta.location}>
                {liveDcMeta.location}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module 3: Historical Metadata & Strictly Filtered Bot Querying */}
      <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-lg p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-800">
            <div>
              <p className="text-xs text-slate-400">
                Module 03 · Filtered Bot Interrogation (Ads &amp; Placeholders Removed)
              </p>
              <h2 className="text-xl font-semibold text-slate-100 mt-1">
                03. Historical Handles &amp; Names
              </h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {historicalUsernames.length} Handles · {historicalNames.length} Names
            </span>
          </div>

          {/* Historical Usernames Table */}
          <div className="mt-4">
            <h3 className="text-xs font-medium text-slate-300 mb-2">
              Historical Usernames (Strictly Filtered · Pivoted into Module 06)
            </h3>
            <div className="overflow-x-auto border border-slate-800 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-2 px-3 font-medium">Username</th>
                    <th className="py-2 px-3 font-medium">Observed Timestamp</th>
                    <th className="py-2 px-3 font-medium text-right">Source Bot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {historicalUsernames.map((item) => (
                    <tr
                      key={`${item.username}-${item.observedAt}`}
                      className="hover:bg-slate-800/40"
                    >
                      <td className="py-2 px-3 font-mono text-sky-400 font-medium">
                        @{item.username}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                        {item.observedAt}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400 text-right">
                        {item.sourceBot}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Display Names Table */}
          <div className="mt-4">
            <h3 className="text-xs font-medium text-slate-300 mb-2">Historical Display Names</h3>
            <div className="overflow-x-auto border border-slate-800 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-2 px-3 font-medium">Display Name</th>
                    <th className="py-2 px-3 font-medium">Recorded Timestamp</th>
                    <th className="py-2 px-3 font-medium text-right">Source Bot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {historicalNames.map((item) => (
                    <tr
                      key={`${item.displayName}-${item.observedAt}`}
                      className="hover:bg-slate-800/40"
                    >
                      <td className="py-2 px-3 text-slate-200 font-medium">{item.displayName}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                        {item.observedAt}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400 text-right">
                        {item.sourceBot}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Collapsible Raw Bot Response Box */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-300">Select Tracking Bot</span>
            <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
              {botLogs.map((b, idx) => (
                <button
                  key={b.botHandle}
                  type="button"
                  onClick={() => setSelectedBotIdx(idx)}
                  className={`px-2 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedBotIdx === idx
                      ? 'bg-slate-800 text-sky-400 font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b.botHandle}
                </button>
              ))}
            </div>
          </div>

          <details className="bg-slate-950 border border-slate-800 rounded p-3 text-xs">
            <summary className="cursor-pointer font-medium text-slate-300 select-none">
              Inspect Unfiltered Raw Bot Transcript ({currentBot?.botHandle})
            </summary>
            <pre className="mt-2 pt-2 border-t border-slate-800/80 font-mono text-slate-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {currentBot?.rawReply}
            </pre>
          </details>
        </div>
      </div>
    </section>
  );
};
