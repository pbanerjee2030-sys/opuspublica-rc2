'use client';

import { useState, useEffect } from 'react';
import { adminFetch, adminUpdate } from '@/lib/admin-api';
import {
  Users,
  Search,
  Pencil,
  Shield,
  User,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  bio: string | null;
  affiliation: string | null;
  created_at: string;
  journals: { name: string; slug: string } | null;
}

const ROLES = ['admin', 'editor', 'author', 'reviewer'];

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await adminFetch('users');
      setUsers((data || []) as any);
    } catch (e: any) {
      if (e.message?.includes('403') || e.message?.includes('Forbidden')) {
        setAccessDenied(true);
      } else {
        console.error('Error fetching users:', e);
      }
    }
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRoleChange = async () => {
    if (!editingUser || !newRole) return;
    setSaving(true);
    try {
      await adminUpdate('profiles', editingUser.id, { role: newRole });
      showToast('success', `Role updated to ${newRole}`);
      setShowRoleModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      showToast('error', e.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-950/40 text-red-400 border border-red-900/30';
      case 'editor': return 'bg-purple-950/40 text-purple-400 border border-purple-900/30';
      case 'reviewer': return 'bg-blue-950/40 text-blue-400 border border-blue-900/30';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.affiliation?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const roleCounts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    editor: users.filter(u => u.role === 'editor').length,
    author: users.filter(u => u.role === 'author').length,
    reviewer: users.filter(u => u.role === 'reviewer').length,
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xl ${
          toast.type === 'success' ? 'bg-green-900 text-green-200 border border-green-800' : 'bg-red-900 text-red-200 border border-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">User Management</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage user roles and account details.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-zinc-300 placeholder-zinc-600 outline-none w-full"
          />
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex gap-1 bg-[#111118] border border-zinc-800 rounded-xl p-1 overflow-x-auto">
        {(['all', 'admin', 'editor', 'author', 'reviewer'] as const).map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              roleFilter === role ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {role === 'all' ? 'All Users' : role}
            <span className="ml-1.5 text-[10px] text-zinc-500">({roleCounts[role]})</span>
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-[#111118] border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accessDenied ? (
          <div className="py-16 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-400 text-sm font-bold">Access Denied</p>
            <p className="text-zinc-500 text-xs mt-1">Only administrators can manage users.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">User</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden md:table-cell">Role</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden lg:table-cell">Journal</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden lg:table-cell">Joined</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center text-xs font-bold font-serif flex-shrink-0">
                          {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{user.full_name || 'Unnamed User'}</p>
                          <p className="text-[11px] text-zinc-500 truncate md:hidden">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getRoleColor(user.role)}`}>{user.role}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs text-zinc-400">{user.journals?.name || '—'}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs text-zinc-500">
                        {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => { setEditingUser(user); setNewRole(user.role); setShowRoleModal(true); }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <Pencil className="w-3 h-3" />
                        <span className="hidden sm:inline">Edit Role</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {showRoleModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowRoleModal(false)} />
          <div className="relative bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-serif font-bold text-white">Edit User Role</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center text-sm font-bold font-serif">
                  {editingUser.full_name ? editingUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{editingUser.full_name || 'Unnamed User'}</p>
                  <p className="text-[11px] text-zinc-500">ID: {editingUser.id.substring(0, 8)}...</p>
                </div>
              </div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Select Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => setNewRole(role)}
                    className={`p-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                      newRole === role
                        ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                        : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => setShowRoleModal(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleRoleChange}
                disabled={saving || newRole === editingUser.role}
                className="px-4 py-2 bg-[#C9A84C] hover:bg-[#D4AF37] text-[#13131A] text-xs font-bold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
