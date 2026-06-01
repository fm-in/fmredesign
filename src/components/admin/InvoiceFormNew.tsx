/**
 * Invoice Creator — V2 Design Language
 *
 * 60/40 layout: form (left) + sticky live preview (right).
 * The live preview mirrors the PDF output so users see exactly
 * what the downloaded invoice will look like.
 *
 * GST-compliant: CGST/SGST/IGST split, SAC codes, multi-currency,
 * persistent invoice numbering via API.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Copy,
  CheckCircle2,
  Circle,
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
import type { SimplePDFGenerator } from '@/lib/admin/pdf-simple';
import { ClientService } from '@/lib/admin/client-service';
import { InvoiceNumbering } from '@/lib/admin/invoice-numbering';
import { DIGITAL_MARKETING_PACKAGES } from '@/lib/admin/proposal-types';
import {
  AGENCY_SERVICES,
  SERVICE_CATEGORIES,
  DEFAULT_COMPANY_INFO,
  CURRENCY_OPTIONS,
  COMPANY_STATE,
  COMPANY_GSTIN,
  InvoiceUtils,
  type InvoiceCurrency,
} from '@/lib/admin/types';

const companyInfo = DEFAULT_COMPANY_INFO;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceLineItem {
  id: string;
  serviceId?: string;
  description: string;
  sacCode?: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  gstNumber?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: InvoiceClient;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: InvoiceCurrency;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  placeOfSupply: string;
  companyGstin: string;
  notes: string;
  terms: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Step completion helper
// ---------------------------------------------------------------------------

type StepId = 'client' | 'items' | 'review';

function getStepState(invoice: Invoice): Record<StepId, boolean> {
  return {
    client: !!invoice.client.name,
    items:
      invoice.lineItems.length > 0 &&
      invoice.lineItems.some(i => i.description.trim() !== '' && i.amount > 0),
    review: !!invoice.client.name && invoice.lineItems.some(i => i.amount > 0),
  };
}

const STEPS: { id: StepId; label: string }[] = [
  { id: 'client', label: 'Client' },
  { id: 'items', label: 'Items' },
  { id: 'review', label: 'Review' },
];

// ---------------------------------------------------------------------------
// Service categories for grouped dropdown
// ---------------------------------------------------------------------------

const grouped = AGENCY_SERVICES.reduce<Record<string, typeof AGENCY_SERVICES>>(
  (acc, svc) => {
    const cat = SERVICE_CATEGORIES[svc.category] || svc.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(svc);
    return acc;
  },
  {},
);

// ---------------------------------------------------------------------------
// GST display helpers
// ---------------------------------------------------------------------------

function getGSTType(
  clientCountry: string,
  clientState: string,
): 'intra' | 'inter' | 'export' {
  if (clientCountry && clientCountry.toLowerCase() !== 'india') return 'export';
  if (clientState?.toLowerCase() === COMPANY_STATE.toLowerCase()) return 'intra';
  return 'inter';
}

function getGSTLabel(type: 'intra' | 'inter' | 'export', taxRate: number): string {
  if (type === 'export') return 'No GST (Export)';
  if (type === 'intra') return `CGST ${taxRate / 2}% + SGST ${taxRate / 2}%`;
  return `IGST ${taxRate}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceFormNew() {
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  const editId = searchParams.get('edit');
  const fromProposalId = searchParams.get('from-proposal');
  const [isEditMode, setIsEditMode] = useState(false);

  const [invoice, setInvoice] = useState<Invoice>(() => {
    const invoiceDate = new Date();
    return {
      id: `inv-${Date.now()}`,
      invoiceNumber: '',
      date: invoiceDate.toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      client: {
        id: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
      },
      lineItems: [
        {
          id: `item-${Date.now()}`,
          serviceId: '',
          description: '',
          sacCode: '',
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ],
      subtotal: 0,
      taxRate: 18,
      taxAmount: 0,
      total: 0,
      currency: 'INR',
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      placeOfSupply: '',
      companyGstin: COMPANY_GSTIN,
      notes:
        'Thank you for choosing Freaking Minds for your digital marketing needs.',
      terms:
        'Payment is due within 30 days of invoice date. Late payments may incur additional charges.',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [clients, setClients] = useState<InvoiceClient[]>([]);
  const [nextPreview, setNextPreview] = useState('');
  const pdfGeneratorRef = useRef<SimplePDFGenerator | null>(null);
  const getPdfGenerator = async () => {
    if (!pdfGeneratorRef.current) {
      const { SimplePDFGenerator } = await import('@/lib/admin/pdf-simple');
      pdfGeneratorRef.current = new SimplePDFGenerator();
    }
    return pdfGeneratorRef.current;
  };
  const steps = getStepState(invoice);

  // ---- Load initial invoice number from API ----
  useEffect(() => {
    const loadInvoiceNumber = async () => {
      try {
        const num = await InvoiceNumbering.previewNextInvoiceNumber();
        setInvoice(prev => {
          if (!prev.invoiceNumber) return { ...prev, invoiceNumber: num };
          return prev;
        });
        setNextPreview(num);
      } catch {
        // Use a local fallback
        const fallback = `FM164/${new Date().getFullYear()}`;
        setInvoice(prev => {
          if (!prev.invoiceNumber) return { ...prev, invoiceNumber: fallback };
          return prev;
        });
        setNextPreview(fallback);
      }
    };
    loadInvoiceNumber();
  }, []);

  // ---- Load clients ----
  const loadClients = async () => {
    localStorage.removeItem('fm_admin_clients');
    setClients([]);
    try {
      const invoiceClients = await ClientService.getInvoiceClients();
      setClients(invoiceClients || []);
    } catch {
      setClients([]);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // ---- Pre-populate from duplicate invoice ----
  useEffect(() => {
    if (!duplicateId) return;
    const loadDuplicate = async () => {
      try {
        const res = await fetch(`/api/invoices?id=${duplicateId}`);
        const result = await res.json();
        if (result.success && result.data) {
          const src = result.data;
          setInvoice(prev => ({
            ...prev,
            id: `inv-${Date.now()}`,
            // Keep the invoice number that was already loaded from API
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            client: src.client || prev.client,
            lineItems: (src.lineItems || []).map((item: Record<string, unknown>, idx: number) => ({
              id: `item-dup-${Date.now()}-${idx}`,
              serviceId: (item.serviceId as string) || '',
              description: (item.description as string) || '',
              sacCode: (item.sacCode as string) || '',
              quantity: (item.quantity as number) || 1,
              rate: (item.rate as number) || 0,
              amount: (item.amount as number) || 0,
            })),
            taxRate: src.taxRate ?? prev.taxRate,
            currency: src.currency ?? prev.currency,
            notes: src.notes ?? prev.notes,
            terms: src.terms ?? prev.terms,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          adminToast.success('Invoice data loaded from duplicate');
        }
      } catch {
        adminToast.error('Failed to load invoice for duplication');
      }
    };
    loadDuplicate();
  }, [duplicateId]);

  // ---- Pre-populate from an approved proposal (?from-proposal=<id>) ----
  // Source of truth for line items is the proposal's `investment.packages` +
  // `customServices`. We flatten them into invoice line items so the user
  // sees the entire quote without retyping anything. Client info is reused
  // when the proposal targets an existing client; for prospect proposals the
  // user picks a client in the form before saving.
  useEffect(() => {
    if (!fromProposalId) return;
    const loadFromProposal = async () => {
      try {
        const res = await fetch(`/api/proposals?id=${fromProposalId}`);
        const result = await res.json();
        if (!result.success || !result.data) {
          adminToast.error('Could not load source proposal');
          return;
        }
        const p = result.data;

        // Resolve a label per investment package by looking it up in the
        // proposal's own `servicePackages` array (it was snapshotted at
        // creation time, so this stays stable even if the catalog changes).
        const packagesById: Record<string, { name: string; description: string }> = {};
        for (const sp of (p.servicePackages || [])) {
          if (sp && sp.id) {
            packagesById[sp.id] = { name: sp.name || '', description: sp.description || '' };
          }
        }

        const lineItemsFromPackages = (p.investment?.packages || []).map(
          (entry: { packageId: string; variant?: string; quantity: number; price: number }, idx: number) => {
            const meta = packagesById[entry.packageId] || { name: entry.packageId, description: '' };
            const label = entry.variant ? `${meta.name} — ${entry.variant}` : meta.name;
            const qty = entry.quantity || 1;
            const rate = entry.price || 0;
            return {
              id: `item-prop-${Date.now()}-${idx}`,
              serviceId: '',
              description: label,
              sacCode: '',
              quantity: qty,
              rate,
              amount: qty * rate,
            };
          },
        );

        const lineItemsFromCustom = (p.customServices || []).map(
          (entry: { name: string; description?: string; price: number }, idx: number) => ({
            id: `item-prop-custom-${Date.now()}-${idx}`,
            serviceId: '',
            description: entry.description ? `${entry.name} — ${entry.description}` : entry.name,
            sacCode: '',
            quantity: 1,
            rate: entry.price || 0,
            amount: entry.price || 0,
          }),
        );

        const allLineItems = [...lineItemsFromPackages, ...lineItemsFromCustom];

        setInvoice((prev) => ({
          ...prev,
          id: `inv-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          // Pre-select the linked client only when the proposal points to a
          // real client record; for prospect proposals we leave the
          // selector empty so the user picks or creates one.
          client: p.client?.isExisting && p.client?.clientId
            ? { ...prev.client, id: p.client.clientId }
            : prev.client,
          lineItems: allLineItems,
          currency: p.investment?.currency ?? prev.currency,
          // Surface the linkage in the notes field so it's visible on the
          // PDF and searchable in the DB. A proper `source_proposal_id`
          // column would be cleaner; deferring that to a follow-up migration.
          notes: prev.notes || `Generated from proposal ${p.proposalNumber || fromProposalId}`,
          terms: prev.terms,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        adminToast.success('Invoice pre-filled from proposal');
      } catch (err) {
        console.error('Proposal→Invoice load error:', err);
        adminToast.error('Failed to load proposal');
      }
    };
    loadFromProposal();
  }, [fromProposalId]);

  // ---- Pre-populate from existing invoice (edit mode) ----
  useEffect(() => {
    if (!editId) return;
    const loadForEdit = async () => {
      try {
        const res = await fetch(`/api/invoices?id=${editId}`);
        const result = await res.json();
        if (result.success && result.data) {
          const src = result.data;
          setInvoice(prev => ({
            ...prev,
            id: src.id, // Keep original ID for upsert
            invoiceNumber: src.invoiceNumber || prev.invoiceNumber,
            date: src.date ? src.date.split('T')[0] : prev.date,
            dueDate: src.dueDate ? src.dueDate.split('T')[0] : prev.dueDate,
            client: src.client || prev.client,
            lineItems: (src.lineItems || []).map((item: Record<string, unknown>, idx: number) => ({
              id: `item-edit-${Date.now()}-${idx}`,
              serviceId: (item.serviceId as string) || '',
              description: (item.description as string) || '',
              sacCode: (item.sacCode as string) || '',
              quantity: (item.quantity as number) || 1,
              rate: (item.rate as number) || 0,
              amount: (item.amount as number) || 0,
            })),
            subtotal: src.subtotal ?? prev.subtotal,
            taxRate: src.taxRate ?? prev.taxRate,
            taxAmount: src.taxAmount ?? prev.taxAmount,
            total: src.total ?? prev.total,
            currency: src.currency ?? prev.currency,
            cgstAmount: src.cgstAmount ?? prev.cgstAmount,
            sgstAmount: src.sgstAmount ?? prev.sgstAmount,
            igstAmount: src.igstAmount ?? prev.igstAmount,
            placeOfSupply: src.placeOfSupply ?? prev.placeOfSupply,
            companyGstin: src.companyGstin ?? prev.companyGstin,
            notes: src.notes ?? prev.notes,
            terms: src.terms ?? prev.terms,
            status: src.status ?? prev.status,
          }));
          setIsEditMode(true);
          adminToast.success('Invoice loaded for editing');
        }
      } catch {
        adminToast.error('Failed to load invoice for editing');
      }
    };
    loadForEdit();
  }, [editId]);

  // ---- Recalculate totals with GST split ----
  const recalcTotals = useCallback(() => {
    const subtotal = invoice.lineItems.reduce((s, i) => s + i.amount, 0);
    const gst = InvoiceUtils.calculateGST(
      subtotal,
      invoice.taxRate,
      COMPANY_STATE,
      invoice.placeOfSupply || invoice.client.state || '',
      invoice.client.country || 'India',
    );

    setInvoice(prev => ({
      ...prev,
      subtotal,
      cgstAmount: gst.cgst,
      sgstAmount: gst.sgst,
      igstAmount: gst.igst,
      taxAmount: gst.totalTax,
      total: subtotal + gst.totalTax,
    }));
  }, [invoice.lineItems, invoice.taxRate, invoice.placeOfSupply, invoice.client.state, invoice.client.country]);

  useEffect(() => {
    recalcTotals();
  }, [recalcTotals]);

  // ---- Line item helpers ----
  const addLineItem = () =>
    setInvoice(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: `item-${Date.now()}`,
          serviceId: '',
          description: '',
          sacCode: '',
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ],
    }));

  // Insert a line item from the shared service catalog (DIGITAL_MARKETING_PACKAGES).
  // Quantity defaults to the package's `duration` for monthly retainers (so a
  // 6-month SEO package becomes 6 × ₹35,000), or 1 for project/hourly billing.
  const insertPackageAsLineItem = useCallback((packageId: string) => {
    const pkg = DIGITAL_MARKETING_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return;
    const quantity = pkg.billingType === 'monthly' && pkg.duration ? pkg.duration : 1;
    setInvoice((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: `item-${Date.now()}`,
          serviceId: pkg.id,
          description: pkg.name + (pkg.description ? ` — ${pkg.description}` : ''),
          sacCode: '',
          quantity,
          rate: pkg.basePrice,
          amount: quantity * pkg.basePrice,
        },
      ],
    }));
    adminToast.success(`Inserted "${pkg.name}" from catalog`);
  }, []);

  const duplicateLastItem = () => {
    const last = invoice.lineItems[invoice.lineItems.length - 1];
    if (!last) return addLineItem();
    setInvoice(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { ...last, id: `item-${Date.now()}` },
      ],
    }));
  };

  const removeLineItem = (id: string) =>
    setInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(i => i.id !== id),
    }));

  const updateLineItem = (
    id: string,
    field: keyof InvoiceLineItem,
    value: string | number,
  ) =>
    setInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate')
          updated.amount = updated.quantity * updated.rate;
        return updated;
      }),
    }));

  const selectService = (itemId: string, serviceId: string) => {
    const service = AGENCY_SERVICES.find(s => s.id === serviceId);
    if (!service) return;
    setInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id !== itemId) return item;
        const rate = service.suggestedRate || 0;
        return {
          ...item,
          serviceId,
          description: service.description,
          sacCode: service.sacCode,
          rate,
          amount: item.quantity * rate,
        };
      }),
    }));
  };

  const selectClient = (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    if (!c) return;

    const isInternational = c.country && c.country.toLowerCase() !== 'india';
    const newCurrency: InvoiceCurrency = isInternational ? 'USD' : 'INR';

    setInvoice(prev => ({
      ...prev,
      client: c,
      placeOfSupply: c.state || '',
      currency: newCurrency,
    }));
  };

  // ---- Save / Preview / Download ----
  const handleSave = async () => {
    try {
      // In edit mode, keep existing invoice number; for new invoices, get next number
      if (!isEditMode && (!invoice.invoiceNumber || invoice.invoiceNumber === nextPreview)) {
        const num = await InvoiceNumbering.getNextInvoiceNumber();
        invoice.invoiceNumber = num;
        setInvoice(prev => ({ ...prev, invoiceNumber: num }));
      }
      await saveToAPI(invoice);
      adminToast.success(isEditMode ? 'Invoice updated successfully!' : 'Invoice saved successfully!');
    } catch {
      adminToast.error('Error saving invoice. Please try again.');
    }
  };

  const saveToAPI = async (data: Invoice) => {
    try {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // silent
    }
  };

  const handlePreview = async () => {
    if (!invoice.client.name) {
      adminToast.error('Please select a client before generating preview.');
      return;
    }
    if (!invoice.lineItems.some(i => i.description.trim())) {
      adminToast.error('Add at least one line item with a description.');
      return;
    }
    try {
      const gen = await getPdfGenerator();
      const uri = await gen.generateInvoice(invoice);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(
          `<html><body style="margin:0"><embed src="${uri}" width="100%" height="100%" type="application/pdf"></body></html>`,
        );
      } else {
        window.open(uri, '_blank');
      }
    } catch (err) {
      adminToast.error(
        `PDF preview error: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    }
  };

  const handleDownload = async () => {
    try {
      // Claim a permanent invoice number if not yet claimed
      if (!isEditMode && (!invoice.invoiceNumber || invoice.invoiceNumber === nextPreview)) {
        const num = await InvoiceNumbering.getNextInvoiceNumber();
        invoice.invoiceNumber = num;
        setInvoice(prev => ({ ...prev, invoiceNumber: num }));
      }
      const { SimplePDFGenerator } = await import('@/lib/admin/pdf-simple');
      const defaultName = SimplePDFGenerator.getDefaultFilename(invoice);
      const customName = window.prompt('Filename for the PDF:', defaultName);
      if (customName === null) return; // User cancelled
      const gen = await getPdfGenerator();
      await gen.downloadPDF(invoice, customName || defaultName);
    } catch {
      adminToast.error('Error downloading PDF.');
    }
  };

  // ---- Format helpers ----
  const currencyOpt = CURRENCY_OPTIONS.find(c => c.value === invoice.currency) || CURRENCY_OPTIONS[0];
  const fmt = (n: number) =>
    new Intl.NumberFormat(currencyOpt.locale, {
      style: 'currency',
      currency: currencyOpt.value,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const gstType = getGSTType(invoice.client.country, invoice.placeOfSupply || invoice.client.state);

  // ---- Shared input classes ----
  const inputCls =
    'w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400';
  const selectCls =
    'w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400 appearance-none';
  const textareaCls =
    'w-full px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400';

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="max-w-[1440px] mx-auto">
      {/* ---- Step indicator ---- */}
      <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2">
            {idx > 0 && (
              <div className="w-8 h-px bg-fm-neutral-300" />
            )}
            <div className="flex items-center gap-1.5">
              {steps[step.id] ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-fm-neutral-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  steps[step.id]
                    ? 'text-fm-neutral-900'
                    : 'text-fm-neutral-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Main grid: 60/40 ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-8">
        {/* ===== LEFT COLUMN (3/5 = 60%) ===== */}
        <div className="xl:col-span-3 space-y-4 sm:space-y-6">
          {/* Header actions card */}
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-fm-neutral-900">
                        Invoice #
                      </label>
                      <input
                        type="text"
                        value={invoice.invoiceNumber}
                        onChange={e => {
                          const v = e.target.value;
                          setInvoice(p => ({ ...p, invoiceNumber: v }));
                          if (InvoiceNumbering.isValidFormat(v))
                            InvoiceNumbering.updateFromManualInvoice(v);
                        }}
                        className="px-2 py-1 border border-fm-neutral-300 rounded text-sm font-semibold text-fm-neutral-900 w-32"
                        placeholder="FM164/2025"
                      />
                    </div>
                    <p className="text-sm text-fm-neutral-600">
                      Draft &middot; Created{' '}
                      {new Date().toLocaleDateString()}
                    </p>
                    {nextPreview && (
                      <p className="text-xs text-fm-neutral-500">
                        Next auto: {nextPreview}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    {invoice.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handlePreview}>
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client information */}
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-fm-neutral-900">
                    Select Client
                  </label>
                  <button
                    onClick={loadClients}
                    className="text-fm-magenta-600 hover:text-fm-magenta-700 flex items-center text-sm"
                    type="button"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Refresh
                  </button>
                </div>
                <select
                  value={invoice.client.id}
                  onChange={e => selectClient(e.target.value)}
                  className={selectCls}
                >
                  <option value="">
                    Choose a client... ({clients.length} available)
                  </option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.email}
                    </option>
                  ))}
                </select>
              </div>

              {invoice.client.name && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-fm-neutral-200">
                  <InfoField label="Name" value={invoice.client.name} />
                  <InfoField label="Email" value={invoice.client.email} />
                  <InfoField label="Phone" value={invoice.client.phone} />
                  <InfoField
                    label="GST Number"
                    value={invoice.client.gstNumber}
                    fallback="Not provided"
                  />
                  <div className="sm:col-span-2">
                    <InfoField
                      label="Address"
                      value={formatAddress(invoice.client)}
                      fallback="No address information"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice dates + currency */}
          <Card variant="admin">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-fm-magenta-600" />
                </div>
                <CardTitle>Invoice Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoice.date}
                    onChange={e =>
                      setInvoice(p => ({ ...p, date: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invoice.dueDate}
                    onChange={e =>
                      setInvoice(p => ({ ...p, dueDate: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                    <Globe className="w-3.5 h-3.5 inline mr-1" />
                    Currency
                  </label>
                  <select
                    value={invoice.currency}
                    onChange={e =>
                      setInvoice(p => ({
                        ...p,
                        currency: e.target.value as InvoiceCurrency,
                      }))
                    }
                    className={selectCls}
                  >
                    {CURRENCY_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card variant="admin">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-fm-magenta-600" />
                  </div>
                  <CardTitle>Services &amp; Items</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={duplicateLastItem}
                    title="Duplicate last item"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Duplicate</span>
                  </Button>
                  {/* Insert from service catalog — uses the same shared
                      DIGITAL_MARKETING_PACKAGES list the proposal form uses
                      so pricing stays consistent across quotes and invoices. */}
                  <select
                    aria-label="Insert from catalog"
                    className="text-xs px-2 py-1.5 rounded border border-fm-neutral-300 bg-white text-fm-neutral-700"
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      insertPackageAsLineItem(e.target.value);
                      e.target.value = '';
                    }}
                  >
                    <option value="">+ From catalog</option>
                    {DIGITAL_MARKETING_PACKAGES.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — ₹{pkg.basePrice.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" onClick={addLineItem}>
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.lineItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-white border-l-[3px] border-l-fm-magenta-500 border border-fm-neutral-200 shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Service selector with grouped options */}
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">
                        Service Template (optional)
                      </label>
                      <select
                        value={item.serviceId || ''}
                        onChange={e => {
                          if (e.target.value)
                            selectService(item.id, e.target.value);
                          else updateLineItem(item.id, 'serviceId', '');
                        }}
                        className={selectCls}
                      >
                        <option value="">Custom entry...</option>
                        {Object.entries(grouped).map(([cat, services]) => (
                          <optgroup key={cat} label={cat}>
                            {services.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} — {currencyOpt.symbol}
                                {s.suggestedRate?.toLocaleString(currencyOpt.locale)}/{s.unit}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {/* Description + SAC code badge */}
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={e =>
                          updateLineItem(item.id, 'description', e.target.value)
                        }
                        placeholder="Describe the service or product..."
                        className={`${textareaCls} resize-none`}
                      />
                      {/* SAC code display */}
                      <div className="flex items-center gap-2 mt-1">
                        {item.sacCode ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            SAC: {item.sacCode}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value=""
                            onChange={e =>
                              updateLineItem(item.id, 'sacCode', e.target.value)
                            }
                            placeholder="SAC code (optional)"
                            className="px-2 py-0.5 text-xs border border-fm-neutral-200 rounded w-36"
                          />
                        )}
                        {item.sacCode && (
                          <button
                            type="button"
                            onClick={() =>
                              updateLineItem(item.id, 'sacCode', '')
                            }
                            className="text-xs text-fm-neutral-400 hover:text-fm-neutral-600"
                          >
                            clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Qty / Rate / Amount / Delete */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-fm-neutral-600 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e =>
                            updateLineItem(
                              item.id,
                              'quantity',
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-fm-neutral-600 mb-1">
                          Rate ({currencyOpt.symbol})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={e =>
                            updateLineItem(
                              item.id,
                              'rate',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-fm-neutral-600 mb-1">
                          Amount
                        </label>
                        <div className="px-3 py-2 bg-fm-magenta-50 border border-fm-magenta-200 rounded-lg text-fm-neutral-900 font-semibold text-sm">
                          {fmt(item.amount)}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        {invoice.lineItems.length > 1 && (
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Additional info */}
          <Card variant="admin">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={invoice.notes}
                  onChange={e =>
                    setInvoice(p => ({ ...p, notes: e.target.value }))
                  }
                  className={`${textareaCls} resize-none`}
                  placeholder="Any additional notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                  Payment Terms
                </label>
                <textarea
                  rows={3}
                  value={invoice.terms}
                  onChange={e =>
                    setInvoice(p => ({ ...p, terms: e.target.value }))
                  }
                  className={`${textareaCls} resize-none`}
                  placeholder="Payment terms and conditions..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== RIGHT COLUMN (2/5 = 40%) — Sticky ===== */}
        <div className="hidden xl:block xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Subtotal"
              value={fmt(invoice.subtotal)}
              subtitle="Before taxes"
              icon={<Calculator className="w-6 h-6" />}
              variant="admin"
            />
            <MetricCard
              title="Total Amount"
              value={fmt(invoice.total)}
              subtitle={
                gstType === 'export'
                  ? 'No GST (Export)'
                  : `Inc. ${fmt(invoice.taxAmount)} tax`
              }
              icon={<CreditCard className="w-6 h-6" />}
              variant="admin"
            />
          </div>

          {/* Tax setting */}
          <Card variant="admin">
            <CardHeader>
              <CardTitle>Tax Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={invoice.taxRate}
                  onChange={e =>
                    setInvoice(p => ({
                      ...p,
                      taxRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={inputCls}
                />
              </div>

              {/* Place of Supply */}
              <div>
                <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                  Place of Supply
                </label>
                <input
                  type="text"
                  value={invoice.placeOfSupply}
                  onChange={e =>
                    setInvoice(p => ({ ...p, placeOfSupply: e.target.value }))
                  }
                  placeholder={invoice.client.state || 'Client state'}
                  className={inputCls}
                />
              </div>

              {/* GST breakdown */}
              <div className="p-3 rounded-lg bg-fm-neutral-50 border border-fm-neutral-200 text-sm space-y-1">
                <div className="flex justify-between text-fm-neutral-600">
                  <span>Type</span>
                  <span className="font-medium text-fm-neutral-900">
                    {getGSTLabel(gstType, invoice.taxRate)}
                  </span>
                </div>
                {gstType === 'intra' && (
                  <>
                    <div className="flex justify-between text-fm-neutral-600">
                      <span>CGST ({invoice.taxRate / 2}%)</span>
                      <span>{fmt(invoice.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-fm-neutral-600">
                      <span>SGST ({invoice.taxRate / 2}%)</span>
                      <span>{fmt(invoice.sgstAmount)}</span>
                    </div>
                  </>
                )}
                {gstType === 'inter' && (
                  <div className="flex justify-between text-fm-neutral-600">
                    <span>IGST ({invoice.taxRate}%)</span>
                    <span>{fmt(invoice.igstAmount)}</span>
                  </div>
                )}
                {gstType === 'export' && (
                  <p className="text-xs text-fm-neutral-500 italic">
                    No GST applicable for international clients
                  </p>
                )}
                <div className="flex justify-between font-medium text-fm-neutral-900 pt-1 border-t border-fm-neutral-200">
                  <span>Total Tax</span>
                  <span>{fmt(invoice.taxAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---- LIVE PREVIEW (mirrors PDF layout) ---- */}
          <div className="xl:sticky xl:top-4">
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Live Preview</CardTitle>
                <p className="text-xs text-fm-neutral-500">
                  Matches the downloaded PDF
                </p>
              </CardHeader>
              <CardContent className="p-3">
                <InvoicePreview
                  invoice={invoice}
                  fmt={fmt}
                  fmtDate={fmtDate}
                  gstType={gstType}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ---- Sticky bottom action bar (mobile-friendly) ---- */}
      <div className="fixed bottom-0 left-0 right-0 xl:hidden bg-white border-t border-fm-neutral-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 shadow-lg"
        style={{ zIndex: 40 }}
      >
        <div className="text-sm font-semibold text-fm-neutral-900">
          Total: <span className="text-fm-magenta-600">{fmt(invoice.total)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePreview}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

/** Small label/value pair for client details */
function InfoField({
  label,
  value,
  fallback,
}: {
  label: string;
  value?: string;
  fallback?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-fm-neutral-500 mb-0.5">{label}</p>
      <p className="text-sm text-fm-neutral-900">
        {value || (
          <span className="text-fm-neutral-400 italic">{fallback || '—'}</span>
        )}
      </p>
    </div>
  );
}

/** Format client address into a single string */
function formatAddress(client: { address: string; city: string; state: string; zipCode: string; country: string }): string {
  const parts: string[] = [];
  if (client.address) parts.push(client.address);
  const cityState = [client.city, client.state].filter(Boolean).join(', ');
  if (cityState) parts.push(cityState);
  if (client.zipCode) parts[parts.length - 1] += ` ${client.zipCode}`;
  if (client.country && client.country !== 'India') parts.push(client.country);
  return parts.join(', ');
}

// ===========================================================================
// Live Preview — mirrors the PDF design
// ===========================================================================

function InvoicePreview({
  invoice,
  fmt,
  fmtDate,
  gstType,
}: {
  invoice: Invoice;
  fmt: (n: number) => string;
  fmtDate: (d: string) => string;
  gstType: 'intra' | 'inter' | 'export';
}) {
  return (
    <div
      className="bg-white rounded-lg overflow-hidden text-[10px] leading-snug shadow-inner border border-fm-neutral-200"
      style={{ aspectRatio: '210 / 297', maxHeight: 540, overflowY: 'auto' }}
    >
      {/* ---- Header: purple band + magenta accent ---- */}
      <div className="h-3" style={{ background: '#4a1942' }} />
      <div className="h-0.5" style={{ background: '#c9325d' }} />

      {/* Company info */}
      <div className="px-4 pt-3 pb-2 flex justify-between items-start">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Freaking Minds"
            className="h-8 w-auto object-contain rounded"
          />
          <div>
            <p className="font-bold text-[13px] text-fm-neutral-900 leading-none">
              FREAKING MINDS
            </p>
            <p
              className="text-[6px] tracking-[0.2em] mt-0.5"
              style={{ color: '#c9325d' }}
            >
              CREATIVE MARKETING AGENCY
            </p>
          </div>
        </div>
        <div className="text-right text-[7px] text-fm-neutral-500 space-y-0.5">
          <p>freakingmindsdigital@gmail.com</p>
          <p>+91 98332 57659</p>
          <p>www.freakingminds.in</p>
        </div>
      </div>

      {/* ---- Invoice meta line ---- */}
      <div className="mx-4 border-t" style={{ borderColor: '#c9325d' }} />
      <div className="px-4 py-1.5 flex justify-between items-baseline">
        <p className="font-bold text-[14px] text-fm-neutral-900">INVOICE</p>
        <p className="font-bold text-[11px]" style={{ color: '#c9325d' }}>
          #{invoice.invoiceNumber || '—'}
        </p>
      </div>
      <div className="mx-4 border-t border-fm-neutral-200" />

      {/* ---- Client + Dates ---- */}
      <div className="px-4 pt-2 pb-1 flex justify-between">
        <div>
          <p
            className="text-[7px] font-bold tracking-[0.15em] mb-1"
            style={{ color: '#c9325d' }}
          >
            BILL TO
          </p>
          {invoice.client.name ? (
            <>
              <p className="font-bold text-[10px] text-fm-neutral-900">
                {invoice.client.name}
              </p>
              {invoice.client.email && (
                <p className="text-fm-neutral-500">{invoice.client.email}</p>
              )}
              {invoice.client.phone && (
                <p className="text-fm-neutral-500">{invoice.client.phone}</p>
              )}
              {invoice.client.gstNumber && (
                <p className="text-fm-neutral-700 font-medium">
                  GST: {invoice.client.gstNumber}
                </p>
              )}
              {(invoice.placeOfSupply || invoice.client.state) && (
                <p className="text-fm-neutral-500 text-[7px]">
                  Place of Supply: {invoice.placeOfSupply || invoice.client.state}
                </p>
              )}
            </>
          ) : (
            <p className="text-fm-neutral-400 italic">No client selected</p>
          )}
        </div>
        <div className="text-right">
          <p
            className="text-[7px] font-bold tracking-[0.12em]"
            style={{ color: '#c9325d' }}
          >
            INVOICE DATE
          </p>
          <p className="font-medium text-fm-neutral-900 mb-1">
            {fmtDate(invoice.date)}
          </p>
          <p
            className="text-[7px] font-bold tracking-[0.12em]"
            style={{ color: '#c9325d' }}
          >
            DUE DATE
          </p>
          <p className="font-medium text-fm-neutral-900">
            {fmtDate(invoice.dueDate)}
          </p>
        </div>
      </div>

      {/* ---- Items table (with SAC column) ---- */}
      <div className="px-4 pt-2">
        <table className="w-full">
          <thead>
            <tr
              className="text-white text-[8px]"
              style={{ background: '#4a1942' }}
            >
              <th className="text-left py-1 px-1.5 font-semibold">
                Description
              </th>
              <th className="text-left py-1 px-1 font-semibold w-12">SAC</th>
              <th style={{ textAlign: 'center' }} className="py-1 px-1 font-semibold w-8">Qty</th>
              <th className="text-right py-1 px-1 font-semibold w-14">Rate</th>
              <th className="text-right py-1 px-1.5 font-semibold w-16">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => (
              <tr
                key={item.id}
                className="border-b border-fm-neutral-100"
                style={{
                  background: i % 2 === 1 ? '#fcf5f8' : 'white',
                  borderLeft: '2px solid #c9325d',
                }}
              >
                <td className="py-1 px-1.5">
                  {item.description || (
                    <span className="text-fm-neutral-400 italic">
                      Description...
                    </span>
                  )}
                </td>
                <td className="py-1 px-1 text-[7px] text-fm-neutral-500">
                  {item.sacCode || '\u2014'}
                </td>
                <td style={{ textAlign: 'center' }} className="py-1 px-1">{item.quantity}</td>
                <td className="text-right py-1 px-1">{fmt(item.rate)}</td>
                <td className="text-right py-1 px-1.5 font-semibold">
                  {fmt(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Totals with GST split ---- */}
      <div className="px-4 pt-2">
        <div className="flex justify-end text-[9px] mb-0.5">
          <span className="text-fm-neutral-500 mr-4">Subtotal</span>
          <span className="font-medium text-fm-neutral-900 w-16 text-right">
            {fmt(invoice.subtotal)}
          </span>
        </div>
        {gstType === 'intra' && (
          <>
            <div className="flex justify-end text-[9px] mb-0.5">
              <span className="text-fm-neutral-500 mr-4">
                CGST ({invoice.taxRate / 2}%)
              </span>
              <span className="font-medium text-fm-neutral-900 w-16 text-right">
                {fmt(invoice.cgstAmount)}
              </span>
            </div>
            <div className="flex justify-end text-[9px] mb-1">
              <span className="text-fm-neutral-500 mr-4">
                SGST ({invoice.taxRate / 2}%)
              </span>
              <span className="font-medium text-fm-neutral-900 w-16 text-right">
                {fmt(invoice.sgstAmount)}
              </span>
            </div>
          </>
        )}
        {gstType === 'inter' && (
          <div className="flex justify-end text-[9px] mb-1">
            <span className="text-fm-neutral-500 mr-4">
              IGST ({invoice.taxRate}%)
            </span>
            <span className="font-medium text-fm-neutral-900 w-16 text-right">
              {fmt(invoice.igstAmount)}
            </span>
          </div>
        )}
        {gstType === 'export' && (
          <div className="flex justify-end text-[9px] mb-1">
            <span className="text-fm-neutral-500 mr-4 italic">
              No GST (Export)
            </span>
            <span className="font-medium text-fm-neutral-900 w-16 text-right">
              {fmt(0)}
            </span>
          </div>
        )}

        {/* Magenta total ribbon */}
        <div
          className="flex justify-between items-center px-2 py-1.5 rounded-sm text-white"
          style={{ background: '#c9325d' }}
        >
          <span className="font-bold text-[11px]">TOTAL</span>
          <span className="font-bold text-[11px]">{fmt(invoice.total)}</span>
        </div>
      </div>

      {/* ---- Footer ---- */}
      <div className="px-4 pt-2 pb-1">
        <div className="border-t border-fm-neutral-200 pt-1">
          <p className="text-[7px] text-fm-neutral-500">
            GSTIN: {companyInfo.taxId} &middot; MSME: {companyInfo.msmeUdyamNumber}
          </p>
          <p className="text-[8px] italic text-fm-neutral-600 mt-0.5">
            Thank you for your business!
          </p>
        </div>
      </div>

      {/* Bottom bars: magenta + purple (mirror header) */}
      <div className="mt-auto">
        <div className="h-0.5" style={{ background: '#c9325d' }} />
        <div className="h-2" style={{ background: '#4a1942' }} />
      </div>
    </div>
  );
}
