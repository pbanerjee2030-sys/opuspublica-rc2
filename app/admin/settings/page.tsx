'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/admin-api';
import {
  Settings,
  Mail,
  Key,
  Globe,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Shield,
  Bell,
  Server,
} from 'lucide-react';

interface SettingSection {
  id: string;
  label: string;
  icon: any;
}

const sections: SettingSection[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [doiPrefix, setDoiPrefix] = useState('10.57939');

  useEffect(() => {
    fetchDoiPrefix();
  }, []);

  const fetchDoiPrefix = async () => {
    try {
      const { data } = await adminFetch('articles');
      if (data && Array.isArray(data)) {
        const articleWithDoi = data.find((a: any) => a.doi && a.doi.includes('/'));
        if (articleWithDoi) {
          const prefix = articleWithDoi.doi.split('/')[0];
          setDoiPrefix(prefix);
        }
      }
    } catch (e) {
      console.error('Error fetching DOI prefix:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white">Settings & Integrations</h1>
        <p className="text-sm text-zinc-400 mt-1">Configure platform settings and third-party integrations.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-[#111118] border border-zinc-800 rounded-xl p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeSection === s.id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'general' && (
            <div className="space-y-6">
              <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-serif font-bold text-white mb-4">Platform Information</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Platform Name</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white">Opus Publica</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Organization</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white">Advocacy Unified Network</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Website URL</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white flex items-center gap-2">
                      https://www.opuspublica.com
                      <a href="https://www.opuspublica.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 hover:text-[#C9A84C]" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Contact Email</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white">info@opuspublica.com</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-serif font-bold text-white mb-4">Database Status</h2>
                <div className="space-y-3">
                  {[
                    { name: 'Supabase Connected', status: true },
                    { name: 'Auth Service', status: true },
                    { name: 'Storage Buckets', status: true },
                    { name: 'Row Level Security', status: true },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
                      <span className="text-sm text-zinc-300">{item.name}</span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6">
              {/* Crossref */}
              <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-950/40 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-white">Crossref DOI</h2>
                    <p className="text-xs text-zinc-500">Automated DOI minting for published articles</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Deposit Endpoint</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-400 font-mono">api.crossref.org/deposits</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">DOI Prefix</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-400 font-mono">{doiPrefix}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Username</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white flex items-center gap-2">
                      pronob@opuspublica.com
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Password</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-400">Set in .env.local</div>
                  </div>
                </div>
              </div>

              {/* Resend */}
              <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-950/40 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-white">Resend Email</h2>
                    <p className="text-xs text-zinc-500">Transactional email delivery service</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">API Endpoint</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-400 font-mono">api.resend.com</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">From Address</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-400 font-mono">notifications@opuspublica.com</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Status</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-amber-400 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Requires RESEND_API_KEY in .env.local
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">API Key</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-400">Set in .env.local</div>
                  </div>
                </div>
              </div>

              {/* Supabase */}
              <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-950/40 flex items-center justify-center">
                    <Database className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-white">Supabase</h2>
                    <p className="text-xs text-zinc-500">Database, auth, and storage backend</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Project URL</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-400 font-mono truncate">pnrmsxowlquoifhhfeom.supabase.co</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Status</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-serif font-bold text-white mb-4">Email Notification Templates</h2>
              <p className="text-sm text-zinc-400 mb-6">The following email types are supported. Configure via the Resend API integration.</p>
              <div className="space-y-4">
                {[
                  { type: 'submission_received', label: 'Submission Received', desc: 'Sent to authors when they submit a manuscript', icon: '📄' },
                  { type: 'article_published', label: 'Article Published', desc: 'Sent to authors when their article is approved and published', icon: '✅' },
                  { type: 'article_rejected', label: 'Article Rejected', desc: 'Sent to authors when their article is rejected (includes reason)', icon: '❌' },
                  { type: 'review_assigned', label: 'Review Assigned', desc: 'Sent to reviewers when assigned to review an article', icon: '📋' },
                ].map((t) => (
                  <div key={t.type} className="flex items-center gap-4 p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{t.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-950/40 text-green-400 border border-green-900/30">
                      Configured
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-serif font-bold text-white mb-4">Authentication</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Auth Provider', value: 'Supabase Auth (Email/Password)' },
                    { label: 'Session Persistence', value: 'Enabled (localStorage + cookies)' },
                    { label: 'Auto Token Refresh', value: 'Enabled' },
                    { label: 'Email Confirmation', value: 'Required on signup' },
                    { label: 'Password Minimum Length', value: '6 characters' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
                      <span className="text-sm text-zinc-400">{item.label}</span>
                      <span className="text-sm text-white font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-serif font-bold text-white mb-4">Role Hierarchy</h2>
                <div className="space-y-3">
                  {[
                    { role: 'admin', desc: 'Full platform access. Can manage all settings, users, journals, and articles.', color: 'text-red-400' },
                    { role: 'editor', desc: 'Can review, approve, reject articles. Can mint DOIs and manage reviewers.', color: 'text-purple-400' },
                    { role: 'reviewer', desc: 'Can view assigned reviews and submit review recommendations.', color: 'text-blue-400' },
                    { role: 'author', desc: 'Can submit manuscripts and view their own profile and submissions.', color: 'text-zinc-400' },
                  ].map((r) => (
                    <div key={r.role} className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${r.color}`} />
                        <span className={`text-sm font-bold uppercase tracking-wider ${r.color}`}>{r.role}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111118] border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-serif font-bold text-white mb-4">API Endpoints</h2>
                <div className="space-y-2">
                  {[
                    { method: 'POST', path: '/api/doi/mint', desc: 'Mint DOI via Crossref (admin/editor only)' },
                    { method: 'POST', path: '/api/notifications', desc: 'Send email notifications (server-side only)' },
                    { method: 'GET', path: '/api/debug', desc: 'Diagnostic endpoint (service role required)' },
                  ].map((ep) => (
                    <div key={ep.path} className="flex items-center gap-3 py-2 border-b border-zinc-800/60 last:border-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        ep.method === 'POST' ? 'bg-blue-950/40 text-blue-400' : 'bg-green-950/40 text-green-400'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="text-sm font-mono text-white">{ep.path}</span>
                      <span className="text-xs text-zinc-500 ml-auto hidden sm:block">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
