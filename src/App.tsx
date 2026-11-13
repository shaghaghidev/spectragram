/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { validateTelegramUsername } from './utils/osintEngine';
import {
  SAMPLE_TARGETS,
  synthesizeIntelligenceReport,
  generateStandaloneHtmlReport,
} from './utils/reportProfiles';
import { EntityAndHistoryPanel } from './components/EntityAndHistoryPanel';
import { AvatarForensicsPanel } from './components/AvatarForensicsPanel';
import { ActivityAndSocialPanel } from './components/ActivityAndSocialPanel';
import { PivotAndDorksPanel } from './components/PivotAndDorksPanel';
import { PythonFrameworkView } from './components/PythonFrameworkView';
import fullSpectraGramScript from '../spectragram.py?raw';
import { Search, Download, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';

const AUDIT_STAGE_LABELS = [
  'Module 1/7: Resolving MTProto Entity & Server Geography...',
  'Module 2/7: Verifying Public t.me Web Preview & OpenGraph...',
  'Module 3/7: Querying Historical Bots & Filtering Placeholders...',
  'Module 4/7: Archiving Avatars & Computing pHash Signatures...',
  'Module 5/7: Sampling Shared Groups & Estimating UTC Timezone...',
  'Module 6/7: Probing 26 Platforms via Async httpx & GitHub API...',
  'Module 7/7: Generating Dork Launchpad & Privacy Hardening Score...',
];

export default function App() {
  const [targetInput, setTargetInput] = useState<string>('@shaghaghidev');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState(() =>
    synthesizeIntelligenceReport('@shaghaghidev')
  );
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<
    'ALL' | 'DASHBOARD' | 'SETUP' | 'PYTHON'
  >('ALL');

  // Simulated Real-Time Stage Progress Bar
  const [auditProgress, setAuditProgress] = useState<{
    running: boolean;
    stageIndex: number;
    percent: number;
    label: string;
  } | null>(null);

  // Browser-Based Setup & API Authorization State (mirrors spectragram.py config.json flow)
  const [apiIdInput, setApiIdInput] = useState<string>('24819204');
  const [apiHashInput, setApiHashInput] = useState<string>('9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c');
  const [phoneInput, setPhoneInput] = useState<string>('+989120000000');
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [loginCodeInput, setLoginCodeInput] = useState<string>('');
  const [twoFaInput, setTwoFaInput] = useState<string>('');
  const [sessionAuthorized, setSessionAuthorized] = useState<boolean>(true);
  const [setupStatusMsg, setSetupStatusMsg] = useState<string>(
    'Session authorized and saved to config.json (spectragram_userbot.session).'
  );

  const executeAuditWithProgress = (rawHandle: string) => {
    const check = validateTelegramUsername(rawHandle);
    if (!check.valid) {
      setValidationError(check.error ?? 'Invalid Telegram @username.');
      return;
    }
    setValidationError(null);
    const normalized = `@${check.cleaned}`;
    setTargetInput(normalized);

    setAuditProgress({
      running: true,
      stageIndex: 1,
      percent: 28,
      label: AUDIT_STAGE_LABELS[0],
    });

    setTimeout(() => {
      setAuditProgress({
        running: true,
        stageIndex: 5,
        percent: 72,
        label: AUDIT_STAGE_LABELS[5],
      });
    }, 110);

    setTimeout(() => {
      setActiveReport(synthesizeIntelligenceReport(normalized));
      setAuditProgress({
        running: false,
        stageIndex: 7,
        percent: 100,
        label: `Completed 7/7 Modules · Saved ./reports/${check.cleaned}/report.html & data.json`,
      });
    }, 220);
  };

  const handleRunRecon = (e: React.FormEvent) => {
    e.preventDefault();
    executeAuditWithProgress(targetInput);
  };

  const handleSelectSample = (handle: string) => {
    executeAuditWithProgress(handle);
  };

  const handleSendLoginCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiIdInput.trim() || !apiHashInput.trim() || !phoneInput.trim()) {
      setSetupStatusMsg('Please enter API_ID, API_HASH, and Phone Number.');
      return;
    }
    setCodeSent(true);
    setSetupStatusMsg('Verification code dispatched via Telegram MTProto. Enter the code below.');
  };

  const handleAuthorizeSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCodeInput.trim()) {
      setSetupStatusMsg('Enter the 5-digit Telegram login code to complete authorization.');
      return;
    }
    setSessionAuthorized(true);
    setSetupStatusMsg('Credentials saved to config.json · Telethon session authorized.');
    setActiveWorkspaceView('ALL');
  };

  const handleDownloadPython = () => {
    const blob = new Blob([fullSpectraGramScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spectragram.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtmlReport = () => {
    const htmlContent = generateStandaloneHtmlReport(activeReport);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${activeReport.entity.username}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract (Ultra-Clean & Minimal) */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          SpectraGram
        </a>

        {/* Zone 2: 4–5 concise single-line text navigation links */}
        <nav
          aria-label="Primary sections"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          <a
            href="#identity-section"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            MTProto &amp; Web
          </a>
          <a
            href="#avatars-section"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Avatar Forensics
          </a>
          <a
            href="#pivots-section"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Platform Presence
          </a>
          <a
            href="#hardening-section"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Privacy Hardening
          </a>
          <a
            href="#python-framework-section"
            className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Python Source
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPython}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download spectragram.py</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Command & Target Exposure Audit Bar */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs text-slate-400 font-mono">
                Telegram Digital Footprint &amp; Exposure Auditor · Local Web GUI (http://127.0.0.1:8080)
              </p>
              <h1
                className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Zero-Friction Telegram Footprint &amp; Privacy Hardening Auditor
              </h1>
            </div>

            {/* Workspace View Filter Controls */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setActiveWorkspaceView('ALL')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeWorkspaceView === 'ALL'
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Complete Auditor
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceView('DASHBOARD')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeWorkspaceView === 'DASHBOARD'
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Audit Report
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceView('SETUP')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeWorkspaceView === 'SETUP'
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Setup &amp; API Auth
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceView('PYTHON')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeWorkspaceView === 'PYTHON'
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python Source (spectragram.py)
              </button>
            </div>
          </div>

          {/* Target @username Input Form + Sample Targets */}
          <form onSubmit={handleRunRecon} className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <label htmlFor="target-username-input" className="sr-only">
                  Enter Telegram @username
                </label>
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="target-username-input"
                  type="text"
                  value={targetInput}
                  onChange={(e) => {
                    setTargetInput(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Enter Telegram @username (e.g., @shaghaghidev)"
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Run Exposure Audit
              </button>

              <button
                type="button"
                onClick={handleDownloadHtmlReport}
                className="px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Export Standalone HTML
              </button>
            </div>

            {validationError && (
              <div
                role="alert"
                className="mt-3 p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center gap-2 text-xs text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Real-Time Stage Progress Bar */}
            {auditProgress && (
              <div className="mt-3 p-3 bg-slate-950/90 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-300 mb-1.5">
                  <span>{auditProgress.label}</span>
                  <span className="text-sky-400">{auditProgress.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden">
                  <div
                    style={{ width: `${auditProgress.percent}%` }}
                    className="h-full bg-sky-400 transition-all duration-150"
                  />
                </div>
              </div>
            )}

            {/* Quick Sample Target Selector */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                <span>Preset Profiles:</span>
                {SAMPLE_TARGETS.map((preset) => (
                  <button
                    key={preset.handle}
                    type="button"
                    onClick={() => handleSelectSample(preset.handle)}
                    className={`px-2.5 py-1 font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                      activeReport.targetInput.toLowerCase() === preset.handle.toLowerCase()
                        ? 'bg-slate-800 border-sky-500/60 text-sky-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {preset.handle} · ID {preset.numericId} · DC{preset.dcId}
                  </button>
                ))}
              </div>

              <div className="font-mono tabular-nums text-slate-400">
                Audited: <span className="text-sky-400">{activeReport.targetInput}</span> · Privacy Score:{' '}
                <span className="text-slate-100 font-semibold">
                  {activeReport.privacyHardening.score}/100
                </span>{' '}
                · {activeReport.crossPlatformProfiles.length} Platforms Matched
              </div>
            </div>
          </form>
        </section>

        {/* Browser-Based Setup & API Authorization View (config.json Wizard) */}
        {activeWorkspaceView === 'SETUP' && (
          <section
            id="setup-auth-section"
            className="bg-slate-900/90 border border-slate-800 rounded-lg p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <p className="text-xs text-slate-400">
                  One-Time Browser Setup · Persists Credentials to ./config.json &amp; Telethon Session
                </p>
                <h2 className="text-xl font-semibold text-slate-100 mt-1 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-sky-400" />
                  <span>Setup &amp; Telegram MTProto API Authorization</span>
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{sessionAuthorized ? 'Session Authorized' : 'Pending Login Code'}</span>
              </div>
            </div>

            <form onSubmit={handleSendLoginCode} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="setup-api-id" className="block text-xs text-slate-400 mb-1">
                  Telegram API_ID (my.telegram.org)
                </label>
                <input
                  id="setup-api-id"
                  type="text"
                  value={apiIdInput}
                  onChange={(e) => setApiIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label htmlFor="setup-api-hash" className="block text-xs text-slate-400 mb-1">
                  Telegram API_HASH
                </label>
                <input
                  id="setup-api-hash"
                  type="text"
                  value={apiHashInput}
                  onChange={(e) => setApiHashInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label htmlFor="setup-phone" className="block text-xs text-slate-400 mb-1">
                  Phone Number (International Format)
                </label>
                <input
                  id="setup-phone"
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors"
                >
                  Send Code via Telegram
                </button>
                <span className="text-xs font-mono text-slate-400">{setupStatusMsg}</span>
              </div>
            </form>

            {codeSent && (
              <form
                onSubmit={handleAuthorizeSession}
                className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
              >
                <div>
                  <label htmlFor="setup-login-code" className="block text-xs text-slate-400 mb-1">
                    Telegram Login Code
                  </label>
                  <input
                    id="setup-login-code"
                    type="text"
                    placeholder="Enter 5-digit code"
                    value={loginCodeInput}
                    onChange={(e) => setLoginCodeInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label htmlFor="setup-2fa" className="block text-xs text-slate-400 mb-1">
                    2FA Cloud Password (Optional)
                  </label>
                  <input
                    id="setup-2fa"
                    type="password"
                    placeholder="Leave blank if 2FA disabled"
                    value={twoFaInput}
                    onChange={(e) => setTwoFaInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
                  >
                    Authorize &amp; Save config.json
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Dashboard Panels (Modules 1 through 7) */}
        {(activeWorkspaceView === 'ALL' || activeWorkspaceView === 'DASHBOARD') && (
          <div className="space-y-6">
            <EntityAndHistoryPanel report={activeReport} />
            <AvatarForensicsPanel
              avatars={activeReport.avatars}
              targetHandle={activeReport.targetInput}
            />
            <ActivityAndSocialPanel report={activeReport} />
            <PivotAndDorksPanel report={activeReport} />
          </div>
        )}

        {/* Complete SpectraGram Python Source, README & Report Exporter */}
        {(activeWorkspaceView === 'ALL' || activeWorkspaceView === 'PYTHON') && (
          <PythonFrameworkView report={activeReport} />
        )}
      </main>

      {/* Subtle, Classy Footer with Author Credit Linking to shaghaghidev.ir & GitHub */}
      <footer className="border-t border-slate-800/80 py-5 px-6 text-xs text-slate-400">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>
            SpectraGram — Telegram Digital Footprint &amp; Exposure Auditor · Output: ./reports/
            {activeReport.entity.username}/report.html &amp; data.json
          </span>
          <span>
            Designed by{' '}
            <a
              href="https://shaghaghidev.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-200 hover:text-sky-400 underline underline-offset-4 transition-colors"
            >
              Abolfazl Shaghaghi (@shaghaghidev)
            </a>{' '}
            ·{' '}
            <a
              href="https://github.com/shaghaghidev/spectragram"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-200 hover:text-sky-400 underline underline-offset-4 transition-colors font-mono"
            >
              github.com/shaghaghidev/spectragram
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
