'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ChevronDown, Sparkles, MapPin, Code, FileText, Save, Loader2, CheckCircle, AlertCircle, Copy, Upload, BookOpen, Settings, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { TagPicker } from '@/components/ui/TagPicker';

type CardId = 'widget' | 'form' | 'ghl' | 'tracking' | 'maps' | 'ghl-config' | 'service-area';

const GHL_CONFIG_HELP = '/help/ghl-config';
function GhlHelpIcon({ anchor }: { anchor: string }) {
  return (
    <Link href={`${GHL_CONFIG_HELP}#${anchor}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-muted-foreground hover:text-primary shrink-0" title="Help">
      <HelpCircle className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function ToolSettingsClient({ toolId, toolSlug }: { toolId: string; toolSlug?: string }) {
  const [widget, setWidget] = useState({ title: '', subtitle: '', primaryColor: '#7c3aed' });
  const [form, setForm] = useState<Record<string, string>>({});
  const [ghlToken, setGhlToken] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [ghlStatus, setGhlStatus] = useState<{ configured: boolean; connected?: boolean; locationId?: string } | null>(null);
  const [customHeadCode, setCustomHeadCode] = useState('');
  const [trackingQuoteSummary, setTrackingQuoteSummary] = useState('');
  const [trackingAppointmentBooking, setTrackingAppointmentBooking] = useState('');
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [googleMapsExists, setGoogleMapsExists] = useState(false);
  const [serviceAreaStatus, setServiceAreaStatus] = useState<{ type: string; polygonCount?: number; networkLink?: string } | null>(null);
  const [serviceAreaFile, setServiceAreaFile] = useState<File | null>(null);
  const [serviceAreaUploading, setServiceAreaUploading] = useState(false);
  const [ghlConfig, setGhlConfig] = useState<{
    createContact: boolean;
    createOpportunity: boolean;
    createNote: boolean;
    createQuoteObject: boolean;
    pipelineId?: string;
    pipelineStageId?: string;
    useDynamicPricingForValue?: boolean;
    opportunityAssignedTo?: string;
    opportunitySource?: string;
    opportunityTags?: string[];
    inServiceTags?: string[];
    outOfServiceTags?: string[];
    appointmentCalendarId?: string;
    callCalendarId?: string;
    appointmentUserId?: string;
    callUserId?: string;
    quotedAmountField?: string;
    redirectAfterAppointment?: boolean;
    appointmentRedirectUrl?: string;
    appointmentBookedTags?: string[];
    quoteCompletedTags?: string[];
    formIsIframed?: boolean;
    pipelineRoutingRules?: Array<{
      utmParam: string;
      match: string;
      value: string;
      pipelineId: string;
      pipelineStageId: string;
      opportunityStatus?: string;
      opportunityAssignedTo?: string;
      opportunitySource?: string;
      opportunityTags?: string[];
    }>;
  }>({
    createContact: true,
    createOpportunity: false,
    createNote: true,
    createQuoteObject: true,
    redirectAfterAppointment: false,
    appointmentRedirectUrl: '',
    formIsIframed: false,
  });
  const [pipelines, setPipelines] = useState<{ id: string; name: string; stages: { id: string; name: string }[] }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [calendars, setCalendars] = useState<{ id: string; name: string }[]>([]);
  const [ghlTags, setGhlTags] = useState<{ id: string; name: string }[]>([]);
  const [customFields, setCustomFields] = useState<{ key: string; name: string }[]>([]);
  const [quotedAmountFieldSearch, setQuotedAmountFieldSearch] = useState('');
  const [loadingGhlLists, setLoadingGhlLists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<CardId | null>(null);
  const [expandedRuleIndex, setExpandedRuleIndex] = useState<number | null>(null);
  const [sectionMessage, setSectionMessage] = useState<{ card: CardId; type: 'success' | 'error'; text: string } | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<CardId>>(new Set(['widget']));
  const [queryLinkCopied, setQueryLinkCopied] = useState(false);

  const toggleCard = (cardId: CardId) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };
  const isCardExpanded = (cardId: CardId) => expandedCards.has(cardId);
  const clearMessage = (card: CardId) => {
    setSectionMessage((m) => (m?.card === card ? null : m));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [wRes, fRes, ghlRes, trackRes, mapsRes, areaRes, configRes] = await Promise.all([
          fetch(`/api/dashboard/tools/${toolId}/widget-settings`),
          fetch(`/api/dashboard/tools/${toolId}/form-settings`),
          fetch(`/api/dashboard/tools/${toolId}/ghl-settings`),
          fetch(`/api/dashboard/tools/${toolId}/tracking-codes`),
          fetch(`/api/dashboard/tools/${toolId}/google-maps-key`),
          fetch(`/api/dashboard/tools/${toolId}/service-area/status`),
          fetch(`/api/dashboard/tools/${toolId}/ghl-config`),
        ]);
        if (wRes.ok) {
          const w = await wRes.json();
          setWidget({ title: w.title ?? '', subtitle: w.subtitle ?? '', primaryColor: w.primaryColor ?? '#7c3aed' });
        }
        if (fRes.ok) {
          const { formSettings } = await fRes.json();
          setForm(formSettings ?? {});
        }
        if (ghlRes.ok) {
          const g = await ghlRes.json();
          setGhlStatus(g);
          if (g.locationId) setGhlLocationId(g.locationId);
        }
        if (trackRes.ok) {
          const t = await trackRes.json();
          setCustomHeadCode(t.trackingCodes?.customHeadCode ?? '');
          setTrackingQuoteSummary(t.trackingCodes?.trackingQuoteSummary ?? '');
          setTrackingAppointmentBooking(t.trackingCodes?.trackingAppointmentBooking ?? '');
        }
        if (mapsRes.ok) {
          const m = await mapsRes.json();
          setGoogleMapsExists(m.exists ?? false);
        }
        if (areaRes.ok) {
          const a = await areaRes.json();
          setServiceAreaStatus(a);
        }
        if (configRes.ok) {
          const { config } = await configRes.json();
          if (config) setGhlConfig((prev) => ({ ...prev, ...config }));
        }
      } catch {
        setSectionMessage({ card: 'widget', type: 'error', text: 'Failed to load settings' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toolId]);

  useEffect(() => {
    if (!ghlStatus?.connected) return;
    const loadLists = async () => {
      setLoadingGhlLists(true);
      try {
        const [pipeRes, usrRes, calRes, tagRes, fieldsRes] = await Promise.all([
          fetch(`/api/dashboard/tools/${toolId}/ghl-pipelines`),
          fetch(`/api/dashboard/tools/${toolId}/ghl-users`),
          fetch(`/api/dashboard/tools/${toolId}/ghl-calendars`),
          fetch(`/api/dashboard/tools/${toolId}/ghl-tags`),
          fetch(`/api/dashboard/tools/${toolId}/ghl-custom-fields`),
        ]);
        if (pipeRes.ok) {
          const d = await pipeRes.json();
          setPipelines(d.pipelines ?? []);
        }
        if (usrRes.ok) {
          const d = await usrRes.json();
          setUsers(d.users ?? []);
        }
        if (calRes.ok) {
          const d = await calRes.json();
          setCalendars(d.calendars ?? []);
        }
        if (tagRes.ok) {
          const d = await tagRes.json();
          setGhlTags(d.tags ?? []);
        }
        if (fieldsRes.ok) {
          const d = await fieldsRes.json();
          setCustomFields(d.fields ?? []);
        }
      } finally {
        setLoadingGhlLists(false);
      }
    };
    loadLists();
  }, [toolId, ghlStatus?.connected]);

  const saveWidget = async () => {
    setSavingSection('widget');
    clearMessage('widget');
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/widget-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(widget),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.settings) {
          setWidget({
            title: data.settings.title ?? '',
            subtitle: data.settings.subtitle ?? '',
            primaryColor: data.settings.primaryColor ?? '#7c3aed',
          });
        }
        setSectionMessage({
          card: 'widget',
          type: 'success',
          text: data.message ?? 'Widget settings saved. Refresh the live tool page to see changes.',
        });
      } else {
        setSectionMessage({ card: 'widget', type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setSectionMessage({ card: 'widget', type: 'error', text: 'Failed to save widget settings' });
    } finally {
      setSavingSection(null);
    }
  };

  const saveForm = async (messageCard: 'form' | 'service-area' = 'form') => {
    setSavingSection('form');
    clearMessage(messageCard);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/form-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSectionMessage({ card: messageCard, type: 'success', text: data.message ?? 'Form settings saved' });
      } else {
        setSectionMessage({ card: messageCard, type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setSectionMessage({ card: messageCard, type: 'error', text: 'Failed to save form settings' });
    } finally {
      setSavingSection(null);
    }
  };

  const saveGhl = async () => {
    if (!ghlToken.trim() || !ghlLocationId.trim()) {
      setSectionMessage({ card: 'ghl', type: 'error', text: 'HighLevel token and Location ID are required' });
      return;
    }
    setSavingSection('ghl');
    clearMessage('ghl');
    // Use explicit URL so this always hits the dashboard GHL settings route (not any other handler)
    const ghlSettingsUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/dashboard/tools/${toolId}/ghl-settings`
        : `/api/dashboard/tools/${toolId}/ghl-settings`;
    try {
      const res = await fetch(ghlSettingsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ghlToken.trim(), locationId: ghlLocationId.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSectionMessage({ card: 'ghl', type: 'success', text: data.message ?? 'HighLevel settings saved' });
        setGhlStatus({ configured: true, connected: true, locationId: ghlLocationId.trim() });
      } else {
        const detail = data.details ? `${data.error}. ${data.details}` : (data.error ?? 'Failed to save');
        setSectionMessage({ card: 'ghl', type: 'error', text: detail });
      }
    } catch {
      setSectionMessage({ card: 'ghl', type: 'error', text: 'Failed to save HighLevel settings' });
    } finally {
      setSavingSection(null);
    }
  };

  const saveTracking = async () => {
    setSavingSection('tracking');
    clearMessage('tracking');
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/tracking-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customHeadCode: customHeadCode.trim(),
          trackingQuoteSummary: trackingQuoteSummary.trim(),
          trackingAppointmentBooking: trackingAppointmentBooking.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSectionMessage({ card: 'tracking', type: 'success', text: data.message ?? 'Tracking codes saved' });
      } else {
        setSectionMessage({ card: 'tracking', type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setSectionMessage({ card: 'tracking', type: 'error', text: 'Failed to save tracking codes' });
    } finally {
      setSavingSection(null);
    }
  };

  const saveGoogleMaps = async () => {
    if (!googleMapsKey.trim()) {
      setSectionMessage({ card: 'maps', type: 'error', text: 'Google Maps API key is required' });
      return;
    }
    setSavingSection('maps');
    clearMessage('maps');
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/google-maps-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: googleMapsKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSectionMessage({ card: 'maps', type: 'success', text: data.message ?? 'Google Maps key saved' });
        setGoogleMapsExists(true);
        setGoogleMapsKey('');
      } else {
        setSectionMessage({ card: 'maps', type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setSectionMessage({ card: 'maps', type: 'error', text: 'Failed to save Google Maps key' });
    } finally {
      setSavingSection(null);
    }
  };

  const saveGhlConfig = async () => {
    setSavingSection('ghl-config');
    clearMessage('ghl-config');
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/ghl-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ghlConfig),
      });
      const data = await res.json();
      if (res.ok) {
        setSectionMessage({ card: 'ghl-config', type: 'success', text: data.message ?? 'HighLevel configuration saved' });
      } else {
        setSectionMessage({ card: 'ghl-config', type: 'error', text: data.error ?? 'Failed to save HighLevel config' });
      }
    } catch {
      setSectionMessage({ card: 'ghl-config', type: 'error', text: 'Failed to save HighLevel config' });
    } finally {
      setSavingSection(null);
    }
  };

  const uploadServiceArea = async () => {
    if (!serviceAreaFile) {
      setSectionMessage({ card: 'service-area', type: 'error', text: 'Please select a KML file' });
      return;
    }
    setServiceAreaUploading(true);
    clearMessage('service-area');
    try {
      const content = await serviceAreaFile.text();
      const res = await fetch(`/api/dashboard/tools/${toolId}/service-area/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kmlContent: content }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSectionMessage({ card: 'service-area', type: 'success', text: data.message ?? 'Service area updated' });
        setServiceAreaFile(null);
        const statusRes = await fetch(`/api/dashboard/tools/${toolId}/service-area/status`);
        if (statusRes.ok) {
          const a = await statusRes.json();
          setServiceAreaStatus(a);
        }
      } else {
        setSectionMessage({ card: 'service-area', type: 'error', text: data.error ?? 'Upload failed' });
      }
    } catch {
      setSectionMessage({ card: 'service-area', type: 'error', text: 'Failed to upload service area' });
    } finally {
      setServiceAreaUploading(false);
    }
  };

  const selectClass = 'mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm bg-background';
  const inputClass = 'mt-3';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Site Customization (Widget) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('widget')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Site Customization</CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Customize the title, subtitle, and primary color for this quoting tool
                  {toolSlug && (
                    <span className="block mt-2 text-foreground/80">
                      Changes apply at <code className="rounded bg-muted px-1">/t/{toolSlug}</code>. View that URL (or your custom domain with that path) and refresh to see updates.
                    </span>
                  )}
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('widget') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('widget') && (
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {sectionMessage?.card === 'widget' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p>{sectionMessage.text}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="widget-title" className="text-base font-semibold">Site Title</Label>
                  <Input
                    id="widget-title"
                    value={widget.title}
                    onChange={(e) => setWidget((w) => ({ ...w, title: e.target.value }))}
                    placeholder="e.g., Acme Cleaning"
                    className={inputClass}
                  />
                  <p className="text-sm text-muted-foreground mt-1">Displayed at the top of the quote form.</p>
                </div>
                <div>
                  <Label htmlFor="widget-subtitle" className="text-base font-semibold">Site Subtitle</Label>
                  <Input
                    id="widget-subtitle"
                    value={widget.subtitle}
                    onChange={(e) => setWidget((w) => ({ ...w, subtitle: e.target.value }))}
                    placeholder="e.g., Let's get your professional cleaning price!"
                    className={inputClass}
                  />
                  <p className="text-sm text-muted-foreground mt-1">Appears below the title.</p>
                </div>
                <div>
                  <Label htmlFor="widget-primary-color" className="text-base font-semibold">Primary Brand Color</Label>
                  <div className="mt-2 flex gap-3 items-center">
                    <input
                      id="widget-primary-color"
                      type="color"
                      value={widget.primaryColor}
                      onChange={(e) => setWidget((w) => ({ ...w, primaryColor: e.target.value }))}
                      className="w-16 h-12 rounded-lg border-2 border-input cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={widget.primaryColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || val.length <= 7) setWidget((w) => ({ ...w, primaryColor: val }));
                      }}
                      placeholder="#7c3aed"
                      className="font-mono flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Used for buttons and accents.</p>
                </div>
                <Button onClick={saveWidget} disabled={savingSection === 'widget'} className="w-full h-11 font-semibold flex items-center gap-2">
                  {savingSection === 'widget' ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Widget Settings</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Query Parameter Settings (Form) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('form')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <FileText className="h-5 w-5 text-primary" />
                  Query Parameter Settings
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Configure which URL query parameters pre-fill the form (e.g. ?firstName=John&email=test@example.com)
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('form') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('form') && (
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {sectionMessage?.card === 'form' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p>{sectionMessage.text}</p>
                  </div>
                )}
                {['firstNameParam', 'lastNameParam', 'emailParam', 'phoneParam', 'addressParam'].map((key) => (
                  <div key={key}>
                    <Label htmlFor={key} className="text-base font-semibold">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    <Input
                      id={key}
                      value={(form[key] as string) ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={`e.g. ${key === 'emailParam' ? 'email' : key === 'phoneParam' ? 'phone' : key.toLowerCase().replace('param', '')}`}
                      className={inputClass}
                    />
                  </div>
                ))}
                {/* Query link with placeholders — copy and replace {{...}} with your dynamic variables */}
                {(() => {
                  const paramKeys = ['firstNameParam', 'lastNameParam', 'emailParam', 'phoneParam', 'addressParam'] as const;
                  const segments = paramKeys
                    .filter((k) => (form[k] as string)?.trim())
                    .map((k) => {
                      const p = (form[k] as string).trim();
                      return `${encodeURIComponent(p)}={{${p}}}`;
                    });
                  const queryLink = segments.length ? `?${segments.join('&')}` : '';
                  return (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Query link (copy and replace placeholders with your variables)</Label>
                      <p className="text-sm text-muted-foreground">Append this to your survey URL. Replace each <code className="bg-muted px-1 rounded">{'{{param}}'}</code> with your CRM/email variable (e.g. HighLevel <code className="bg-muted px-1 rounded">{'{{contact.first_name}}'}</code>).</p>
                      <div className="flex gap-2 items-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 gap-2"
                          disabled={!queryLink}
                          onClick={async () => {
                            if (!queryLink) return;
                            await navigator.clipboard.writeText(queryLink);
                            setQueryLinkCopied(true);
                            setTimeout(() => setQueryLinkCopied(false), 2000);
                          }}
                          title={queryLinkCopied ? 'Copied!' : 'Copy query link'}
                        >
                          <Copy className="h-4 w-4" />
                          {queryLinkCopied ? 'Copied!' : 'Copy'}
                        </Button>
                        <Input
                          readOnly
                          value={queryLink || '(configure at least one param above)'}
                          className={`font-mono text-sm flex-1 min-w-0 ${queryLink ? 'bg-background' : 'bg-muted/50 text-muted-foreground'}`}
                        />
                      </div>
                    </div>
                  );
                })()}
                <Button onClick={() => saveForm('form')} disabled={savingSection === 'form'} className="w-full h-11 font-semibold flex items-center gap-2">
                  {savingSection === 'form' ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Form Settings</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Tracking & Analytics */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('tracking')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <Code className="h-5 w-5 text-primary" />
                  Tracking & Analytics
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Three code boxes: every page (e.g. Meta PageView), quote summary (conversions), appointment booking (e.g. Appointment Booked)
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('tracking') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('tracking') && (
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {sectionMessage?.card === 'tracking' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p>{sectionMessage.text}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="custom-head-code" className="text-base font-semibold">1. Every page (e.g. Meta PageView)</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Loads on every tool page (form, quote summary, confirmation). Use for page views and general tracking.
                  </p>
                  <textarea
                    id="custom-head-code"
                    value={customHeadCode}
                    onChange={(e) => setCustomHeadCode(e.target.value)}
                    rows={4}
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                    placeholder="<script>...</script>"
                  />
                </div>
                <div>
                  <Label htmlFor="tracking-quote-summary" className="text-base font-semibold">2. Quote Summary only (e.g. Meta Conversion)</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Loads only when the user sees the quote result/summary. Use for conversion events (e.g. fbq(&apos;track&apos;, &apos;Lead&apos;)).
                  </p>
                  <textarea
                    id="tracking-quote-summary"
                    value={trackingQuoteSummary}
                    onChange={(e) => setTrackingQuoteSummary(e.target.value)}
                    rows={4}
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                    placeholder="<script>...</script>"
                  />
                </div>
                <div>
                  <Label htmlFor="tracking-appointment-booking" className="text-base font-semibold">3. Appointment booking only (e.g. Appointment Booked event)</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Loads on the appointment-confirmed and callback-confirmed pages. Use for &quot;appointment booked&quot; or similar events.
                  </p>
                  <textarea
                    id="tracking-appointment-booking"
                    value={trackingAppointmentBooking}
                    onChange={(e) => setTrackingAppointmentBooking(e.target.value)}
                    rows={4}
                    className="mt-2 w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                    placeholder="<script>...</script>"
                  />
                </div>
                <Button onClick={saveTracking} disabled={savingSection === 'tracking'} className="w-full h-11 font-semibold flex items-center gap-2">
                  {savingSection === 'tracking' ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Tracking Codes</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Service Area Configuration */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('service-area')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  Service Area Configuration
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  Upload a KML file with your service area polygon, and configure tags for in-service and out-of-service customers.
                  <Link href="/help/service-area-polygon" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <BookOpen className="h-3.5 w-3.5" />
                    Instructions
                  </Link>
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('service-area') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('service-area') && (
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {sectionMessage?.card === 'service-area' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <p>{sectionMessage.text}</p>
                  </div>
                )}

                {/* KML Upload */}
                <div>
                  <Label className="text-base font-semibold">Upload Service Area Polygon (KML)</Label>

                  {/* Status Display */}
                  {serviceAreaStatus && serviceAreaStatus.type !== 'none' && (
                    <div
                      className={`mt-3 p-4 rounded-lg border-2 ${
                        serviceAreaStatus.type === 'network'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p
                            className={`font-semibold ${
                              serviceAreaStatus.type === 'network' ? 'text-blue-900' : 'text-emerald-900'
                            }`}
                          >
                            {serviceAreaStatus.type === 'network'
                              ? '🔗 NetworkLink Active'
                              : '✓ Direct Polygon Active'}
                          </p>
                          <p
                            className={`text-sm mt-1 ${
                              serviceAreaStatus.type === 'network' ? 'text-blue-800' : 'text-emerald-800'
                            }`}
                          >
                            {serviceAreaStatus.type === 'network'
                              ? `Automatically fetching from: ${serviceAreaStatus.networkLink ?? 'URL'}`
                              : `${serviceAreaStatus.polygonCount ?? 0} coordinates loaded`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 p-4 border-2 border-dashed border-border rounded-lg text-center">
                    <input
                      type="file"
                      accept=".kml,.kmz"
                      onChange={(e) => setServiceAreaFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                      id="kml-file-input"
                    />
                    <label htmlFor="kml-file-input" className="cursor-pointer block">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-semibold text-foreground">Click to select KML file</p>
                      <p className="text-sm text-muted-foreground">or drag and drop</p>
                      {serviceAreaFile && (
                        <p className="text-sm text-emerald-600 mt-2">📁 {serviceAreaFile.name}</p>
                      )}
                    </label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Export your service area as a KML file from Google Maps or other mapping software. The system supports:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2 mt-1">
                    <li>
                      <strong>Direct KML files</strong> - Traditional KML with polygon coordinates. Uploads once and stores the data.
                    </li>
                    <li>
                      <strong>NetworkLink references</strong> - KML files that link to a remote server. The system will automatically fetch and update the polygon data periodically, so you don&apos;t need to re-upload when your map changes!
                    </li>
                  </ul>
                  {serviceAreaFile && (
                    <Button
                      onClick={uploadServiceArea}
                      disabled={serviceAreaUploading}
                      className="w-full mt-4 h-10 font-semibold flex items-center gap-2"
                    >
                      {serviceAreaUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Polygon
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Open survey in new tab after service area check success */}
                <div className="border-t border-border pt-6 mt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="openSurveyInNewTab" className="text-base font-semibold cursor-pointer">
                        Open survey in new tab after service area check success
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        When enabled, after the user enters their address and passes the service area check, a new tab opens to continue the survey. Contact info is pre-filled and they skip to house details. Only works when the widget is embedded in an iframe.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        id="openSurveyInNewTab"
                        checked={String(form.openSurveyInNewTab) === 'true'}
                        onChange={(e) => setForm((f) => ({ ...f, openSurveyInNewTab: e.target.checked ? 'true' : 'false' }))}
                        className="w-4 h-4 rounded border-input"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => saveForm('service-area')}
                    disabled={savingSection === 'form'}
                    className="mt-4 h-10 font-semibold flex items-center gap-2"
                  >
                    {savingSection === 'form' ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Google Maps API Key */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('maps')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <Code className="h-5 w-5 text-primary" />
                  Google Maps API Key
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  Required for address autocomplete and geocoding on the quote form.
                  <Link href="/help/google-maps-api" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <BookOpen className="h-3.5 w-3.5" />
                    Instructions
                  </Link>
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('maps') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('maps') && (
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {sectionMessage?.card === 'maps' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p>{sectionMessage.text}</p>
                  </div>
                )}
                {googleMapsExists && <p className="text-sm text-muted-foreground">API key is set. Enter a new value below to replace.</p>}
                <div>
                  <Label htmlFor="google-maps-key" className="text-base font-semibold">API key</Label>
                  <Input
                    id="google-maps-key"
                    type="password"
                    placeholder={googleMapsExists ? '••••••••' : 'Paste Google Maps API key'}
                    value={googleMapsKey}
                    onChange={(e) => setGoogleMapsKey(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <Button onClick={saveGoogleMaps} disabled={savingSection === 'maps'} className="w-full h-11 font-semibold flex items-center gap-2">
                  {savingSection === 'maps' ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Google Maps key</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* HighLevel Connection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('ghl')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
                  <Sparkles className="h-6 w-6 text-primary" />
                  HighLevel Integration
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  Configure your HighLevel API token and Location ID for this tool.
                  <Link href="/help/ghl-integration" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <BookOpen className="h-3.5 w-3.5" />
                    Instructions
                  </Link>
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {ghlStatus?.configured && (
                  <span
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      ghlStatus.connected ? 'bg-green-100 text-green-800' : 'bg-muted text-gray-800'
                    }`}
                  >
                    {ghlStatus.connected ? <><span className="w-2 h-2 rounded-full bg-green-600" /> Connected</> : 'Not connected'}
                  </span>
                )}
                <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('ghl') ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
          {isCardExpanded('ghl') && (
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {sectionMessage?.card === 'ghl' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p>{sectionMessage.text}</p>
                  </div>
                )}
                {ghlStatus?.configured && (
                  <>
                    <p className="text-sm text-muted-foreground">Location ID: {ghlStatus.locationId ?? '—'}. Enter new token/location below to update.</p>
                    {ghlStatus.locationId && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">GHL Quoter Button – paste in GHL → Settings → Company → Custom JS:</p>
                        <code className="text-xs block break-all bg-background p-2 rounded border">
                          {`<script src="${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://www.cleanquote.io')}/api/script/cleanquote.js" data-location-id="${ghlStatus.locationId}"></script>`}
                        </code>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <Label htmlFor="ghl-token" className="text-base font-semibold">HighLevel API Token</Label>
                  <Input
                    id="ghl-token"
                    type="password"
                    placeholder={ghlStatus?.configured ? '••••••••' : 'Paste your HighLevel API token'}
                    value={ghlToken}
                    onChange={(e) => setGhlToken(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label htmlFor="ghl-location" className="text-base font-semibold">Location ID <span className="text-red-500">*</span></Label>
                  <Input
                    id="ghl-location"
                    placeholder="HighLevel Location ID (e.g. yRlRzLxQ0y3TlR5V0xNdQ)"
                    value={ghlLocationId}
                    onChange={(e) => setGhlLocationId(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <Button onClick={saveGhl} disabled={savingSection === 'ghl'} className="w-full h-11 font-semibold flex items-center gap-2">
                  {savingSection === 'ghl' ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save HighLevel connection</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* HighLevel Integration Config - right after HighLevel Integration */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('ghl-config')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <Settings className="h-5 w-5 text-primary" />
                  HighLevel Config
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  Configure CRM behavior when a quote is submitted (contacts, opportunities, notes, calendars, tags). Save HighLevel connection first.
                  <Link href="/help/ghl-config" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <BookOpen className="h-3.5 w-3.5" />
                    Instructions
                  </Link>
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('ghl-config') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('ghl-config') && (
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {sectionMessage?.card === 'ghl-config' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p>{sectionMessage.text}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {[
                    { key: 'createContact' as const, label: 'Create/update contact', desc: 'Create or update contact with customer info', anchor: 'create-contact' },
                    { key: 'createNote' as const, label: 'Create note', desc: 'Add a note with quote summary', anchor: 'create-note' },
                    { key: 'createQuoteObject' as const, label: 'Create Quote (custom object)', desc: 'Create Quote custom object in HighLevel', anchor: 'create-quote-object' },
                    { key: 'createOpportunity' as const, label: 'Create opportunity', desc: 'Create sales opportunity with quote details', anchor: 'create-opportunity' },
                  ].map(({ key, label, desc, anchor }) => (
                    <div key={key} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                      <input
                        type="checkbox"
                        id={key}
                        checked={ghlConfig[key]}
                        onChange={(e) => setGhlConfig((c) => ({ ...c, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-input"
                      />
                      <label htmlFor={key} className="flex-1 cursor-pointer flex items-start gap-1.5">
                        <span>
                          <div className="font-medium text-foreground">{label}</div>
                          <div className="text-xs text-muted-foreground">{desc}</div>
                        </span>
                        <GhlHelpIcon anchor={anchor} />
                      </label>
                    </div>
                  ))}
                </div>
                {ghlConfig.createOpportunity && (
                  <>
                    {pipelines.length === 0 ? (
                      <div className="pt-2 border-t border-border text-sm text-muted-foreground">
                        No pipelines found. Please create a pipeline in HighLevel first.
                      </div>
                    ) : (
                      <>
                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Label className="text-base font-semibold">Default Pipeline</Label>
                            <GhlHelpIcon anchor="default-pipeline" />
                          </div>
                          <select
                            value={ghlConfig.pipelineId ?? ''}
                            onChange={(e) => setGhlConfig((c) => ({ ...c, pipelineId: e.target.value || undefined, pipelineStageId: undefined }))}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          >
                            <option value="">— Select a pipeline —</option>
                            {pipelines.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <div className="text-sm text-muted-foreground mt-1">Used when no UTM routing rule matches.</div>
                        </div>
                        {ghlConfig.pipelineId && (
                          <div className="pt-2 border-t border-border">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Label className="text-base font-semibold">Default Starting Stage</Label>
                              <GhlHelpIcon anchor="default-pipeline" />
                            </div>
                            <select
                              value={ghlConfig.pipelineStageId ?? ''}
                              onChange={(e) => setGhlConfig((c) => ({ ...c, pipelineStageId: e.target.value || undefined }))}
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                            >
                              <option value="">— Select a stage —</option>
                              {pipelines.find((p) => p.id === ghlConfig.pipelineId)?.stages?.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="pt-4 border-t border-input">
                          <h5 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            Pipeline Routing by UTM (Optional)
                            <GhlHelpIcon anchor="pipeline-routing-utm" />
                          </h5>
                          <p className="text-sm text-muted-foreground mb-3">
                            First matching rule wins. Match is case-insensitive. If none match, the default pipeline is used.
                          </p>
                          <Button
                            type="button"
                            onClick={() => {
                              const rules = ghlConfig.pipelineRoutingRules ?? [];
                              setGhlConfig((c) => ({
                                ...c,
                                pipelineRoutingRules: [
                                  ...rules,
                                  {
                                    utmParam: 'utm_source',
                                    match: 'contains',
                                    value: '',
                                    pipelineId: '',
                                    pipelineStageId: '',
                                    opportunityStatus: undefined,
                                    opportunityAssignedTo: undefined,
                                    opportunitySource: undefined,
                                    opportunityTags: undefined,
                                  },
                                ],
                              }));
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Add Rule
                          </Button>
                        </div>
                        {(ghlConfig.pipelineRoutingRules?.length ?? 0) > 0 && (
                          <div className="space-y-3 mt-3">
                            {(ghlConfig.pipelineRoutingRules ?? []).map((rule, idx) => (
                              <div key={idx} className="p-3 bg-muted/50 border border-border rounded-lg space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">UTM Param</label>
                                    <select
                                      value={rule.utmParam}
                                      onChange={(e) => {
                                        const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                        newRules[idx] = { ...newRules[idx], utmParam: e.target.value };
                                        setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                      }}
                                      className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                                    >
                                      <option value="utm_source">utm_source</option>
                                      <option value="utm_medium">utm_medium</option>
                                      <option value="utm_campaign">utm_campaign</option>
                                      <option value="utm_term">utm_term</option>
                                      <option value="utm_content">utm_content</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Match</label>
                                    <select
                                      value={rule.match}
                                      onChange={(e) => {
                                        const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                        newRules[idx] = { ...newRules[idx], match: e.target.value };
                                        setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                      }}
                                      className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                                    >
                                      <option value="contains">contains</option>
                                      <option value="equals">equals</option>
                                      <option value="starts_with">starts_with</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Value</label>
                                    <input
                                      type="text"
                                      value={rule.value}
                                      onChange={(e) => {
                                        const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                        newRules[idx] = { ...newRules[idx], value: e.target.value };
                                        setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                      }}
                                      placeholder="e.g., google"
                                      className="w-full px-2 py-1 border border-input rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Pipeline</label>
                                    <select
                                      value={rule.pipelineId}
                                      onChange={(e) => {
                                        const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                        newRules[idx] = { ...newRules[idx], pipelineId: e.target.value, pipelineStageId: '' };
                                        setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                      }}
                                      className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                                    >
                                      <option value="">— Select —</option>
                                      {pipelines.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Stage</label>
                                    <select
                                      value={rule.pipelineStageId}
                                      onChange={(e) => {
                                        const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                        newRules[idx] = { ...newRules[idx], pipelineStageId: e.target.value };
                                        setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                      }}
                                      className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                                    >
                                      <option value="">— Select —</option>
                                      {rule.pipelineId && pipelines
                                        .find((p) => p.id === rule.pipelineId)
                                        ?.stages?.map((s) => (
                                          <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="border-t border-border pt-3 mt-3">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedRuleIndex(expandedRuleIndex === idx ? null : idx)}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    {expandedRuleIndex === idx ? '▼' : '▶'} Opportunity Settings for This Rule (Optional)
                                  </button>
                                  {expandedRuleIndex === idx && (
                                    <div className="mt-3 space-y-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                      <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                                        <select
                                          value={rule.opportunityStatus ?? ''}
                                          onChange={(e) => {
                                            const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                            newRules[idx] = { ...newRules[idx], opportunityStatus: e.target.value || undefined };
                                            setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                          }}
                                          className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                                        >
                                          <option value="">— Use default —</option>
                                          <option value="open">Open</option>
                                          <option value="won">Won</option>
                                          <option value="lost">Lost</option>
                                          <option value="abandoned">Abandoned</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1">Assign to User</label>
                                        <select
                                          value={rule.opportunityAssignedTo ?? ''}
                                          onChange={(e) => {
                                            const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                            newRules[idx] = { ...newRules[idx], opportunityAssignedTo: e.target.value || undefined };
                                            setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                          }}
                                          className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                                        >
                                          <option value="">— Use default —</option>
                                          {users.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : ''}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1">Source</label>
                                        <input
                                          type="text"
                                          value={rule.opportunitySource ?? ''}
                                          onChange={(e) => {
                                            const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                            newRules[idx] = { ...newRules[idx], opportunitySource: e.target.value || undefined };
                                            setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                          }}
                                          placeholder="e.g., Google Ads"
                                          className="w-full px-2 py-1 border border-input rounded text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1">Tags</label>
                                        <TagPicker
                                          value={Array.isArray(rule.opportunityTags) ? rule.opportunityTags.join(', ') : ''}
                                          onChange={(csv) => {
                                            const newRules = [...(ghlConfig.pipelineRoutingRules ?? [])];
                                            newRules[idx] = { ...newRules[idx], opportunityTags: csv.split(',').map((s) => s.trim()).filter(Boolean) };
                                            setGhlConfig((c) => ({ ...c, pipelineRoutingRules: newRules }));
                                          }}
                                          suggestions={ghlTags.map((t) => t.name)}
                                          placeholder="Search or type a tag…"
                                          className="mt-1"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {rule.opportunityTags?.length ? `${rule.opportunityTags.length} tag(s) selected` : 'No tags selected (uses default)'}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex justify-end pt-2 border-t border-border mt-3">
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      setGhlConfig((c) => ({
                                        ...c,
                                        pipelineRoutingRules: (ghlConfig.pipelineRoutingRules ?? []).filter((_, i) => i !== idx),
                                      }));
                                      if (expandedRuleIndex === idx) setExpandedRuleIndex(null);
                                      else if (expandedRuleIndex != null && expandedRuleIndex > idx) setExpandedRuleIndex(expandedRuleIndex - 1);
                                    }}
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                    size="sm"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                <div className="pt-2 border-t border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useDynamicPricing"
                      checked={ghlConfig.useDynamicPricingForValue !== false}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, useDynamicPricingForValue: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <Label htmlFor="useDynamicPricing" className="text-base font-semibold cursor-pointer flex items-center gap-1.5">Use quoted amount for opportunity value <GhlHelpIcon anchor="quoted-amount-value" /></Label>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-base font-semibold">Quoted amount field (HighLevel custom field key)</Label>
                      <GhlHelpIcon anchor="quoted-amount-field" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Contact custom fields from your HighLevel location. Select one or enter a custom key below (e.g. quoted_cleaning_price).</p>
                    {customFields.length > 0 ? (
                      <>
                        <Input
                          type="text"
                          placeholder="Search fields..."
                          value={quotedAmountFieldSearch}
                          onChange={(e) => setQuotedAmountFieldSearch(e.target.value)}
                          className={`${inputClass} max-w-xs mb-2`}
                        />
                        <select
                          className={`${selectClass} w-full max-w-md`}
                          value={customFields.some((f) => f.key === (ghlConfig.quotedAmountField ?? '')) ? (ghlConfig.quotedAmountField ?? '') : '__custom__'}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '__custom__') {
                              setGhlConfig((c) => ({ ...c, quotedAmountField: undefined }));
                            } else {
                              setGhlConfig((c) => ({ ...c, quotedAmountField: v || undefined }));
                            }
                          }}
                        >
                          <option value="">— Select field —</option>
                          {customFields
                            .filter(
                              (f) =>
                                !quotedAmountFieldSearch.trim() ||
                                f.name.toLowerCase().includes(quotedAmountFieldSearch.toLowerCase()) ||
                                f.key.toLowerCase().includes(quotedAmountFieldSearch.toLowerCase())
                            )
                            .map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.name} ({f.key})
                              </option>
                            ))}
                          <option value="__custom__">— Enter custom key —</option>
                        </select>
                        {!customFields.some((f) => f.key === (ghlConfig.quotedAmountField ?? '')) && (
                          <div className="mt-2">
                            <Label className="text-xs text-muted-foreground">Custom key (if not in list)</Label>
                            <Input
                              value={ghlConfig.quotedAmountField ?? ''}
                              onChange={(e) => setGhlConfig((c) => ({ ...c, quotedAmountField: e.target.value || undefined }))}
                              placeholder="e.g. quoted_cleaning_price"
                              className={`${inputClass} max-w-xs mt-1`}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          value={ghlConfig.quotedAmountField ?? ''}
                          onChange={(e) => setGhlConfig((c) => ({ ...c, quotedAmountField: e.target.value || undefined }))}
                          placeholder="e.g. quoted_cleaning_price"
                          className={`${inputClass} max-w-xs`}
                        />
                        <p className="text-xs text-muted-foreground">
                          {loadingGhlLists ? 'Loading contact custom fields…' : 'Connect HighLevel and expand this card to load contact custom fields from your location.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-base font-semibold">Opportunity assigned to</Label>
                      <GhlHelpIcon anchor="opportunity-assigned-to" />
                    </div>
                    <select
                      value={ghlConfig.opportunityAssignedTo ?? ''}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, opportunityAssignedTo: e.target.value || undefined }))}
                      className={selectClass}
                    >
                      <option value="">— Select user —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-base font-semibold">Opportunity source</Label>
                      <GhlHelpIcon anchor="opportunity-source" />
                    </div>
                    <Input
                      value={ghlConfig.opportunitySource ?? ''}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, opportunitySource: e.target.value || undefined }))}
                      placeholder="e.g. Quote Widget"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-base font-semibold">Opportunity tags</Label>
                      <GhlHelpIcon anchor="opportunity-tags" />
                    </div>
                    <TagPicker
                      value={Array.isArray(ghlConfig.opportunityTags) ? ghlConfig.opportunityTags.join(', ') : ''}
                      onChange={(csv) => setGhlConfig((c) => ({ ...c, opportunityTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                      suggestions={ghlTags.map((t) => t.name)}
                      placeholder="Search or type a tag…"
                      className="mt-3"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-base font-semibold">Appointment calendar</Label>
                      <GhlHelpIcon anchor="calendars" />
                    </div>
                    <select
                      value={ghlConfig.appointmentCalendarId ?? ''}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, appointmentCalendarId: e.target.value || undefined }))}
                      className={selectClass}
                    >
                      <option value="">— Select —</option>
                      {calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>{cal.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-base font-semibold">Call calendar</Label>
                    <select
                      value={ghlConfig.callCalendarId ?? ''}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, callCalendarId: e.target.value || undefined }))}
                      className={selectClass}
                    >
                      <option value="">— Select —</option>
                      {calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>{cal.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-base font-semibold">Appointment user</Label>
                      <GhlHelpIcon anchor="calendar-users" />
                    </div>
                    <select
                      value={ghlConfig.appointmentUserId ?? ''}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, appointmentUserId: e.target.value || undefined }))}
                      className={selectClass}
                    >
                      <option value="">— Select —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-base font-semibold">Call user</Label>
                      <GhlHelpIcon anchor="calendar-users" />
                    </div>
                    <select
                      value={ghlConfig.callUserId ?? ''}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, callUserId: e.target.value || undefined }))}
                      className={selectClass}
                    >
                      <option value="">— Select —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="redirectAfterAppointment"
                      checked={ghlConfig.redirectAfterAppointment === true}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, redirectAfterAppointment: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <Label htmlFor="redirectAfterAppointment" className="text-base font-semibold cursor-pointer flex items-center gap-1.5">Redirect after appointment booking <GhlHelpIcon anchor="redirect-after-appointment" /></Label>
                  </div>
                    {ghlConfig.redirectAfterAppointment && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Label className="text-base font-semibold">Appointment redirect URL</Label>
                          <GhlHelpIcon anchor="redirect-after-appointment" />
                        </div>
                        <Input
                          type="url"
                          value={ghlConfig.appointmentRedirectUrl ?? ''}
                          onChange={(e) => setGhlConfig((c) => ({ ...c, appointmentRedirectUrl: e.target.value || undefined }))}
                          placeholder="https://..."
                          className={inputClass}
                        />
                      </div>
                    )}
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="formIsIframed"
                      checked={ghlConfig.formIsIframed === true}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, formIsIframed: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <Label htmlFor="formIsIframed" className="text-base font-semibold cursor-pointer">
                      Form is iframed (pre-fill from GHL)
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    When checked, the quote form loads in an iframe with a GHL contact ID in the URL. We fetch name, phone, email, and address from GHL and land the user on the address step (Google autocomplete). Use iframe URL: <code className="text-xs">?contactId=&#123;&#123;Contact.Id&#125;&#125;</code>
                  </p>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Label className="text-base font-semibold">In-service tags</Label>
                    <GhlHelpIcon anchor="service-area-tags" />
                  </div>
                  <TagPicker
                    value={Array.isArray(ghlConfig.inServiceTags) ? ghlConfig.inServiceTags.join(', ') : ''}
                    onChange={(csv) => setGhlConfig((c) => ({ ...c, inServiceTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                    suggestions={ghlTags.map((t) => t.name)}
                    placeholder="Search or type a tag…"
                    className="mt-3"
                  />
                </div>
                <div className="pt-2 border-t border-border">
                  <Label className="text-base font-semibold">Out-of-service tags</Label>
                  <TagPicker
                    value={Array.isArray(ghlConfig.outOfServiceTags) ? ghlConfig.outOfServiceTags.join(', ') : ''}
                    onChange={(csv) => setGhlConfig((c) => ({ ...c, outOfServiceTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                    suggestions={ghlTags.map((t) => t.name)}
                    placeholder="Search or type a tag…"
                    className="mt-3"
                  />
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Label className="text-base font-semibold">Appointment booked tags</Label>
                    <GhlHelpIcon anchor="appointment-booked-tags" />
                  </div>
                  <TagPicker
                    value={Array.isArray(ghlConfig.appointmentBookedTags) ? ghlConfig.appointmentBookedTags.join(', ') : ''}
                    onChange={(csv) => setGhlConfig((c) => ({ ...c, appointmentBookedTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                    suggestions={ghlTags.map((t) => t.name)}
                    placeholder="Search or type a tag…"
                    className="mt-3"
                  />
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Label className="text-base font-semibold">Quote completed tags</Label>
                    <GhlHelpIcon anchor="quote-completed-tags" />
                  </div>
                  <TagPicker
                    value={Array.isArray(ghlConfig.quoteCompletedTags) ? ghlConfig.quoteCompletedTags.join(', ') : ''}
                    onChange={(csv) => setGhlConfig((c) => ({ ...c, quoteCompletedTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                    suggestions={ghlTags.map((t) => t.name)}
                    placeholder="Search or type a tag…"
                    className="mt-3"
                  />
                </div>
                {loadingGhlLists && <p className="text-sm text-muted-foreground">Loading pipelines, users, calendars…</p>}
                <Button onClick={saveGhlConfig} disabled={savingSection === 'ghl-config'} className="w-full h-11 font-semibold flex items-center gap-2">
                  {savingSection === 'ghl-config' ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save HighLevel config</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
