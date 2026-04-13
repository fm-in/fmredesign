'use client';

import { useRouter } from 'next/navigation';
import { DashboardCard as Card, CardContent, CardHeader, CardTitle } from '@/design-system';
import type { ClientProfile } from '@/hooks/admin/useClientDetail';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  Users,
  TrendingUp,
  Receipt,
  PenSquare,
  FolderPlus,
  LifeBuoy,
  MessageSquare,
  Zap,
  Calendar,
  Send,
  Plus,
  Trash2,
} from 'lucide-react';
import { DashboardButton } from '@/design-system';
import { BrandIdentitySection } from './BrandIdentitySection';
import { AutoInvoiceSection } from './AutoInvoiceSection';

interface OverviewTabProps {
  clientProfile: ClientProfile;
  onProfileUpdate?: () => void;
  onTabChange?: (tab: string) => void;
}

export function OverviewTab({ clientProfile, onProfileUpdate, onTabChange }: OverviewTabProps) {
  const router = useRouter();

  const quickActions = [
    {
      label: 'Generate Invoice',
      icon: Receipt,
      onClick: () =>
        router.push(
          `/admin/invoice?clientId=${clientProfile.id}&clientName=${encodeURIComponent(clientProfile.name)}`
        ),
    },
    {
      label: 'Create Content',
      icon: PenSquare,
      onClick: () => router.push(`/admin/content/new?clientId=${clientProfile.id}`),
    },
    {
      label: 'New Project',
      icon: FolderPlus,
      onClick: () => router.push(`/admin/projects/new?clientId=${clientProfile.id}`),
    },
    {
      label: 'Raise Ticket',
      icon: LifeBuoy,
      onClick: () => onTabChange?.('support'),
    },
    {
      label: 'Send Message',
      icon: MessageSquare,
      onClick: () => onTabChange?.('messages'),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-fm-neutral-500 uppercase tracking-wider">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-fm-neutral-700 bg-fm-neutral-50 border border-fm-neutral-200 rounded-lg hover:bg-fm-magenta-50 hover:text-fm-magenta-700 hover:border-fm-magenta-200 transition-colors"
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientProfile.website && (
              <div className="flex items-center">
                <Globe className="h-4 w-4 text-fm-neutral-400 mr-3" />
                <a
                  href={clientProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fm-magenta-600 hover:underline"
                >
                  {clientProfile.website}
                </a>
              </div>
            )}

            <div className="flex items-start">
              <MapPin className="h-4 w-4 text-fm-neutral-400 mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-fm-neutral-900">
                  {clientProfile.headquarters.city}, {clientProfile.headquarters.state}
                </p>
                <p className="text-sm text-fm-neutral-600">{clientProfile.headquarters.country}</p>
              </div>
            </div>

            {clientProfile.description && (
              <div>
                <p className="text-sm text-fm-neutral-600">{clientProfile.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Primary Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-fm-neutral-900">{clientProfile.primaryContact.name}</p>
              <p className="text-sm text-fm-neutral-600">{clientProfile.primaryContact.role}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-fm-neutral-400 mr-3" />
                <a
                  href={`mailto:${clientProfile.primaryContact.email}`}
                  className="text-fm-magenta-600 hover:underline"
                >
                  {clientProfile.primaryContact.email}
                </a>
              </div>

              {clientProfile.primaryContact.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-fm-neutral-400 mr-3" />
                  <a
                    href={`tel:${clientProfile.primaryContact.phone}`}
                    className="text-fm-magenta-600 hover:underline"
                  >
                    {clientProfile.primaryContact.phone}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Contract Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-sm text-fm-neutral-600">Contract Value</p>
              <p className="text-2xl font-bold text-fm-neutral-900">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: clientProfile.contractDetails.currency,
                  minimumFractionDigits: 0,
                }).format(clientProfile.contractDetails.value)}
              </p>
            </div>

            <div>
              <p className="text-sm text-fm-neutral-600">Start Date</p>
              <p className="text-lg font-medium text-fm-neutral-900">
                {clientProfile.contractDetails.startDate
                  ? new Date(clientProfile.contractDetails.startDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>

            <div>
              <p className="text-sm text-fm-neutral-600">End Date</p>
              <p className="text-lg font-medium text-fm-neutral-900">
                {clientProfile.contractDetails.endDate
                  ? new Date(clientProfile.contractDetails.endDate).toLocaleDateString()
                  : 'Ongoing'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto Invoice */}
      <AutoInvoiceSection
        clientId={clientProfile.id}
        clientProfile={clientProfile}
        onUpdate={onProfileUpdate || (() => {})}
      />

      {/* Brand Identity */}
      <BrandIdentitySection
        clientId={clientProfile.id}
        clientData={{
          logoUrl: (clientProfile as any).logoUrl,
          brandColors: (clientProfile as any).brandColors,
          brandFonts: (clientProfile as any).brandFonts,
          tagline: (clientProfile as any).tagline,
          brandGuidelinesUrl: (clientProfile as any).brandGuidelinesUrl,
          name: clientProfile.name,
        }}
        onUpdate={onProfileUpdate || (() => {})}
      />
    </div>
  );
}
