'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Mail,
  Phone,
  Globe,
  Bell,
  Shield,
  Eye,
  Palette,
  Key,
  Building,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Share2,
  KeyRound,
  Webhook,
  Plus,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Clock,
  Target,
  MessageCircle
} from 'lucide-react';
import {
  DashboardButton,
  DashboardCard,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/design-system';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/select-native';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SocialAccountsPanel } from '@/components/admin/social/SocialAccountsPanel';
import { SalesSettingsPanel } from '@/components/admin/sales/SalesSettingsPanel';
import { WhatsAppSettingsPanel } from '@/components/admin/whatsapp/WhatsAppSettingsPanel';
import { cn } from '@/lib/utils';
import { PERMISSIONS } from '@/lib/admin/permissions';
import { ALL_EVENT_TYPES } from '@/lib/events/types';

interface AdminSettings {
  profile: {
    name: string;
    email: string;
    phone: string;
    role: string;
    avatar_url?: string;
  };
  general: {
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    language: string;
    currency: string;
  };
  notifications: {
    email_notifications: boolean;
    browser_notifications: boolean;
    mobile_notifications: boolean;
    security_alerts: boolean;
    lead_updates: boolean;
    client_updates: boolean;
    system_updates: boolean;
    marketing_emails: boolean;
  };
  security: {
    two_factor_enabled: boolean;
    session_timeout: number;
    password_expiry: number;
    login_alerts: boolean;
    audit_logs: boolean;
  };
  privacy: {
    data_retention: number;
    analytics_tracking: boolean;
    data_sharing: boolean;
    cookie_consent: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    sidebar_collapsed: boolean;
    compact_mode: boolean;
    animations_enabled: boolean;
  };
  integrations: {
    google_sheets: boolean;
    google_analytics: boolean;
    email_service: boolean;
    payment_gateway: boolean;
    crm_integration: boolean;
  };
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', content: string } | null>(null);

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>([]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);

