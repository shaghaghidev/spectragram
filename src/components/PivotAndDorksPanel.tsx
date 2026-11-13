import React, { useState } from 'react';
import { IntelligenceReport, DorkQueryRecord } from '../utils/osintEngine';
import { ExternalLink, Search, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Props {
  report: IntelligenceReport;
}

export const PivotAndDorksPanel: React.FC<Props> = ({ report }) => {
  const { crossPlatformProfiles, githubLeaks, dorks, privacyHardening } = report;

  const [toolFilter, setToolFilter] = useState<'ALL' | 'httpx Async Probe' | 'GitHub REST API'>('ALL');
  const [profileSearch, setProfileSearch] = useState<string>('');
  const [dorkCategoryFilter, setDorkCategoryFilter] = useState<string>('ALL');
  const [dorkUsernameFilter, setDorkUsernameFilter] = useState<string>('ALL');

  const filteredProfiles = crossPlatformProfiles.filter((item) => {
    const matchesTool = toolFilter === 'ALL' || item.sourceTool === toolFilter;
    const q = profileSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.platform.toLowerCase().includes(q) ||
      item.username.toLowerCase().includes(q) ||
      item.extraMeta.toLowerCase().includes(q);
    return matchesTool && matchesQuery;
  });

  const allDorkUsernames = Array.from(new Set(dorks.map((d) => d.username)));
  const dorkCategories: Array<'ALL' | DorkQueryRecord['category']> = [
    'ALL',
    'Telegram Search Index',
    'Direct Telegram Surface',
    'External Web Mentions',
    'Code & Paste Leaks',
  ];

  const filteredDorks = dorks.filter((d) => {
    const matchesCat = dorkCategoryFilter === 'ALL' || d.category === dorkCategoryFilter;
    const matchesUser = dorkUsernameFilter === 'ALL' || d.username === dorkUsernameFilter;
    return matchesCat && matchesUser;
  });

  return (
    <div className="space-y-6">
      {/* Module 6: Native Async Cross-Platform Presence Check (httpx) & GitHub Commit Exposure */}
      <section id="pivots-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <p className="text-xs text-slate-400">
                  Module 06 · 100% Native Python Async HTTP Presence Check (httpx · 26 Platforms)
                </p>
                <h2 className="text-xl font-semibold text-slate-100 mt-1">
                  06. Native Cross-Platform Presence Check
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {filteredProfiles.length} of {crossPlatformProfiles.length} Confirmed Profiles
              </span>
            </div>

            {/* Interactive Filter Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                {(['ALL', 'httpx Async Probe', 'GitHub REST API'] as const).map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setToolFilter(tool)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      toolFilter === tool
                        ? 'bg-slate-800 text-sky-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tool === 'ALL' ? 'All Probes (26 Sites)' : tool}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Filter discovered profiles by platform or username"
                  placeholder="Filter platform or handle..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Cross-Platform Profiles Table */}
            <div className="mt-4 overflow-x-auto border border-slate-800 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-2.5 px-3 font-medium">Handle</th>
                    <th className="py-2.5 px-3 font-medium">Platform &amp; Category</th>
                    <th className="py-2.5 px-3 font-medium">Verification Method</th>
                    <th className="py-2.5 px-3 font-medium text-right">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredProfiles.length > 0 ? (
                    filteredProfiles.map((prof) => (
                      <tr
                        key={`${prof.platform}-${prof.username}`}
                        className="hover:bg-slate-800/40"
                      >
                        <td className="py-2.5 px-3 font-mono text-sky-400 font-medium whitespace-nowrap">
                          @{prof.username}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-100 font-medium">{prof.platform}</span>
                          <span className="text-slate-400 ml-1.5">· {prof.category}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{prof.extraMeta}</td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <a
                            href={prof.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline inline-flex items-center gap-1 font-mono"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No cross-platform profiles match the current filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Probes GitHub, GitLab, X, Instagram, Reddit, Medium, Keybase, Steam, DEV.to, HackerNews, PyPI, NPM, Gravatar, Linktree, Crates.io, DockerHub, HuggingFace, Kaggle, and more via native async httpx without external CLI binaries.
          </p>
        </div>

        {/* GitHub Public Repository & Commit Author Email Exposure */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-800">
              <div>
                <p className="text-xs text-slate-400">
                  Module 06 · GitHub REST API (/repos &amp; /events/public)
                </p>
                <h2 className="text-xl font-semibold text-slate-100 mt-1">
                  GitHub Commit Email Exposure
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {githubLeaks.length} Commit Payloads Exposed
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {githubLeaks.map((leak) => (
                <div
                  key={leak.commitSha}
                  className="p-3.5 bg-slate-950/75 border border-slate-800 rounded-lg text-xs"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sky-400 font-semibold break-all">
                      {leak.authorEmail}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400 shrink-0">
                      {leak.timestampUtc.slice(0, 10)}
                    </span>
                  </div>
                  <div className="text-slate-300 mt-1 font-mono">
                    Author: {leak.authorName} · Repo: {leak.repoName}@{leak.commitSha}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-slate-400 font-mono truncate">
                    Commit: "{leak.commitMessage}"
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
             Extracted directly from public GitHub PushEvent JSON payloads where the author committed without enabling GitHub's private noreply email address.
          </div>
        </div>
      </section>

      {/* Module 7A: 1-Click Search Engine & Public Index Launchpad */}
      <section id="dorks-section" className="bg-slate-900/90 border border-slate-800 rounded-lg p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <p className="text-xs text-slate-400">
              Module 07 · Public Telegram Indexes (TGStat, Telemetr, Lyzem, Telegago CSE) &amp; Google Dorks
            </p>
            <h2 className="text-xl font-semibold text-slate-100 mt-1">
              07. Search Engine &amp; Public Index Launchpad
            </h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {filteredDorks.length} Ready-to-Execute Search Queries
          </span>
        </div>

        {/* Category & Handle Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {dorkCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setDorkCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  dorkCategoryFilter === cat
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setDorkUsernameFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                dorkUsernameFilter === 'ALL'
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Handles ({allDorkUsernames.length})
            </button>
            {allDorkUsernames.map((uname) => (
              <button
                key={uname}
                type="button"
                onClick={() => setDorkUsernameFilter(uname)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                  dorkUsernameFilter === uname
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                @{uname}
              </button>
            ))}
          </div>
        </div>

        {/* Dork Grid */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDorks.map((dork) => (
            <div
              key={dork.id}
              className="p-3.5 bg-slate-950/75 border border-slate-800 rounded-lg flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-xs text-slate-400">
                  <span className="text-slate-200 font-medium">{dork.engine}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{dork.category}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="font-mono text-sky-400">@{dork.username}</span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5 truncate" title={dork.title}>
                  {dork.title}
                </div>
                <code className="block text-[11px] font-mono text-slate-400 mt-1 truncate">
                  {dork.query}
                </code>
              </div>

              <a
                href={dork.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <span>Launch</span>
                <ExternalLink className="w-3 h-3 text-sky-400" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Module 7B: Privacy Hardening Score & Lockdown Checklist */}
      <section
        id="hardening-section"
        className="bg-slate-900/90 border border-slate-800 rounded-lg p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <p className="text-xs text-slate-400">
              Defensive Exposure Assessment &amp; Actionable Remediation Guide
            </p>
            <h2 className="text-xl font-semibold text-slate-100 mt-1">
              Privacy Hardening Score &amp; Lockdown Checklist
            </h2>
          </div>

          <div className="flex items-center gap-3 font-mono tabular-nums text-sm">
            <span className="text-slate-400">Score:</span>
            <span className="text-lg font-bold text-sky-400">
              {privacyHardening.score} / 100
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-200">{privacyHardening.grade}</span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-800 rounded">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Exposure Vector &amp; State</th>
                <th className="py-2.5 px-3 font-medium">Audit Observation</th>
                <th className="py-2.5 px-3 font-medium">Recommended Lockdown Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {privacyHardening.checklist.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium text-slate-100">
                      {item.severity === 'Hardened' ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ShieldAlert
                          className={`w-4 h-4 shrink-0 ${
                            item.severity === 'High Exposure'
                              ? 'text-red-400'
                              : item.severity === 'Medium Exposure'
                              ? 'text-amber-400'
                              : 'text-sky-400'
                          }`}
                        />
                      )}
                      <span>{item.vector}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 pl-6 mt-0.5">
                      Status: {item.severity}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{item.observation}</td>
                  <td className="py-3 px-3 text-slate-200">{item.remediation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
