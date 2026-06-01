'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ProgramForm } from '@/components/admin/academy/ProgramForm';
import { GraduationCap } from 'lucide-react';

export default function NewProgramPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Program"
        icon={<GraduationCap className="w-6 h-6" />}
        description="Create a workshop, cohort, course or 1:1 to start selling."
      />
      <ProgramForm />
    </div>
  );
}
