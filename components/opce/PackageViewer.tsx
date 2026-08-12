'use client';

/**
 * Opus Publica Composition Engine (OPCE) — Publication Package Viewer Component
 *
 * Inspector displaying archival PublicationPackage metadata, checksum manifests,
 * and rendered format descriptors.
 */

import React from 'react';
import type { CompositionResult } from '@/lib/opce';

export interface PackageViewerProps {
  result: CompositionResult | null;
  renderMode?: string;
}

export const PackageViewer: React.FC<PackageViewerProps> = ({ result, renderMode = 'draft' }) => {
  if (!result || !result.success) {
    return (
      <div className="p-6 bg-[#FCFAF4] rounded-lg border border-[#E0D7C2] text-center text-[#5A5245] text-sm">
        <p>No publication package generated.</p>
      </div>
    );
  }

  const isPublished = renderMode === 'publication';

  return (
    <div className="bg-white rounded-lg border border-[#E0D7C2] p-6 space-y-4 text-xs">
      <h3 className="text-sm font-semibold text-[#0F2C4A] border-b border-[#E0D7C2] pb-2">
        {isPublished ? 'Archival Package Manifest' : 'Preview Manifest'}
      </h3>

      <div className="grid grid-cols-2 gap-4 bg-[#FCFAF4] p-4 rounded-md border border-[#E0D7C2]">
        <div>
          <span className="text-[#5A5245] block">Session ID:</span>
          <span className="font-mono font-medium text-[#0F2C4A]">{result.sessionId}</span>
        </div>
        <div>
          <span className="text-[#5A5245] block">Style Checksum:</span>
          <span className="font-mono font-medium text-[#0F2C4A]">{result.styleChecksum}</span>
        </div>
        <div>
          <span className="text-[#5A5245] block">Render Mode:</span>
          <span className="font-medium text-[#0F2C4A] uppercase">{renderMode}</span>
        </div>
        <div>
          <span className="text-[#5A5245] block">Template Version:</span>
          <span className="font-medium text-[#0F2C4A]">v1.0.0</span>
        </div>
        {isPublished && (
          <>
            <div>
              <span className="text-[#5A5245] block">Render Duration:</span>
              <span className="font-medium text-[#0F2C4A]">{result.renderDurationMs} ms</span>
            </div>
            <div>
              <span className="text-[#5A5245] block">Package Storage Path:</span>
              <span className="font-mono text-[10px] text-[#0F2C4A] truncate block">{result.packageStoragePath}</span>
            </div>
          </>
        )}
      </div>

      <div>
        <h4 className="font-semibold text-[#0F2C4A] mb-2">Rendered Outputs ({result.renderedOutputs.length})</h4>
        <div className="space-y-2">
          {result.renderedOutputs.map((out: any, idx) => (
            <div key={idx} className="p-2.5 bg-white border border-[#E0D7C2] rounded flex items-center justify-between">
              <div>
                <span className="font-bold uppercase text-[#0F2C4A] mr-2">{out.format || 'html'}</span>
                <span className="font-mono text-[#5A5245] truncate max-w-xs block">{out.storagePath}</span>
              </div>
              <span className="font-mono text-[10px] bg-[#F4EFE2] px-2 py-0.5 rounded">
                SHA-256: {out.checksum}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
