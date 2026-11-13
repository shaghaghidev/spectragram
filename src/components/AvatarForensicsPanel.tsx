import React, { useState } from 'react';
import { AvatarForensicItem } from '../utils/osintEngine';
import { ExternalLink, Copy, Check, Image as ImageIcon } from 'lucide-react';

interface Props {
  avatars: AvatarForensicItem[];
  targetHandle: string;
}

export const AvatarForensicsPanel: React.FC<Props> = ({ avatars, targetHandle }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const copyHash = (id: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  return (
    <section id="avatars-section" className="bg-slate-900/90 border border-slate-800 rounded-lg p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <p className="text-xs text-slate-400">
            Stage 02 · Telethon GetUserPhotosRequest · Pillow &amp; imagehash (pHash)
          </p>
          <h2 className="text-xl font-semibold text-slate-100 mt-1">
            02. Historical Avatar Timeline &amp; Image Forensics
          </h2>
        </div>
        <div className="text-xs text-slate-400 font-mono tabular-nums">
          <span>{avatars.length} Historical Photos Archived</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>./reports/{targetHandle.replace(/^@/, '')}/avatars/</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {avatars.map((av) => {
          const imgFailed = failedImages[av.photoId];
          return (
            <article
              key={av.photoId}
              className="bg-slate-950/70 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Resilient Image Container with Zero-Broken-Image Policy */}
                <div className="relative h-64 w-full bg-slate-900 border-b border-slate-800 overflow-hidden">
                  {!imgFailed ? (
                    <img
                      src={av.imageUrl}
                      alt={`Historical avatar ${av.index + 1} for ${targetHandle} uploaded ${av.uploadedUtc}`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [av.photoId]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 to-slate-950">
                      <ImageIcon className="w-8 h-8 text-slate-600 mb-2" />
                      <span className="text-xs font-mono text-slate-400">
                        Avatar #{av.index + 1} · {av.dimensions}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums text-slate-100 font-medium">
                      {av.uploadedUtc}
                    </span>
                    <span className="font-mono tabular-nums text-slate-300">
                      DC{av.dcId} · {av.dimensions}
                    </span>
                  </div>
                </div>

                {/* Cryptographic & Perceptual Hashes */}
                <div className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Telegram Photo ID</span>
                    <span className="font-mono tabular-nums text-slate-200">{av.photoId}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Perceptual Hash (pHash)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono tabular-nums text-sky-400 font-medium">
                        {av.phash}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyHash(`phash-${av.photoId}`, av.phash)}
                        aria-label={`Copy pHash for avatar ${av.index + 1}`}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded"
                      >
                        {copiedHash === `phash-${av.photoId}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>MD5 Checksum</span>
                    <span className="font-mono tabular-nums text-slate-300">
                      {av.md5.slice(0, 16)}…
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>SHA-256 Digest</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono tabular-nums text-slate-300">
                        {av.sha256.slice(0, 16)}…
                      </span>
                      <button
                        type="button"
                        onClick={() => copyHash(`sha-${av.photoId}`, av.sha256)}
                        aria-label={`Copy SHA-256 for avatar ${av.index + 1}`}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded"
                      >
                        {copiedHash === `sha-${av.photoId}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    {Object.entries(av.exifSummary).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2 text-slate-400">
                        <span>{k}</span>
                        <span className="text-slate-300 font-mono text-right truncate max-w-[180px]" title={v}>
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1-Click Reverse Image Search Action Bar */}
              <div className="px-4 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">Reverse Pivot:</span>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <a
                    href={av.reverseSearchUrls.yandex}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <span>Yandex</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-700" aria-hidden="true">·</span>
                  <a
                    href={av.reverseSearchUrls.googleLens}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <span>Google Lens</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-700" aria-hidden="true">·</span>
                  <a
                    href={av.reverseSearchUrls.tineye}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <span>TinEye</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
