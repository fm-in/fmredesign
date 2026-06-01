'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgramForm } from '@/components/admin/academy/ProgramForm';
import { GraduationCap } from 'lucide-react';
import type { Program } from '@/lib/admin/academy-types';

export default function EditProgramPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/academy/programs?id=${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProgram(json.data as Program);
        else setError(json.error || 'Program not found');
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={program ? `Edit: ${program.title}` : 'Edit program'}
        icon={<GraduationCap className="w-6 h-6" />}
      />
      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : program ? (
        <ProgramForm initial={program} />
      ) : null}
    </div>
  );
}
