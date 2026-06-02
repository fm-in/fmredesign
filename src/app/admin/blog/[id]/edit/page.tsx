/**
 * Blog edit — TipTap editor (left) + metadata sidebar (right).
 * Save persists current title + body + metadata. Publish flips status.
 *
 * If query param ?fresh=1 we just landed from the upload page; show a
 * one-time toast hint pointing the user at the AI-filled fields.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Eye, Loader2, Sparkles, Trash2, Upload, Image as ImageIcon,
  Tag as TagIcon, Globe, Settings2, Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { adminToast } from '@/lib/admin/toast';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { BlogEditor } from '@/components/admin/blog/BlogEditor';
import {
  STATUS_LABELS, slugify, type BlogPost, type PostStatus, type PostTag,
} from '@/lib/admin/blog-types';

export default function BlogEditPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const postId = params.id;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bodyJson, setBodyJson] = useState<Record<string, unknown> | undefined>();
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [featured, setFeatured] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/blog/posts?id=${postId}`);
        const json = await res.json();
        if (!json.success) {
          adminToast.error(json.error || 'Failed to load post');
          return;
        }
        const p = json.data as BlogPost;
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt || '');
        setCategory(p.category || '');
        setTagsInput((p.tags || []).map((t) => t.name).join(', '));
        setCoverImageUrl(p.coverImageUrl || '');
        setSeoTitle(p.seoTitle || '');
        setSeoDescription(p.seoDescription || '');
        setStatus(p.status);
        setFeatured(p.featured);
        setBodyJson(p.bodyTiptap);
        setBodyHtml(p.bodyHtml || '');
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  useEffect(() => {
    if (search.get('fresh') === '1') {
      adminToast.success('AI drafted your post — review the title, excerpt and tags on the right, then publish.');
    }
  }, [search]);

  const onEditorChange = useCallback((state: { json: Record<string, unknown>; html: string }) => {
    setBodyJson(state.json);
    setBodyHtml(state.html);
  }, []);

  async function save(newStatus?: PostStatus) {
    if (!post) return;
    setSaving(true);
    try {
      const tags: PostTag[] = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, slug: slugify(name) }));

      const payload: Record<string, unknown> = {
        id: post.id,
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        excerpt: excerpt.trim() || null,
        category: category.trim() || null,
        tags: tags.length > 0 ? tags : null,
        coverImageUrl: coverImageUrl.trim() || null,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        bodyHtml,
        bodyTiptap: bodyJson,
        featured,
      };
      if (newStatus) payload.status = newStatus;

      const res = await fetch('/api/admin/blog/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        adminToast.error(json.error || 'Save failed');
        return;
      }
      if (newStatus) setStatus(newStatus);
      adminToast.success(newStatus === 'published' ? 'Published!' : 'Saved');
      if (newStatus === 'published') {
        // Refresh to pick up published_at
        const r = await fetch(`/api/admin/blog/posts?id=${post.id}`);
        const j = await r.json();
        if (j.success) setPost(j.data);
      }
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(file: File) {
    if (!post) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('postId', post.id);
    fd.append('kind', 'covers');
    try {
      const res = await fetch('/api/admin/blog/images', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Cover upload failed');
      setCoverImageUrl(json.data.url);
      adminToast.success('Cover image uploaded');
    } catch (e) {
      adminToast.error((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!post) return;
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/admin/blog/posts?id=${post.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      adminToast.success('Post deleted');
      router.push('/admin/blog');
    } catch (e) {
      adminToast.error((e as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-fm-neutral-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!post) {
    return (
      <div className="p-12 text-center">
        <p className="text-fm-neutral-700">Post not found.</p>
        <Link href="/admin/blog" className="text-fm-magenta-600 hover:underline text-sm mt-2 inline-block">
          ← Back to all posts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={post.title || 'Untitled'}
        description={post.aiAssisted ? 'AI-drafted from your upload' : 'Manual draft'}
        icon={post.aiAssisted ? <Sparkles className="w-6 h-6" /> : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-fm-neutral-600 hover:text-fm-neutral-900">
              <ArrowLeft className="w-4 h-4" />
              All posts
            </Link>
            {post.status === 'published' && (
              <Link
                href={`/blog/${post.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-fm-neutral-200 text-fm-neutral-700 hover:bg-fm-neutral-50 text-sm"
              >
                <Eye className="w-4 h-4" />
                View live
              </Link>
            )}
            <button
              type="button"
              onClick={() => save()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-700 hover:bg-fm-neutral-50 text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save draft
            </button>
            {status !== 'published' && (
              <button
                type="button"
                onClick={() => save('published')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-fm-magenta-600 text-white hover:bg-fm-magenta-700 text-sm font-medium disabled:opacity-50"
              >
                Publish
              </button>
            )}
            {status === 'published' && (
              <button
                type="button"
                onClick={() => save('draft')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-sm font-medium disabled:opacity-50"
              >
                Unpublish
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column: title + body ──────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-4 py-3 text-2xl font-display font-bold text-fm-neutral-900 border border-fm-neutral-200 rounded-xl focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent bg-white"
          />
          <input
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Excerpt (one-sentence summary, shows on listing & social cards)"
            className="w-full px-4 py-2 text-fm-neutral-700 border border-fm-neutral-200 rounded-xl focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent bg-white"
            maxLength={200}
          />
          <BlogEditor
            postId={post.id}
            initialJson={bodyJson}
            initialHtml={bodyHtml}
            onChange={onEditorChange}
          />
        </div>

        {/* ── Sidebar: metadata ──────────────────────────── */}
        <aside className="space-y-5">
          {/* Status card */}
          <SidebarCard title="Status" icon={<Settings2 className="w-4 h-4" />}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-fm-neutral-600">Current</span>
              <span className="text-sm font-semibold text-fm-neutral-900">{STATUS_LABELS[status]}</span>
            </div>
            {post.publishedAt && (
              <div className="flex items-center justify-between text-xs text-fm-neutral-500">
                <span>Published</span>
                <span>{new Date(post.publishedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            )}
            <label className="flex items-center gap-2 mt-3 text-sm text-fm-neutral-700">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 accent-fm-magenta-600"
              />
              Featured post (shows at top of /blog)
            </label>
          </SidebarCard>

          {/* Cover image */}
          <SidebarCard title="Cover image" icon={<ImageIcon className="w-4 h-4" />}>
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="cover" className="w-full aspect-video object-cover rounded-lg mb-2" />
            ) : (
              <div className="aspect-video w-full bg-fm-neutral-100 rounded-lg flex items-center justify-center text-fm-neutral-400 mb-2">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 text-sm text-fm-magenta-700 cursor-pointer hover:underline">
              <Upload className="w-4 h-4" />
              {coverImageUrl ? 'Replace image' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCover(f);
                  if (e.target) e.target.value = '';
                }}
              />
            </label>
            {coverImageUrl && (
              <button
                type="button"
                onClick={() => setCoverImageUrl('')}
                className="ml-3 text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </SidebarCard>

          {/* URL + tags + category */}
          <SidebarCard title="Discovery" icon={<TagIcon className="w-4 h-4" />}>
            <div className="space-y-3">
              <Field label="URL slug">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-post-slug"
                  className="text-sm w-full px-3 py-1.5 border border-fm-neutral-200 rounded-md focus:ring-1 focus:ring-fm-magenta-500"
                />
                <div className="text-[11px] text-fm-neutral-500 mt-1">/blog/{slug || '…'}</div>
              </Field>
              <Field label="Category">
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Marketing"
                  className="text-sm w-full px-3 py-1.5 border border-fm-neutral-200 rounded-md focus:ring-1 focus:ring-fm-magenta-500"
                />
              </Field>
              <Field label="Tags (comma-separated)">
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="SEO, Bhopal, Growth"
                  className="text-sm w-full px-3 py-1.5 border border-fm-neutral-200 rounded-md focus:ring-1 focus:ring-fm-magenta-500"
                />
              </Field>
            </div>
          </SidebarCard>

          {/* SEO */}
          <SidebarCard title="SEO" icon={<Globe className="w-4 h-4" />}>
            <div className="space-y-3">
              <Field label={`SEO title (${seoTitle.length}/60)`}>
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Falls back to post title"
                  maxLength={80}
                  className="text-sm w-full px-3 py-1.5 border border-fm-neutral-200 rounded-md focus:ring-1 focus:ring-fm-magenta-500"
                />
              </Field>
              <Field label={`Meta description (${seoDescription.length}/155)`}>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Falls back to excerpt"
                  maxLength={170}
                  rows={3}
                  className="text-sm w-full px-3 py-1.5 border border-fm-neutral-200 rounded-md focus:ring-1 focus:ring-fm-magenta-500 resize-none"
                />
              </Field>
            </div>
          </SidebarCard>

          {/* Stats + danger */}
          <SidebarCard title="Stats" icon={<Calendar className="w-4 h-4" />}>
            <div className="text-sm text-fm-neutral-700 space-y-1">
              <div className="flex justify-between"><span>Word count</span><span>{post.wordCount}</span></div>
              <div className="flex justify-between"><span>Read time</span><span>{post.readMinutes} min</span></div>
              <div className="flex justify-between"><span>Created</span><span>{new Date(post.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span></div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete post
            </button>
          </SidebarCard>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this post?"
        description="This is permanent. There is no recycle bin."
        confirmLabel="Delete"
        variant="destructive"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function SidebarCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-fm-neutral-200 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-fm-neutral-900 mb-3">
        <span className="text-fm-magenta-600">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
