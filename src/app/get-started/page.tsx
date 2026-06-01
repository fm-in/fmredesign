'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
  Users,
  DollarSign,
  Sparkles,
  ArrowRight,
  Mail,
  Phone,
  Globe,
  Building,
  BarChart3,
  Gift
} from 'lucide-react';
import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";
import type { LeadInput, ProjectType, BudgetRange, Timeline, CompanySize, Industry } from '@/lib/admin/lead-types';
import { INDUSTRIES } from '@/lib/admin/lead-types';

const PROJECT_TYPES: { value: ProjectType; label: string; description: string; icon: string }[] = [
  { value: 'website_design', label: 'Website Design', description: 'Custom website or redesign', icon: '🌐' },
  { value: 'ecommerce', label: 'E-commerce Store', description: 'Online store with payments', icon: '🛒' },
  { value: 'web_app', label: 'Web Application', description: 'Custom web-based software', icon: '💻' },
  { value: 'mobile_app', label: 'Mobile App', description: 'iOS/Android application', icon: '📱' },
  { value: 'branding', label: 'Branding & Identity', description: 'Logo, brand guidelines', icon: '🎨' },
  { value: 'digital_marketing', label: 'Digital Marketing', description: 'SEO, PPC, social media', icon: '📈' },
  { value: 'full_service', label: 'Full Service', description: 'Complete digital transformation', icon: '🚀' },
  { value: 'consultation', label: 'Consultation', description: 'Strategy and guidance', icon: '💡' }
];

const BUDGET_RANGES: { value: BudgetRange; label: string; popular?: boolean }[] = [
  { value: 'under_10k', label: 'Under ₹10,000' },
  { value: '10k_25k', label: '₹10,000 - ₹25,000' },
  { value: '25k_50k', label: '₹25,000 - ₹50,000', popular: true },
  { value: '50k_100k', label: '₹50,000 - ₹1,00,000', popular: true },
  { value: '100k_250k', label: '₹1,00,000 - ₹2,50,000' },
  { value: 'over_250k', label: 'Over ₹2,50,000' },
  { value: 'not_disclosed', label: 'Prefer not to disclose' }
];

const TIMELINES: { value: Timeline; label: string; urgent?: boolean }[] = [
  { value: 'asap', label: 'ASAP (within 1 week)', urgent: true },
  { value: '1_month', label: 'Within 1 month', urgent: true },
  { value: '2_3_months', label: '2-3 months' },
  { value: '3_6_months', label: '3-6 months' },
  { value: '6_months_plus', label: '6+ months' },
  { value: 'flexible', label: 'Timeline is flexible' }
];

const COMPANY_SIZES: { value: CompanySize; label: string; icon: string }[] = [
  { value: 'startup', label: 'Startup (1-10 employees)', icon: '🚀' },
  { value: 'small_business', label: 'Small Business (11-50)', icon: '🏢' },
  { value: 'medium_business', label: 'Medium Business (51-200)', icon: '🏬' },
  { value: 'enterprise', label: 'Enterprise (200+)', icon: '🏭' },
  { value: 'agency', label: 'Agency/Consultant', icon: '🎯' },
  { value: 'nonprofit', label: 'Non-profit', icon: '❤️' },
  { value: 'individual', label: 'Individual/Freelancer', icon: '👤' }
];

// Modern input styling (inline to avoid Tailwind v4 cascade issues)
const inputBase: React.CSSProperties = {
  padding: '14px 16px',
  background: '#faf9f9',
  border: '1.5px solid #e5e2e2',
  outline: 'none',
  fontSize: '16px',
  color: '#0f0f0f',
  width: '100%',
  borderRadius: '12px',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
};

const inputWithIcon: React.CSSProperties = { ...inputBase, paddingLeft: '44px' };

const selectStyle: React.CSSProperties = {
  ...inputBase,
  appearance: 'none' as const,
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  paddingRight: '44px',
};

const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.target.style.border = '1.5px solid #c9325d';
  e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)';
  e.target.style.background = '#fff';
};

