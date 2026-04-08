/**
 * Add Lead Modal Component
 * Form modal for creating new leads
 */

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/design-system/components/primitives/Button';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: () => void;
}

const PROJECT_TYPES = [
  'web_development',
  'mobile_app',
  'ecommerce',
  'branding',
  'marketing_campaign',
  'seo',
  'social_media',
  'content_creation',
  'consulting',
  'other'
];

const PROJECT_TYPE_LABELS: Record<string, string> = {
  'web_development': 'Web Development',
  'mobile_app': 'Mobile App',
  'ecommerce': 'E-commerce',
  'branding': 'Branding',
  'marketing_campaign': 'Marketing Campaign',
  'seo': 'SEO',
  'social_media': 'Social Media',
  'content_creation': 'Content Creation',
  'consulting': 'Consulting',
  'other': 'Other'
};

const BUDGET_RANGES = [
  'under_10k',
  '10k_25k',
  '25k_50k',
  '50k_100k',
  '100k_250k',
  'over_250k',
  'not_disclosed'
];

const BUDGET_LABELS: Record<string, string> = {
  'under_10k': 'Under ₹10,000',
  '10k_25k': '₹10,000 - ₹25,000',
  '25k_50k': '₹25,000 - ₹50,000',
  '50k_100k': '₹50,000 - ₹1,00,000',
  '100k_250k': '₹1,00,000 - ₹2,50,000',
  'over_250k': 'Over ₹2,50,000',
  'not_disclosed': 'Not Disclosed'
};

const TIMELINES = [
  'asap',
  '1_month',
  '1_3_months',
  '3_6_months',
  '6_12_months',
  'over_year',
  'flexible'
];

const TIMELINE_LABELS: Record<string, string> = {
  'asap': 'ASAP',
  '1_month': '1 Month',
  '1_3_months': '1-3 Months',
  '3_6_months': '3-6 Months',
  '6_12_months': '6-12 Months',
  'over_year': 'Over 1 Year',
  'flexible': 'Flexible'
};

const COMPANY_SIZES = [
  'individual',
  'startup',
  'small_business',
  'medium_business',
  'enterprise'
];

const COMPANY_SIZE_LABELS: Record<string, string> = {
  'individual': 'Individual/Freelancer',
  'startup': 'Startup (1-10 employees)',
  'small_business': 'Small Business (11-50 employees)',
  'medium_business': 'Medium Business (51-200 employees)',
  'enterprise': 'Enterprise (200+ employees)'
};

export function AddLeadModal({ isOpen, onClose, onLeadAdded }: AddLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    companySize: 'small_business',
    projectType: 'web_development',
    projectDescription: '',
    budgetRange: '25k_50k',
    timeline: '3_6_months',
    primaryChallenge: '',
    specificRequirements: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing in required fields
    if (error && (name === 'projectDescription' || name === 'primaryChallenge')) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Client-side validation
    if (formData.projectDescription.length < 10) {
      setError('Project description must be at least 10 characters long');
      setIsSubmitting(false);
      return;
    }

    if (formData.primaryChallenge.length < 5) {
      setError('Primary challenge must be at least 5 characters long');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          companySize: 'small_business',
          projectType: 'web_development',
          projectDescription: '',
          budgetRange: '25k_50k',
          timeline: '3_6_months',
          primaryChallenge: '',
          specificRequirements: ''
        });
        
        setError(null);
        onLeadAdded();
        onClose();
      } else {
        setError(result.error || 'Failed to create lead. Please check all required fields.');
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-2xl w-full sm:mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-fm-neutral-200 shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-fm-neutral-900">Add New Lead</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-fm-neutral-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Information */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider pb-2 border-b border-fm-neutral-100">Contact Information</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Company *
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                required
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Company Size
              </label>
              <select
                name="companySize"
                value={formData.companySize}
                onChange={handleInputChange}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
              >
                {COMPANY_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {COMPANY_SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Information */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider pb-2 border-b border-fm-neutral-100">Project Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Project Type *
              </label>
              <select
                name="projectType"
                value={formData.projectType}
                onChange={handleInputChange}
                required
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
              >
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PROJECT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Budget Range *
              </label>
              <select
                name="budgetRange"
                value={formData.budgetRange}
                onChange={handleInputChange}
                required
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
              >
                {BUDGET_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {BUDGET_LABELS[range]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Timeline *
              </label>
              <select
                name="timeline"
                value={formData.timeline}
                onChange={handleInputChange}
                required
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
              >
                {TIMELINES.map((timeline) => (
                  <option key={timeline} value={timeline}>
                    {TIMELINE_LABELS[timeline]}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-fm-neutral-700">
                  Project Description * <span className="text-xs text-fm-neutral-500">(minimum 10 characters)</span>
                </label>
                <span className={`text-xs ${
                  formData.projectDescription.length >= 10 ? 'text-green-600' : 'text-fm-neutral-400'
                }`}>
                  {formData.projectDescription.length}/10
                </span>
              </div>
              <textarea
                name="projectDescription"
                value={formData.projectDescription}
                onChange={handleInputChange}
                required
                minLength={10}
                rows={3}
                className={`w-full px-3 py-2 text-base bg-fm-neutral-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 ${
                  formData.projectDescription.length > 0 && formData.projectDescription.length < 10
                    ? 'border-red-300 bg-red-50'
                    : 'border-fm-neutral-300'
                }`}
                placeholder="Describe your project in detail (minimum 10 characters)"
              />
              {formData.projectDescription.length > 0 && formData.projectDescription.length < 10 && (
                <p className="mt-1 text-xs text-red-600">
                  {10 - formData.projectDescription.length} more characters needed
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-fm-neutral-700">
                  Primary Challenge * <span className="text-xs text-fm-neutral-500">(minimum 5 characters)</span>
                </label>
                <span className={`text-xs ${
                  formData.primaryChallenge.length >= 5 ? 'text-green-600' : 'text-fm-neutral-400'
                }`}>
                  {formData.primaryChallenge.length}/5
                </span>
              </div>
              <textarea
                name="primaryChallenge"
                value={formData.primaryChallenge}
                onChange={handleInputChange}
                required
                minLength={5}
                rows={2}
                className={`w-full px-3 py-2 text-base bg-fm-neutral-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 ${
                  formData.primaryChallenge.length > 0 && formData.primaryChallenge.length < 5
                    ? 'border-red-300 bg-red-50'
                    : 'border-fm-neutral-300'
                }`}
                placeholder="What's your main challenge or goal? (minimum 5 characters)"
              />
              {formData.primaryChallenge.length > 0 && formData.primaryChallenge.length < 5 && (
                <p className="mt-1 text-xs text-red-600">
                  {5 - formData.primaryChallenge.length} more characters needed
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Specific Requirements
              </label>
              <textarea
                name="specificRequirements"
                value={formData.specificRequirements}
                onChange={handleInputChange}
                rows={2}
                className="w-full min-h-[4rem] px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Any specific requirements or preferences?"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6 pt-6 border-t border-fm-neutral-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              fullWidth
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || formData.projectDescription.length < 10 || formData.primaryChallenge.length < 5}
              loading={isSubmitting}
              fullWidth
              className="sm:w-auto"
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}