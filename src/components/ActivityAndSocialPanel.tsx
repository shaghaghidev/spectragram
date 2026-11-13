import React, { useState, useEffect } from 'react';
import { IntelligenceReport } from '../utils/osintEngine';

interface Props {
  report: IntelligenceReport;
}

export const ActivityAndSocialPanel: React.FC<Props> = ({ report }) => {
  const { socialGraph } = report;
  const { hourlyHistogramUtc, timezone, commonGroups, topPeers, sampledMessagesCount } =
    socialGraph;
  const [selectedHour, setSelectedHour] = useState<number>(timezone.peakHourUtc);

  useEffect(() => {
    setSelectedHour(timezone.peakHourUtc);
  }, [timezone.peakHourUtc]);

  const maxHourlyCount = Math.max(...hourlyHistogramUtc, 1);

  return (
    <section id="activity-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left 7 Cols: 24-Hour UTC Activity Heatmap & Timezone Estimator */}
      <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-lg p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <p className="text-xs text-slate-400">
                Stage 04 · Telepathy &amp; telegram-tracker Temporal Behavioral Analysis
              </p>
              <h2 className="text-xl font-semibold text-slate-100 mt-1">
                04. Activity Heatmap &amp; Timezone Estimation
              </h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {sampledMessagesCount} Sampled Messages · {timezone.confidenceScore}
            </span>
          </div>

          {/* Key Behavioral Inference Metrics (Unboxed Clean Grid) */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Estimated Timezone</span>
              <span className="font-mono tabular-nums text-base font-semibold text-sky-400 mt-0.5 block">
                {timezone.estimatedOffset}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Sleep Trough (UTC)</span>
              <span className="font-mono tabular-nums text-sm font-medium text-slate-100 mt-0.5 block">
                {timezone.sleepWindowUtc}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Active Window (UTC)</span>
              <span className="font-mono tabular-nums text-sm font-medium text-slate-100 mt-0.5 block">
                {timezone.activeWindowUtc}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Peak Activity Hour</span>
              <span className="font-mono tabular-nums text-sm font-medium text-slate-100 mt-0.5 block">
                {String(timezone.peakHourUtc).padStart(2, '0')}:00 UTC ({hourlyHistogramUtc[timezone.peakHourUtc]} msgs)
              </span>
            </div>
          </div>

          {/* 24-Hour Interactive Bar Histogram */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>Hourly Message Distribution (00:00 – 23:00 UTC)</span>
              <span className="font-mono tabular-nums text-slate-200">
                Selected Hour {String(selectedHour).padStart(2, '0')}:00 UTC ·{' '}
                {hourlyHistogramUtc[selectedHour]} messages (
                {Math.round((hourlyHistogramUtc[selectedHour] / Math.max(sampledMessagesCount, 1)) * 100)}
                % of volume)
              </span>
            </div>

            <div
              className="grid grid-cols-24 gap-1.5 h-44 items-end pt-4 px-2 bg-slate-950/70 border border-slate-800 rounded"
              style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
            >
              {hourlyHistogramUtc.map((count, hr) => {
                const heightPct = Math.max(Math.round((count / maxHourlyCount) * 100), 4);
                const isSelected = selectedHour === hr;
                const isPeak = hr === timezone.peakHourUtc;
                return (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => setSelectedHour(hr)}
                    aria-label={`Inspect hour ${String(hr).padStart(2, '0')}:00 UTC with ${count} messages`}
                    className="group flex flex-col items-center justify-end h-full focus:outline-none"
                  >
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 mb-1 opacity-80 group-hover:opacity-100">
                      {count}
                    </span>
                    <div className="w-full h-28 flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t transition-opacity ${
                          isSelected
                            ? 'bg-sky-400'
                            : isPeak
                            ? 'bg-sky-500/90 group-hover:bg-sky-400'
                            : count <= 2
                            ? 'bg-slate-700/70 group-hover:bg-slate-600'
                            : 'bg-sky-600/65 group-hover:bg-sky-500/80'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono tabular-nums mt-1.5 pb-1 ${
                        isSelected ? 'text-sky-400 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {String(hr).padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Sleep-cycle inference locates the lowest 6-hour contiguous UTC message volume window and aligns its midpoint with 04:00 AM local operator time.
        </p>
      </div>

      {/* Right 5 Cols: Common Groups & Top Interacted Accounts */}
      <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-lg p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-800">
            <div>
              <p className="text-xs text-slate-400">
                Stage 04 · GetCommonChatsRequest &amp; Reply Graph
              </p>
              <h2 className="text-xl font-semibold text-slate-100 mt-1">
                Shared Groups &amp; Social Graph
              </h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {commonGroups.length} Groups · {topPeers.length} Top Peers
            </span>
          </div>

          {/* Shared Groups Table */}
          <div className="mt-4">
            <h3 className="text-xs font-medium text-slate-300 mb-2">
              Discovered Common Groups (GetCommonChatsRequest)
            </h3>
            <div className="overflow-x-auto border border-slate-800 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-2 px-3 font-medium">Group / Channel</th>
                    <th className="py-2 px-3 font-medium">Focus</th>
                    <th className="py-2 px-3 font-medium text-right">Msgs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {commonGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3">
                        <div className="text-slate-100 font-medium">{g.title}</div>
                        <div className="font-mono text-slate-400 text-[11px]">
                          {g.handle} · {g.memberCount.toLocaleString()} members
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{g.topicCategory}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-sky-400 text-right font-medium">
                        {g.userMessageCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Interacted Peers (Reply Graph) */}
          <div className="mt-5">
            <h3 className="text-xs font-medium text-slate-300 mb-2">
              Top Interacted Accounts (Reply-To Frequency Graph)
            </h3>
            <div className="overflow-x-auto border border-slate-800 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-2 px-3 font-medium">Peer Handle</th>
                    <th className="py-2 px-3 font-medium">Primary Shared Group</th>
                    <th className="py-2 px-3 font-medium text-right">Replies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {topPeers.map((peer) => (
                    <tr key={peer.peerId} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3">
                        <span className="font-mono text-sky-400 font-medium">{peer.handle}</span>
                        <span className="text-slate-400 ml-1.5">· {peer.displayName}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300">{peer.sharedGroup}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-100 text-right font-medium">
                        {peer.replyCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
