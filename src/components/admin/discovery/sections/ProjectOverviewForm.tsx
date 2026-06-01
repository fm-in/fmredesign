/**
 * Project Overview Form
 * Section 2 of Discovery Wizard
 */

'use client';

import { useState } from 'react';
import { DiscoverySession } from '@/lib/admin/discovery-types';
import { Button } from '@/design-system/components/primitives/Button';
import { Plus, Trash2, Target, Calendar } from 'lucide-react';

interface ProjectOverviewFormProps {
  session: DiscoverySession;
  onUpdate: (data: Partial<DiscoverySession>) => void;
}

const PROJECT_TYPES = [
  { value: 'rebrand', label: 'Rebranding' },
  { value: 'website', label: 'Website Development' },
  { value: 'app', label: 'Mobile App' },
  { value: 'marketing_campaign', label: 'Marketing Campaign' },
  { value: 'ecommerce', label: 'E-commerce Platform' },
  { value: 'other', label: 'Other' }
];

const TIMELINE_FLEXIBILITY = [
  { value: 'fixed', label: 'Fixed - Cannot change dates' },
  { value: 'flexible', label: 'Flexible - Some wiggle room' },
  { value: 'asap', label: 'ASAP - As soon as possible' }
];

export function ProjectOverviewForm({ session, onUpdate }: ProjectOverviewFormProps) {
  const [formData, setFormData] = useState(session.projectOverview);

  const handleInputChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate({ projectOverview: updated });
  };

  const handleTimelineChange = (field: string, value: any) => {
    const updatedTimeline = { ...formData.timeline, [field]: value };
    const updated = { ...formData, timeline: updatedTimeline };
    setFormData(updated);
    onUpdate({ projectOverview: updated });
  };

  const handleArrayAdd = (field: keyof typeof formData, newItem: string = '') => {
    if (!newItem.trim() && field !== 'keyObjectives') return;
    
    const currentArray = formData[field] as string[];
    const updated = { ...formData, [field]: [...currentArray, newItem || ''] };
    setFormData(updated);
    onUpdate({ projectOverview: updated });
  };

  const handleArrayUpdate = (field: keyof typeof formData, index: number, value: string) => {
    const currentArray = [...(formData[field] as string[])];
    currentArray[index] = value;
    const updated = { ...formData, [field]: currentArray };
    setFormData(updated);
    onUpdate({ projectOverview: updated });
  };

  const handleArrayRemove = (field: keyof typeof formData, index: number) => {
    const currentArray = (formData[field] as string[]).filter((_, i) => i !== index);
    const updated = { ...formData, [field]: currentArray };
    setFormData(updated);
    onUpdate({ projectOverview: updated });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-fm-magenta-50 rounded-lg">
            <Target className="h-6 w-6 text-fm-magenta-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-fm-neutral-900">Project Overview</h2>
            <p className="text-fm-neutral-600">Define your project scope, objectives, and timeline</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Basic Project Information */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-fm-neutral-900 mb-6">Project Basics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Give your project a name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Project Type *
              </label>
              <select
                value={formData.projectType}
                onChange={(e) => handleInputChange('projectType', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400 appearance-none"
                required
              >
                <option value="">Select project type</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Project Description *
              </label>
              <textarea
                value={formData.projectDescription}
                onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                placeholder="Provide a detailed description of what you want to achieve"
                required
              />
            </div>
          </div>
        </div>

        {/* Key Objectives */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-fm-neutral-900">Key Objectives</h3>
            <Button
              variant="secondary"
              onClick={() => handleArrayAdd('keyObjectives')}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Objective
            </Button>
          </div>

          {formData.keyObjectives.length === 0 ? (
            <div style={{ textAlign: 'center' }} className="py-8 text-fm-neutral-500">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No objectives defined yet</p>
              <p className="text-sm">Add your main project goals and objectives</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.keyObjectives.map((objective, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => handleArrayUpdate('keyObjectives', index, e.target.value)}
                    className="flex-1 h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                    placeholder={`Objective ${index + 1}`}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleArrayRemove('keyObjectives', index)}
                    icon={<Trash2 className="h-4 w-4" />}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-5 w-5 text-fm-magenta-600" />
            <h3 className="text-lg font-semibold text-fm-neutral-900">Timeline</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Preferred Start Date
              </label>
              <input
                type="date"
                value={formData.timeline.startDate}
                onChange={(e) => handleTimelineChange('startDate', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Desired Launch Date *
              </label>
              <input
                type="date"
                value={formData.timeline.desiredLaunch}
                onChange={(e) => handleTimelineChange('desiredLaunch', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fm-neutral-900 mb-1.5">
                Timeline Flexibility *
              </label>
              <select
                value={formData.timeline.flexibility}
                onChange={(e) => handleTimelineChange('flexibility', e.target.value)}
                className="w-full h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400 appearance-none"
                required
              >
                {TIMELINE_FLEXIBILITY.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Project Scope */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-fm-neutral-900">Project Scope</h3>
            <Button
              variant="secondary"
              onClick={() => handleArrayAdd('projectScope')}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Scope Item
            </Button>
          </div>

          <div className="space-y-3">
            {formData.projectScope.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleArrayUpdate('projectScope', index, e.target.value)}
                  className="flex-1 h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                  placeholder="Describe what's included in scope"
                />
                <Button
                  variant="secondary"
                  onClick={() => handleArrayRemove('projectScope', index)}
                  icon={<Trash2 className="h-4 w-4" />}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                />
              </div>
            ))}
            
            {formData.projectScope.length === 0 && (
              <p style={{ textAlign: 'center' }} className="text-fm-neutral-500 py-4">
                Define what will be included in your project scope
              </p>
            )}
          </div>
        </div>

        {/* Success Metrics */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-fm-neutral-900">Success Metrics</h3>
            <Button
              variant="secondary"
              onClick={() => handleArrayAdd('successMetrics')}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Metric
            </Button>
          </div>

          <div className="space-y-3">
            {formData.successMetrics.map((metric, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={metric}
                  onChange={(e) => handleArrayUpdate('successMetrics', index, e.target.value)}
                  className="flex-1 h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                  placeholder="How will you measure success?"
                />
                <Button
                  variant="secondary"
                  onClick={() => handleArrayRemove('successMetrics', index)}
                  icon={<Trash2 className="h-4 w-4" />}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                />
              </div>
            ))}
            
            {formData.successMetrics.length === 0 && (
              <p style={{ textAlign: 'center' }} className="text-fm-neutral-500 py-4">
                Define how you'll measure project success (KPIs, metrics, goals)
              </p>
            )}
          </div>
        </div>

        {/* Constraints */}
        <div className="bg-white rounded-xl border border-fm-neutral-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-fm-neutral-900">Constraints & Limitations</h3>
            <Button
              variant="secondary"
              onClick={() => handleArrayAdd('constraints')}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Constraint
            </Button>
          </div>

          <div className="space-y-3">
            {formData.constraints.map((constraint, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={constraint}
                  onChange={(e) => handleArrayUpdate('constraints', index, e.target.value)}
                  className="flex-1 h-12 px-3 py-2 text-base bg-fm-neutral-50 border border-fm-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:ring-offset-2 transition-all duration-200 hover:border-fm-magenta-400"
                  placeholder="Any limitations or constraints we should know about?"
                />
                <Button
                  variant="secondary"
                  onClick={() => handleArrayRemove('constraints', index)}
                  icon={<Trash2 className="h-4 w-4" />}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                />
              </div>
            ))}
            
            {formData.constraints.length === 0 && (
              <p style={{ textAlign: 'center' }} className="text-fm-neutral-500 py-4">
                Any technical, legal, or business constraints? (Optional)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}