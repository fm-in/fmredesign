/**
 * Blog editor — TipTap rich-text wrapper used on the admin edit page.
 *
 * Initial content is the post's TipTap JSON (preferred — round-trips
 * losslessly) or the HTML if no JSON is stored. Emits both onChange so
 * the edit page can persist either representation.
 *
 * Toolbar covers what a marketing blog usually needs: headings, bold,
 * italic, lists, blockquote, link, image (upload to Supabase). Image
 * uploads go through /api/admin/blog/images with the editor's postId.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
// NB: StarterKit v3 ships Link — don't double-import @tiptap/extension-link.
import {
  Bold, Italic, Strikethrough, Code,
  Heading2, Heading3,
  List, ListOrdered, Quote,
  Link as LinkIcon, Image as ImageIcon, Undo2, Redo2, Minus,
} from 'lucide-react';

interface BlogEditorProps {
  postId: string;
  initialJson?: Record<string, unknown>;
  initialHtml?: string;
  onChange: (state: { json: Record<string, unknown>; html: string }) => void;
}

export function BlogEditor({ postId, initialJson, initialHtml, onChange }: BlogEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { class: 'blog-link', rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Start writing your post…' }),
    ],
    content: initialJson ?? initialHtml ?? '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-6 py-5',
      },
    },
    onUpdate: ({ editor }) => {
      onChange({ json: editor.getJSON() as Record<string, unknown>, html: editor.getHTML() });
    },
  });

  // If the parent loads new initial content async (e.g. after fetching the
  // post), push it into the editor exactly once.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editor || hydratedRef.current) return;
    if (initialJson) {
      editor.commands.setContent(initialJson);
      hydratedRef.current = true;
    } else if (initialHtml) {
      editor.commands.setContent(initialHtml);
      hydratedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, initialJson, initialHtml]);

  if (!editor) {
    return <div className="border rounded-lg p-8 text-sm text-fm-neutral-500">Loading editor…</div>;
  }

  const insertImage = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('postId', postId);
    fd.append('kind', 'inline');
    try {
      const res = await fetch('/api/admin/blog/images', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Upload failed');
      editor.chain().focus().setImage({ src: json.data.url, alt: file.name }).run();
    } catch (e) {
      alert(`Image upload failed: ${(e as Error).message}`);
    }
  };

  const onPickImage = () => fileInputRef.current?.click();

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border border-fm-neutral-200 rounded-xl bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-fm-neutral-200 bg-fm-neutral-50">
        <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 className="w-4 h-4" />} title="Heading 2" />
        <Btn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} icon={<Heading3 className="w-4 h-4" />} title="Heading 3" />
        <Divider />
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold className="w-4 h-4" />} title="Bold" />
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic className="w-4 h-4" />} title="Italic" />
        <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} icon={<Strikethrough className="w-4 h-4" />} title="Strikethrough" />
        <Btn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} icon={<Code className="w-4 h-4" />} title="Inline code" />
        <Divider />
        <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<List className="w-4 h-4" />} title="Bullet list" />
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={<ListOrdered className="w-4 h-4" />} title="Numbered list" />
        <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={<Quote className="w-4 h-4" />} title="Quote" />
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={<Minus className="w-4 h-4" />} title="Divider" />
        <Divider />
        <Btn active={editor.isActive('link')} onClick={setLink} icon={<LinkIcon className="w-4 h-4" />} title="Insert link" />
        <Btn onClick={onPickImage} icon={<ImageIcon className="w-4 h-4" />} title="Insert image" />
        <Divider />
        <Btn onClick={() => editor.chain().focus().undo().run()} icon={<Undo2 className="w-4 h-4" />} title="Undo" />
        <Btn onClick={() => editor.chain().focus().redo().run()} icon={<Redo2 className="w-4 h-4" />} title="Redo" />
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) insertImage(f);
          if (e.target) e.target.value = '';
        }}
      />
    </div>
  );
}

function Btn({
  icon,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition-colors ${
        active ? 'bg-fm-magenta-600 text-white' : 'text-fm-neutral-600 hover:bg-fm-neutral-200'
      }`}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-6 bg-fm-neutral-200 self-center mx-1" aria-hidden />;
}
