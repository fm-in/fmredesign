/**
 * Proposal Dashboard - FreakingMinds
 * Manage and track all client proposals
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  BarChart3,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import {
  DashboardCard as Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DashboardButton as Button,
  MetricCard
} from '@/design-system';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/select-native';
import { Badge } from '@/components/ui/Badge';
import { Proposal } from '@/lib/admin/proposal-types';
import { adminToast } from '@/lib/admin/toast';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { ProposalPDFGenerator } from '@/lib/admin/proposal-pdf-generator';

interface ProposalStats {
  total: number; draft: number; sent: number; viewed: number;
  approved: number; declined: number; expired: number; converted: number;
  approvalRate: number; conversionRate: number;
}

interface ProposalDashboardProps {
  onCreateNew: () => void;
  onEditProposal: (proposal: Proposal) => void;
}

export function ProposalDashboard({ onCreateNew, onEditProposal }: ProposalDashboardProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [stats, setStats] = useState<ProposalStats>({ total: 0, draft: 0, sent: 0, viewed: 0, approved: 0, declined: 0, expired: 0, converted: 0, approvalRate: 0, conversionRate: 0 });
  const [totalValue, setTotalValue] = useState(0);
  const [convertedValue, setConvertedValue] = useState(0);
  const pdfGeneratorRef = useRef<ProposalPDFGenerator | null>(null);
  const getPdfGenerator = async () => {
    if (!pdfGeneratorRef.current) {
      const { ProposalPDFGenerator } = await import('@/lib/admin/proposal-pdf-generator');
      pdfGeneratorRef.current = new ProposalPDFGenerator();
    }
    return pdfGeneratorRef.current;
  };
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load proposals
  useEffect(() => {
    loadProposals();
  }, []);

  // Filter proposals based on search and filters
  useEffect(() => {
    let filtered = proposals;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(proposal =>
        proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.proposalNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.client.prospectInfo?.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.client.prospectInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.proposalType === typeFilter);
    }

    setFilteredProposals(filtered);
  }, [proposals, searchQuery, statusFilter, typeFilter]);

  const loadProposals = async () => {
    try {
      const response = await fetch('/api/proposals');
      const result = await response.json();
      if (result.success) {
        const allProposals = result.data || [];
        setProposals(allProposals);
        if (result.stats) setStats(result.stats);
        setTotalValue(allProposals.reduce((sum: number, p: Proposal) => sum + (p.investment?.total || 0), 0));
        setConvertedValue(allProposals.filter((p: Proposal) => p.status === 'converted').reduce((sum: number, p: Proposal) => sum + (p.investment?.total || 0), 0));
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      adminToast.error('Failed to load proposals');
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    try {
      await fetch(`/api/proposals?id=${proposalId}`, { method: 'DELETE' });
      loadProposals();
      adminToast.success('Proposal deleted');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      adminToast.error('Failed to delete proposal');
    }
  };

  const handleDuplicateProposal = (proposalId: string) => {
    const original = proposals.find(p => p.id === proposalId);
    if (original) {
      const duplicated: Proposal = {
        ...original,
        id: `prop-${Date.now()}`,
        title: `Copy of ${original.title}`,
        proposalNumber: '',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sentAt: undefined,
        viewedAt: undefined,
        approvedAt: undefined,
      };
      onEditProposal(duplicated);
    }
  };

  const handleStatusUpdate = async (proposalId: string, newStatus: Proposal['status']) => {
    try {
      await fetch('/api/proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposalId, status: newStatus }),
      });
      loadProposals();
    } catch (error) {
      console.error('Error updating proposal status:', error);
    }
  };

  const handlePreviewProposal = async (proposal: Proposal) => {
    try {
      const gen = await getPdfGenerator();
      const pdfDataUri = await gen.generateProposal(proposal);
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Proposal Preview - ${proposal.proposalNumber}</title>
              <style>body { margin: 0; padding: 0; }</style>
            </head>
            <body>
              <embed src="${pdfDataUri}" width="100%" height="100%" type="application/pdf">
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error previewing proposal:', error);
      adminToast.error('Error generating preview');
    }
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const sym: Record<string, string> = { INR: 'Rs.', USD: '$', GBP: '\u00A3', AED: 'AED ', EUR: '\u20AC' };
    const loc: Record<string, string> = { INR: 'en-IN', USD: 'en-US', GBP: 'en-GB', AED: 'en-AE', EUR: 'de-DE' };
    const c = currency || 'INR';
    return `${sym[c] || 'Rs.'}${amount.toLocaleString(loc[c] || 'en-IN')}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Proposal Dashboard"
        description="Manage and track your client proposals"
        actions={
          <Button variant="primary" onClick={onCreateNew}>
            <Plus className="w-4 h-4" />
            New Proposal
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard
          title="Total Proposals"
          value={stats.total.toString()}
          subtitle={`${stats.draft} drafts, ${stats.sent} sent`}
          icon={<FileText className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="Approval Rate"
          value={`${stats.approvalRate.toFixed(1)}%`}
          subtitle={`${stats.approved} approved proposals`}
          icon={<TrendingUp className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="Total Value"
          value={formatCurrency(totalValue)}
          subtitle="All active proposals"
          icon={<DollarSign className="w-6 h-6" />}
          variant="admin"
        />
        <MetricCard
          title="Converted Value"
          value={formatCurrency(convertedValue)}
          subtitle={`${stats.converted} converted`}
          icon={<CheckCircle className="w-6 h-6" />}
          variant="admin"
        />
      </div>

      {/* Filters and Search */}
      <Card variant="admin">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-fm-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
                <option value="converted">Converted</option>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="sm:w-48">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="retainer">Retainer</option>
                <option value="project">Project</option>
                <option value="audit">Audit</option>
                <option value="consultation">Consultation</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={proposals.length === 0 ? 'No proposals yet' : 'No proposals match your filters'}
            description={
              proposals.length === 0
                ? 'Create your first proposal to get started'
                : 'Try adjusting your search or filter criteria'
            }
            action={proposals.length === 0 ? (
              <Button variant="primary" onClick={onCreateNew}>
                <Plus className="w-4 h-4" />
                Create First Proposal
              </Button>
            ) : undefined}
          />
        ) : (
          filteredProposals.map((proposal) => (
            <Card key={proposal.id} variant="admin" className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-fm-neutral-900">
                        {proposal.title}
                      </h3>
                      <StatusBadge status={proposal.status} />
                      <Badge variant="outline">
                        {proposal.proposalType}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-fm-neutral-600 mb-3">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {proposal.proposalNumber}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(proposal.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(proposal.investment.total, proposal.investment?.currency)}
                      </span>
                      {proposal.validUntil && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Valid until {new Date(proposal.validUntil).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-fm-neutral-700">
                      <span className="font-medium">Client: </span>
                      {proposal.client.prospectInfo?.company ||
                       proposal.client.prospectInfo?.name ||
                       'Existing Client'}
                      {proposal.client.prospectInfo?.email && (
                        <span className="text-fm-neutral-500 ml-2">
                          ({proposal.client.prospectInfo.email})
                        </span>
                      )}
                    </div>

                    {(proposal.servicePackages || []).length > 0 && (
                      <div className="mt-2 text-sm text-fm-neutral-600">
                        <span className="font-medium">Services: </span>
                        {(proposal.servicePackages || []).slice(0, 2).map(pkg => pkg.name).join(', ')}
                        {(proposal.servicePackages || []).length > 2 && (
                          <span className="text-fm-neutral-500">
                            {' '}and {(proposal.servicePackages || []).length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewProposal(proposal)}
                      title="Preview PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditProposal(proposal)}
                      title="Edit Proposal"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateProposal(proposal.id)}
                      title="Duplicate Proposal"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    {proposal.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusUpdate(proposal.id, 'sent')}
                        title="Mark as Sent"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}

                    {(proposal.status === 'sent' || proposal.status === 'viewed') && (
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusUpdate(proposal.id, 'approved')}
                          title="Mark as Approved"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger-ghost"
                          size="sm"
                          onClick={() => handleStatusUpdate(proposal.id, 'declined')}
                          title="Mark as Declined"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Convert to Invoice — visible once the proposal is
                        approved. Opens the invoice form pre-filled with
                        the proposal's line items, client and currency. */}
                    {proposal.status === 'approved' && (
                      <Link
                        href={`/admin/invoice?from-proposal=${proposal.id}`}
                        title="Convert to Invoice"
                      >
                        <Button variant="ghost" size="sm">
                          <Receipt className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}

                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(proposal.id)}
                      title="Delete Proposal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Proposal"
        description="Are you sure you want to delete this proposal? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirm) handleDeleteProposal(deleteConfirm);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