  const loadApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys');
      const result = await res.json();
      if (result.success) setApiKeys(result.data || []);
      else console.error('Failed to load API keys:', result.error);
    } catch (err) { console.error('Failed to load API keys:', err); } finally { setApiKeysLoading(false); }
  };

  const createApiKey = async () => {
    if (!newKeyName || newKeyPerms.length === 0) return;
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, permissions: newKeyPerms, rate_limit: newKeyRateLimit }),
      });
      const result = await res.json();
      if (result.success) {
        setCreatedKey(result.data.key);
        setNewKeyName('');
        setNewKeyPerms([]);
        setNewKeyRateLimit(60);
        loadApiKeys();
        setMessage({ type: 'success', content: 'API key created successfully.' });
      } else {
        setMessage({ type: 'error', content: result.error || 'Failed to create API key.' });
      }
    } catch (err) {
      setMessage({ type: 'error', content: `API key creation failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/api-keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    loadApiKeys();
  };

  const deleteApiKey = async (id: string) => {
    await fetch(`/api/admin/api-keys?id=${id}`, { method: 'DELETE' });
    loadApiKeys();
  };

  const loadWebhooks = async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch('/api/admin/webhooks');
      const result = await res.json();
      if (result.success) setWebhooks(result.data || []);
      else console.error('Failed to load webhooks:', result.error);
    } catch (err) { console.error('Failed to load webhooks:', err); } finally { setWebhooksLoading(false); }
  };

  const createWebhook = async () => {
    if (!newWebhookName || !newWebhookUrl || newWebhookEvents.length === 0) return;
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWebhookName, url: newWebhookUrl, events: newWebhookEvents }),
      });
      const result = await res.json();
      if (result.success) {
        setCreatedWebhookSecret(result.data.secret);
        setNewWebhookName('');
        setNewWebhookUrl('');
        setNewWebhookEvents([]);
        loadWebhooks();
        setMessage({ type: 'success', content: 'Webhook created successfully.' });
      } else {
        setMessage({ type: 'error', content: result.error || 'Failed to create webhook.' });
      }
    } catch (err) {
      setMessage({ type: 'error', content: `Webhook creation failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/webhooks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    loadWebhooks();
  };

  const deleteWebhook = async (id: string) => {
    await fetch(`/api/admin/webhooks?id=${id}`, { method: 'DELETE' });
    loadWebhooks();
  };

  const AVAILABLE_PERMISSIONS = PERMISSIONS.map((p) => p.key);

  const WEBHOOK_EVENT_TYPES = ['*', ...ALL_EVENT_TYPES];

  const defaults: AdminSettings = {
    profile: {
      name: 'Admin User',
      email: 'admin@freakingminds.in',
      phone: '+91 98765 43210',
      role: 'Super Admin',
      avatar_url: ''
    },
    general: {
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      language: 'en',
      currency: 'INR'
    },
    notifications: {
      email_notifications: true,
      browser_notifications: true,
      mobile_notifications: true,
      security_alerts: true,
      lead_updates: true,
      client_updates: true,
      system_updates: true,
      marketing_emails: false
    },
    security: {
      two_factor_enabled: false,
      session_timeout: 8,
      password_expiry: 90,
      login_alerts: true,
      audit_logs: true
    },
    privacy: {
      data_retention: 365,
      analytics_tracking: true,
      data_sharing: false,
      cookie_consent: true
    },
    appearance: {
      theme: 'light',
      sidebar_collapsed: false,
      compact_mode: false,
      animations_enabled: true
    },
    integrations: {
      google_sheets: true,
      google_analytics: true,
      email_service: true,
      payment_gateway: false,
      crm_integration: false
    },
  };

  const [settings, setSettings] = useState<AdminSettings>(defaults);

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          setClients(result.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        }
      })
      .catch(() => {});
    loadApiKeys();
    loadWebhooks();
  }, []);

  useEffect(() => {
    // Load settings from API first, fallback to localStorage
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const result = await res.json();
        if (result.success && result.data) {
          const merged: AdminSettings = {
            profile: { ...defaults.profile, ...result.data.profile },
            general: { ...defaults.general, ...result.data.general },
            notifications: { ...defaults.notifications, ...result.data.notifications },
            security: { ...defaults.security, ...result.data.security },
            privacy: { ...defaults.privacy, ...result.data.privacy },
            appearance: { ...defaults.appearance, ...result.data.appearance },
            integrations: { ...defaults.integrations, ...result.data.integrations },
          };
          setSettings(merged);
          localStorage.setItem('freaking-minds-admin-settings', JSON.stringify(merged));
          setLoading(false);
          return;
        }
      } catch {
        // API failed, try localStorage
      }
      const savedSettings = localStorage.getItem('freaking-minds-admin-settings');
      if (savedSettings) {
        try { setSettings(JSON.parse(savedSettings)); } catch { /* ignore */ }
      }
      setLoading(false);
    };
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async (section: keyof AdminSettings, data: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);

    try {
      const newSettings = {
        ...settings,
        [section]: { ...settings[section], ...data }
      };
      setSettings(newSettings);

      // Save to API
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data: newSettings[section] }),
      });
      const result = await res.json();

      // Also cache in localStorage
      localStorage.setItem('freaking-minds-admin-settings', JSON.stringify(newSettings));

      if (!result.success) throw new Error(result.error);

      setMessage({
        type: 'success',
        content: 'Settings saved successfully!'
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        content: 'Failed to save settings to server. Changes saved locally.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader title="Settings" description="Loading settings..." />
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-fm-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your admin panel preferences and account settings"
        actions={
          <DashboardButton
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </DashboardButton>
        }
      />

      {/* Message */}
      {message && (
        <div className={cn(
          "p-4 rounded-lg border flex items-center gap-2",
          message.type === 'success' && "bg-green-50 border-green-200 text-green-800",
          message.type === 'error' && "bg-red-50 border-red-200 text-red-800",
          message.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800"
        )}>
          {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          {message.type === 'info' && <Info className="h-4 w-4" />}
          {message.content}
        </div>
      )}

      <Tabs defaultValue="profile" orientation="vertical">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <DashboardCard variant="admin">
              <CardContent className="p-4">
                <TabsList variant="line" className="flex-col w-full items-stretch">
                  <TabsTrigger value="profile" className="justify-start gap-3">
                    <User className="h-4 w-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="general" className="justify-start gap-3">
                    <SettingsIcon className="h-4 w-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="justify-start gap-3">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="security" className="justify-start gap-3">
                    <Shield className="h-4 w-4" />
                    Security
                  </TabsTrigger>
                  <TabsTrigger value="privacy" className="justify-start gap-3">
                    <Eye className="h-4 w-4" />
                    Privacy
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="justify-start gap-3">
                    <Palette className="h-4 w-4" />
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger value="integrations" className="justify-start gap-3">
                    <Zap className="h-4 w-4" />
                    Integrations
                  </TabsTrigger>
                  <TabsTrigger value="social" className="justify-start gap-3">
                    <Share2 className="h-4 w-4" />
                    Social Media
                  </TabsTrigger>
                  <TabsTrigger value="api-keys" className="justify-start gap-3">
                    <KeyRound className="h-4 w-4" />
                    API Keys
                  </TabsTrigger>
                  <TabsTrigger value="webhooks" className="justify-start gap-3">
                    <Webhook className="h-4 w-4" />
                    Webhooks
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="justify-start gap-3">
                    <Target className="h-4 w-4" />
                    Sales
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" className="justify-start gap-3">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </DashboardCard>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            <TabsContent value="profile">
              <DashboardCard variant="admin">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and profile details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:space-x-4">
                    <div className="h-20 w-20 bg-fm-magenta-700 rounded-full flex items-center justify-center">
                      {settings.profile.avatar_url ? (
                        <img
                          src={settings.profile.avatar_url}
                          alt="Avatar"
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-10 w-10 text-white" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-fm-neutral-900">Profile Photo</h3>
                      <p className="text-sm text-fm-neutral-500">Avatar upload coming soon</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      value={settings.profile.name}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, name: e.target.value }
                      }))}
                      leftIcon={<User className="h-4 w-4" />}
                      required
                    />

                    <Input
                      label="Email Address"
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, email: e.target.value }
                      }))}
                      leftIcon={<Mail className="h-4 w-4" />}
                      required
                    />

                    <Input
                      label="Phone Number"
                      value={settings.profile.phone}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, phone: e.target.value }
                      }))}
                      leftIcon={<Phone className="h-4 w-4" />}
                      placeholder="+91 98765 43210"
                    />

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-fm-neutral-900">Role</label>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-fm-neutral-500" />
                        <Badge variant="secondary">{settings.profile.role}</Badge>
                      </div>
                    </div>
                  </div>

                  <DashboardButton
                    variant="primary"
                    onClick={() => saveSettings('profile', settings.profile)}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </DashboardButton>
                </CardContent>
              </DashboardCard>
            </TabsContent>

            <TabsContent value="general">
              <DashboardCard variant="admin">
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure your general preferences and regional settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Timezone"
                      value={settings.general.timezone}
                      onChange={(e) => saveSettings('general', { timezone: e.target.value })}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Asia/Mumbai">Asia/Mumbai (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </Select>

                    <Select
                      label="Date Format"
                      value={settings.general.dateFormat}
                      onChange={(e) => saveSettings('general', { dateFormat: e.target.value })}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </Select>

                    <Select
                      label="Time Format"
                      value={settings.general.timeFormat}
                      onChange={(e) => saveSettings('general', { timeFormat: e.target.value })}
                    >
                      <option value="12h">12 Hour (AM/PM)</option>
                      <option value="24h">24 Hour</option>
                    </Select>

                    <Select
                      label="Currency"
                      value={settings.general.currency}
                      onChange={(e) => saveSettings('general', { currency: e.target.value })}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </Select>
                  </div>
                </CardContent>
              </DashboardCard>
            </TabsContent>

            <TabsContent value="notifications">
              <DashboardCard variant="admin">
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Choose how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Active email notification toggles */}
                  {(['email_notifications', 'security_alerts', 'lead_updates', 'client_updates', 'system_updates', 'marketing_emails'] as const).map((key) => (
                    <Toggle
                      key={key}
                      checked={settings.notifications[key]}
                      onChange={(checked) => saveSettings('notifications', { [key]: checked })}
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      description={
                        key === 'email_notifications' ? 'Receive notifications via email (leads, invoices, contracts, support tickets)' :
                        key === 'security_alerts' ? 'Important security notifications' :
                        key === 'lead_updates' ? 'Updates about new leads and inquiries' :
                        key === 'client_updates' ? 'Client-related notifications (contracts, support)' :
                        key === 'system_updates' ? 'System maintenance and updates' :
                        key === 'marketing_emails' ? 'Marketing emails and newsletters' : ''
                      }
                    />
                  ))}

                  {/* Coming soon — not yet implemented */}
                  <div className="pt-4 border-t border-fm-neutral-200">
                    <p className="text-xs font-medium uppercase tracking-wider text-fm-neutral-400 mb-3">Coming Soon</p>
                    <div className="space-y-4 opacity-50">
                      <Toggle
                        checked={false}
                        onChange={() => {}}
                        label="Browser Notifications"
                        description="Real-time push notifications in your browser"
                      />
                      <Toggle
                        checked={false}
                        onChange={() => {}}
                        label="Mobile Notifications"
                        description="Push notifications on mobile devices"
                      />
                    </div>
                  </div>
                </CardContent>
              </DashboardCard>
            </TabsContent>

            <TabsContent value="security">
              <DashboardCard variant="admin">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  {/* Password Section */}
                  <div className="p-3 sm:p-4 bg-fm-neutral-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Key className="h-5 w-5 text-fm-neutral-600" />
                      <div>
                        <p className="font-medium text-fm-neutral-900">Password</p>
                        <p className="text-sm text-fm-neutral-600">Managed via environment variable (ADMIN_PASSWORD)</p>
                      </div>
                    </div>
                  </div>

                  {/* Security Toggles */}
                  <div className="space-y-4">
                    <Toggle
                      checked={settings.security.two_factor_enabled}
                      onChange={(checked) => saveSettings('security', { two_factor_enabled: checked })}
                      label="Two-Factor Authentication"
                      description="Add an extra layer of security to your account"
                    />

                    <Toggle
                      checked={settings.security.login_alerts}
                      onChange={(checked) => saveSettings('security', { login_alerts: checked })}
                      label="Login Alerts"
                      description="Get notified of new login attempts"
                    />

                    <Toggle
                      checked={settings.security.audit_logs}
                      onChange={(checked) => saveSettings('security', { audit_logs: checked })}
                      label="Audit Logs"
                      description="Keep detailed logs of admin actions"
                    />
                  </div>

                  {/* Session Timeout */}
                  <Select
                    label="Session Timeout (hours)"
                    value={settings.security.session_timeout.toString()}
                    onChange={(e) => saveSettings('security', { session_timeout: parseInt(e.target.value) })}
                    className="max-w-xs"
                  >
                    <option value="1">1 hour</option>
                    <option value="4">4 hours</option>
                    <option value="8">8 hours</option>
                    <option value="24">24 hours</option>
                    <option value="168">1 week</option>
                  </Select>
                </CardContent>
              </DashboardCard>
            </TabsContent>

            <TabsContent value="privacy">
              <DashboardCard variant="admin">
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Manage data privacy and retention policies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Toggle
                    checked={settings.privacy.analytics_tracking}
                    onChange={(checked) => saveSettings('privacy', { analytics_tracking: checked })}
                    label="Analytics Tracking"
                    description="Allow usage analytics to improve the product"
                  />
                  <Toggle
                    checked={settings.privacy.data_sharing}
                    onChange={(checked) => saveSettings('privacy', { data_sharing: checked })}
                    label="Data Sharing"
                    description="Share anonymized usage data"
                  />
                  <Toggle
                    checked={settings.privacy.cookie_consent}
                    onChange={(checked) => saveSettings('privacy', { cookie_consent: checked })}
                    label="Cookie Consent"
                    description="Show cookie consent banner to visitors"
                  />
                </CardContent>
              </DashboardCard>
            </TabsContent>

            <TabsContent value="appearance">
              <DashboardCard variant="admin">
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize the look and feel of your admin dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <Select
                    label="Theme"
                    value={settings.appearance.theme}
                    onChange={(e) => saveSettings('appearance', { theme: e.target.value })}
                    className="max-w-xs"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </Select>

                  <div className="space-y-4">
                    <Toggle
                      checked={settings.appearance.sidebar_collapsed}
                      onChange={(checked) => saveSettings('appearance', { sidebar_collapsed: checked })}
                      label="Collapsed Sidebar"
                      description="Keep sidebar collapsed by default"
                    />

                    <Toggle
                      checked={settings.appearance.compact_mode}
                      onChange={(checked) => saveSettings('appearance', { compact_mode: checked })}
                      label="Compact Mode"
                      description="Use more compact spacing"
                    />

                    <Toggle
                      checked={settings.appearance.animations_enabled}
                      onChange={(checked) => saveSettings('appearance', { animations_enabled: checked })}
                      label="Animations"
                      description="Enable smooth animations and transitions"
                    />
                  </div>
                </CardContent>
              </DashboardCard>
            </TabsContent>

            <TabsContent value="integrations">
              <DashboardCard variant="admin">
                <CardHeader>
                  <CardTitle>Platform Integrations</CardTitle>
                  <CardDescription>
                    Manage your third-party service connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.integrations).map(([key, connected]) => (
                    <div key={key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-fm-neutral-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          key === 'google_sheets' && "bg-green-100 text-green-600",
                          key === 'google_analytics' && "bg-orange-100 text-orange-600",
                          key === 'email_service' && "bg-blue-100 text-blue-600",
                          key === 'payment_gateway' && "bg-purple-100 text-purple-600",
                          key === 'crm_integration' && "bg-fm-magenta-100 text-fm-magenta-700"
                        )}>
                          <Globe className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-fm-neutral-900 capitalize">
                            {key.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-fm-neutral-600">
                            {connected ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <DashboardButton
                        variant={connected ? "secondary" : "primary"}
                        size="sm"
                        onClick={() => saveSettings('integrations', { [key]: !connected })}
                      >
                        {connected ? 'Disconnect' : 'Connect'}
                      </DashboardButton>
                    </div>
                  ))}
                </CardContent>
              </DashboardCard>
            </TabsContent>

            <TabsContent value="whatsapp">
              <WhatsAppSettingsPanel />
            </TabsContent>

            <TabsContent value="sales">
              <SalesSettingsPanel />
            </TabsContent>

            <TabsContent value="social">
              <DashboardCard variant="admin">
                <CardHeader>
                  <CardTitle>Social Media Accounts</CardTitle>
                  <CardDescription>
                    Connect client Facebook and Instagram accounts for direct publishing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    label="Select Client"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="">Choose a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>

                  {selectedClientId ? (
                    <SocialAccountsPanel
                      clientId={selectedClientId}
                      clientName={clients.find(c => c.id === selectedClientId)?.name || ''}
                    />
                  ) : (
                    <p className="text-sm text-fm-neutral-500 py-4" style={{ textAlign: 'center' }}>
                      Select a client above to manage their social media accounts.
                    </p>
                  )}
                </CardContent>
              </DashboardCard>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api-keys">
              <DashboardCard variant="admin">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>API Keys</CardTitle>
                      <CardDescription>
                        Create and manage API keys for external integrations
                      </CardDescription>
                    </div>
                    <DashboardButton variant="primary" size="sm" onClick={() => { setShowCreateKey(true); setCreatedKey(null); }}>
                      <Plus className="h-4 w-4" />
                      Create Key
                    </DashboardButton>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Created key banner */}
                  {createdKey && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">API key created — copy it now!</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white p-2 rounded border border-green-200 break-all">{createdKey}</code>
                        <DashboardButton variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(createdKey); }}>
                          <Copy className="h-4 w-4" />
                        </DashboardButton>
                      </div>
                      <p className="text-xs text-green-700">This key will not be shown again. Store it securely.</p>
                    </div>
                  )}

                  {/* Create key form */}
                  {showCreateKey && (
                    <div className="p-4 border border-fm-neutral-200 rounded-lg space-y-3">
                      <Input
                        label="Key Name"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Zapier Integration"
                      />
                      <div>
                        <label className="text-sm font-medium text-fm-neutral-900 mb-2 block">Permissions</label>
                        <div className="grid grid-cols-2 gap-2">
                          {AVAILABLE_PERMISSIONS.map((perm) => (
                            <label key={perm} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={newKeyPerms.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) setNewKeyPerms(prev => [...prev, perm]);
                                  else setNewKeyPerms(prev => prev.filter(p => p !== perm));
                                }}
                                className="rounded"
                              />
                              <span className="text-fm-neutral-700">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Input
                        label="Rate Limit (req/min)"
                        type="number"
                        value={newKeyRateLimit.toString()}
                        onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 60)}
                      />
                      <div className="flex gap-2">
                        <DashboardButton variant="primary" size="sm" onClick={createApiKey} disabled={!newKeyName || newKeyPerms.length === 0}>
                          Create
                        </DashboardButton>
                        <DashboardButton variant="secondary" size="sm" onClick={() => setShowCreateKey(false)}>
                          Cancel
                        </DashboardButton>
                      </div>
                    </div>
                  )}

                  {/* Key list */}
                  {apiKeysLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin text-fm-neutral-400" />
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <p className="text-sm text-fm-neutral-500 py-4" style={{ textAlign: 'center' }}>
                      No API keys yet. Create one to get started.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map((key: any) => (
                        <div key={key.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 border border-fm-neutral-200 rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-fm-neutral-900">{key.name}</span>
                              <Badge variant={key.is_active ? 'default' : 'secondary'}>
                                {key.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <code className="text-xs text-fm-neutral-500">{key.key_prefix}...</code>
                            <div className="flex items-center gap-3 text-xs text-fm-neutral-500">
                              <span>{key.rate_limit} req/min</span>
                              {key.last_used_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last used {new Date(key.last_used_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(key.permissions || []).map((p: string) => (
                                <span key={p} className="text-xs px-1.5 py-0.5 bg-fm-neutral-100 rounded text-fm-neutral-600">{p}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DashboardButton variant="secondary" size="sm" onClick={() => toggleApiKey(key.id, key.is_active)}>
                              {key.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </DashboardButton>
                            <DashboardButton variant="secondary" size="sm" onClick={() => deleteApiKey(key.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </DashboardButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* API Docs link */}
                  <div className="pt-4 border-t border-fm-neutral-200">
                    <a href="/api/docs/ui" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-fm-magenta-600 hover:underline">
                      <ExternalLink className="h-4 w-4" />
                      View API Documentation
                    </a>
                  </div>
                </CardContent>
              </DashboardCard>
            </TabsContent>

            {/* Webhooks Tab */}
            <TabsContent value="webhooks">
              <DashboardCard variant="admin">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Outgoing Webhooks</CardTitle>
                      <CardDescription>
                        Send event notifications to external URLs
                      </CardDescription>
                    </div>
                    <DashboardButton variant="primary" size="sm" onClick={() => { setShowCreateWebhook(true); setCreatedWebhookSecret(null); }}>
                      <Plus className="h-4 w-4" />
                      Create Webhook
                    </DashboardButton>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Created webhook secret banner */}
                  {createdWebhookSecret && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Webhook created — copy the signing secret!</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white p-2 rounded border border-green-200 break-all">{createdWebhookSecret}</code>
                        <DashboardButton variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(createdWebhookSecret); }}>
                          <Copy className="h-4 w-4" />
                        </DashboardButton>
                      </div>
                      <p className="text-xs text-green-700">Use this secret to verify webhook signatures (X-FM-Signature header).</p>
                    </div>
                  )}

                  {/* Create webhook form */}
                  {showCreateWebhook && (
                    <div className="p-4 border border-fm-neutral-200 rounded-lg space-y-3">
                      <Input
                        label="Webhook Name"
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        placeholder="e.g., Slack Notifications"
                      />
                      <Input
                        label="URL"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        placeholder="https://example.com/webhook"
                      />
                      <div>
                        <label className="text-sm font-medium text-fm-neutral-900 mb-2 block">Events</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {WEBHOOK_EVENT_TYPES.map((evt) => (
                            <label key={evt} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={newWebhookEvents.includes(evt)}
                                onChange={(e) => {
                                  if (e.target.checked) setNewWebhookEvents(prev => [...prev, evt]);
                                  else setNewWebhookEvents(prev => prev.filter(ev => ev !== evt));
                                }}
                                className="rounded"
                              />
                              <span className="text-fm-neutral-700">{evt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <DashboardButton variant="primary" size="sm" onClick={createWebhook} disabled={!newWebhookName || !newWebhookUrl || newWebhookEvents.length === 0}>
                          Create
                        </DashboardButton>
                        <DashboardButton variant="secondary" size="sm" onClick={() => setShowCreateWebhook(false)}>
                          Cancel
                        </DashboardButton>
                      </div>
                    </div>
                  )}

                  {/* Webhook list */}
                  {webhooksLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin text-fm-neutral-400" />
                    </div>
                  ) : webhooks.length === 0 ? (
                    <p className="text-sm text-fm-neutral-500 py-4" style={{ textAlign: 'center' }}>
                      No webhooks configured. Create one to send event notifications.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {webhooks.map((wh: any) => (
                        <div key={wh.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 border border-fm-neutral-200 rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-fm-neutral-900">{wh.name}</span>
                              <Badge variant={wh.is_active ? 'default' : 'secondary'}>
                                {wh.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <code className="text-xs text-fm-neutral-500 break-all">{wh.url}</code>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(wh.events || []).map((e: string) => (
                                <span key={e} className="text-xs px-1.5 py-0.5 bg-fm-neutral-100 rounded text-fm-neutral-600">{e}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DashboardButton variant="secondary" size="sm" onClick={() => toggleWebhook(wh.id, wh.is_active)}>
                              {wh.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </DashboardButton>
                            <DashboardButton variant="secondary" size="sm" onClick={() => deleteWebhook(wh.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </DashboardButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </DashboardCard>
            </TabsContent>

          </div>
        </div>
      </Tabs>
    </div>
  );
}
