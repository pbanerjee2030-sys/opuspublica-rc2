'use client';

/**
 * Opus Publica Composition Engine (OPCE) — Session History Component
 *
 * Displays audit history log of composition sessions for an article.
 */

import React from 'react';

export interface SessionHistoryItem {
  id: string;
  initiatedAt: string;
  renderMode: 'draft' | 'publication' | 'proof';
  status: 'running' | 'completed' | 'failed' | 'approved';
  qualityScore: number | null;
  existingPdfUrl?: string | null;
  templateVersion?: string;
}

export interface SessionHistoryProps {
  sessionHistory?: SessionHistoryItem[];
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ sessionHistory = [] }) => {
  if (!sessionHistory || sessionHistory.length === 0) {
    return (
      <div className="p-4 bg-[#FCFAF4] rounded border border-[#E0D7C2] text-center text-xs text-[#5A5245]">
        No previous composition sessions found.
      </div>
    );
  }

  const getBadgeClass = (status: string) =>
    status === 'completed'
      ? 'bg-green-100 text-green-800'
      : status === 'approved'
      ? 'bg-blue-100 text-blue-800 font-bold'
      : status === 'failed'
      ? 'bg-red-100 text-red-800'
      : 'bg-amber-100 text-amber-800';

  return (
    <div className="bg-white rounded-lg border border-[#E0D7C2] p-4 text-xs space-y-2 max-h-[600px] overflow-y-auto shadow-sm">
      <h4 className="font-semibold text-[#0F2C4A] border-b border-[#E0D7C2] pb-2 mb-3">
        Composition History
      </h4>
      <div className="space-y-3">
        {sessionHistory.map((session, idx) => (
          <div key={session.id} className="p-2.5 rounded border border-[#E0D7C2] bg-[#FCFAF4] hover:bg-[#F4EFE2] cursor-pointer transition-colors relative">
            {idx === 0 && (
              <span className="absolute -top-2 -right-2 bg-[#C9A84C] text-[#0F2C4A] text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                LATEST
              </span>
            )}
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono font-medium text-[#0F2C4A] truncate max-w-[150px]" title={session.id}>{session.id}</span>
              <span className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded ${getBadgeClass(session.status)}`}>
                {session.status}
              </span>
            </div>
            
            <div className="text-[10px] text-[#5A5245] flex justify-between items-center mb-2">
              <span>{new Date(session.initiatedAt).toLocaleString()}</span>
              <span className="font-semibold uppercase text-[#0F2C4A]">{session.renderMode}</span>
            </div>

            <div className="flex items-center justify-between border-t border-[#E0D7C2] pt-2">
              <div className="flex items-center gap-2">
                {session.qualityScore !== null ? (
                  <span className="font-bold text-[#0F2C4A] bg-[#E0D7C2] px-1.5 py-0.5 rounded text-[10px]">
                    Score: {session.qualityScore}
                  </span>
                ) : (
                  <span className="text-[#5A5245] italic text-[10px]">No Score</span>
                )}
              </div>
              <button className="text-[#0F2C4A] font-semibold text-[10px] underline hover:text-[#C9A84C]">
                Reopen Session
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
