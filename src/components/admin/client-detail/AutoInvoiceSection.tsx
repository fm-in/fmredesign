'use client';

import { useState, useCallback } from 'react';
import { Zap, Calendar, Send, Plus, Trash2, Save } from 'lucide-react';
import { DashboardCard as Card, CardContent, CardHeader, CardTitle, DashboardButton } from '@/design-system';
import { adminToast } from '@/lib/admin/toast';
import type { ClientProfile } from '@/hooks/admin/useClientDetail';

interface LineItem {
  description: string;
  sacCode?: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface AutoInvoiceSectionProps {
  clientId: string;
  clientProfile: ClientProfile;
  onUpdate: () => void;
}

const CURRENCY_OPTIONS = ['INR', 'USD', 'GBP', 'AED', 'EUR'];
const DAY_OPTIONS = [...Array.from({ length: 31 }, (_, i) => i + 1), -1]; // -1 = last day of month

export function AutoInvoiceSection({ clientId, clientProfile, onUpdate }: AutoInvoiceSectionProps) {
  const [enabled, setEnabled] = useState(clientProfile.autoInvoice ?? false);
  const [billingDay, setBillingDay] = useState(clientProfile.autoInvoiceDay ?? 1);
  const [autoSend, setAutoSend] = useState(clientProfile.autoInvoiceSend ?? false);
  const [currency, setCurrency] = useState(clientProfile.autoInvoiceCurrency ?? 'INR');
  const [taxRate, setTaxRate] = useState(clientProfile.autoInvoiceTaxRate ?? 18);
  const [notes, setNotes] = useState(clientProfile.autoInvoiceNotes ?? '');
  const [terms, setTerms] = useState(clientProfile.autoInvoiceTerms ?? 'Payment due within 15 days of invoice date.');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    (clientProfile.autoInvoiceTemplate as LineItem[]) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const addLineItem = () => {
    setLineItems(prev => [...prev, { description: '', quantity: 1, rate: 0, amount: 0 }]);
    markDirty();
  };

  const removeLineItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
    markDirty();
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        item.amount = Number(item.quantity) * Number(item.rate);
      }
      updated[idx] = item;
      return updated;
    });
    markDirty();
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = subtotal + taxAmount;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clientId,
          autoInvoice: enabled,
          autoInvoiceDay: billingDay,
          autoInvoiceSend: autoSend,
          autoInvoiceTemplate: lineItems,
          autoInvoiceCurrency: currency,
          autoInvoiceTaxRate: taxRate,
          autoInvoiceNotes: notes,
          autoInvoiceTerms: terms,
        }),
      });
      const json = await res.json();
      if (json.success) {
        adminToast.success('Auto-invoice settings saved');
        setDirty(false);
        onUpdate();
      } else {
        adminToast.error(json.error || 'Failed to save');
      }
    } catch {
      adminToast.error('Failed to save auto-invoice settings');
    } finally {
      setSaving(false);
    }
  }, [clientId, enabled, billingDay, autoSend, lineItems, currency, taxRate, notes, terms, onUpdate]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Auto Invoice
          </CardTitle>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-fm-neutral-600">{enabled ? 'Enabled' : 'Disabled'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => { setEnabled(!enabled); markDirty(); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-fm-magenta-600' : 'bg-fm-neutral-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </label>
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-5">
          {/* Schedule + Currency Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-fm-neutral-600 block mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Billing Day
              </label>
              <select
                value={billingDay}
                onChange={(e) => { setBillingDay(parseInt(e.target.value, 10)); markDirty(); }}
                className="w-full px-3 py-2 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
              >
                {DAY_OPTIONS.map(d => (
                  <option key={d} value={d}>
                    {d === -1
                      ? 'Last day of every month'
                      : `${d}${d === 1 || d === 21 || d === 31 ? 'st' : d === 2 || d === 22 ? 'nd' : d === 3 || d === 23 ? 'rd' : 'th'} of every month`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-fm-neutral-600 block mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => { setCurrency(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
              >
                {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-fm-neutral-600 block mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => { setTaxRate(parseFloat(e.target.value) || 0); markDirty(); }}
                className="w-full px-3 py-2 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                min={0}
                max={100}
                step={0.5}
              />
            </div>
          </div>

          {/* Auto-send toggle */}
          <div className="flex items-center gap-3 bg-fm-neutral-50 rounded-xl border border-fm-neutral-200 p-3">
            <Send className="w-4 h-4 text-fm-neutral-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fm-neutral-900">Auto-send to client</p>
              <p className="text-xs text-fm-neutral-500">
                {autoSend
                  ? 'Invoice will be emailed to the client automatically'
                  : 'Invoice will be saved as draft for your review'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSend}
              onClick={() => { setAutoSend(!autoSend); markDirty(); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                autoSend ? 'bg-fm-magenta-600' : 'bg-fm-neutral-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoSend ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Line Items Template */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-fm-neutral-600">Invoice Line Items Template</label>
              <DashboardButton variant="ghost" size="sm" onClick={addLineItem}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </DashboardButton>
            </div>

            {lineItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-fm-neutral-300 bg-fm-neutral-50 p-6" style={{ textAlign: 'center' }}>
                <p className="text-sm text-fm-neutral-500">No line items yet. Add items that will appear on each auto-generated invoice.</p>
                <DashboardButton variant="secondary" size="sm" onClick={addLineItem} className="mt-3">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add First Item
                </DashboardButton>
              </div>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-fm-neutral-50 rounded-lg border border-fm-neutral-200 p-3">
                    <div className="col-span-12 sm:col-span-5">
                      <label className="text-[10px] font-medium text-fm-neutral-400 uppercase">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        placeholder="e.g., Monthly SEO retainer"
                        className="w-full px-2 py-1.5 rounded border border-fm-neutral-200 bg-white text-sm text-fm-neutral-900 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] font-medium text-fm-neutral-400 uppercase">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded border border-fm-neutral-200 bg-white text-sm text-fm-neutral-900 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                        min={0}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] font-medium text-fm-neutral-400 uppercase">Rate</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateLineItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded border border-fm-neutral-200 bg-white text-sm text-fm-neutral-900 focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                        min={0}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <label className="text-[10px] font-medium text-fm-neutral-400 uppercase">Amount</label>
                      <p className="px-2 py-1.5 text-sm font-medium text-fm-neutral-900">
                        {(item.amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-1.5 rounded text-fm-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="bg-white rounded-lg border border-fm-neutral-200 p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-fm-neutral-600">Subtotal</span>
                    <span className="font-medium text-fm-neutral-900">{currency} {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fm-neutral-600">Tax ({taxRate}%)</span>
                    <span className="text-fm-neutral-700">{currency} {taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-fm-neutral-200 pt-1">
                    <span className="text-fm-neutral-900">Total per invoice</span>
                    <span className="text-fm-magenta-600">{currency} {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-fm-neutral-600 block mb-1">Invoice Notes</label>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); markDirty(); }}
                placeholder="Auto-generated invoice note..."
                className="w-full min-h-[60px] px-3 py-2 rounded-lg border border-fm-neutral-200 bg-white text-sm text-fm-neutral-900 resize-y focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-fm-neutral-600 block mb-1">Payment Terms</label>
              <textarea
                value={terms}
                onChange={(e) => { setTerms(e.target.value); markDirty(); }}
                placeholder="Payment due within 15 days..."
                className="w-full min-h-[60px] px-3 py-2 rounded-lg border border-fm-neutral-200 bg-white text-sm text-fm-neutral-900 resize-y focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Save */}
          {dirty && (
            <div className="flex justify-end">
              <DashboardButton variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save Auto-Invoice Settings'}
              </DashboardButton>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
