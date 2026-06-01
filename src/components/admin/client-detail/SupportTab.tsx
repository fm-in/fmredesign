'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LifeBuoy, Clock, User, Plus, Send, X } from 'lucide-react';
import { DashboardButton } from '@/design-system';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminToast } from '@/lib/admin/toast';

interface TicketItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  assignedTo?: string;
  createdAt: string;
}

interface SupportTabProps {
  clientId: string;
}

export function SupportTab({ clientId }: SupportTabProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
  });

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/support?clientId=${clientId}`);
        if (res.ok) {
          const data = await res.json();
          setTickets(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching support tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [clientId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title.trim() || !newTicket.description.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title: newTicket.title,
          description: newTicket.description,
          priority: newTicket.priority,
          category: newTicket.category,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTickets((prev) => [data.data, ...prev]);
        setNewTicket({ title: '', description: '', priority: 'medium', category: 'general' });
        setShowCreateForm(false);
        adminToast.success('Support ticket created');
      } else {
        const err = await res.json();
        adminToast.error(err.error || 'Failed to create ticket');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      adminToast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-fm-neutral-200 rounded w-1/3" />
          <div className="h-16 bg-fm-neutral-200 rounded" />
          <div className="h-16 bg-fm-neutral-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider">
            Support Tickets
          </h3>
          <div className="flex items-center gap-2">
            <DashboardButton
              variant="primary"
              size="sm"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? 'Cancel' : 'Create Ticket'}
            </DashboardButton>
            <DashboardButton
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/admin/support?client=${clientId}`)}
            >
              View in Support
            </DashboardButton>
          </div>
        </div>

        {/* Create Ticket Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateTicket} className="border border-fm-neutral-200 rounded-lg p-4 mb-4 bg-fm-neutral-50">
            <h4 className="font-medium text-fm-neutral-900 mb-3">Create Ticket on Behalf of Client</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket((t) => ({ ...t, title: e.target.value }))}
                  placeholder="Brief description of the issue"
                  required
                  className="w-full px-3 py-2 border border-fm-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-fm-magenta-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket((t) => ({ ...t, description: e.target.value }))}
                  placeholder="Detailed information about the issue or request"
                  rows={3}
                  required
                  className="w-full px-3 py-2 border border-fm-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-fm-magenta-500 resize-vertical"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket((t) => ({ ...t, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-fm-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-fm-magenta-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket((t) => ({ ...t, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-fm-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-fm-magenta-500"
                  >
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="services">Services</option>
                    <option value="reports">Reports</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <DashboardButton type="submit" variant="primary" size="sm" disabled={submitting}>
                  <Send className="w-4 h-4" />
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </DashboardButton>
                <DashboardButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </DashboardButton>
              </div>
            </div>
          </form>
        )}

        {tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-fm-neutral-200 rounded-lg p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-medium text-fm-neutral-900 text-sm sm:text-base">
                        {ticket.title}
                      </h4>
                      <StatusBadge status={ticket.status} />
                      <StatusBadge status={ticket.priority} />
                    </div>
                    {ticket.description && (
                      <p className="text-sm text-fm-neutral-600 line-clamp-2 mb-1">
                        {ticket.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-fm-neutral-500">
                      {ticket.category && (
                        <span className="capitalize">{ticket.category}</span>
                      )}
                      {ticket.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ticket.assignedTo}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center' }} className="py-8 sm:py-12">
            <LifeBuoy className="h-10 w-10 sm:h-12 sm:w-12 text-fm-neutral-400 mx-auto mb-4" />
            <h4 className="font-semibold text-fm-neutral-900 mb-2">
              No support tickets
            </h4>
            <p className="text-sm sm:text-base text-fm-neutral-600 mb-4">
              Support tickets from this client will appear here
            </p>
            <DashboardButton variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4" />
              Create First Ticket
            </DashboardButton>
          </div>
        )}
      </div>
    </div>
  );
}
