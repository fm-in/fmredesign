/**
 * Professional Proposal Generator — V2 Rewrite
 *
 * 60/40 layout matching InvoiceFormNew:
 *   Left (3/5)  — Form cards (template, client, details, content, packages, timeline, pricing)
 *   Right (2/5) — Sticky live preview + pricing summary
 *
 * Supabase-backed numbering, multi-currency, template picker, live preview.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Save,
  Eye,
  Calculator,
  User,
  Calendar,
  FileText,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  Circle,
  Layers,
  Clock,
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb,
  Globe,
} from 'lucide-react';
import {
  DashboardCard as Card,
  CardContent,
  CardHeader,
  CardTitle,
  DashboardButton as Button,
  MetricCard,
} from '@/design-system';
import { Badge } from '@/components/ui/Badge';
import { adminToast } from '@/lib/admin/toast';
import { ClientService } from '@/lib/admin/client-service';
import { ProposalNumbering } from '@/lib/admin/proposal-numbering';
import type { ProposalPDFGenerator } from '@/lib/admin/proposal-pdf-generator';
import { CONTRACT_TEMPLATES, getTemplate as getContractTemplate } from '@/lib/admin/contract-templates';
import {
  type Proposal,
  type ProspectClient,
  type ServicePackage,
  type PricingStructure,
  type ProjectTimeline,
  type ProposalTemplate,
  DIGITAL_MARKETING_PACKAGES,
  PRICING_MODIFIERS,
  DEFAULT_PROPOSAL_CONTENT,
  PROPOSAL_TEMPLATES,
} from '@/lib/admin/proposal-types';
import {
  CURRENCY_OPTIONS,
  type InvoiceCurrency,
  type InvoiceClient,
} from '@/lib/admin/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectedPackage {
  package: ServicePackage;
  variant?: string;
  quantity: number;
  customPrice?: number;
}

interface CustomService {
  id: string;
  name: string;
  description: string;
  price: number;
  timeline: string;
}

interface ProposalFormNewProps {
  initialProposal?: Proposal | null;
  onSaveSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 'client' as const, label: 'Client' },
  { id: 'services' as const, label: 'Services' },
  { id: 'content' as const, label: 'Content' },
  { id: 'review' as const, label: 'Review' },
];

function getStepState(
  proposal: Proposal,
  selectedPackages: SelectedPackage[],
): Record<string, boolean> {
  return {
    client: !!(
      (proposal.client.isExisting && proposal.client.clientId) ||
      (!proposal.client.isExisting && proposal.client.prospectInfo?.company)
    ),
    services: selectedPackages.length > 0,
    content: !!(proposal.executiveSummary || proposal.proposedSolution),
    review:
      !!proposal.title &&
      selectedPackages.length > 0 &&
      !!(
        (proposal.client.isExisting && proposal.client.clientId) ||
        proposal.client.prospectInfo?.company
      ),
  };
}

// ---------------------------------------------------------------------------
// Shared CSS
// ---------------------------------------------------------------------------

const inputCls =
  'w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md ' +
  'focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 ' +
  'transition-all duration-200 hover:border-fm-magenta-400';

const selectCls =
  'w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md ' +
  'focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 ' +
  'transition-all duration-200 hover:border-fm-magenta-400 appearance-none';

const textareaCls =
  'w-full px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md ' +
  'focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 ' +
  'transition-all duration-200 hover:border-fm-magenta-400';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalFormNew({ initialProposal, onSaveSuccess }: ProposalFormNewProps) {
  // ---- State ---------------------------------------------------------------

  const [proposal, setProposal] = useState<Proposal>(() => {
    if (initialProposal) return initialProposal;
    return {
      id: `prop-${Date.now()}`,
      proposalNumber: '',
      title: '',
      client: { isExisting: true, clientId: '', prospectInfo: undefined },
      servicePackages: [],
      customServices: [],
      timeline: {
        kickoff: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        milestones: [],
        completion: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        ongoingSupport: true,
      },
      investment: {
        packages: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        currency: 'INR',
        paymentTerms: '50-50',
      },
      proposalType: 'retainer',
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      executiveSummary: '',
      problemStatement: '',
      proposedSolution: '',
      whyFreakingMinds: DEFAULT_PROPOSAL_CONTENT.whyFreakingMinds,
      nextSteps: DEFAULT_PROPOSAL_CONTENT.nextSteps,
      termsAndConditions: DEFAULT_PROPOSAL_CONTENT.termsAndConditions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      template: 'professional',
    };
  });

  const [clients, setClients] = useState<InvoiceClient[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(() => {
    if (initialProposal?.servicePackages?.length) {
      return initialProposal.servicePackages.map((pkg) => ({
        package: pkg,
        quantity: 1,
      }));
    }
    return [];
  });
  const [customServices, setCustomServices] = useState<CustomService[]>(
    () => (initialProposal?.customServices || []).map((s, i) => ({ ...s, id: `cs-${i}` })),
  );

  const [clientSizeMultiplier, setClientSizeMultiplier] = useState('medium');
  const [urgencyMultiplier, setUrgencyMultiplier] = useState('standard');
  const [retainerDuration, setRetainerDuration] = useState('6-months');
  const [nextPreview, setNextPreview] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const pdfGenRef = useRef<ProposalPDFGenerator | null>(null);

  // ---- Derived --------------------------------------------------------------

  const steps = getStepState(proposal, selectedPackages);
  const currency = proposal.investment?.currency || 'INR';
  const currencyOpt =
    CURRENCY_OPTIONS.find((c) => c.value === currency) || CURRENCY_OPTIONS[0];
  const fmt = (n: number) =>
    new Intl.NumberFormat(currencyOpt.locale, {
      style: 'currency',
      currency: currencyOpt.value,
      maximumFractionDigits: 0,
    }).format(n);

  // ---- Effects --------------------------------------------------------------

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await ClientService.getInvoiceClients();
        setClients(data || []);
      } catch {
        setClients([]);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    ProposalNumbering.previewNextProposalNumber().then(setNextPreview);
  }, []);

  // ---- Pricing calculator ---------------------------------------------------

  const recalculatePricing = useCallback(() => {
    let subtotal = 0;
    const pkgs = selectedPackages.map((sel) => {
      let base = sel.customPrice ?? sel.package.basePrice;
      if (sel.variant && sel.package.variants) {
        const v = sel.package.variants.find((vr) => vr.name === sel.variant);
        if (v) base *= v.priceMultiplier;
      }
      base *= PRICING_MODIFIERS.clientSize[clientSizeMultiplier] || 1;
      base *= PRICING_MODIFIERS.urgency[urgencyMultiplier] || 1;
      const total = base * sel.quantity;
      subtotal += total;
      return { packageId: sel.package.id, variant: sel.variant, quantity: sel.quantity, price: total };
    });

    // Add custom services
    customServices.forEach((cs) => {
      subtotal += cs.price;
    });

    let discount = 0;
    if (proposal.proposalType === 'retainer' && retainerDuration in PRICING_MODIFIERS.retainerDiscount) {
      discount = subtotal * PRICING_MODIFIERS.retainerDiscount[retainerDuration];
    }

    const inv: PricingStructure = {
      packages: pkgs,
      subtotal,
      discount,
      discountReason: discount > 0 ? `${retainerDuration.replace('-', ' ')} retainer discount` : undefined,
      total: subtotal - discount,
      currency: currency as InvoiceCurrency,
      paymentTerms: proposal.investment?.paymentTerms || '50-50',
      appliedModifiers: { clientSize: clientSizeMultiplier, urgency: urgencyMultiplier, retainerDuration },
    };

    setProposal((prev) => ({
      ...prev,
      investment: inv,
      servicePackages: selectedPackages.map((s) => s.package),
      customServices: customServices.map(({ id: _id, ...rest }) => rest),
    }));
  }, [selectedPackages, customServices, clientSizeMultiplier, urgencyMultiplier, retainerDuration, currency, proposal.proposalType, proposal.investment?.paymentTerms]);

  // Recalculate pricing when dependencies change
  useEffect(() => {
    recalculatePricing();
  }, [recalculatePricing]);

  // ---- PDF lazy-load --------------------------------------------------------

  const getPdfGen = async () => {
    if (!pdfGenRef.current) {
      const { ProposalPDFGenerator } = await import('@/lib/admin/proposal-pdf-generator');
      pdfGenRef.current = new ProposalPDFGenerator();
    }
    return pdfGenRef.current;
  };

  // ---- Template picker ------------------------------------------------------

  const applyTemplate = (tpl: ProposalTemplate) => {
    const clientName =
      proposal.client.prospectInfo?.company ||
      clients.find((c) => c.id === proposal.client.clientId)?.name ||
      'Client';

    // Pre-select packages
    const pkgs: SelectedPackage[] = tpl.defaultPackageIds
      .map((pid) => DIGITAL_MARKETING_PACKAGES.find((p) => p.id === pid))
      .filter(Boolean)
      .map((pkg) => ({ package: pkg!, quantity: 1 }));

    setSelectedPackages(pkgs);
    setProposal((prev) => ({
      ...prev,
      title: tpl.generateTitle(clientName),
      proposalType: tpl.proposalType,
      investment: { ...prev.investment, currency: tpl.currency },
      executiveSummary: tpl.defaultContent.executiveSummary,
      problemStatement: tpl.defaultContent.problemStatement,
      proposedSolution: tpl.defaultContent.proposedSolution,
      whyFreakingMinds: tpl.defaultContent.whyFreakingMinds,
      nextSteps: tpl.defaultContent.nextSteps,
      termsAndConditions: tpl.defaultContent.termsAndConditions,
    }));
  };

  // ---- Client selection -----------------------------------------------------

  const selectClient = (clientId: string) => {
    const c = clients.find((cl) => cl.id === clientId);
    if (!c) {
      setProposal((prev) => ({ ...prev, client: { isExisting: true, clientId: '' } }));
      return;
    }
    const isInternational = c.country && c.country.toLowerCase() !== 'india';
    setProposal((prev) => ({
      ...prev,
      client: { isExisting: true, clientId: c.id },
      investment: { ...prev.investment, currency: isInternational ? 'USD' : 'INR' },
    }));
  };

  // ---- Package management ---------------------------------------------------

  const addPackage = (pkgId: string) => {
    const pkg = DIGITAL_MARKETING_PACKAGES.find((p) => p.id === pkgId);
    if (!pkg || selectedPackages.some((s) => s.package.id === pkgId)) return;
    setSelectedPackages((prev) => [...prev, { package: pkg, quantity: 1 }]);
  };

  const removePackage = (pkgId: string) => {
    setSelectedPackages((prev) => prev.filter((s) => s.package.id !== pkgId));
  };

  const updatePackage = (pkgId: string, field: string, value: string | number) => {
    setSelectedPackages((prev) =>
      prev.map((s) => (s.package.id !== pkgId ? s : { ...s, [field]: value })),
    );
  };

  const addCustomService = () => {
    setCustomServices((prev) => [
      ...prev,
      { id: `cs-${Date.now()}`, name: '', description: '', price: 0, timeline: '' },
    ]);
  };

  const updateCustomService = (id: string, field: string, value: string | number) => {
    setCustomServices((prev) =>
      prev.map((s) => (s.id !== id ? s : { ...s, [field]: value })),
    );
  };

  const removeCustomService = (id: string) => {
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
  };

  // ---- Milestone management -------------------------------------------------

  const addMilestone = () => {
    setProposal((prev) => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        milestones: [
          ...prev.timeline.milestones,
          {
            name: '',
            deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            deliverables: [],
          },
        ],
      },
    }));
  };

  const updateMilestone = (idx: number, field: string, value: string | string[]) => {
    setProposal((prev) => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        milestones: prev.timeline.milestones.map((m, i) =>
          i !== idx ? m : { ...m, [field]: value },
        ),
      },
    }));
  };

  const removeMilestone = (idx: number) => {
    setProposal((prev) => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        milestones: prev.timeline.milestones.filter((_, i) => i !== idx),
      },
    }));
  };

  // ---- Section collapse toggling --------------------------------------------

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ---- Handlers: Save / Preview / Download ----------------------------------

  const handleSave = async () => {
    if (!proposal.title.trim()) {
      adminToast.error('Please enter a proposal title');
      return;
    }
    setSaving(true);
    try {
      let num = proposal.proposalNumber;
      if (!num || num === nextPreview) {
        num = await ProposalNumbering.getNextProposalNumber();
        setProposal((prev) => ({ ...prev, proposalNumber: num }));
      }

      const body = { ...proposal, proposalNumber: num };
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Save failed');
      adminToast.success('Proposal saved successfully!');
      onSaveSuccess?.();
    } catch (err) {
      adminToast.error('Failed to save proposal');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const gen = await getPdfGen();
      const uri = await gen.generateProposal(proposal, clients);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(
          `<html><body style="margin:0"><embed src="${uri}" width="100%" height="100%" type="application/pdf"/></body></html>`,
        );
      }
    } catch {
      adminToast.error('Failed to generate preview');
    }
  };

  const handleDownload = async () => {
    try {
      let num = proposal.proposalNumber;
      if (!num || num === nextPreview) {
        num = await ProposalNumbering.getNextProposalNumber();
        setProposal((prev) => ({ ...prev, proposalNumber: num }));
      }
      const gen = await getPdfGen();
      await gen.downloadProposal({ ...proposal, proposalNumber: num }, clients);
    } catch {
      adminToast.error('Failed to download PDF');
    }
  };

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="max-w-[1440px] mx-auto">
      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2">
            {idx > 0 && <div className="w-8 h-px bg-fm-neutral-300" />}
            <div className="flex items-center gap-1.5">
              {steps[step.id] ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-fm-neutral-400" />
              )}
              <span
                className={`text-sm font-medium ${steps[step.id] ? 'text-fm-neutral-900' : 'text-fm-neutral-500'}`}
              >
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main 60/40 grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-8">
        {/* LEFT COLUMN — Form cards */}
        <div className="xl:col-span-3 space-y-4 sm:space-y-6">
          {/* Card 1: Header */}
          <Card variant="admin">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{nextPreview || proposal.proposalNumber || 'PM—'}</Badge>
                  <Badge variant="default">{proposal.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handlePreview}>
                    <Eye className="w-4 h-4 mr-1" /> Preview
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-1" /> PDF
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Template Picker */}
          <Card variant="admin">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-fm-magenta-600" />
                </div>
                <CardTitle>Template</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {PROPOSAL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="text-left p-3 rounded-lg border border-fm-neutral-200 hover:border-fm-magenta-400 hover:bg-fm-magenta-50 transition-all"
                  >
                    <p className="text-sm font-medium text-fm-neutral-900">{tpl.label}</p>
                    <p className="text-xs text-fm-neutral-500 mt-0.5">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Client Information */}
          <Card variant="admin">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-fm-magenta-600" />
                </div>
                <CardTitle>Client Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setProposal((prev) => ({ ...prev, client: { isExisting: true, clientId: prev.client.clientId } }))
                  }
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    proposal.client.isExisting
                      ? 'bg-fm-magenta-600 text-white'
                      : 'bg-fm-neutral-100 text-fm-neutral-700 hover:bg-fm-neutral-200'
                  }`}
                >
                  Existing Client
                </button>
                <button
                  onClick={() =>
                    setProposal((prev) => ({
                      ...prev,
                      client: {
                        isExisting: false,
                        prospectInfo: prev.client.prospectInfo || {
                          name: '',
                          email: '',
                          company: '',
                          industry: '',
                          companySize: 'small' as const,
                        },
                      },
                    }))
                  }
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !proposal.client.isExisting
                      ? 'bg-fm-magenta-600 text-white'
                      : 'bg-fm-neutral-100 text-fm-neutral-700 hover:bg-fm-neutral-200'
                  }`}
                >
                  New Prospect
                </button>
              </div>

              {proposal.client.isExisting ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      className={selectCls}
                      value={proposal.client.clientId || ''}
                      onChange={(e) => selectClient(e.target.value)}
                    >
                      <option value="">Choose a client... ({clients.length} available)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.email}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        setClients([]);
                        const data = await ClientService.getInvoiceClients();
                        setClients(data || []);
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  {proposal.client.clientId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-fm-neutral-200">
                      {(() => {
                        const c = clients.find((cl) => cl.id === proposal.client.clientId);
                        if (!c) return null;
                        return (
                          <>
                            <InfoField label="Name" value={c.name} />
                            <InfoField label="Email" value={c.email} />
                            <InfoField label="Country" value={c.country} />
                            <InfoField label="State" value={c.state} />
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Company *</label>
                    <input
                      className={inputCls}
                      value={proposal.client.prospectInfo?.company || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: {
                            ...prev.client,
                            prospectInfo: { ...prev.client.prospectInfo!, company: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Contact Name *</label>
                    <input
                      className={inputCls}
                      value={proposal.client.prospectInfo?.name || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: {
                            ...prev.client,
                            prospectInfo: { ...prev.client.prospectInfo!, name: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Email *</label>
                    <input
                      type="email"
                      className={inputCls}
                      value={proposal.client.prospectInfo?.email || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: {
                            ...prev.client,
                            prospectInfo: { ...prev.client.prospectInfo!, email: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Industry</label>
                    <input
                      className={inputCls}
                      value={proposal.client.prospectInfo?.industry || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: {
                            ...prev.client,
                            prospectInfo: { ...prev.client.prospectInfo!, industry: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Company Size</label>
                    <select
                      className={selectCls}
                      value={proposal.client.prospectInfo?.companySize || 'small'}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: {
                            ...prev.client,
                            prospectInfo: {
                              ...prev.client.prospectInfo!,
                              companySize: e.target.value as ProspectClient['companySize'],
                            },
                          },
                        }))
                      }
                    >
                      <option value="startup">Startup</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Proposal Details */}
          <Card variant="admin">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-fm-magenta-600" />
                </div>
                <CardTitle>Proposal Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Title *</label>
                  <input
                    className={inputCls}
                    value={proposal.title}
                    onChange={(e) => setProposal((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Digital Marketing Retainer Proposal"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Type</label>
                  <select
                    className={selectCls}
                    value={proposal.proposalType}
                    onChange={(e) =>
                      setProposal((prev) => ({
                        ...prev,
                        proposalType: e.target.value as Proposal['proposalType'],
                      }))
                    }
                  >
                    <option value="retainer">Retainer</option>
                    <option value="project">Project</option>
                    <option value="audit">Audit</option>
                    <option value="consultation">Consultation</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Valid Until</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={proposal.validUntil}
                    onChange={(e) => setProposal((prev) => ({ ...prev, validUntil: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Currency</label>
                  <select
                    className={selectCls}
                    value={currency}
                    onChange={(e) =>
                      setProposal((prev) => ({
                        ...prev,
                        investment: { ...prev.investment, currency: e.target.value as InvoiceCurrency },
                      }))
                    }
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Payment Terms</label>
                  <select
                    className={selectCls}
                    value={proposal.investment?.paymentTerms || '50-50'}
                    onChange={(e) =>
                      setProposal((prev) => ({
                        ...prev,
                        investment: {
                          ...prev.investment,
                          paymentTerms: e.target.value as PricingStructure['paymentTerms'],
                        },
                      }))
                    }
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="50-50">50% Advance / 50% on Completion</option>
                    <option value="milestone-based">Milestone-based</option>
                    <option value="upfront">Upfront</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Content Sections */}
          <Card variant="admin">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-fm-magenta-600" />
                </div>
                <CardTitle>Content Sections</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(
                [
                  { key: 'executiveSummary', label: 'Executive Summary' },
                  { key: 'problemStatement', label: 'Problem Statement' },
                  { key: 'proposedSolution', label: 'Proposed Solution' },
                  { key: 'whyFreakingMinds', label: 'Why Freaking Minds' },
                  { key: 'nextSteps', label: 'Next Steps' },
                  { key: 'termsAndConditions', label: 'Terms & Conditions' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="border border-fm-neutral-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-fm-neutral-50 hover:bg-fm-neutral-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-fm-neutral-900">{label}</span>
                    <div className="flex items-center gap-2">
                      {(proposal[key] as string)?.trim() ? (
                        <Badge variant="outline" className="text-xs">
                          filled
                        </Badge>
                      ) : null}
                      {expandedSections[key] ? (
                        <ChevronUp className="w-4 h-4 text-fm-neutral-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-fm-neutral-400" />
                      )}
                    </div>
                  </button>
                  {expandedSections[key] && (
                    <div className="p-3 space-y-2">
                      {/* Contract template loader — only on the T&Cs field.
                          Loads contract-grade T&Cs into the proposal so the
                          eventual proposal→contract handoff carries the same
                          legal text the client already saw. */}
                      {key === 'termsAndConditions' && (
                        <div className="flex items-center gap-2 bg-fm-neutral-50 border border-fm-neutral-200 rounded-md px-3 py-2">
                          <label className="text-xs font-medium text-fm-neutral-600 shrink-0">
                            Load contract template:
                          </label>
                          <select
                            className="text-xs px-2 py-1 rounded border border-fm-neutral-300 bg-white text-fm-neutral-900 flex-1"
                            value=""
                            onChange={(e) => {
                              const tpl = getContractTemplate(e.target.value);
                              if (!tpl) return;
                              setProposal((prev) => ({
                                ...prev,
                                termsAndConditions: tpl.termsAndConditions,
                              }));
                              adminToast.success(`Loaded T&Cs from "${tpl.label}" template`);
                            }}
                          >
                            <option value="">— Choose template —</option>
                            {CONTRACT_TEMPLATES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label} ({t.currency})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <textarea
                        className={textareaCls}
                        rows={6}
                        value={(proposal[key] as string) || ''}
                        onChange={(e) =>
                          setProposal((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={`Enter ${label.toLowerCase()}...`}
                      />
                    </div>
                  )}
                  {!expandedSections[key] && (proposal[key] as string)?.trim() && (
                    <div className="px-4 py-2 text-xs text-fm-neutral-500 line-clamp-2">
                      {(proposal[key] as string).substring(0, 120)}...
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Card 6: Service Packages */}
          <Card variant="admin">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-fm-magenta-600" />
                </div>
                <CardTitle>Service Packages</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add service dropdown */}
              <select
                className={selectCls}
                value=""
                onChange={(e) => addPackage(e.target.value)}
              >
                <option value="">+ Add a service package...</option>
                {DIGITAL_MARKETING_PACKAGES.filter(
                  (p) => !selectedPackages.some((s) => s.package.id === p.id),
                ).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.category} — {fmt(p.basePrice)}
                  </option>
                ))}
              </select>

              {/* Selected packages */}
              {selectedPackages.map((sel) => (
                <div
                  key={sel.package.id}
                  className="p-4 rounded-lg bg-white border-l-[3px] border-l-fm-magenta-500 border border-fm-neutral-200 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-fm-neutral-900">{sel.package.name}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {sel.package.category}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removePackage(sel.package.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-xs text-fm-neutral-500 mb-3">{sel.package.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sel.package.variants && sel.package.variants.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">
                          Variant
                        </label>
                        <select
                          className={selectCls}
                          value={sel.variant || ''}
                          onChange={(e) => updatePackage(sel.package.id, 'variant', e.target.value)}
                        >
                          <option value="">Standard</option>
                          {sel.package.variants.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} ({v.priceMultiplier}x)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={sel.quantity}
                        onChange={(e) =>
                          updatePackage(sel.package.id, 'quantity', parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">
                        Custom Price
                      </label>
                      <input
                        type="number"
                        className={inputCls}
                        placeholder={sel.package.basePrice.toString()}
                        value={sel.customPrice ?? ''}
                        onChange={(e) =>
                          updatePackage(
                            sel.package.id,
                            'customPrice',
                            e.target.value ? parseInt(e.target.value) : 0,
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {sel.package.deliverables.slice(0, 4).map((d, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-fm-neutral-50 border border-fm-neutral-200 rounded px-2 py-0.5 text-fm-neutral-600"
                      >
                        {d}
                      </span>
                    ))}
                    {sel.package.deliverables.length > 4 && (
                      <span className="text-[10px] text-fm-neutral-400">
                        +{sel.package.deliverables.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Custom services */}
              {customServices.map((cs) => (
                <div
                  key={cs.id}
                  className="p-4 rounded-lg bg-white border-l-[3px] border-l-blue-500 border border-fm-neutral-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">Custom Service</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeCustomService(cs.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      className={inputCls}
                      placeholder="Service name"
                      value={cs.name}
                      onChange={(e) => updateCustomService(cs.id, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      className={inputCls}
                      placeholder="Price"
                      value={cs.price || ''}
                      onChange={(e) => updateCustomService(cs.id, 'price', parseInt(e.target.value) || 0)}
                    />
                    <input
                      className={inputCls}
                      placeholder="Description"
                      value={cs.description}
                      onChange={(e) => updateCustomService(cs.id, 'description', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      placeholder="Timeline"
                      value={cs.timeline}
                      onChange={(e) => updateCustomService(cs.id, 'timeline', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button variant="ghost" size="sm" onClick={addCustomService}>
                <Plus className="w-4 h-4 mr-1" /> Add Custom Service
              </Button>
            </CardContent>
          </Card>

          {/* Card 7: Timeline */}
          <Card variant="admin">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-fm-magenta-600" />
                </div>
                <CardTitle>Timeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Kickoff Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={proposal.timeline.kickoff}
                    onChange={(e) =>
                      setProposal((prev) => ({
                        ...prev,
                        timeline: { ...prev.timeline, kickoff: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">Completion Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={proposal.timeline.completion}
                    onChange={(e) =>
                      setProposal((prev) => ({
                        ...prev,
                        timeline: { ...prev.timeline, completion: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Milestones */}
              {proposal.timeline.milestones.map((m, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-fm-neutral-50 border border-fm-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-fm-neutral-500">Milestone {idx + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeMilestone(idx)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      className={inputCls}
                      placeholder="Milestone name"
                      value={m.name}
                      onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                    />
                    <input
                      type="date"
                      className={inputCls}
                      value={m.deadline}
                      onChange={(e) => updateMilestone(idx, 'deadline', e.target.value)}
                    />
                  </div>
                  <input
                    className={inputCls}
                    placeholder="Deliverables (comma-separated)"
                    value={m.deliverables.join(', ')}
                    onChange={(e) =>
                      updateMilestone(
                        idx,
                        'deliverables',
                        e.target.value.split(',').map((s) => s.trim()),
                      )
                    }
                  />
                </div>
              ))}

              <Button variant="ghost" size="sm" onClick={addMilestone}>
                <Plus className="w-4 h-4 mr-1" /> Add Milestone
              </Button>
            </CardContent>
          </Card>

          {/* Card 8: Pricing Configuration */}
          {selectedPackages.length > 0 && (
            <Card variant="admin">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-fm-magenta-600" />
                  </div>
                  <CardTitle>Pricing Modifiers</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">
                      Client Size ({((PRICING_MODIFIERS.clientSize[clientSizeMultiplier] || 1) * 100 - 100).toFixed(0)}%)
                    </label>
                    <select
                      className={selectCls}
                      value={clientSizeMultiplier}
                      onChange={(e) => setClientSizeMultiplier(e.target.value)}
                    >
                      {Object.entries(PRICING_MODIFIERS.clientSize).map(([k, v]) => (
                        <option key={k} value={k}>
                          {k} ({v > 1 ? '+' : ''}{((v - 1) * 100).toFixed(0)}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">
                      Urgency ({((PRICING_MODIFIERS.urgency[urgencyMultiplier] || 1) * 100 - 100).toFixed(0)}%)
                    </label>
                    <select
                      className={selectCls}
                      value={urgencyMultiplier}
                      onChange={(e) => setUrgencyMultiplier(e.target.value)}
                    >
                      {Object.entries(PRICING_MODIFIERS.urgency).map(([k, v]) => (
                        <option key={k} value={k}>
                          {k} ({v > 1 ? '+' : ''}{((v - 1) * 100).toFixed(0)}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  {proposal.proposalType === 'retainer' && (
                    <div>
                      <label className="text-xs font-medium text-fm-neutral-500 mb-1 block">
                        Retainer Duration (-{((PRICING_MODIFIERS.retainerDiscount[retainerDuration] || 0) * 100).toFixed(0)}%)
                      </label>
                      <select
                        className={selectCls}
                        value={retainerDuration}
                        onChange={(e) => setRetainerDuration(e.target.value)}
                      >
                        {Object.entries(PRICING_MODIFIERS.retainerDiscount).map(([k, v]) => (
                          <option key={k} value={k}>
                            {k.replace('-', ' ')} (-{(v * 100).toFixed(0)}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN — Preview + Summary */}
        <div className="hidden xl:block xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Pricing summary */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Subtotal"
              value={fmt(proposal.investment?.subtotal || 0)}
              subtitle="Before discount"
              icon={<Calculator className="w-6 h-6" />}
              variant="admin"
            />
            <MetricCard
              title="Total"
              value={fmt(proposal.investment?.total || 0)}
              subtitle={
                proposal.investment?.discount
                  ? `Disc: ${fmt(proposal.investment.discount)}`
                  : 'No discount'
              }
              icon={<CreditCard className="w-6 h-6" />}
              variant="admin"
            />
          </div>

          {/* Live Preview */}
          <div className="xl:sticky xl:top-4">
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Live Preview</CardTitle>
                <p className="text-xs text-fm-neutral-500">Matches the downloaded PDF</p>
              </CardHeader>
              <CardContent className="p-3">
                <ProposalPreview proposal={proposal} fmt={fmt} clients={clients} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MOBILE: Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 xl:hidden bg-white border-t border-fm-neutral-200 px-4 py-3"
        style={{ zIndex: 40 }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-xs text-fm-neutral-500">Total Investment</p>
            <p className="text-lg font-bold text-fm-neutral-900">{fmt(proposal.investment?.total || 0)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handlePreview}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoField sub-component
// ---------------------------------------------------------------------------

function InfoField({ label, value, fallback }: { label: string; value?: string; fallback?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-fm-neutral-500 mb-0.5">{label}</p>
      <p className="text-sm text-fm-neutral-900">
        {value || <span className="text-fm-neutral-400 italic">{fallback || '\u2014'}</span>}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProposalPreview — A4-ratio HTML preview mirroring the PDF
// ---------------------------------------------------------------------------

function ProposalPreview({
  proposal,
  fmt,
  clients,
}: {
  proposal: Proposal;
  fmt: (n: number) => string;
  clients: InvoiceClient[];
}) {
  const clientName = (() => {
    if (proposal.client.isExisting && proposal.client.clientId) {
      return clients.find((c) => c.id === proposal.client.clientId)?.name || 'Client';
    }
    return proposal.client.prospectInfo?.company || 'Client';
  })();

  return (
    <div
      className="bg-white rounded-lg overflow-hidden text-[10px] leading-snug shadow-inner border border-fm-neutral-200"
      style={{ aspectRatio: '210 / 297', maxHeight: 540, overflowY: 'auto' }}
    >
      {/* Purple header band */}
      <div style={{ height: 10, background: '#4a1942' }} />
      <div style={{ height: 3, background: '#c9325d' }} />

      {/* Company + proposal info */}
      <div className="px-3 pt-2 pb-1 flex justify-between items-start">
        <div>
          <p className="font-bold text-[11px]" style={{ color: '#0f0f0f' }}>
            FREAKING MINDS
          </p>
          <p className="text-[7px] tracking-widest" style={{ color: '#c9325d' }}>
            CREATIVE MARKETING AGENCY
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-[11px]" style={{ color: '#0f0f0f' }}>
            PROPOSAL
          </p>
          <p className="text-[9px] font-medium" style={{ color: '#c9325d' }}>
            #{proposal.proposalNumber || nextPreviewFallback(proposal)}
          </p>
        </div>
      </div>

      <div style={{ height: 1, background: '#c9325d', margin: '0 8px' }} />

      {/* Client info */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-[7px] tracking-widest font-bold" style={{ color: '#c9325d' }}>
          PREPARED FOR
        </p>
        <p className="font-bold text-[9px] mt-0.5" style={{ color: '#0f0f0f' }}>
          {clientName}
        </p>
      </div>

      {/* Title */}
      <div className="px-3 py-1">
        <p className="text-[9px] font-medium" style={{ color: '#0f0f0f' }}>
          {proposal.title || 'Untitled Proposal'}
        </p>
      </div>

      {/* Services mini table */}
      {(proposal.servicePackages?.length > 0 || proposal.customServices?.length) && (
        <div className="mx-3 mt-1">
          <div
            className="text-[7px] font-bold px-1.5 py-0.5 text-white"
            style={{ background: '#4a1942' }}
          >
            SERVICE PACKAGES
          </div>
          {proposal.servicePackages?.map((pkg, i) => {
            const pkgInv = proposal.investment?.packages?.find((p) => p.packageId === pkg.id);
            return (
              <div
                key={pkg.id}
                className="flex justify-between px-1.5 py-0.5"
                style={{ background: i % 2 === 1 ? '#fcf5f8' : 'white' }}
              >
                <span>{pkg.name}</span>
                <span className="font-medium">{fmt(pkgInv?.price ?? pkg.basePrice)}</span>
              </div>
            );
          })}
          {proposal.customServices?.map((cs, i) => (
            <div
              key={i}
              className="flex justify-between px-1.5 py-0.5"
              style={{
                background:
                  ((proposal.servicePackages?.length || 0) + i) % 2 === 1 ? '#fcf5f8' : 'white',
              }}
            >
              <span>{cs.name}</span>
              <span className="font-medium">{fmt(cs.price)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total ribbon */}
      {proposal.investment && (
        <div className="mx-3 mt-2">
          {proposal.investment.discount > 0 && (
            <div className="flex justify-between px-1.5 text-[8px]" style={{ color: '#059669' }}>
              <span>Discount</span>
              <span>-{fmt(proposal.investment.discount)}</span>
            </div>
          )}
          <div
            className="flex justify-between px-2 py-1 text-white font-bold text-[9px] mt-0.5"
            style={{ background: '#c9325d' }}
          >
            <span>TOTAL INVESTMENT</span>
            <span>{fmt(proposal.investment.total)}</span>
          </div>
        </div>
      )}

      {/* Timeline summary */}
      {proposal.timeline?.kickoff && (
        <div className="px-3 mt-2">
          <p className="text-[7px] font-bold" style={{ color: '#c9325d' }}>
            TIMELINE
          </p>
          <div className="flex gap-3 mt-0.5 text-[8px]">
            <span>
              Kickoff:{' '}
              {new Date(proposal.timeline.kickoff).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
            <span>
              End:{' '}
              {new Date(proposal.timeline.completion).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>
        </div>
      )}

      {/* Valid until */}
      <div className="px-3 mt-2 text-[7px]" style={{ color: '#646464' }}>
        Valid until:{' '}
        {new Date(proposal.validUntil).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto">
        <div style={{ height: 3, background: '#c9325d', marginTop: 8 }} />
        <div style={{ height: 6, background: '#4a1942' }} />
      </div>
    </div>
  );
}

function nextPreviewFallback(proposal: Proposal): string {
  return proposal.proposalNumber || 'PM—/2026';
}
