'use client';

/**
 * Opus Publica Composition Engine (OPCE) — Preview Frame Component
 *
 * Renders live manuscript HTML preview in a scoped iframe viewer with download controls.
 */

import React from 'react';

export interface PreviewFrameProps {
  htmlContent: string | null;
  isLoading?: boolean;
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({ htmlContent, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-[600px] w-full bg-[#FCFAF4] border border-[#E0D7C2] rounded-lg flex items-center justify-center text-[#5A5245]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#0F2C4A] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Generating OPCE Composition Preview...</p>
        </div>
      </div>
    );
  }

  if (!htmlContent) {
    return (
      <div className="h-[400px] w-full bg-[#FCFAF4] border border-[#E0D7C2] rounded-lg flex items-center justify-center text-[#5A5245] text-sm">
        <p>No preview generated yet. Click "Compose Manuscript" to render document.</p>
      </div>
    );
  }

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `opce-preview-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg border border-[#E0D7C2] overflow-hidden flex flex-col h-[700px]">
      {/* Control Bar */}
      <div className="px-4 py-2.5 bg-[#F4EFE2] border-b border-[#E0D7C2] flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0F2C4A]">HTML Preview Frame</span>
        <button
          onClick={handleDownload}
          className="px-3 py-1 text-xs font-medium bg-[#0F2C4A] text-white rounded hover:bg-[#163A5E] transition-colors"
        >
          Download HTML Preview
        </button>
      </div>

      {/* Iframe Viewport */}
      <iframe
        srcDoc={htmlContent}
        title="OPCE Manuscript Preview"
        className="w-full flex-grow border-none"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
};
