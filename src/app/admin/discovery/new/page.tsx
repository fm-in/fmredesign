/**
 * Discovery Wizard Page
 * Multi-step discovery process for client analysis
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DiscoveryWizard } from '@/components/admin/discovery/DiscoveryWizard';
import { DiscoverySession, DiscoveryTemplate, DISCOVERY_TEMPLATES } from '@/lib/admin/discovery-types';
import { DiscoveryService } from '@/lib/admin/discovery-service';
import { Button } from '@/design-system/components/primitives/Button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { adminToast } from '@/lib/admin/toast';
import { ArrowLeft, FileText, Users, Target } from 'lucide-react';

export default function NewDiscoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const leadId = searchParams.get('leadId');
  const templateParam = searchParams.get('template') as DiscoveryTemplate;
  
  const [currentSession, setCurrentSession] = useState<DiscoverySession | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DiscoveryTemplate>(templateParam || 'custom');
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateSelection, setShowTemplateSelection] = useState(!templateParam);

  useEffect(() => {
    // Load existing draft session if available
    const loadDraftSession = async () => {
      if (clientId) {
        try {
          const sessions = await DiscoveryService.getClientDiscoverySessions(clientId);
          const draftSession = sessions.find(s => s.status === 'draft');
          if (draftSession) {
            setCurrentSession(draftSession);
            setShowTemplateSelection(false);
          }
        } catch (error) {
          console.error('Error loading draft sessions:', error);
          // Continue with template selection if loading fails
        }
      }
      // If no clientId, we'll start fresh with template selection
    };

    loadDraftSession();
  }, [clientId]);

  const handleTemplateSelect = async (template: DiscoveryTemplate) => {
    setIsCreating(true);
    try {
      // Create discovery session with or without client ID
      const newSession = await DiscoveryService.createDiscoverySession(clientId || null, template, leadId ?? undefined);
      setCurrentSession(newSession);
      setShowTemplateSelection(false);
    } catch (error) {
      console.error('Error creating discovery session:', error);
      adminToast.error('Failed to create discovery session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSessionUpdate = (updatedSession: DiscoverySession) => {
    setCurrentSession(updatedSession);
  };

  const handleSessionComplete = () => {
    router.push(`/admin/discovery/${currentSession?.id}/report`);
  };

  if (showTemplateSelection) {
    return (
      <div className="min-h-screen bg-fm-neutral-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.push('/admin/clients')}
            >
              Back to Clients
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-fm-neutral-900">Start Discovery Process</h1>
              <p className="text-fm-neutral-600">
                {clientId ? 'Choose a template to begin client discovery' : 'Choose a template to begin discovery (client can be assigned later)'}
              </p>
            </div>
          </div>

          {/* Template Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(DISCOVERY_TEMPLATES).map(([key, template]) => (
              <div
                key={key}
                className="bg-white rounded-xl border border-fm-neutral-200 p-6 hover:border-fm-magenta-300 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleTemplateSelect(key as DiscoveryTemplate)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-fm-magenta-50 rounded-lg">
                    {key === 'ecommerce' && <FileText className="h-6 w-6 text-fm-magenta-600" />}
                    {key === 'saas' && <Target className="h-6 w-6 text-fm-magenta-600" />}
                    {key === 'local_business' && <Users className="h-6 w-6 text-fm-magenta-600" />}
                    {key === 'enterprise' && <FileText className="h-6 w-6 text-fm-magenta-600" />}
                    {key === 'startup' && <Target className="h-6 w-6 text-fm-magenta-600" />}
                    {key === 'custom' && <FileText className="h-6 w-6 text-fm-magenta-600" />}
                  </div>
                  <span className="text-xs bg-fm-neutral-100 px-2 py-1 rounded-full">
                    {template.sections.length} sections
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-fm-neutral-900 mb-2">
                  {template.name}
                </h3>
                <p className="text-fm-neutral-600 text-sm mb-4">
                  {template.description}
                </p>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-fm-neutral-500">
                    Sections: {template.sections.join(', ')}
                  </span>
                  <Button size="sm" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Select'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Start Info */}
          <div className="mt-12 bg-fm-magenta-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-fm-neutral-900 mb-3">
              Discovery Process Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-fm-neutral-700">
              <div>
                <strong>Section 1-3:</strong> Company & Project Basics
                <br />
                <strong>Section 4-6:</strong> Current State & Competition
                <br />
                <strong>Section 7-8:</strong> Budget & Technical Requirements
              </div>
              <div>
                <strong>Section 9:</strong> Content & Creative Strategy
                <br />
                <strong>Section 10:</strong> Next Steps & Planning
                <br />
                <strong>Features:</strong> Auto-save, resume anytime, PDF report
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return <LoadingSpinner size="lg" message="Loading discovery session..." fullscreen />;
  }

  return (
    <div className="min-h-screen bg-fm-neutral-50">
      <DiscoveryWizard
        session={currentSession}
        onUpdate={handleSessionUpdate}
        onComplete={handleSessionComplete}
      />
    </div>
  );
}