const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.target.style.border = '1.5px solid #e5e2e2';
  e.target.style.boxShadow = 'none';
  e.target.style.background = '#faf9f9';
};

const handleErrorFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.target.style.border = '1.5px solid #c9325d';
  e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)';
  e.target.style.background = '#fff';
};

const handleErrorBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.target.style.border = '1.5px solid #dc2626';
  e.target.style.boxShadow = 'none';
  e.target.style.background = '#faf9f9';
};

export default function GetStartedPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<LeadInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fm_lead_progress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFormData(data.formData || {});
        setCurrentStep(data.currentStep || 1);
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      localStorage.setItem('fm_lead_progress', JSON.stringify({
        formData,
        currentStep,
        timestamp: Date.now()
      }));
    }
  }, [formData, currentStep]);

  const updateFormData = (updates: Partial<LeadInput>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(updates).forEach(key => {
        delete newErrors[key];
      });
      return newErrors;
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name?.trim()) newErrors.name = 'Name is required';
        if (!formData.email?.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Valid email is required';
        }
        if (!formData.company?.trim()) newErrors.company = 'Company is required';
        break;

      case 2:
        if (!formData.projectType) newErrors.projectType = 'Please select a project type';
        if (!formData.projectDescription?.trim() || formData.projectDescription.length < 10) {
          newErrors.projectDescription = 'Please provide at least 10 characters';
        }
        break;

      case 3:
        if (!formData.budgetRange) newErrors.budgetRange = 'Please select a budget range';
        if (!formData.timeline) newErrors.timeline = 'Please select a timeline';
        break;

      case 4:
        if (!formData.primaryChallenge?.trim() || formData.primaryChallenge.length < 5) {
          newErrors.primaryChallenge = 'Please describe your main challenge (at least 5 characters)';
        }
        if (!formData.companySize) newErrors.companySize = 'Please select company size';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(5, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitForm = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source: 'website_form'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      localStorage.removeItem('fm_lead_progress');
      setSubmitted(true);
      setCurrentStep(5);

      if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'generate_lead', {
          event_category: 'form',
          event_label: formData.projectType,
          value: 1
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting your form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return <ThankYouStep formData={formData} />;
  }

  return (
    <V2PageWrapper>
      <section className="relative z-10 v2-section pt-40 pb-32">
        <div className="v2-container">
          {/* 3D Brain Decoration */}
          <div className="absolute right-8 lg:right-20 top-36 hidden lg:block" style={{ zIndex: 10 }}>
            <img
              src="/3dasset/brain-rocket.webp"
              alt="Launch Your Project"
              loading="lazy"
              className="h-auto animate-v2-hero-float"
              style={{
                width: 'min(180px, 30vw)',
                filter: 'drop-shadow(0 20px 40px rgba(140,25,60,0.2))',
              }}
            />
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div className="v2-badge v2-badge-glass" style={{ marginBottom: '24px' }}>
                <Sparkles className="w-4 h-4 v2-text-primary" />
                <span className="v2-text-primary">Start Your Project</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-5xl font-bold v2-text-primary leading-tight" style={{ marginBottom: '16px' }}>
                Let&apos;s Grow Your <span className="v2-accent">Brand</span>
              </h1>
              <p className="text-base md:text-lg v2-text-secondary leading-relaxed max-w-2xl mx-auto">
                Tell us about your project. We&apos;ll get back within 24 hours with a customized proposal.
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl" style={{ marginBottom: '48px' }}>
              <div className="p-5 sm:p-8 md:p-12">
                {/* Progress Bar */}
                <div style={{ marginBottom: '40px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-[background-color,border-color,color,box-shadow] duration-300 font-semibold
                            ${currentStep >= step
                              ? 'bg-fm-magenta-700 border-fm-magenta-700 text-white shadow-lg'
                              : 'border-fm-neutral-300 text-fm-neutral-500 bg-white'}`}
                        >
                          {currentStep > step ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <span className="text-xs sm:text-sm">{step}</span>
                          )}
                        </div>
                        <span className={`text-[11px] sm:text-xs mt-1 sm:mt-2 font-medium ${
                          currentStep >= step ? 'text-fm-magenta-700' : 'text-fm-neutral-500'
                        }`}>
                          {step === 1 && 'Contact'}
                          {step === 2 && 'Project'}
                          {step === 3 && 'Budget'}
                          {step === 4 && 'Details'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-fm-neutral-200 rounded-full" style={{ height: '6px' }}>
                    <div
                      className="bg-gradient-to-r from-fm-magenta-700 to-fm-magenta-400 rounded-full transition-[width] duration-500 ease-out"
                      style={{ width: `${((currentStep - 1) / 3) * 100}%`, height: '6px' }}
                    />
                  </div>
                </div>

                {/* Step Content */}
                <div style={{ minHeight: 'min(400px, 50vh)' }}>
                  {/* Step 1: Contact Information */}
                  {currentStep === 1 && (
                    <div className="space-y-8">
                      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div className="w-16 h-16 bg-fm-magenta-100 rounded-full flex items-center justify-center mx-auto" style={{ marginBottom: '24px' }}>
                          <Users className="w-8 h-8 text-fm-magenta-700" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-fm-neutral-900" style={{ marginBottom: '12px' }}>
                          Let&apos;s get to know you
                        </h2>
                        <p className="text-lg text-fm-neutral-600">
                          Share your contact details so we can connect
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                            Your Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => updateFormData({ name: e.target.value })}
                            style={{ ...inputBase, ...(errors.name ? { borderColor: '#dc2626' } : {}) }}
                            onFocus={errors.name ? handleErrorFocus : handleFocus}
                            onBlur={errors.name ? handleErrorBlur : handleBlur}
                            placeholder="Enter your full name"
                          />
                          {errors.name && <p className="text-red-500 text-sm mt-2 font-medium">{errors.name}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                            Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="w-5 h-5 absolute left-[14px] top-1/2 transform -translate-y-1/2 text-fm-neutral-500" />
                            <input
                              type="email"
                              value={formData.email || ''}
                              onChange={(e) => updateFormData({ email: e.target.value })}
                              style={{ ...inputWithIcon, ...(errors.email ? { borderColor: '#dc2626' } : {}) }}
                              onFocus={errors.email ? handleErrorFocus : handleFocus}
                              onBlur={errors.email ? handleErrorBlur : handleBlur}
                              placeholder="your@email.com"
                            />
                          </div>
                          {errors.email && <p className="text-red-500 text-sm mt-2 font-medium">{errors.email}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                            Company Name *
                          </label>
                          <div className="relative">
                            <Building className="w-5 h-5 absolute left-[14px] top-1/2 transform -translate-y-1/2 text-fm-neutral-500" />
                            <input
                              type="text"
                              value={formData.company || ''}
                              onChange={(e) => updateFormData({ company: e.target.value })}
                              style={{ ...inputWithIcon, ...(errors.company ? { borderColor: '#dc2626' } : {}) }}
                              onFocus={errors.company ? handleErrorFocus : handleFocus}
                              onBlur={errors.company ? handleErrorBlur : handleBlur}
                              placeholder="Your company name"
                            />
                          </div>
                          {errors.company && <p className="text-red-500 text-sm mt-2 font-medium">{errors.company}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="w-5 h-5 absolute left-[14px] top-1/2 transform -translate-y-1/2 text-fm-neutral-500" />
                            <input
                              type="tel"
                              value={formData.phone || ''}
                              onChange={(e) => updateFormData({ phone: e.target.value })}
                              style={inputWithIcon}
                              onFocus={handleFocus}
                              onBlur={handleBlur}
                              placeholder="+91 XXXXX XXXXX"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                          Website (Optional)
                        </label>
                        <div className="relative">
                          <Globe className="w-5 h-5 absolute left-[14px] top-1/2 transform -translate-y-1/2 text-fm-neutral-500" />
                          <input
                            type="url"
                            value={formData.website || ''}
                            onChange={(e) => updateFormData({ website: e.target.value })}
                            style={inputWithIcon}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Project Details */}
                  {currentStep === 2 && (
                    <div className="space-y-8">
                      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div className="w-16 h-16 bg-fm-magenta-100 rounded-full flex items-center justify-center mx-auto" style={{ marginBottom: '24px' }}>
                          <Target className="w-8 h-8 text-fm-magenta-700" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-fm-neutral-900" style={{ marginBottom: '12px' }}>
                          What do you need?
                        </h2>
                        <p className="text-lg text-fm-neutral-600">
                          Tell us about your project requirements
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '24px' }}>
                          Project Type *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {PROJECT_TYPES.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => updateFormData({ projectType: type.value })}
                              className={`p-4 sm:p-6 border-2 rounded-xl text-left hover:bg-fm-magenta-50 hover:border-fm-magenta-300 transition-[background-color,border-color] duration-300 group
                                ${formData.projectType === type.value
                                  ? 'border-fm-magenta-700 bg-fm-magenta-50 shadow-lg'
                                  : 'border-fm-neutral-200'}`}
                            >
                              <div className="flex items-start space-x-3 sm:space-x-4">
                                <span className="text-xl sm:text-2xl">{type.icon}</span>
                                <div>
                                  <div className="font-semibold text-fm-neutral-900 mb-1">{type.label}</div>
                                  <div className="text-sm text-fm-neutral-600">{type.description}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        {errors.projectType && <p className="text-red-500 text-sm mt-3 font-medium">{errors.projectType}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                          Project Description *
                        </label>
                        <textarea
                          value={formData.projectDescription || ''}
                          onChange={(e) => updateFormData({ projectDescription: e.target.value })}
                          rows={5}
                          style={{ ...inputBase, resize: 'none' as const, ...(errors.projectDescription ? { borderColor: '#dc2626' } : {}) }}
                          onFocus={errors.projectDescription ? handleErrorFocus : handleFocus}
                          onBlur={errors.projectDescription ? handleErrorBlur : handleBlur}
                          placeholder="Describe your project in detail. What are you looking to build or improve?"
                        />
                        <div className="flex justify-between text-sm mt-2">
                          <span className={errors.projectDescription ? 'text-red-500 font-medium' : 'text-fm-neutral-500'}>
                            {errors.projectDescription || 'Minimum 10 characters'}
                          </span>
                          <span className="text-fm-neutral-500">{formData.projectDescription?.length || 0} characters</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                          Industry (Optional)
                        </label>
                        <select
                          value={formData.industry || ''}
                          onChange={(e) => updateFormData({ industry: e.target.value as Industry })}
                          style={selectStyle}
                          onFocus={handleFocus}
                          onBlur={handleBlur}
                        >
                          <option value="">Select your industry</option>
                          {INDUSTRIES.map((industry) => (
                            <option key={industry} value={industry}>
                              {industry}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Budget & Timeline */}
                  {currentStep === 3 && (
                    <div className="space-y-8">
                      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div className="w-16 h-16 bg-fm-magenta-100 rounded-full flex items-center justify-center mx-auto" style={{ marginBottom: '24px' }}>
                          <DollarSign className="w-8 h-8 text-fm-magenta-700" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-fm-neutral-900" style={{ marginBottom: '12px' }}>
                          Budget & Timeline
                        </h2>
                        <p className="text-lg text-fm-neutral-600">
                          Help us create the perfect proposal for you
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '24px' }}>
                          Budget Range *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {BUDGET_RANGES.map((budget) => (
                            <button
                              key={budget.value}
                              type="button"
                              onClick={() => updateFormData({ budgetRange: budget.value })}
                              className={`p-6 border-2 rounded-xl text-left hover:bg-fm-magenta-50 hover:border-fm-magenta-300 transition-[background-color,border-color] duration-300 relative
                                ${formData.budgetRange === budget.value
                                  ? 'border-fm-magenta-700 bg-fm-magenta-50 shadow-lg'
                                  : 'border-fm-neutral-200'}`}
                            >
                              <div className="font-semibold text-fm-neutral-900">{budget.label}</div>
                              {budget.popular && (
                                <span className="absolute top-3 right-3 bg-fm-magenta-700 text-white text-xs px-3 py-1 rounded-full font-medium">
                                  Popular
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        {errors.budgetRange && <p className="text-red-500 text-sm mt-3 font-medium">{errors.budgetRange}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '24px' }}>
                          Timeline *
                        </label>
                        <div className="space-y-3">
                          {TIMELINES.map((timeline) => (
                            <button
                              key={timeline.value}
                              type="button"
                              onClick={() => updateFormData({ timeline: timeline.value })}
                              className={`w-full p-6 border-2 rounded-xl text-left hover:bg-fm-magenta-50 hover:border-fm-magenta-300 transition-[background-color,border-color] duration-300
                                ${formData.timeline === timeline.value
                                  ? 'border-fm-magenta-700 bg-fm-magenta-50 shadow-lg'
                                  : 'border-fm-neutral-200'}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-fm-neutral-900">{timeline.label}</span>
                                {timeline.urgent && (
                                  <span className="flex items-center text-fm-magenta-600 font-medium">
                                    <Zap className="w-4 h-4 mr-1" />
                                    Urgent
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {errors.timeline && <p className="text-red-500 text-sm mt-3 font-medium">{errors.timeline}</p>}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Challenges & Company Info */}
                  {currentStep === 4 && (
                    <div className="space-y-8">
                      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div className="w-16 h-16 bg-fm-magenta-100 rounded-full flex items-center justify-center mx-auto" style={{ marginBottom: '24px' }}>
                          <AlertCircle className="w-8 h-8 text-fm-magenta-700" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-fm-neutral-900" style={{ marginBottom: '12px' }}>
                          Tell us your challenges
                        </h2>
                        <p className="text-lg text-fm-neutral-600">
                          Understanding your pain points helps us deliver better solutions
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                          What&apos;s your biggest challenge right now? *
                        </label>
                        <textarea
                          value={formData.primaryChallenge || ''}
                          onChange={(e) => updateFormData({ primaryChallenge: e.target.value })}
                          rows={4}
                          style={{ ...inputBase, resize: 'none' as const, ...(errors.primaryChallenge ? { borderColor: '#dc2626' } : {}) }}
                          onFocus={errors.primaryChallenge ? handleErrorFocus : handleFocus}
                          onBlur={errors.primaryChallenge ? handleErrorBlur : handleBlur}
                          placeholder="What problem are you trying to solve?"
                        />
                        {errors.primaryChallenge && <p className="text-red-500 text-sm mt-2 font-medium">{errors.primaryChallenge}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                          Any specific requirements? (Optional)
                        </label>
                        <textarea
                          value={formData.specificRequirements || ''}
                          onChange={(e) => updateFormData({ specificRequirements: e.target.value })}
                          rows={3}
                          style={{ ...inputBase, resize: 'none' as const }}
                          onFocus={handleFocus}
                          onBlur={handleBlur}
                          placeholder="Any specific features, integrations, or technical requirements?"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '24px' }}>
                          Company Size *
                        </label>
                        <div className="space-y-3">
                          {COMPANY_SIZES.map((size) => (
                            <button
                              key={size.value}
                              type="button"
                              onClick={() => updateFormData({ companySize: size.value })}
                              className={`w-full p-6 border-2 rounded-xl text-left hover:bg-fm-magenta-50 hover:border-fm-magenta-300 transition-[background-color,border-color] duration-300
                                ${formData.companySize === size.value
                                  ? 'border-fm-magenta-700 bg-fm-magenta-50 shadow-lg'
                                  : 'border-fm-neutral-200'}`}
                            >
                              <div className="flex items-center space-x-4">
                                <span className="text-xl">{size.icon}</span>
                                <span className="font-semibold text-fm-neutral-900">{size.label}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {errors.companySize && <p className="text-red-500 text-sm mt-3 font-medium">{errors.companySize}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-fm-neutral-800" style={{ marginBottom: '12px' }}>
                          Your Role at the Company (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.jobTitle || ''}
                          onChange={(e) => updateFormData({ jobTitle: e.target.value })}
                          style={inputBase}
                          onFocus={handleFocus}
                          onBlur={handleBlur}
                          placeholder="e.g., CEO, Marketing Manager, Founder"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center border-t border-fm-neutral-200" style={{ marginTop: '48px', paddingTop: '32px' }}>
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-[background-color,color] duration-300 ${
                      currentStep === 1
                        ? 'text-fm-neutral-400 cursor-not-allowed'
                        : 'text-fm-neutral-700 hover:bg-fm-neutral-100'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>

                  {currentStep < 4 ? (
                    <button
                      onClick={nextStep}
                      className="v2-btn v2-btn-magenta v2-btn-lg"
                    >
                      Continue
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={submitForm}
                      disabled={isSubmitting}
                      className="v2-btn v2-btn-magenta v2-btn-lg disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Request
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="v2-paper rounded-2xl p-6 md:p-8 max-w-3xl mx-auto" style={{ marginBottom: '64px' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {[
                  { icon: Zap, label: "24hr Response" },
                  { icon: Target, label: "Custom Strategy" },
                  { icon: BarChart3, label: "Data-Driven" },
                  { icon: Gift, label: "Free Consultation" }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex flex-col items-center">
                      <Icon className="w-6 h-6 text-fm-magenta-600 mb-1.5" />
                      <div className="text-sm text-fm-neutral-600 font-medium">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}

// Thank You Step Component
function ThankYouStep({ formData }: { formData: Partial<LeadInput> }) {
  return (
    <V2PageWrapper>
      <section className="relative z-10 min-h-screen flex items-center justify-center v2-section">
        <div className="v2-container">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 lg:p-16 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-fm-neutral-900 mb-6">
              Thank You, {formData.name}!
            </h1>

            <p className="text-xl text-fm-neutral-600 mb-10 leading-relaxed">
              We&apos;ve received your project details and our expert team will get back to you within
              <span className="font-semibold text-fm-magenta-700"> 24 hours </span>
              with a customized proposal.
            </p>

            {/* What's Next Section */}
            <div className="bg-fm-magenta-50 rounded-2xl p-8 mb-10 text-left">
              <h3 className="font-bold text-fm-neutral-900 mb-6 text-xl text-center">What happens next?</h3>
              <ul className="space-y-4">
                {[
                  { step: 1, title: "Expert Review", desc: "Our team will carefully analyze your requirements and challenges" },
                  { step: 2, title: "Custom Proposal", desc: "We'll create a detailed proposal with timeline, strategy, and transparent pricing" },
                  { step: 3, title: "Discovery Call", desc: "Schedule a call to discuss your project in detail and answer any questions" },
                  { step: 4, title: "Project Kickoff", desc: "Start building your amazing project with our expert team!" }
                ].map((item) => (
                  <li key={item.step} className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-fm-magenta-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-semibold text-sm">{item.step}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-fm-neutral-900">{item.title}</h4>
                      <p className="text-fm-neutral-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-6">
              <Link
                href="/"
                className="v2-btn v2-btn-magenta"
              >
                Return to Homepage
                <ArrowRight className="w-5 h-5" />
              </Link>

              <p className="text-sm text-fm-neutral-500">
                Questions? Email us at{' '}
                <a href="mailto:freakingmindsdigital@gmail.com" className="text-fm-magenta-700 hover:underline font-medium">
                  freakingmindsdigital@gmail.com
                </a>{' '}
                or call us at{' '}
                <a href="tel:+919833257659" className="text-fm-magenta-700 hover:underline font-medium">
                  +91 98332 57659
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}
