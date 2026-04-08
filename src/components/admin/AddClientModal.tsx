/**
 * Add Client Modal Component
 * Form modal for creating new clients (react-hook-form + Zod validation)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Plus, Trash2, Palette } from 'lucide-react';
import { Button } from '@/design-system/components/primitives/Button';
import { adminToast } from '@/lib/admin/toast';
import { createClientSchema } from '@/lib/validations/schemas';
import { useTeamMembers } from '@/hooks/admin/useTeamMembers';
import { TEAM_ROLES } from '@/lib/admin/types';

type ClientFormData = z.infer<typeof createClientSchema>;

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: () => void;
}

const INDUSTRIES = [
  'technology', 'healthcare', 'finance', 'ecommerce', 'education',
  'real_estate', 'hospitality', 'manufacturing', 'retail', 'automotive',
  'food_beverage', 'consulting', 'non_profit', 'other',
];

const INDUSTRY_LABELS: Record<string, string> = {
  'technology': 'Technology', 'healthcare': 'Healthcare',
  'finance': 'Finance & Banking', 'ecommerce': 'E-commerce',
  'education': 'Education', 'real_estate': 'Real Estate',
  'hospitality': 'Hospitality & Travel', 'manufacturing': 'Manufacturing',
  'retail': 'Retail', 'automotive': 'Automotive',
  'food_beverage': 'Food & Beverage', 'consulting': 'Consulting',
  'non_profit': 'Non-Profit', 'other': 'Other',
};

const inputClass = 'w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400';
const selectClass = 'w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400 appearance-none';
const errorClass = 'text-xs text-red-600 mt-1.5';

export function AddClientModal({ isOpen, onClose, onClientAdded }: AddClientModalProps) {
  const { teamMembers } = useTeamMembers();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      industry: 'technology',
      website: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      zipCode: '',
      status: 'active',
      health: 'good',
      totalValue: '0',
      gstNumber: '',
      accountManager: '',
      portalPassword: '',
      brandName: '',
      parentClientId: '',
      isBrandGroup: false,
      logoUrl: '',
      brandColors: [],
      brandFonts: [],
      tagline: '',
      brandGuidelinesUrl: '',
    },
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [brandColorInputs, setBrandColorInputs] = useState<string[]>(['#c9325d']);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('clientId', `temp-${Date.now()}`);
      const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: formDataUpload });
      const result = await res.json();
      if (result.success) {
        setValue('logoUrl', result.url);
        setLogoPreview(result.url);
      } else {
        adminToast.error(result.error || 'Failed to upload logo');
      }
    } catch {
      adminToast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const addBrandColor = () => {
    if (brandColorInputs.length < 5) {
      setBrandColorInputs([...brandColorInputs, '#000000']);
    }
  };

  const removeBrandColor = (index: number) => {
    const updated = brandColorInputs.filter((_, i) => i !== index);
    setBrandColorInputs(updated);
    setValue('brandColors', updated);
  };

  const updateBrandColor = (index: number, value: string) => {
    const updated = [...brandColorInputs];
    updated[index] = value;
    setBrandColorInputs(updated);
    setValue('brandColors', updated);
  };

  const [existingClients, setExistingClients] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/clients')
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          setExistingClients((result.data || []).map((c: any) => ({ id: c.id, name: c.name })));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      // Ensure brandColors from local state is included
      const payload = { ...data, brandColors: brandColorInputs.filter(c => /^#[0-9a-fA-F]{6}$/.test(c)) };
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        reset();
        setLogoPreview(null);
        setBrandColorInputs(['#c9325d']);
        onClientAdded();
        onClose();
      } else {
        adminToast.error(result.error || 'Failed to create client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      adminToast.error('Failed to create client. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-2xl w-full sm:mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-fm-neutral-200 shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-fm-neutral-900">Add New Client</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-fm-neutral-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider pb-2 border-b border-fm-neutral-100">Basic Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Client Name *
              </label>
              <input {...register('name')} className={inputClass} placeholder="Enter client name" />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Email *
              </label>
              <input {...register('email')} type="email" className={inputClass} placeholder="Enter email address" />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Phone</label>
              <input {...register('phone')} type="tel" className={inputClass} placeholder="Enter phone number" />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Industry
              </label>
              <select {...register('industry')} className={selectClass}>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{INDUSTRY_LABELS[industry]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Website</label>
              <input {...register('website')} type="url" className={inputClass} placeholder="https://example.com" />
            </div>

            {/* Brand / Grouping */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider pb-2 border-b border-fm-neutral-100">Brand / Grouping</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Brand Name</label>
              <input {...register('brandName')} className={inputClass} placeholder="e.g. Sharma's (used in content)" />
              <p className="text-xs text-fm-neutral-500 mt-1">Name used in AI-generated content. Leave empty to use client name.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Parent Client</label>
              <select {...register('parentClientId')} className={selectClass}>
                <option value="">None (standalone client)</option>
                {existingClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-fm-neutral-500 mt-1">Link this as a sub-brand under a parent client</p>
            </div>

            {/* Brand Identity */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider pb-2 border-b border-fm-neutral-100">
                <Palette className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                Brand Identity
              </h3>
            </div>

            {/* Logo Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Brand Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative w-16 h-16 rounded-lg border border-fm-neutral-200 overflow-hidden bg-fm-neutral-50 flex items-center justify-center">
                    <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => { setLogoPreview(null); setValue('logoUrl', ''); }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-fm-neutral-300 flex items-center justify-center cursor-pointer hover:border-fm-magenta-400 transition-colors"
                  >
                    <Upload className="h-5 w-5 text-fm-neutral-400" />
                  </div>
                )}
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="text-sm text-fm-magenta-700 hover:text-fm-magenta-800 font-medium"
                  >
                    {logoUploading ? 'Uploading...' : 'Upload logo'}
                  </button>
                  <p className="text-xs text-fm-neutral-500 mt-0.5">PNG, JPEG, SVG, or WebP. Max 2MB.</p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
              </div>
            </div>

            {/* Brand Colors */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Brand Colors</label>
              <div className="space-y-2">
                {brandColorInputs.map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateBrandColor(index, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-fm-neutral-200"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateBrandColor(index, e.target.value)}
                      placeholder="#c9325d"
                      className="w-28 h-10 px-2 text-sm bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 font-mono"
                    />
                    <span className="text-xs text-fm-neutral-500">
                      {index === 0 ? 'Primary' : index === 1 ? 'Secondary' : 'Accent'}
                    </span>
                    {brandColorInputs.length > 1 && (
                      <button type="button" onClick={() => removeBrandColor(index)} className="p-1 text-fm-neutral-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {brandColorInputs.length < 5 && (
                  <button type="button" onClick={addBrandColor} className="flex items-center gap-1 text-sm text-fm-magenta-700 hover:text-fm-magenta-800">
                    <Plus className="h-3.5 w-3.5" /> Add color
                  </button>
                )}
              </div>
            </div>

            {/* Brand Fonts */}
            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Brand Fonts</label>
              <input
                {...register('brandFonts')}
                className={inputClass}
                placeholder="Poppins, Montserrat"
                onChange={(e) => {
                  const fonts = e.target.value.split(',').map(f => f.trim()).filter(Boolean);
                  setValue('brandFonts', fonts);
                }}
              />
              <p className="text-xs text-fm-neutral-500 mt-1">Comma-separated font names</p>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Tagline / Slogan</label>
              <input {...register('tagline')} className={inputClass} placeholder="Your brand's catchphrase" />
            </div>

            {/* Brand Guidelines URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Brand Guidelines URL</label>
              <input {...register('brandGuidelinesUrl')} type="url" className={inputClass} placeholder="https://drive.google.com/..." />
              <p className="text-xs text-fm-neutral-500 mt-1">Link to brand guidelines document (Google Drive, Dropbox, etc.)</p>
            </div>

            {/* Address Information */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider pb-2 border-b border-fm-neutral-100">Address Information</h3>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Address</label>
              <input {...register('address')} className={inputClass} placeholder="Street address" />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">City</label>
              <input {...register('city')} className={inputClass} placeholder="City" />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">State</label>
              <input {...register('state')} className={inputClass} placeholder="State" />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Country</label>
              <input {...register('country')} className={inputClass} placeholder="Country" />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">ZIP Code</label>
              <input {...register('zipCode')} className={inputClass} placeholder="ZIP Code" />
            </div>

            {/* Business Information */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider pb-2 border-b border-fm-neutral-100">Business Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Total Value (₹)</label>
              <input {...register('totalValue')} type="number" min="0" className={inputClass} placeholder="0" />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">GST Number</label>
              <input {...register('gstNumber')} className={inputClass} placeholder="22AAAAA0000A1Z5" />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Account Manager</label>
              <select {...register('accountManager')} className={selectClass}>
                <option value="">Select account manager</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name} — {TEAM_ROLES[member.role]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Portal Password</label>
              <input {...register('portalPassword')} type="text" className={inputClass} placeholder="Password for client portal login" />
              <p className="text-xs text-fm-neutral-500 mt-1">Client will use this password to log into their portal</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">Health Status</label>
              <select {...register('health')} className={selectClass}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="at-risk">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6 pt-6 border-t border-fm-neutral-200">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} fullWidth className="sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              className="sm:w-auto"
            >
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
