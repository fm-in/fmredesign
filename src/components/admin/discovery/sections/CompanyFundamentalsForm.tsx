/**
 * Company Fundamentals Form
 * Section 1 of Discovery Wizard
 */

'use client';

import { useState } from 'react';
import { DiscoverySession, Stakeholder } from '@/lib/admin/discovery-types';
import { Button } from '@/design-system/components/primitives/Button';
import { Plus, Trash2, Building2 } from 'lucide-react';

interface CompanyFundamentalsFormProps {
  session: DiscoverySession;
  onUpdate: (data: Partial<DiscoverySession>) => void;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Food & Beverage',
  'Travel & Tourism',
  'Media & Entertainment',
  'Automotive',
  'Construction',
  'Agriculture',
  'Energy',
  'Consulting',
  'Other'
];

const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-10 employees)' },
  { value: 'small', label: 'Small (11-50 employees)' },
  { value: 'medium', label: 'Medium (51-200 employees)' },
  { value: 'large', label: 'Large (201-1000 employees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ employees)' }
];

export function CompanyFundamentalsForm({ session, onUpdate }: CompanyFundamentalsFormProps) {
  const [formData, setFormData] = useState(session.companyFundamentals);

  const handleInputChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate({ companyFundamentals: updated });
  };

  const handleStakeholderAdd = () => {
    const newStakeholder: Stakeholder = {
      name: '',
      role: '',
      decisionMakingPower: 'medium',
      contactInfo: ''
    };
    
    const updated = {
      ...formData,
      keyStakeholders: [...formData.keyStakeholders, newStakeholder]
    };
    
    setFormData(updated);
    onUpdate({ companyFundamentals: updated });
  };

  const handleStakeholderUpdate = (index: number, field: keyof Stakeholder, value: any) => {
    const updatedStakeholders = [...formData.keyStakeholders];
    updatedStakeholders[index] = { ...updatedStakeholders[index], [field]: value };
    
    const updated = { ...formData, keyStakeholders: updatedStakeholders };
    setFormData(updated);
    onUpdate({ companyFundamentals: updated });
  };

  const handleStakeholderRemove = (index: number) => {
    const updatedStakeholders = formData.keyStakeholders.filter((_, i) => i !== index);
    const updated = { ...formData, keyStakeholders: updatedStakeholders };
    setFormData(updated);
    onUpdate({ companyFundamentals: updated });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-fm-magenta-50 rounded-lg">
            <Building2 className="h-6 w-6 text-fm-magenta-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-fm-neutral-900">Company Fundamentals</h2>
            <p className="text-fm-neutral-600">Basic information about your company and business</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Basic Company Information */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-fm-neutral-900 mb-6">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Enter your company name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Industry *
              </label>
              <select
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400 appearance-none"
                required
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Company Size *
              </label>
              <select
                value={formData.companySize}
                onChange={(e) => handleInputChange('companySize', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400 appearance-none"
                required
              >
                <option value="">Select company size</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Founded Year
              </label>
              <input
                type="number"
                value={formData.foundedYear || ''}
                onChange={(e) => handleInputChange('foundedYear', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="e.g., 2020"
                min="1900"
                max="2024"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Headquarters Location *
              </label>
              <input
                type="text"
                value={formData.headquarters}
                onChange={(e) => handleInputChange('headquarters', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="e.g., Mumbai, India"
                required
              />
            </div>
          </div>
        </div>

        {/* Business Model & Positioning */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-fm-neutral-900 mb-6">Business Model & Positioning</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Business Model *
              </label>
              <textarea
                value={formData.businessModel}
                onChange={(e) => handleInputChange('businessModel', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Describe how your business operates and generates revenue"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Mission Statement
              </label>
              <textarea
                value={formData.missionStatement || ''}
                onChange={(e) => handleInputChange('missionStatement', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="What is your company's mission?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Unique Selling Proposition *
              </label>
              <textarea
                value={formData.uniqueSellingProposition}
                onChange={(e) => handleInputChange('uniqueSellingProposition', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="What makes your company unique? What's your competitive advantage?"
                required
              />
            </div>
          </div>
        </div>

        {/* Key Stakeholders */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-fm-neutral-900">Key Stakeholders</h3>
            <Button
              variant="secondary"
              onClick={handleStakeholderAdd}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Stakeholder
            </Button>
          </div>

          {formData.keyStakeholders.length === 0 ? (
            <div style={{ textAlign: 'center' }} className="py-8 text-fm-neutral-500">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No stakeholders added yet</p>
              <p className="text-sm">Add key decision makers and project stakeholders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.keyStakeholders.map((stakeholder, index) => (
                <div key={index} className="p-4 border border-fm-neutral-200 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                        Name
                      </label>
                      <input
                        type="text"
                        value={stakeholder.name}
                        onChange={(e) => handleStakeholderUpdate(index, 'name', e.target.value)}
                        className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                        placeholder="Full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                        Role/Title
                      </label>
                      <input
                        type="text"
                        value={stakeholder.role}
                        onChange={(e) => handleStakeholderUpdate(index, 'role', e.target.value)}
                        className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                        placeholder="e.g., CEO, Marketing Manager"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                        Decision Power
                      </label>
                      <select
                        value={stakeholder.decisionMakingPower}
                        onChange={(e) => handleStakeholderUpdate(index, 'decisionMakingPower', e.target.value)}
                        className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400 appearance-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                          Contact
                        </label>
                        <input
                          type="text"
                          value={stakeholder.contactInfo || ''}
                          onChange={(e) => handleStakeholderUpdate(index, 'contactInfo', e.target.value)}
                          className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                          placeholder="Email or phone"
                        />
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => handleStakeholderRemove(index)}
                        icon={<Trash2 className="h-4 w-4" />}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}