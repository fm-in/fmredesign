/**
 * Talent Application Form
 * Multi-step form for joining CreativeMinds network
 * 4 steps: About You, Your Expertise, Online Presence, Availability & Pricing
 */

'use client';

import { useState } from 'react';
import {
  TalentApplication,
  TalentCategory,
  TALENT_CATEGORIES,
  EXPERIENCE_LEVELS,
  POPULAR_SKILLS,
  POPULAR_TOOLS,
  LANGUAGES,
  CURRENCIES,
  PROJECT_COMMITMENT_OPTIONS,
  PricingInfo,
  PortfolioLinks,
} from '@/lib/admin/talent-types';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Briefcase,
  Globe,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface TalentApplicationFormProps {
  onSubmit: (application: TalentApplication) => Promise<void>;
  onCancel: () => void;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormErrors {
  [key: string]: string;
}

export function TalentApplicationForm({ onSubmit, onCancel }: TalentApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<Partial<TalentApplication>>({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: { city: '', state: '', country: 'India' },
      bio: '',
      languages: ['English'],
    },
    professionalDetails: {
      category: 'creative_design',
      subcategories: [],
      experienceLevel: 'intermediate',
      yearsOfExperience: 0,
      skills: [],
      tools: [],
      certifications: [],
      education: [],
      workExperience: [],
    },
    portfolioLinks: {
      websiteUrl: '',
      workSampleUrls: ['', '', ''],
    },
    portfolio: [],
    socialMedia: {},
    availability: {
      currentStatus: 'available',
      hoursPerWeek: 40,
      preferredWorkingHours: {
        timezone: 'Asia/Kolkata',
        startTime: '09:00',
        endTime: '18:00',
      },
      unavailableDates: [],
      projectCommitment: 'both',
      remoteWork: true,
      travelWillingness: false,
    },
    preferences: {
      projectTypes: [],
      industries: [],
      clientTypes: [],
      communicationStyle: 'mixed',
      paymentTerms: [],
      minimumProjectValue: 10000,
      currency: 'INR',
    },
    pricing: {
      hourlyRate: { min: 0, max: 0 },
      projectRate: { min: 0, max: 0 },
      retainerRate: { min: 0, max: 0 },
      openToNegotiation: true,
    },
  });

  const updateData = (updates: Partial<TalentApplication>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidUrl = (url: string) => {
    if (!url) return true; // empty is OK for optional fields
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};
    const pi = formData.personalInfo!;
    const pd = formData.professionalDetails!;
    const pl = formData.portfolioLinks!;
    const avail = formData.availability!;
    const pricing = formData.pricing!;

    if (step === 1) {
      if (!pi.fullName.trim()) newErrors.fullName = 'Name is required';
      if (!pi.email.trim()) newErrors.email = 'Email is required';
      else if (!isValidEmail(pi.email)) newErrors.email = 'Enter a valid email';
      if (!pi.phone.trim()) newErrors.phone = 'Phone is required';
      if (!pi.location.city.trim()) newErrors.city = 'City is required';
      if (!pi.location.state.trim()) newErrors.state = 'State is required';
      if (!pi.bio.trim()) newErrors.bio = 'Bio is required';
      else if (pi.bio.trim().length < 20) newErrors.bio = 'Bio must be at least 20 characters';
    }

    if (step === 2) {
      if (pd.subcategories.length === 0) newErrors.subcategories = 'Select at least one subcategory';
      if (!pd.skills || pd.skills.length === 0) newErrors.skills = 'Select at least one skill';
      if (pd.yearsOfExperience <= 0) newErrors.yearsOfExperience = 'Enter your years of experience';
      if (pl.websiteUrl && !isValidUrl(pl.websiteUrl)) newErrors.portfolioWebsite = 'Enter a valid URL';
      pl.workSampleUrls?.forEach((url, i) => {
        if (url && !isValidUrl(url)) newErrors[`workSample${i}`] = 'Enter a valid URL';
      });
    }

    if (step === 3) {
      const sm = formData.socialMedia || {};
      if (sm.linkedin?.profileUrl && !sm.linkedin.profileUrl.includes('linkedin.com'))
        newErrors.linkedin = 'Must be a LinkedIn URL';
      if (sm.behance?.profileUrl && !sm.behance.profileUrl.includes('behance.net'))
        newErrors.behance = 'Must be a Behance URL';
      if (sm.dribbble?.profileUrl && !sm.dribbble.profileUrl.includes('dribbble.com'))
        newErrors.dribbble = 'Must be a Dribbble URL';
    }

    if (step === 4) {
      if (!avail.hoursPerWeek || avail.hoursPerWeek <= 0)
        newErrors.hoursPerWeek = 'Enter hours per week';
      const hasAnyRate =
        (pricing.hourlyRate.min > 0 || pricing.hourlyRate.max > 0) ||
        (pricing.projectRate.min > 0 || pricing.projectRate.max > 0) ||
        (pricing.retainerRate.min > 0 || pricing.retainerRate.max > 0);
      if (!hasAnyRate) newErrors.pricing = 'Fill at least one pricing rate';
      if (pricing.hourlyRate.min > 0 && pricing.hourlyRate.max > 0 && pricing.hourlyRate.min > pricing.hourlyRate.max)
        newErrors.hourlyRate = 'Min must be less than max';
      if (pricing.projectRate.min > 0 && pricing.projectRate.max > 0 && pricing.projectRate.min > pricing.projectRate.max)
        newErrors.projectRate = 'Min must be less than max';
      if (pricing.retainerRate.min > 0 && pricing.retainerRate.max > 0 && pricing.retainerRate.min > pricing.retainerRate.max)
        newErrors.retainerRate = 'Min must be less than max';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setErrors({});
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setSubmitStatus('submitting');
    setSubmitError('');
    try {
      await onSubmit(formData as TalentApplication);
      setSubmitStatus('success');
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitStatus('error');
      setSubmitError('Failed to submit application. Please try again.');
    }
  };

  const steps = [
    { number: 1, title: 'About You', icon: User },
    { number: 2, title: 'Your Expertise', icon: Briefcase },
    { number: 3, title: 'Online Presence', icon: Globe },
    { number: 4, title: 'Availability & Pricing', icon: DollarSign },
  ];

  const totalSteps = steps.length;

  if (submitStatus === 'success') {
    return (
      <div className="max-w-lg mx-auto" style={{ textAlign: 'center' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <div className="w-16 h-16 bg-site-raised rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-site-text" />
          </div>
          <h2 className="text-2xl font-bold text-site-text mb-3">Application Submitted!</h2>
          <p className="text-site-muted mb-6">
            Thank you for applying to join CreativeMinds. Our team will review your application within 24-48 hours.
          </p>
          <button onClick={onCancel} className="site-button">
            Back to CreativeMinds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl">
        <div className="p-5 sm:p-8 md:p-10">
          {/* Progress Circles */}
          <div style={{ marginBottom: '40px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              {steps.map((step) => (
                <div key={step.number} className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-[background-color,border-color,color,box-shadow] duration-300 font-semibold
                      ${currentStep >= step.number
                        ? 'bg-site-accent border-site-accent text-white shadow-lg'
                        : 'border-site-line text-site-muted bg-white'}`}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <span className="text-xs sm:text-sm">{step.number}</span>
                    )}
                  </div>
                  <span className={`text-[11px] sm:text-xs mt-1 sm:mt-2 font-medium ${
                    currentStep >= step.number ? 'text-site-accent' : 'text-site-muted'
                  }`}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-full bg-site-raised rounded-full" style={{ height: '6px' }}>
              <div
                className="bg-gradient-to-r rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`, height: '6px' }}
              />
            </div>
          </div>

          {/* Submit error banner */}
          {submitStatus === 'error' && submitError && (
            <div className="mb-6 p-4 bg-site-raised border border-site-accent rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-site-accent flex-shrink-0" />
              <p className="text-sm text-site-accent">{submitError}</p>
            </div>
          )}

          {currentStep === 1 && (
            <PersonalInfoStep formData={formData} updateData={updateData} errors={errors} />
          )}
          {currentStep === 2 && (
            <ExpertiseStep formData={formData} updateData={updateData} errors={errors} />
          )}
          {currentStep === 3 && (
            <OnlinePresenceStep formData={formData} updateData={updateData} errors={errors} />
          )}
          {currentStep === 4 && (
            <AvailabilityPricingStep formData={formData} updateData={updateData} errors={errors} />
          )}

          {/* Navigation */}
          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center mt-8 pt-8 border-t border-site-line gap-3">
            <button
              onClick={currentStep === 1 ? onCancel : handlePrev}
              className="flex items-center justify-center gap-2 px-6 py-3 text-sm border border-site-line rounded-lg hover:bg-site-raised transition-colors min-h-[48px]"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>

            {currentStep === totalSteps ? (
              <button
                onClick={handleSubmit}
                disabled={submitStatus === 'submitting'}
                className="site-button disabled:opacity-60 min-h-[48px]"
              >
                {submitStatus === 'submitting' ? 'Submitting...' : 'Submit Application'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-site-accent text-white text-sm font-medium rounded-lg hover:bg-site-accent transition-colors min-h-[48px]"
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared helpers ─── */

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-site-accent text-xs mt-1">{message}</p>;
}

const inputClass =
  'w-full px-4 py-3 border border-site-line rounded-lg focus:ring-2 focus:ring-site-accent focus:border-site-accent text-base';
const inputErrorClass =
  'w-full px-4 py-3 border border-site-accent rounded-lg focus:ring-2 focus:ring-red-400 focus:border-site-accent text-base';

interface StepInternalProps {
  formData: Partial<TalentApplication>;
  updateData: (updates: Partial<TalentApplication>) => void;
  errors: FormErrors;
}

/* ─── Step 1: About You ─── */

function PersonalInfoStep({ formData, updateData, errors }: StepInternalProps) {
  const pi = formData.personalInfo!;

  const handleChange = (field: string, value: any) => {
    updateData({ personalInfo: { ...pi, [field]: value } });
  };

  const handleLocationChange = (field: string, value: string) => {
    updateData({
      personalInfo: { ...pi, location: { ...pi.location, [field]: value } },
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-site-text mb-2">About You</h2>
        <p className="text-site-muted">Tell us about yourself</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">Full Name *</label>
          <input
            type="text"
            value={pi.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className={errors.fullName ? inputErrorClass : inputClass}
            placeholder="Enter your full name"
          />
          <FieldError message={errors.fullName} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">Email *</label>
            <input
              type="email"
              value={pi.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={errors.email ? inputErrorClass : inputClass}
              placeholder="your@email.com"
            />
            <FieldError message={errors.email} />
          </div>
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">Phone *</label>
            <input
              type="tel"
              value={pi.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={errors.phone ? inputErrorClass : inputClass}
              placeholder="+91 98765 43210"
            />
            <FieldError message={errors.phone} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">City *</label>
            <input
              type="text"
              value={pi.location.city}
              onChange={(e) => handleLocationChange('city', e.target.value)}
              className={errors.city ? inputErrorClass : inputClass}
              placeholder="Mumbai"
            />
            <FieldError message={errors.city} />
          </div>
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">State *</label>
            <input
              type="text"
              value={pi.location.state}
              onChange={(e) => handleLocationChange('state', e.target.value)}
              className={errors.state ? inputErrorClass : inputClass}
              placeholder="Maharashtra"
            />
            <FieldError message={errors.state} />
          </div>
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">Country</label>
            <select
              value={pi.location.country}
              onChange={(e) => handleLocationChange('country', e.target.value)}
              className={inputClass}
            >
              <option value="India">India</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">
            Professional Bio * <span className="text-site-muted font-normal">(min 20 characters)</span>
          </label>
          <textarea
            value={pi.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            rows={4}
            className={errors.bio ? inputErrorClass : inputClass}
            placeholder="Tell us about your experience, skills, and what makes you unique..."
          />
          <FieldError message={errors.bio} />
        </div>

        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">Languages</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <label key={lang} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={pi.languages.includes(lang)}
                  onChange={(e) => {
                    const languages = e.target.checked
                      ? [...pi.languages, lang]
                      : pi.languages.filter((l) => l !== lang);
                    handleChange('languages', languages);
                  }}
                  className="rounded"
                />
                {lang}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2: Your Expertise ─── */

function ExpertiseStep({ formData, updateData, errors }: StepInternalProps) {
  const pd = formData.professionalDetails!;
  const pl = formData.portfolioLinks || { websiteUrl: '', workSampleUrls: ['', '', ''] };

  const handleCategoryChange = (category: TalentCategory) => {
    updateData({
      professionalDetails: { ...pd, category, subcategories: [] },
    });
  };

  const handleSkillToggle = (skill: string) => {
    const currentSkills = pd.skills || [];
    const skillExists = currentSkills.find((s) => s.name === skill);
    const updatedSkills = skillExists
      ? currentSkills.filter((s) => s.name !== skill)
      : [
          ...currentSkills,
          { name: skill, proficiency: 'intermediate' as const, yearsOfExperience: 1, verified: false },
        ];
    updateData({ professionalDetails: { ...pd, skills: updatedSkills } });
  };

  const handleToolToggle = (tool: string) => {
    const currentTools = pd.tools || [];
    const updatedTools = currentTools.includes(tool)
      ? currentTools.filter((t) => t !== tool)
      : [...currentTools, tool];
    updateData({ professionalDetails: { ...pd, tools: updatedTools } });
  };

  const updateWorkSample = (index: number, value: string) => {
    const urls = [...(pl.workSampleUrls || ['', '', ''])];
    urls[index] = value;
    updateData({ portfolioLinks: { ...pl, workSampleUrls: urls } });
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-site-text mb-2">Your Expertise</h2>
        <p className="text-site-muted">Share your skills, tools, and portfolio</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">
            Primary Category *
          </label>
          <select
            value={pd.category}
            onChange={(e) => handleCategoryChange(e.target.value as TalentCategory)}
            className={inputClass}
          >
            {Object.entries(TALENT_CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">
            Subcategories *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 sm:max-h-40 overflow-y-auto border border-site-line rounded-lg p-4">
            {TALENT_CATEGORIES[pd.category].subcategories.map((sub) => (
              <label key={sub} className="flex items-center text-sm gap-2.5 min-h-[44px] px-1">
                <input
                  type="checkbox"
                  checked={pd.subcategories.includes(sub)}
                  onChange={(e) => {
                    const subcategories = e.target.checked
                      ? [...pd.subcategories, sub]
                      : pd.subcategories.filter((s) => s !== sub);
                    updateData({ professionalDetails: { ...pd, subcategories } });
                  }}
                  className="rounded"
                />
                {sub}
              </label>
            ))}
          </div>
          <FieldError message={errors.subcategories} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">
              Experience Level *
            </label>
            <select
              value={pd.experienceLevel}
              onChange={(e) =>
                updateData({
                  professionalDetails: { ...pd, experienceLevel: e.target.value as any },
                })
              }
              className={inputClass}
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">
              Years of Experience *
            </label>
            <input
              type="number"
              value={pd.yearsOfExperience || ''}
              onChange={(e) =>
                updateData({
                  professionalDetails: { ...pd, yearsOfExperience: parseInt(e.target.value) || 0 },
                })
              }
              min="0"
              max="50"
              className={errors.yearsOfExperience ? inputErrorClass : inputClass}
            />
            <FieldError message={errors.yearsOfExperience} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">Core Skills *</label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SKILLS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => handleSkillToggle(skill)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors min-h-[44px] ${
                  pd.skills?.find((s) => s.name === skill)
                    ? 'bg-site-raised border-site-accent text-site-accent'
                    : 'bg-site-raised border-site-line text-site-text hover:bg-site-raised'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
          <FieldError message={errors.skills} />
        </div>

        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">Tools</label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TOOLS.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => handleToolToggle(tool)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors min-h-[44px] ${
                  pd.tools?.includes(tool)
                    ? 'bg-site-raised border-site-line text-site-text'
                    : 'bg-site-raised border-site-line text-site-text hover:bg-site-raised'
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-site-line pt-6">
          <h3 className="text-sm font-semibold text-site-text mb-3">Portfolio Links</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-site-text mb-1.5">
                Portfolio Website URL
              </label>
              <input
                type="url"
                value={pl.websiteUrl}
                onChange={(e) =>
                  updateData({ portfolioLinks: { ...pl, websiteUrl: e.target.value } })
                }
                className={errors.portfolioWebsite ? inputErrorClass : inputClass}
                placeholder="https://yourportfolio.com"
              />
              <FieldError message={errors.portfolioWebsite} />
            </div>

            {[0, 1, 2].map((i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-site-text mb-1.5">
                  Work Sample URL {i + 1}
                </label>
                <input
                  type="url"
                  value={pl.workSampleUrls?.[i] || ''}
                  onChange={(e) => updateWorkSample(i, e.target.value)}
                  className={errors[`workSample${i}`] ? inputErrorClass : inputClass}
                  placeholder="https://example.com/project"
                />
                <FieldError message={errors[`workSample${i}`]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 3: Online Presence ─── */

function OnlinePresenceStep({ formData, updateData, errors }: StepInternalProps) {
  const sm = formData.socialMedia || {};

  const updateSocial = (updates: Partial<typeof sm>) => {
    updateData({ socialMedia: { ...sm, ...updates } });
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-site-text mb-2">Online Presence</h2>
        <p className="text-site-muted">Help us understand your online reach (all optional)</p>
      </div>

      <div className="space-y-5">
        {/* Instagram */}
        <div className="p-4 border border-site-line rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-site-text flex items-center gap-2">
            <span className="w-5 h-5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded inline-block"></span>
            Instagram
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-site-muted mb-1">Handle</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-site-line bg-site-raised text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={sm.instagram?.handle || ''}
                  onChange={(e) =>
                    updateSocial({
                      instagram: {
                        handle: e.target.value,
                        followers: sm.instagram?.followers || 0,
                        engagementRate: 0,
                        lastUpdated: '',
                        verified: false,
                      },
                    })
                  }
                  className="flex-1 px-3 py-2 border border-site-line rounded-r-lg focus:ring-2 focus:ring-site-accent focus:border-site-accent text-sm"
                  placeholder="your_handle"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-site-muted mb-1">Followers (approx)</label>
              <input
                type="number"
                value={sm.instagram?.followers || ''}
                onChange={(e) =>
                  updateSocial({
                    instagram: {
                      handle: sm.instagram?.handle || '',
                      followers: parseInt(e.target.value) || 0,
                      engagementRate: 0,
                      lastUpdated: '',
                      verified: false,
                    },
                  })
                }
                className={inputClass}
                placeholder="1000"
              />
            </div>
          </div>
        </div>

        {/* YouTube */}
        <div className="p-4 border border-site-line rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-site-text flex items-center gap-2">
            <span className="w-5 h-5 bg-site-accent rounded inline-flex items-center justify-center text-white text-[10px] font-bold">
              &#9654;
            </span>
            YouTube
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-site-muted mb-1">Channel URL</label>
              <input
                type="url"
                value={sm.youtube?.channel || ''}
                onChange={(e) =>
                  updateSocial({
                    youtube: {
                      channel: e.target.value,
                      subscribers: sm.youtube?.subscribers || 0,
                      totalViews: 0,
                      averageViews: 0,
                      lastUpdated: '',
                      verified: false,
                    },
                  })
                }
                className={inputClass}
                placeholder="https://youtube.com/@channel"
              />
            </div>
            <div>
              <label className="block text-xs text-site-muted mb-1">Subscribers (approx)</label>
              <input
                type="number"
                value={sm.youtube?.subscribers || ''}
                onChange={(e) =>
                  updateSocial({
                    youtube: {
                      channel: sm.youtube?.channel || '',
                      subscribers: parseInt(e.target.value) || 0,
                      totalViews: 0,
                      averageViews: 0,
                      lastUpdated: '',
                      verified: false,
                    },
                  })
                }
                className={inputClass}
                placeholder="5000"
              />
            </div>
          </div>
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">
            LinkedIn Profile URL
          </label>
          <input
            type="url"
            value={sm.linkedin?.profileUrl || ''}
            onChange={(e) =>
              updateSocial({
                linkedin: { profileUrl: e.target.value, connections: 0, lastUpdated: '', verified: false },
              })
            }
            className={errors.linkedin ? inputErrorClass : inputClass}
            placeholder="https://linkedin.com/in/yourprofile"
          />
          <FieldError message={errors.linkedin} />
        </div>

        {/* Behance */}
        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">
            Behance Profile URL
          </label>
          <input
            type="url"
            value={sm.behance?.profileUrl || ''}
            onChange={(e) =>
              updateSocial({
                behance: {
                  profileUrl: e.target.value,
                  followers: 0,
                  projects: 0,
                  views: 0,
                  lastUpdated: '',
                  verified: false,
                },
              })
            }
            className={errors.behance ? inputErrorClass : inputClass}
            placeholder="https://behance.net/yourprofile"
          />
          <FieldError message={errors.behance} />
        </div>

        {/* Dribbble */}
        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">
            Dribbble Profile URL
          </label>
          <input
            type="url"
            value={sm.dribbble?.profileUrl || ''}
            onChange={(e) =>
              updateSocial({
                dribbble: {
                  profileUrl: e.target.value,
                  followers: 0,
                  likes: 0,
                  shots: 0,
                  lastUpdated: '',
                  verified: false,
                },
              })
            }
            className={errors.dribbble ? inputErrorClass : inputClass}
            placeholder="https://dribbble.com/yourprofile"
          />
          <FieldError message={errors.dribbble} />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: Availability & Pricing ─── */

function AvailabilityPricingStep({ formData, updateData, errors }: StepInternalProps) {
  const avail = formData.availability!;
  const prefs = formData.preferences!;
  const pricing = formData.pricing!;

  const updatePricingField = (
    rateType: 'hourlyRate' | 'projectRate' | 'retainerRate',
    field: 'min' | 'max',
    value: number
  ) => {
    updateData({
      pricing: {
        ...pricing,
        [rateType]: { ...pricing[rateType], [field]: value },
      },
    });
  };

  const currencySymbol = CURRENCIES.find((c) => c.code === prefs.currency)?.symbol || '₹';

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-site-text mb-2">Availability & Pricing</h2>
        <p className="text-site-muted">Set your availability and rate ranges</p>
      </div>

      <div className="space-y-6">
        {/* Availability section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">
              Current Status
            </label>
            <select
              value={avail.currentStatus}
              onChange={(e) =>
                updateData({ availability: { ...avail, currentStatus: e.target.value as any } })
              }
              className={inputClass}
            >
              <option value="available">Available</option>
              <option value="partially_available">Partially Available</option>
              <option value="busy">Busy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">
              Hours per Week *
            </label>
            <input
              type="number"
              value={avail.hoursPerWeek || ''}
              onChange={(e) =>
                updateData({
                  availability: { ...avail, hoursPerWeek: parseInt(e.target.value) || 0 },
                })
              }
              min="1"
              max="80"
              className={errors.hoursPerWeek ? inputErrorClass : inputClass}
            />
            <FieldError message={errors.hoursPerWeek} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="remoteWork"
            checked={avail.remoteWork}
            onChange={(e) =>
              updateData({ availability: { ...avail, remoteWork: e.target.checked } })
            }
            className="rounded"
          />
          <label htmlFor="remoteWork" className="text-sm font-medium text-site-text">
            Available for remote work
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">
            Project Commitment
          </label>
          <select
            value={avail.projectCommitment}
            onChange={(e) =>
              updateData({
                availability: { ...avail, projectCommitment: e.target.value as any },
              })
            }
            className={inputClass}
          >
            {PROJECT_COMMITMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">
              Minimum Project Value
            </label>
            <input
              type="number"
              value={prefs.minimumProjectValue || ''}
              onChange={(e) =>
                updateData({
                  preferences: { ...prefs, minimumProjectValue: parseInt(e.target.value) || 0 },
                })
              }
              className={inputClass}
              placeholder="10000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-site-text mb-1.5">Currency</label>
            <select
              value={prefs.currency}
              onChange={(e) =>
                updateData({ preferences: { ...prefs, currency: e.target.value } })
              }
              className={inputClass}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-site-text mb-1.5">
            Communication Style
          </label>
          <select
            value={prefs.communicationStyle}
            onChange={(e) =>
              updateData({
                preferences: { ...prefs, communicationStyle: e.target.value as any },
              })
            }
            className={inputClass}
          >
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        {/* Pricing section */}
        <div className="border-t border-site-line pt-6">
          <h3 className="text-sm font-semibold text-site-text mb-1">
            Pricing Rates *
          </h3>
          <p className="text-xs text-site-muted mb-4">
            Fill at least one rate range ({currencySymbol})
          </p>
          {errors.pricing && <FieldError message={errors.pricing} />}

          <div className="space-y-4">
            {/* Hourly */}
            <div>
              <label className="block text-sm font-medium text-site-text mb-1.5">
                Hourly Rate ({currencySymbol})
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={pricing.hourlyRate.min || ''}
                  onChange={(e) => updatePricingField('hourlyRate', 'min', parseInt(e.target.value) || 0)}
                  className={errors.hourlyRate ? inputErrorClass : inputClass}
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={pricing.hourlyRate.max || ''}
                  onChange={(e) => updatePricingField('hourlyRate', 'max', parseInt(e.target.value) || 0)}
                  className={errors.hourlyRate ? inputErrorClass : inputClass}
                  placeholder="Max"
                />
              </div>
              <FieldError message={errors.hourlyRate} />
            </div>

            {/* Per-project */}
            <div>
              <label className="block text-sm font-medium text-site-text mb-1.5">
                Per-project Rate ({currencySymbol})
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={pricing.projectRate.min || ''}
                  onChange={(e) => updatePricingField('projectRate', 'min', parseInt(e.target.value) || 0)}
                  className={errors.projectRate ? inputErrorClass : inputClass}
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={pricing.projectRate.max || ''}
                  onChange={(e) => updatePricingField('projectRate', 'max', parseInt(e.target.value) || 0)}
                  className={errors.projectRate ? inputErrorClass : inputClass}
                  placeholder="Max"
                />
              </div>
              <FieldError message={errors.projectRate} />
            </div>

            {/* Monthly retainer */}
            <div>
              <label className="block text-sm font-medium text-site-text mb-1.5">
                Monthly Retainer ({currencySymbol})
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={pricing.retainerRate.min || ''}
                  onChange={(e) => updatePricingField('retainerRate', 'min', parseInt(e.target.value) || 0)}
                  className={errors.retainerRate ? inputErrorClass : inputClass}
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={pricing.retainerRate.max || ''}
                  onChange={(e) => updatePricingField('retainerRate', 'max', parseInt(e.target.value) || 0)}
                  className={errors.retainerRate ? inputErrorClass : inputClass}
                  placeholder="Max"
                />
              </div>
              <FieldError message={errors.retainerRate} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <input
              type="checkbox"
              id="negotiation"
              checked={pricing.openToNegotiation}
              onChange={(e) =>
                updateData({ pricing: { ...pricing, openToNegotiation: e.target.checked } })
              }
              className="rounded"
            />
            <label htmlFor="negotiation" className="text-sm text-site-text">
              Open to negotiation on rates
            </label>
          </div>
        </div>

        {/* Ready box */}
        <div className="bg-site-raised border border-site-accent rounded-xl p-6 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="h-5 w-5 text-site-accent" />
            <h3 className="text-lg font-semibold text-site-accent">Ready to Submit!</h3>
          </div>
          <p className="text-site-accent mb-4">
            Review your information and submit your application.
          </p>
          <div className="text-sm text-site-accent">
            <strong>What happens next:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Application review (24-48 hours)</li>
              <li>Portfolio verification call</li>
              <li>Welcome to CreativeMinds network</li>
              <li>Start receiving project opportunities</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
