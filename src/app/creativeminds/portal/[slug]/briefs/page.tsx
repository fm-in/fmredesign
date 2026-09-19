'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Briefcase, Loader2, FileText } from 'lucide-react';

interface Brief {
  projectId: string;
  projectName: string;
  clientName: string;
  status: string;
  progress: number;
  deliverables: unknown[];
  milestones: unknown[];
  role: string;
  hoursAllocated: number;
}

export default function TalentBriefsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchBriefs() {
      try {
        const res = await fetch(`/api/talent/${slug}/briefs`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setBriefs(json.data || []);
        if (json.message && (!json.data || json.data.length === 0)) {
          setMessage(json.message);
        }
      } catch {
        setMessage('Failed to load briefs.');
      } finally {
        setLoading(false);
      }
    }
    fetchBriefs();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-fm-magenta-600" />
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'review': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fm-neutral-900">Project Briefs</h1>
        <p className="text-fm-neutral-600 mt-1">Your assigned projects and deliverables.</p>
      </div>

      {briefs.length === 0 && (
        <div className="rounded-lg border border-fm-neutral-200 p-8" style={{ textAlign: 'center' }}>
          <FileText className="w-10 h-10 text-fm-neutral-400 mx-auto mb-3" />
          <p className="text-fm-neutral-600">{message || 'No project briefs assigned yet.'}</p>
        </div>
      )}

      <div className="space-y-4">
        {briefs.map(brief => (
          <div key={brief.projectId} className="rounded-site-md border border-fm-neutral-200 bg-white p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-fm-magenta-600" />
                  <h3 className="text-lg font-semibold text-fm-neutral-900">{brief.projectName}</h3>
                </div>
                <p className="text-sm text-fm-neutral-600 mt-1">
                  Client: {brief.clientName} &middot; Role: {brief.role}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor(brief.status)}`}>
                {brief.status}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-fm-neutral-600">Progress</span>
                <span className="font-medium text-fm-neutral-900">{brief.progress}%</span>
              </div>
              <div className="h-2 bg-fm-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-fm-magenta-600 rounded-full transition-all"
                  style={{ width: `${brief.progress}%` }}
                />
              </div>
            </div>

            {brief.hoursAllocated > 0 && (
              <p className="text-sm text-fm-neutral-500">
                {brief.hoursAllocated} hours allocated
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
