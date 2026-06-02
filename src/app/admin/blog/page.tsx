/**
 * Blog admin list — every post (any status). Quick stats, status filter,
 * jump to edit / view / delete, two entry points for creation:
 * "Upload file" (drag-drop) and "New blank post".
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText, Plus, Upload, Pencil, Trash2, ExternalLink, Sparkles, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select-native';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { adminToast } from '@/lib/admin/toast';
import { STATUS_LABELS, type BlogPost, type PostStatus } from '@/lib/admin/blog-types';

export default function BlogAdminPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const res = await fetch(`/api/admin/blog/posts${q}`);
      const json = await res.json();
      if (json.success) setPosts(json.data || []);
      else adminToast.error(json.error || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/admin/blog/posts?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      adminToast.success('Post deleted');
      fetchPosts();
    } catch (e) {
      adminToast.error((e as Error).message);
    }
  }

  const counts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Manage public blog posts. Upload a Word or Markdown file and the AI structures it for you."
        icon={<FileText className="w-6 h-6" />}
        actions={
          <div className="flex gap-2">
            <Link
              href="/admin/blog/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-700 hover:bg-fm-neutral-50 text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload file
            </Link>
            <button
              type="button"
              onClick={() => router.push('/admin/blog/new')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fm-magenta-600 text-white hover:bg-fm-magenta-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New post
            </button>
          </div>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={posts.length} />
        <StatCard label="Published" value={counts.published || 0} />
        <StatCard label="Drafts" value={counts.draft || 0} />
        <StatCard label="Archived" value={counts.archived || 0} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PostStatus | 'all')}
          className="w-48"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-fm-neutral-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-fm-neutral-50 border-b border-fm-neutral-200">
              <tr className="text-left text-xs uppercase tracking-wider text-fm-neutral-500">
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fm-neutral-100">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-fm-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-fm-neutral-900 line-clamp-1">{p.title}</div>
                    <div className="text-xs text-fm-neutral-500 line-clamp-1">/blog/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status}>{STATUS_LABELS[p.status]}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-fm-neutral-600">
                    <div className="inline-flex items-center gap-1.5">
                      {p.aiAssisted && <Sparkles className="w-3 h-3 text-fm-magenta-500" />}
                      <span className="text-xs">
                        {p.sourceFilename || p.source}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fm-neutral-600 text-xs">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(p.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status === 'published' && (
                        <Link
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-md hover:bg-fm-neutral-100 text-fm-neutral-600"
                          title="View live"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      <Link
                        href={`/admin/blog/${p.id}/edit`}
                        className="p-1.5 rounded-md hover:bg-fm-neutral-100 text-fm-neutral-600"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete this post?"
        description="This is permanent. Drafts are deleted too — there is no recycle bin."
        confirmLabel="Delete"
        variant="destructive"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-fm-neutral-200 p-4">
      <div className="text-xs text-fm-neutral-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-fm-neutral-900">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <FileText className="w-12 h-12 text-fm-neutral-300 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-fm-neutral-900 mb-1">No posts yet</h3>
      <p className="text-sm text-fm-neutral-600 mb-4">
        Upload a Word or Markdown file — the AI will draft it for you, or write one from scratch.
      </p>
      <div className="flex justify-center gap-2">
        <Link
          href="/admin/blog/upload"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fm-magenta-600 text-white hover:bg-fm-magenta-700 text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          Upload your first post
        </Link>
      </div>
    </div>
  );
}
