'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Users, ClipboardList, Loader2 } from 'lucide-react';

interface Assignment {
  id: string;
  clientId: string;
  projectId: string;
  role: string;
  hoursAllocated: number;
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  clientId: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  status: string;
  health: string;
  industry: string;
}

export default function MyWorkPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchMyWork() {
      try {
        const res = await fetch('/api/admin/my-work');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (json.success) {
          setAssignments(json.data.assignments || []);
          setProjects(json.data.projects || []);
          setClients(json.data.clients || []);
          if (json.message) setMessage(json.message);
        }
      } catch {
        setMessage('Failed to load work data.');
      } finally {
        setLoading(false);
      }
    }
    fetchMyWork();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div>
          <div className="h-7 w-32 bg-fm-neutral-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-fm-neutral-100 rounded mt-2 animate-pulse" />
        </div>
        {/* Assignment cards skeleton */}
        <div>
          <div className="h-5 w-48 bg-fm-neutral-200 rounded animate-pulse mb-4" />
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-fm-neutral-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-fm-neutral-200 rounded animate-pulse" />
                  <div className="h-3 w-36 bg-fm-neutral-100 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-fm-neutral-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {/* Project cards skeleton */}
        <div>
          <div className="h-5 w-40 bg-fm-neutral-200 rounded animate-pulse mb-4" />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-fm-neutral-200 bg-white p-4">
                <div className="h-4 w-40 bg-fm-neutral-200 rounded animate-pulse" />
                <div className="flex items-center justify-between mt-3">
                  <div className="h-5 w-16 bg-fm-neutral-100 rounded-full animate-pulse" />
                  <div className="h-3 w-20 bg-fm-neutral-100 rounded animate-pulse" />
                </div>
                <div className="mt-2 h-1.5 bg-fm-neutral-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'on_hold': return 'bg-amber-50 text-amber-700 border border-amber-200';
      default: return 'bg-fm-neutral-50 text-fm-neutral-600 border border-fm-neutral-200';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fm-neutral-900">My Work</h1>
        <p className="text-fm-neutral-600 mt-1">Your assignments, projects, and clients.</p>
      </div>

      {message && assignments.length === 0 && (
        <div className="rounded-lg border border-fm-neutral-200 p-8" style={{ textAlign: 'center' }}>
          <ClipboardList className="w-10 h-10 text-fm-neutral-400 mx-auto mb-3" />
          <p className="text-fm-neutral-600">{message}</p>
        </div>
      )}

      {/* Assignments */}
      {assignments.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-fm-neutral-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            My Assignments ({assignments.length})
          </h2>
          <div className="grid gap-3">
            {assignments.map(a => {
              const project = projects.find(p => p.id === a.projectId);
              const client = clients.find(c => c.id === a.clientId);
              return (
                <div key={a.id} className="rounded-lg border border-fm-neutral-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-fm-neutral-900 truncate">
                      {project?.name || 'Unknown Project'}
                    </p>
                    <p className="text-sm text-fm-neutral-600 truncate">
                      {client?.name || 'Unknown Client'} &middot; Role: {a.role || 'Member'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {a.hoursAllocated > 0 && (
                      <span className="text-xs text-fm-neutral-500">{a.hoursAllocated}h allocated</span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-fm-neutral-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            My Projects ({projects.length})
          </h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {projects.map(p => (
              <a key={p.id} href={`/admin/projects/${p.id}`} className="rounded-lg border border-fm-neutral-200 bg-white p-4 hover:border-fm-magenta-300 transition-colors">
                <p className="font-medium text-fm-neutral-900">{p.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                  <span className="text-sm text-fm-neutral-600">{p.progress || 0}% complete</span>
                </div>
                <div className="mt-2 h-1.5 bg-fm-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fm-magenta-600 rounded-full transition-all"
                    style={{ width: `${p.progress || 0}%` }}
                  />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Clients */}
      {clients.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-fm-neutral-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Clients ({clients.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map(c => (
              <a key={c.id} href={`/admin/clients/${c.id}`} className="rounded-lg border border-fm-neutral-200 bg-white p-4 hover:border-fm-magenta-300 transition-colors">
                <p className="font-medium text-fm-neutral-900">{c.name}</p>
                <p className="text-sm text-fm-neutral-600 mt-1">{c.industry || 'No industry'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
