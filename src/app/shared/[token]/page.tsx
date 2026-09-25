'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import {
  Briefcase,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  Calendar,
} from 'lucide-react';

interface ShareData {
  label: string;
  clientName: string;
  clientLogo: string;
  resource: {
    type: 'project' | 'report';
    // project fields
    name?: string;
    description?: string;
    status?: string;
    progress?: number;
    startDate?: string;
    endDate?: string;
    milestones?: { title: string; isCompleted: boolean; dueDate?: string }[];
    deliverables?: { title: string; status: string }[];
    // report fields
    projects?: { name: string; status: string; progress: number }[];
    recentContent?: { title: string; status: string; platform: string; scheduledDate: string }[];
  };
}

export default function SharedResourcePage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/shared/${token}`);
        if (!res.ok) {
          const json = await res.json();
          setError(json.error || 'Link not found or expired');
          return;
        }
        const json = await res.json();
        setData(json.data);
      } catch {
        setError('Failed to load shared content');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEFCFB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fm-magenta-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FEFCFB] flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 md:p-8 bg-site-raised rounded-site-lg shadow-lg border border-fm-neutral-200" style={{ textAlign: 'center' as const }}>
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-fm-neutral-900 mb-2">Link Unavailable</h2>
          <p className="text-fm-neutral-600">{error || 'This shared link is no longer available.'}</p>
        </div>
      </div>
    );
  }

  const { resource, clientName, clientLogo } = data;

  return (
    <div className="min-h-screen bg-[#FEFCFB]">
      {/* Branded Header */}
      <header className="border-b border-fm-neutral-200 bg-site-raised">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {clientLogo && (
              <img src={clientLogo} alt={clientName} className="w-10 h-10 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-semibold text-fm-neutral-900">{clientName}</p>
              {data.label && <p className="text-sm text-fm-neutral-500">{data.label}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-fm-neutral-500">
            <span className="font-medium text-fm-magenta-600">FreakingMinds</span>
            <span>Shared View</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="max-w-5xl mx-auto px-6 py-8">
        {resource.type === 'project' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-3xl font-display font-bold text-fm-neutral-900">{resource.name}</h1>
                {resource.description && (
                  <p className="text-fm-neutral-600 mt-2">{resource.description}</p>
                )}
              </div>
              {resource.status && (
                <Badge variant="secondary" className="capitalize bg-green-100 text-green-800 border-green-200">
                  {resource.status}
                </Badge>
              )}
            </div>

            {/* Progress */}
            {resource.progress !== undefined && (
              <div className="bg-site-raised rounded-site-md border border-fm-neutral-200 p-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-fm-neutral-600">Overall Progress</span>
                  <span className="font-semibold text-fm-magenta-600">{resource.progress}%</span>
                </div>
                <div className="w-full bg-fm-neutral-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-fm-magenta-500 to-fm-magenta-600 h-3 rounded-full transition-all"
                    style={{ width: `${resource.progress}%` }}
                  />
                </div>
                {resource.startDate && resource.endDate && (
                  <p className="text-sm text-fm-neutral-500 mt-2">
                    {new Date(resource.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' — '}
                    {new Date(resource.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* Milestones */}
            {resource.milestones && resource.milestones.length > 0 && (
              <div className="bg-site-raised rounded-site-md border border-fm-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-fm-neutral-900 mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-fm-magenta-600" />
                  Milestones
                </h2>
                <div className="space-y-3">
                  {resource.milestones.map((m, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      {m.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-fm-neutral-400 flex-shrink-0" />
                      )}
                      <span className={m.isCompleted ? 'text-fm-neutral-500 line-through' : 'text-fm-neutral-900'}>
                        {m.title}
                      </span>
                      {m.dueDate && (
                        <span className="text-xs text-fm-neutral-500 ml-auto">
                          {new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deliverables */}
            {resource.deliverables && resource.deliverables.length > 0 && (
              <div className="bg-site-raised rounded-site-md border border-fm-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-fm-neutral-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-fm-magenta-600" />
                  Deliverables
                </h2>
                <div className="space-y-2">
                  {resource.deliverables.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-fm-neutral-50 rounded-lg">
                      <span className="text-fm-neutral-900">{d.title}</span>
                      <Badge variant="secondary" className="capitalize">{d.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {resource.type === 'report' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-display font-bold text-fm-neutral-900">
              Performance <span className="text-fm-magenta-600">Report</span>
            </h1>

            {/* Projects Summary */}
            {resource.projects && resource.projects.length > 0 && (
              <div className="bg-site-raised rounded-site-md border border-fm-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-fm-neutral-900 mb-4 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-fm-magenta-600" />
                  Projects Overview
                </h2>
                <div className="space-y-4">
                  {resource.projects.map((p, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-fm-neutral-900">{p.name}</span>
                        <Badge variant="secondary" className="capitalize">{p.status}</Badge>
                      </div>
                      <div className="w-full bg-fm-neutral-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-fm-magenta-500 to-fm-magenta-600 h-2 rounded-full"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-fm-neutral-500">{p.progress}% complete</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Content */}
            {resource.recentContent && resource.recentContent.length > 0 && (
              <div className="bg-site-raised rounded-site-md border border-fm-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-fm-neutral-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-fm-magenta-600" />
                  Recent Content
                </h2>
                <div className="space-y-3">
                  {resource.recentContent.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-fm-neutral-50 rounded-lg">
                      <div>
                        <p className="font-medium text-fm-neutral-900">{c.title}</p>
                        <p className="text-sm text-fm-neutral-500">
                          {c.platform} &bull; {new Date(c.scheduledDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-fm-neutral-200 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4" style={{ textAlign: 'center' as const }}>
          <p className="text-sm text-fm-neutral-500">
            Shared via <span className="font-medium text-fm-magenta-600">FreakingMinds</span> Client Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
