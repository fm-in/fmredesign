/**
 * New blog post — creates a blank draft and immediately redirects to the
 * edit page. No separate "create" form; everything happens in the editor.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { adminToast } from '@/lib/admin/toast';

export default function NewBlogPostPage() {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/admin/blog/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Untitled post',
            status: 'draft',
            source: 'manual',
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Could not create post');
        router.replace(`/admin/blog/${json.data.id}/edit`);
      } catch (e) {
        adminToast.error((e as Error).message);
        router.replace('/admin/blog');
      }
    })();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-96 text-fm-neutral-500">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}
