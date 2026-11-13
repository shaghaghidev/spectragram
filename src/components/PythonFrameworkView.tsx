import React, { useState } from 'react';
import { IntelligenceReport } from '../utils/osintEngine';
import { generateStandaloneHtmlReport } from '../utils/reportProfiles';
import {
  PYTHON_STAGE_MODULES,
  REQUIREMENTS_TXT_SOURCE,
  README_MD_SOURCE,
} from '../utils/pythonSource';
import fullSpectraGramScript from '../../spectragram.py?raw';
import { Copy, Check, Download } from 'lucide-react';

interface Props {
  report: IntelligenceReport;
}

export const PythonFrameworkView: React.FC<Props> = ({ report }) => {
  const [activeFileTab, setActiveFileTab] = useState<
    'spectragram.py' | 'requirements.txt' | 'README.md' | 'report.html' | 'data.json'
  >('spectragram.py');
  const [selectedStageId, setSelectedStageId] = useState<string>('ALL');
  const [copiedState, setCopiedState] = useState<string | null>(null);

  const jsonPayload = JSON.stringify(report, null, 2);
  const standaloneHtml = generateStandaloneHtmlReport(report);

  const getDisplayedContent = (): string => {
    if (activeFileTab === 'requirements.txt') return REQUIREMENTS_TXT_SOURCE;
    if (activeFileTab === 'README.md') return README_MD_SOURCE;
    if (activeFileTab === 'data.json') return jsonPayload;
    if (activeFileTab === 'report.html') return standaloneHtml;
    if (selectedStageId !== 'ALL') {
      const found = PYTHON_STAGE_MODULES.find((s) => s.id === selectedStageId);
      if (found) return found.codeSnippet;
    }
    return fullSpectraGramScript;
  };

  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedState(label);
    setTimeout(() => setCopiedState(null), 1600);
  };

  const displayedCode = getDisplayedContent();

  return (
    <section
      id="python-framework-section"
      className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <p className="text-xs text-slate-400">
            100% Native Python 3.10+ · Windows-Compatible Wheels · Embedded Local Web GUI
          </p>
          <h2 className="text-xl font-semibold text-slate-100 mt-1">
            SpectraGram Source (spectragram.py), README &amp; Exported Reports
          </h2>
        </div>

        {/* 1-Click Artifact Download Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              triggerDownload('spectragram.py', fullSpectraGramScript, 'text/x-python')
            }
            className="px-3 py-1.5 text-xs font-medium bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download spectragram.py</span>
          </button>

          <button
            type="button"
            onClick={() =>
              triggerDownload('requirements.txt', REQUIREMENTS_TXT_SOURCE, 'text/plain')
            }
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>requirements.txt</span>
          </button>

          <button
            type="button"
            onClick={() => triggerDownload('README.md', README_MD_SOURCE, 'text/markdown')}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>README.md</span>
          </button>

          <button
            type="button"
            onClick={() =>
              triggerDownload(
                `report_${report.entity.username}.html`,
                standaloneHtml,
                'text/html'
              )
            }
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>report.html</span>
          </button>

          <button
            type="button"
            onClick={() =>
              triggerDownload(
                `data_${report.entity.username}.json`,
                jsonPayload,
                'application/json'
              )
            }
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>data.json</span>
          </button>
        </div>
      </div>

      {/* Zero-Friction Windows / macOS / Linux Usage Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-slate-950/75 border border-slate-800 rounded-lg">
          <div className="font-semibold text-slate-200 mb-1">
            01. Install Pure-Python Wheels (Windows Friendly)
          </div>
          <p className="text-slate-400 mb-2">
            Uses aiohttp, httpx, telethon, pillow, imagehash, and beautifulsoup4 with zero C-compiler requirements:
          </p>
          <code className="block p-2 bg-slate-900 border border-slate-800 rounded font-mono text-sky-400">
            pip install -r requirements.txt
          </code>
        </div>

        <div className="p-4 bg-slate-950/75 border border-slate-800 rounded-lg">
          <div className="font-semibold text-slate-200 mb-1">
            02. Launch Local Web GUI (No CLI Flags Needed)
          </div>
          <p className="text-slate-400 mb-2">
            Run directly from terminal or VS Code Run button to launch http://127.0.0.1:8080 automatically:
          </p>
          <code className="block p-2 bg-slate-900 border border-slate-800 rounded font-mono text-sky-400">
            python spectragram.py
          </code>
        </div>

        <div className="p-4 bg-slate-950/75 border border-slate-800 rounded-lg">
          <div className="font-semibold text-slate-200 mb-1">
            03. Automatic Local Report Persistence
          </div>
          <p className="text-slate-400 mb-2">
            Every browser audit saves a standalone HTML report, structured JSON, and avatar archive:
          </p>
          <code className="block p-2 bg-slate-900 border border-slate-800 rounded font-mono text-sky-400">
            ./reports/{report.entity.username}/report.html &amp; data.json
          </code>
        </div>
      </div>

      {/* File Selector & Module Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
          {(
            [
              'spectragram.py',
              'requirements.txt',
              'README.md',
              'report.html',
              'data.json',
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFileTab(tab)}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeFileTab === tab
                  ? 'bg-slate-800 text-sky-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeFileTab === 'spectragram.py' && (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedStageId('ALL')}
              className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0 ${
                selectedStageId === 'ALL'
                  ? 'bg-slate-800 text-sky-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Application ({fullSpectraGramScript.split('\n').length} lines)
            </button>
            {PYTHON_STAGE_MODULES.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedStageId(mod.id)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                  selectedStageId === mod.id
                    ? 'bg-slate-800 text-sky-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mod {mod.stageNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Code Viewer Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="font-mono text-slate-300">
            <span>{activeFileTab}</span>
            <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-400 tabular-nums">
              {displayedCode.split('\n').length} lines
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(activeFileTab, displayedCode)}
            className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded inline-flex items-center gap-1.5 transition-colors"
          >
            {copiedState === activeFileTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>Copy File Content</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
          <code>{displayedCode}</code>
        </pre>
      </div>
    </section>
  );
};
