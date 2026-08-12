'use client';

/**
 * Opus Publica Composition Engine (OPCE) — Composition Workspace Container
 *
 * Integrated editorial composition workspace tab providing live preview, quality report,
 * package manifest inspection, and session controls.
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { CompositionResult, QualityReport, RenderedOutput } from '@/lib/opce';
import { QualityReportCard } from './QualityReportCard';
import { PreviewFrame } from './PreviewFrame';
import { PackageViewer } from './PackageViewer';
import { SessionHistory, SessionHistoryItem } from './SessionHistory';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, FileText, Settings, Download, ExternalLink, Loader2 } from 'lucide-react';

export interface CompositionWorkspaceProps {
  articleId: string;
  articleTitle: string;
  journalSlug: string;
}

type WorkspaceState = 'config' | 'preview' | 'accepted' | 'publishing' | 'published';

export const CompositionWorkspace: React.FC<CompositionWorkspaceProps> = ({
  articleId,
  articleTitle,
}) => {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>('config');
  const [activeTab, setActiveTab] = useState<'preview' | 'quality' | 'package'>('preview');
  
  // Configuration State
  const [pubStandard, setPubStandard] = useState('Journal Default');
  const [renderMode, setRenderMode] = useState<'draft' | 'proof' | 'publication'>('draft');
  const [pageSize, setPageSize] = useState('A4');
  const [typography, setTypography] = useState('Journal Default');
  const [runningHeader, setRunningHeader] = useState('On');
  const [watermark, setWatermark] = useState('Draft');
  const [citationStyle, setCitationStyle] = useState('Journal Default');
  const [pdfQuality, setPdfQuality] = useState('Standard');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CompositionResult | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [publishedPdfUrl, setPublishedPdfUrl] = useState<string | null>(null);

  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);

  // Validation
  const isConfigValid = !!(
    pubStandard && 
    renderMode && 
    pageSize && 
    typography && 
    runningHeader && 
    watermark && 
    citationStyle && 
    pdfQuality
  );

  const handleCompose = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert('Authentication required.');
      return;
    }

    setIsLoading(true);
    setWorkspaceState('preview');
    try {
      const backendMode = renderMode;
      const res = await fetch('/api/opce/compose', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          articleId, 
          mode: backendMode,
          config: {
            pubStandard,
            pageSize,
            typography,
            runningHeader,
            watermark,
            citationStyle,
            pdfQuality
          }
        }),
      });

      if (!res.ok) {
        throw new Error(`Composition request failed with status ${res.status}`);
      }

      const data: CompositionResult = await res.json();
      setResult(data);

      const report = data.qualityReport as QualityReport | null;
      const outputs = data.renderedOutputs as RenderedOutput[];

      if (data.success && (data as any).htmlPreview) {
        setHtmlPreview((data as any).htmlPreview);
      } else if (data.success && outputs && outputs.length > 0) {
        setHtmlPreview(`<!DOCTYPE html><html><head><style>body { font-family: sans-serif; padding: 24px; color: #23201A; } h1 { color: #0F2C4A; } .box { border-left: 3px solid #C9A84C; padding-left: 12px; background: #FCFAF4; }</style></head><body><div class="box"><h1>${data.document?.metadata?.title || articleTitle}</h1><p>Rendered via OPCE Composition Engine (${data.sessionId}).</p><p>Quality Score: <strong>${report?.summary?.score || 100}/100</strong></p></div></body></html>`);
      }

      if (data.sessionId) {
        const newSession = {
          id: data.sessionId,
          initiatedAt: new Date().toISOString(),
          renderMode: backendMode,
          status: data.success ? 'completed' : 'failed',
          qualityScore: report?.summary?.score ?? null,
          existingPdfUrl: (data as any).existingPdfUrl ? `/api/pdf?id=${articleId}&type=publisher` : null
        } as SessionHistoryItem;
        
        setSessionHistory(prev => [newSession, ...prev]);
      }
      
      if (backendMode === 'publication') {
        setWorkspaceState('accepted');
      } else {
        setWorkspaceState('preview');
      }
      setActiveTab('preview');
    } catch (err) {
      console.error('OPCE Composition error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPreview = async () => {
    if (!result?.sessionId) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert('Authentication required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/opce/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          articleId, 
          sessionId: result.sessionId,
          result,
          config: {
            pubStandard,
            renderMode,
            pageSize,
            typography,
            runningHeader,
            watermark,
            citationStyle,
            pdfQuality
          }
        })
      });
      if (!res.ok) throw new Error('Failed to approve artifact');
      const data = await res.json();
      setWorkspaceState('accepted');
    } catch (e) {
      console.error(e);
      alert('Failed to approve preview.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadHtml = () => {
    const htmlOutput = (result?.renderedOutputs as any[])?.find((o: any) => o.format === 'html' || o.format === 'html-preview');
    if (htmlOutput?.storagePath) {
      window.open(`/api/pdf?id=${articleId}&path=${encodeURIComponent(htmlOutput.storagePath)}&download=true`, '_blank');
      return;
    }
    
    if (!htmlPreview) return;
    const blob = new Blob([htmlPreview], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preview-${articleId}.html`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000); // Increased timeout to ensure download initiates
  };

  const handleDownloadPdf = () => {
    const p = result?.pdfStoragePath;
    const existing = (result as any)?.existingPdfUrl || publishedPdfUrl;
    
    // Check renderedOutputs if pdfStoragePath isn't directly set
    const pdfOutput = (result?.renderedOutputs as any[])?.find((o: any) => o.format === 'pdf');
    const storagePath = p || pdfOutput?.storagePath;
    
    const pdfUrl = storagePath 
      ? `/api/pdf?id=${articleId}&path=${encodeURIComponent(storagePath)}` 
      : (existing && !existing.startsWith('/api/pdf') ? `/api/pdf?id=${articleId}&path=${encodeURIComponent(existing)}` : existing);
      
    if (!pdfUrl) {
      alert("PDF not available for download in this session.");
      return;
    }
    
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.target = '_blank';
    a.download = `article-${articleId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGeneratePdf = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert('Authentication required.');
      return;
    }

    setWorkspaceState('publishing');
    setIsLoading(true);
    try {
      const res = await fetch('/api/opce/pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ articleId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate PDF');

      setPublishedPdfUrl(data.published_pdf_url || data.canonical_package_url ? `${data.canonical_package_url}/publisher.pdf` : `/api/pdf?id=${articleId}&type=publisher`);
      setWorkspaceState('published');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF.');
      setWorkspaceState('accepted');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert('Authentication required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/articles/publish', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ articleId, action: 'publish' })
      });
      if (!res.ok) throw new Error('Failed to publish');
      alert('Article Published Successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to publish.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentReport = result ? (result.qualityReport as QualityReport | null) : null;
  const latestSession = sessionHistory[0];

  const workflowSteps = ['config', 'preview', 'accepted', 'publishing', 'published'];
  const currentStepIndex = workflowSteps.indexOf(workspaceState);

  return (
    <div className="bg-[#FCFAF4] rounded-xl border border-[#E0D7C2] p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 border-b border-[#E0D7C2] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/opus-publica-logo.png"
                alt="Opus Publica Emblem"
                width={32}
                height={32}
                className="object-contain rounded-md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F2C4A] text-[#C9A84C] rounded uppercase tracking-wider">
                    OPCE Engine v1.0
                  </span>
                  <h2 className="text-xl font-bold text-[#0F2C4A]">Editorial Workspace</h2>
                </div>
                <p className="text-xs text-[#5A5245] mt-0.5 truncate max-w-xl">{articleTitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Indicator */}
        <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-[#5A5245] gap-2 pt-2">
          {['Configuration', 'Preview', 'Accepted', 'Publisher PDF', 'Published'].map((label, idx) => {
            const isActive = idx === currentStepIndex;
            const isPast = idx < currentStepIndex;
            return (
              <React.Fragment key={label}>
                <span className={`px-2 py-1 rounded ${isActive ? 'bg-[#0F2C4A] text-[#C9A84C]' : isPast ? 'text-[#0F2C4A] opacity-75' : ''}`}>
                  {label}
                </span>
                {idx < 4 && <span className="opacity-50">→</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
                 {/* Unified Configuration Panel */}
          <div className="bg-white rounded-lg border border-[#E0D7C2] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#0F2C4A] mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#C9A84C]" />
              Composition Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F2C4A] text-xs uppercase tracking-wider">Publication Standard</label>
                <select disabled={workspaceState !== 'config'} value={pubStandard} onChange={e => setPubStandard(e.target.value)} className="w-full p-2 border border-[#E0D7C2] rounded bg-[#FCFAF4] text-[#0F2C4A] focus:outline-none focus:border-[#0F2C4A] disabled:opacity-75 disabled:cursor-not-allowed">
                  <option value="Journal Default">Journal Default</option>
                  <option value="Working Paper">Working Paper</option>
                  <option value="Book Chapter">Book Chapter</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F2C4A] text-xs uppercase tracking-wider">Render Mode</label>
                <select disabled={workspaceState !== 'config'} value={renderMode} onChange={e => setRenderMode(e.target.value as any)} className="w-full p-2 border border-[#E0D7C2] rounded bg-[#FCFAF4] text-[#0F2C4A] focus:outline-none focus:border-[#0F2C4A] disabled:opacity-75 disabled:cursor-not-allowed">
                  <option value="draft">Draft</option>
                  <option value="proof">Proof</option>
                  <option value="publication">Publisher</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F2C4A] text-xs uppercase tracking-wider">Page Size</label>
                <select disabled={workspaceState !== 'config'} value={pageSize} onChange={e => setPageSize(e.target.value)} className="w-full p-2 border border-[#E0D7C2] rounded bg-[#FCFAF4] text-[#0F2C4A] focus:outline-none focus:border-[#0F2C4A] disabled:opacity-75 disabled:cursor-not-allowed">
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F2C4A] text-xs uppercase tracking-wider">Typography</label>
                <select disabled={workspaceState !== 'config'} value={typography} onChange={e => setTypography(e.target.value)} className="w-full p-2 border border-[#E0D7C2] rounded bg-[#FCFAF4] text-[#0F2C4A] focus:outline-none focus:border-[#0F2C4A] disabled:opacity-75 disabled:cursor-not-allowed">
                  <option value="Journal Default">Journal Default</option>
                  <option value="Book">Book</option>
                  <option value="Working Paper">Working Paper</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F2C4A] text-xs uppercase tracking-wider">Running Header</label>
                <select disabled={workspaceState !== 'config'} value={runningHeader} onChange={e => setRunningHeader(e.target.value)} className="w-full p-2 border border-[#E0D7C2] rounded bg-[#FCFAF4] text-[#0F2C4A] focus:outline-none focus:border-[#0F2C4A] disabled:opacity-75 disabled:cursor-not-allowed">
                  <option value="On">On</option>
                  <option value="Off">Off</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F2C4A] text-xs uppercase tracking-wider">Watermark</label>
                <select disabled={workspaceState !== 'config'} value={watermark} onChange={e => setWatermark(e.target.value)} className="w-full p-2 border border-[#E0D7C2] rounded bg-[#FCFAF4] text-[#0F2C4A] focus:outline-none focus:border-[#0F2C4A] disabled:opacity-75 disabled:cursor-not-allowed">
                  <option value="Draft">Draft</option>
                  <option value="Proof">Proof</option>
                  <option value="None">None</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F2C4A] text-xs uppercase tracking-wider">Citation Style</label>
                <select disabled={workspaceState !== 'config'} value={citationStyle} onChange={e => setCitationStyle(e.target.value)} className="w-full p-2 border border-[#E0D7C2] rounded bg-[#FCFAF4] text-[#0F2C4A] focus:outline-none focus:border-[#0F2C4A] disabled:opacity-75 disabled:cursor-not-allowed">
                  <option value="Journal Default">Journal Default</option>
                  <option value="APA">APA</option>
                  <option value="Chicago">Chicago</option>
                  <option value="Harvard">Harvard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F2C4A] text-xs uppercase tracking-wider">PDF Quality</label>
                <select disabled={workspaceState !== 'config'} value={pdfQuality} onChange={e => setPdfQuality(e.target.value)} className="w-full p-2 border border-[#E0D7C2] rounded bg-[#FCFAF4] text-[#0F2C4A] focus:outline-none focus:border-[#0F2C4A] disabled:opacity-75 disabled:cursor-not-allowed">
                  <option value="Standard">Standard</option>
                  <option value="Print">Print</option>
                  <option value="Archive">Archive</option>
                </select>
              </div>
            </div>

            {workspaceState === 'config' && (
              <div className="mt-8 border-t border-[#E0D7C2] pt-6 flex justify-end">
                <button
                  onClick={handleCompose}
                  disabled={isLoading || !isConfigValid}
                  className="px-6 py-2.5 text-sm font-bold bg-[#0F2C4A] text-white rounded hover:bg-[#163A5E] shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Generating...' : 'Generate Preview'}
                </button>
              </div>
            )}
          </div>

          {workspaceState !== 'config' && (
            <div className="space-y-6">

              {/* Action Bar */}
              <div className="flex items-center justify-between bg-white border border-[#E0D7C2] p-4 rounded-lg shadow-sm">
                <div className="flex gap-3">
                  {workspaceState === 'preview' && (
                    <>
                      <button onClick={() => setWorkspaceState('config')} className="px-3 py-1.5 text-xs font-medium bg-[#FCFAF4] border border-[#E0D7C2] text-[#0F2C4A] hover:bg-[#F4EFE2] rounded transition-colors flex items-center gap-1">
                        <Settings className="w-3.5 h-3.5" /> Reconfigure
                      </button>
                      <button onClick={handleCompose} className="px-3 py-1.5 text-xs font-medium bg-[#FCFAF4] border border-[#E0D7C2] text-[#0F2C4A] hover:bg-[#F4EFE2] rounded transition-colors">
                        Regenerate Preview
                      </button>
                    </>
                  )}
                  {(workspaceState === 'preview' || workspaceState === 'accepted' || workspaceState === 'published') && (
                    <>
                      <button onClick={handleDownloadHtml} className="px-3 py-1.5 text-xs font-medium bg-[#FCFAF4] border border-[#E0D7C2] text-[#0F2C4A] hover:bg-[#F4EFE2] rounded transition-colors flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" /> Download HTML
                      </button>
                      <button onClick={handleDownloadPdf} className="px-3 py-1.5 text-xs font-medium bg-[#FCFAF4] border border-[#E0D7C2] text-[#0F2C4A] hover:bg-[#F4EFE2] rounded transition-colors flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  {workspaceState === 'preview' && (
                    <button onClick={handleAcceptPreview} disabled={isLoading} className="px-5 py-1.5 text-xs font-bold bg-[#C9A84C] text-[#0F2C4A] rounded hover:bg-[#b5953e] shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 
                      Accept Preview
                    </button>
                  )}
                  {workspaceState === 'accepted' && (
                    <button onClick={handleGeneratePdf} disabled={isLoading} className="px-5 py-1.5 text-xs font-bold bg-[#0F2C4A] text-[#C9A84C] rounded hover:bg-[#163A5E] shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Generate Publisher PDF
                    </button>
                  )}
                  {workspaceState === 'publishing' && (
                    <button disabled className="px-5 py-1.5 text-xs font-bold bg-gray-400 text-white rounded cursor-not-allowed flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...
                    </button>
                  )}
                  {workspaceState === 'published' && (
                    <div className="flex gap-2">
                      <button onClick={handlePublish} disabled={isLoading} className="px-4 py-1.5 text-xs font-bold bg-green-700 text-white rounded hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Publish Article
                      </button>
                      <button className="px-4 py-1.5 text-xs font-bold bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors">Mint DOI</button>
                      <button className="px-4 py-1.5 text-xs font-bold bg-[#FCFAF4] border border-[#E0D7C2] text-[#0F2C4A] rounded hover:bg-[#F4EFE2] transition-colors">Notify Authors</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-[#E0D7C2] text-xs font-medium space-x-6">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`pb-2 transition-colors ${activeTab === 'preview' ? 'text-[#0F2C4A] border-b-2 border-[#0F2C4A] font-bold' : 'text-[#5A5245] hover:text-[#0F2C4A]'}`}
                >
                  HTML Preview
                </button>
                <button
                  onClick={() => setActiveTab('quality')}
                  className={`pb-2 transition-colors ${activeTab === 'quality' ? 'text-[#0F2C4A] border-b-2 border-[#0F2C4A] font-bold' : 'text-[#5A5245] hover:text-[#0F2C4A]'}`}
                >
                  Quality Diagnostics {currentReport && `(${currentReport.summary.score}/100)`}
                </button>
                <button
                  onClick={() => setActiveTab('package')}
                  className={`pb-2 transition-colors ${activeTab === 'package' ? 'text-[#0F2C4A] border-b-2 border-[#0F2C4A] font-bold' : 'text-[#5A5245] hover:text-[#0F2C4A]'}`}
                >
                  Preview Manifest
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'preview' && (
                <div className="space-y-4">
                  {workspaceState === 'published' && publishedPdfUrl && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="text-green-600 w-5 h-5" />
                        <span className="text-sm font-semibold text-green-900">Publisher PDF Successfully Generated</span>
                      </div>
                      <a href={publishedPdfUrl?.startsWith('/api/pdf') ? publishedPdfUrl : `/api/pdf?id=${articleId}&path=${encodeURIComponent(publishedPdfUrl || '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-[#0F2C4A] hover:underline">
                        View Final PDF <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                  <PreviewFrame htmlContent={htmlPreview} isLoading={isLoading} />
                </div>
              )}

              {activeTab === 'quality' && (
                <QualityReportCard report={currentReport} isLoading={isLoading} />
              )}

              {activeTab === 'package' && (
                <PackageViewer result={result} renderMode={latestSession?.renderMode || renderMode} />
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <SessionHistory sessionHistory={sessionHistory} />
          
          <div className="p-4 bg-white rounded-lg border border-[#E0D7C2] text-xs space-y-2 shadow-sm">
            <h4 className="font-bold text-[#0F2C4A] mb-3 uppercase tracking-wider border-b border-[#E0D7C2] pb-2">Engine Context</h4>
            <div className="space-y-1 mt-3 text-xs text-[#5A5245]">
              <div className="flex justify-between items-center"><span className="font-medium">Subsystem:</span> <span>Native OPCE v1.0.0</span></div>
              <div className="flex justify-between items-center"><span className="font-medium">Template Ver:</span> <span>{latestSession?.templateVersion || 'v1.0.0'}</span></div>
              <div className="flex justify-between items-center"><span className="font-medium">Style Ver:</span> <span className="font-mono text-[10px] text-right truncate max-w-[80px]" title={result?.styleChecksum || 'v1.0.0'}>{result?.styleChecksum ? result.styleChecksum.substring(0, 8) : 'v1.0.0'}</span></div>
              
              <div className="pt-2 mt-2 border-t border-[#E0D7C2] space-y-2">
                <div className="flex justify-between items-center"><span className="font-medium">Article ID:</span> <span className="font-mono text-[10px] text-[#0F2C4A]">{articleId.substring(0, 8)}...</span></div>
                {latestSession && (
                  <>
                    <div className="flex justify-between items-center"><span className="font-medium">Session ID:</span> <span className="font-mono text-[10px] text-[#0F2C4A]">{latestSession.id.substring(0, 8)}...</span></div>
                    <div className="flex justify-between items-center"><span className="font-medium">Render Mode:</span> <span className="uppercase text-[#0F2C4A] font-semibold">{latestSession.renderMode}</span></div>
                    <div className="flex justify-between items-center"><span className="font-medium">Generated By:</span> <span>System Editor</span></div>
                    <div className="flex justify-between items-center"><span className="font-medium">Generated At:</span> <span>{new Date(latestSession.initiatedAt).toLocaleTimeString()}</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
