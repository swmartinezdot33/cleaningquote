'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ChevronDown, Sparkles, Code, FileText, Save, Loader2, CheckCircle, AlertCircle, Copy, Upload, BookOpen, Settings, HelpCircle, Pencil, User, Briefcase, Calendar, Tag, LayoutTemplate, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { TagPicker } from '@/components/ui/TagPicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
type CardId = 'widget' | 'form' | 'ghl' | 'tracking' | 'ghl-config' | 'service-area';

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
    disqualifiedLeadTags?: string[];
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
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgServiceAreas, setOrgServiceAreas] = useState<{ id: string; name: string }[]>([]);
  const [assignedServiceAreaIds, setAssignedServiceAreaIds] = useState<string[]>([]);
  const [assignmentPricing, setAssignmentPricing] = useState<Record<string, string | null>>({});
  const [pricingStructures, setPricingStructures] = useState<{ id: string; name: string }[]>([]);
  const [savingServiceAreaAssignments, setSavingServiceAreaAssignments] = useState(false);

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
        const [wRes, fRes, ghlRes, trackRes, configRes] = await Promise.all([
          fetch(`/api/dashboard/tools/${toolId}/widget-settings`),
          fetch(`/api/dashboard/tools/${toolId}/form-settings`),
          fetch(`/api/dashboard/tools/${toolId}/ghl-settings`),
          fetch(`/api/dashboard/tools/${toolId}/tracking-codes`),
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
        if (configRes.ok) {
          const { config } = await configRes.json();
          if (config) setGhlConfig((prev) => ({ ...prev, ...config }));
        }
        const toolRes = await fetch(`/api/dashboard/tools/${toolId}`);
        if (toolRes.ok) {
          const { tool: toolData } = await toolRes.json();
          const oid = toolData?.org_id;
          if (oid) {
            setOrgId(oid);
            const [areasRes, assignRes] = await Promise.all([
              fetch(`/api/dashboard/orgs/${oid}/service-areas`),
              fetch(`/api/dashboard/tools/${toolId}/service-area-assignments`),
            ]);
            if (areasRes.ok) {
              const areasData = await areasRes.json();
              setOrgServiceAreas(areasData.serviceAreas ?? []);
            }
            if (assignRes.ok) {
              const assignData = await assignRes.json();
              setAssignedServiceAreaIds(assignData.serviceAreaIds ?? []);
              const assignments = assignData.assignments ?? [];
              const byArea: Record<string, string | null> = {};
              for (const a of assignments) {
                if (a.serviceAreaId) byArea[a.serviceAreaId] = a.pricingStructureId ?? null;
              }
              setAssignmentPricing(byArea);
            }
          }
        }
        const psRes = await fetch(`/api/dashboard/tools/${toolId}/pricing-structures`);
        if (psRes.ok) {
          const psData = await psRes.json();
          setPricingStructures(psData.pricingStructures ?? []);
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

  const saveForm = async () => {
    setSavingSection('form');
    clearMessage('form');
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/form-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSectionMessage({ card: 'form', type: 'success', text: data.message ?? 'Form settings saved' });
      } else {
        setSectionMessage({ card: 'form', type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setSectionMessage({ card: 'form', type: 'error', text: 'Failed to save form settings' });
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

  const saveServiceAreaAssignments = async () => {
    setSavingServiceAreaAssignments(true);
    clearMessage('service-area');
    try {
      const assignments = assignedServiceAreaIds.map((serviceAreaId) => ({
        serviceAreaId,
        pricingStructureId: assignmentPricing[serviceAreaId] ?? null,
      }));
      const res = await fetch(`/api/dashboard/tools/${toolId}/service-area-assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      if (res.ok) {
        setSectionMessage({ card: 'service-area', type: 'success', text: 'Service area assignments saved.' });
      } else {
        setSectionMessage({ card: 'service-area', type: 'error', text: data.error ?? 'Failed to save assignments' });
      }
    } catch {
      setSectionMessage({ card: 'service-area', type: 'error', text: 'Failed to save service area assignments' });
    } finally {
      setSavingServiceAreaAssignments(false);
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
                <div className="border-t border-border pt-6">
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
                </div>
                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="internalToolOnly" className="text-base font-semibold cursor-pointer">
                        Internal tool only
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Collect contact info (name, email, phone, address) at the end of the survey instead of the beginning. On the quote summary, show a &quot;Save quote&quot; button instead of Book appointment / Schedule callback.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        id="internalToolOnly"
                        checked={String(form.internalToolOnly ?? '') === 'true'}
                        onChange={(e) => setForm((f) => ({ ...f, internalToolOnly: e.target.checked ? 'true' : 'false' }))}
                        className="w-4 h-4 rounded border-input"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={() => saveForm()} disabled={savingSection === 'form'} className="w-full h-11 font-semibold flex items-center gap-2">
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

      {/* Service area check */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('service-area')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <MapPin className="h-5 w-5 text-primary" />
                  Service area check
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Choose which service areas to use for address checks on this tool. Create and manage areas in{' '}
                  <Link href="/dashboard/service-areas" className="text-primary hover:underline font-medium">Service Areas</Link>.
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('service-area') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('service-area') && (
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4">
                {sectionMessage?.card === 'service-area' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200' : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p className="font-medium">{sectionMessage.text}</p>
                  </div>
                )}
                {orgServiceAreas.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No service areas yet. Create one in{' '}
                    <Link href="/dashboard/service-areas" className="text-primary hover:underline">Service Areas</Link>, then return here to assign them to this tool.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      When a user enters an address, we check if it falls inside any of the selected areas. You can assign a pricing structure per area so quotes use that area&apos;s pricing.
                    </p>
                    <ul className="space-y-2">
                      {orgServiceAreas.map((area) => (
                        <li key={area.id} className="flex flex-col gap-1">
                          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/30">
                            <input
                              type="checkbox"
                              checked={assignedServiceAreaIds.includes(area.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignedServiceAreaIds((prev) => [...prev, area.id]);
                                  setAssignmentPricing((prev) => ({ ...prev, [area.id]: null }));
                                } else {
                                  setAssignedServiceAreaIds((prev) => prev.filter((id) => id !== area.id));
                                  setAssignmentPricing((prev) => {
                                    const next = { ...prev };
                                    delete next[area.id];
                                    return next;
                                  });
                                }
                              }}
                              className="w-4 h-4 rounded border-input accent-primary"
                            />
                            <span className="font-medium">{area.name}</span>
                          </label>
                          {assignedServiceAreaIds.includes(area.id) && pricingStructures.length > 0 && (
                            <div className="ml-6 pl-2 border-l-2 border-border">
                              <Label className="text-xs text-muted-foreground">Pricing for this area</Label>
                              <select
                                value={assignmentPricing[area.id] ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setAssignmentPricing((prev) => ({ ...prev, [area.id]: v || null }));
                                }}
                                className={selectClass}
                              >
                                <option value="">Tool default</option>
                                {pricingStructures.map((ps) => (
                                  <option key={ps.id} value={ps.id}>{ps.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={saveServiceAreaAssignments}
                      disabled={savingServiceAreaAssignments}
                      className="gap-2"
                    >
                      {savingServiceAreaAssignments ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save service area assignments
                    </Button>
                  </>
                )}
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

      {/* HighLevel Integration Config */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border overflow-hidden">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('ghl-config')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <Settings className="h-5 w-5 text-primary" />
                  HighLevel CRM Config
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  Control what happens in HighLevel when quotes and bookings happen. Save your connection above first.
                  <Link href="/help/ghl-config" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                    <BookOpen className="h-3.5 w-3.5" />
                    Full guide
                  </Link>
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('ghl-config') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('ghl-config') && (
            <CardContent className="pt-6 pb-8">
              <div className="space-y-8">
                {sectionMessage?.card === 'ghl-config' && (
                  <div
                    className={`p-4 rounded-xl flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p className="font-medium">{sectionMessage.text}</p>
                  </div>
                )}

                {/* At-a-glance summary */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Active:</span>
                  {ghlConfig.createContact && <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Contact</span>}
                  {ghlConfig.createNote && <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Note</span>}
                  {ghlConfig.createQuoteObject && <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Quote object</span>}
                  {ghlConfig.createOpportunity && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                      Opportunity{ghlConfig.pipelineId ? ` → ${pipelines.find((p) => p.id === ghlConfig.pipelineId)?.name ?? 'Pipeline'}` : ''}
                    </span>
                  )}
                  {!ghlConfig.createContact && !ghlConfig.createNote && !ghlConfig.createQuoteObject && !ghlConfig.createOpportunity && (
                    <span className="text-muted-foreground italic">Nothing sent to CRM yet — enable options below</span>
                  )}
                </div>

                {/* Section: When a quote is submitted */}
                <section className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30 dark:bg-muted/20">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      When a quote is submitted
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose what we create or update in HighLevel</p>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      { key: 'createContact' as const, label: 'Create or update contact', desc: 'Sync name, email, phone, address', anchor: 'create-contact' },
                      { key: 'createNote' as const, label: 'Add a note', desc: 'Quote summary and details', anchor: 'create-note' },
                      { key: 'createQuoteObject' as const, label: 'Create Quote (custom object)', desc: 'Store quote in your Quote object', anchor: 'create-quote-object' },
                      { key: 'createOpportunity' as const, label: 'Create opportunity', desc: 'Deal in pipeline with value and stage', anchor: 'create-opportunity' },
                    ].map(({ key, label, desc, anchor }) => (
                      <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors">
                        <input
                          type="checkbox"
                          id={key}
                          checked={ghlConfig[key]}
                          onChange={(e) => setGhlConfig((c) => ({ ...c, [key]: e.target.checked }))}
                          className="w-4 h-4 rounded border-input accent-primary"
                        />
                        <label htmlFor={key} className="flex-1 cursor-pointer flex items-start justify-between gap-2">
                          <span>
                            <span className="font-medium text-foreground block">{label}</span>
                            <span className="text-xs text-muted-foreground">{desc}</span>
                          </span>
                          <GhlHelpIcon anchor={anchor} />
                        </label>
                      </div>
                    ))}
                  </div>
                </section>
                {/* Section: Opportunities (pipeline, stage, routing) */}
                {ghlConfig.createOpportunity && (
                  <section className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 overflow-hidden">
                    <div className="px-5 py-4 border-b border-border bg-muted/30 dark:bg-muted/20">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Opportunities
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Pipeline, stage, and UTM-based routing</p>
                    </div>
                    <div className="p-5 space-y-5">
                    {pipelines.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No pipelines found. Create a pipeline in HighLevel first.</p>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Label className="text-sm font-semibold">Default pipeline</Label>
                            <GhlHelpIcon anchor="default-pipeline" />
                          </div>
                          <select
                            value={ghlConfig.pipelineId ?? ''}
                            onChange={(e) => setGhlConfig((c) => ({ ...c, pipelineId: e.target.value || undefined, pipelineStageId: undefined }))}
                            className={selectClass}
                          >
                            <option value="">— Select a pipeline —</option>
                            {pipelines.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">Used when no UTM routing rule matches.</p>
                        </div>
                        {ghlConfig.pipelineId && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Label className="text-sm font-semibold">Default starting stage</Label>
                              <GhlHelpIcon anchor="default-pipeline" />
                            </div>
                            <select
                              value={ghlConfig.pipelineStageId ?? ''}
                              onChange={(e) => setGhlConfig((c) => ({ ...c, pipelineStageId: e.target.value || undefined }))}
                              className={selectClass}
                            >
                              <option value="">— Select a stage —</option>
                              {pipelines.find((p) => p.id === ghlConfig.pipelineId)?.stages?.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="pt-3 border-t border-border">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Label className="text-sm font-semibold">Pipeline routing by UTM</Label>
                            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                            <GhlHelpIcon anchor="pipeline-routing-utm" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            First matching rule wins. If none match, default pipeline is used.
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
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary/10"
                          >
                            + Add UTM rule
                          </Button>
                        </div>
                        {(ghlConfig.pipelineRoutingRules?.length ?? 0) > 0 && (
                          <div className="space-y-3 mt-3">
                            {(ghlConfig.pipelineRoutingRules ?? []).map((rule, idx) => (
                              <div key={idx} className="p-4 bg-background border border-border rounded-xl space-y-2">
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
                    </div>
                  </section>
                )}

                {/* Section: Quote value & custom fields */}
                <section className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30 dark:bg-muted/20">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary opacity-80" />
                      Quote value in HighLevel
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Map quoted amount to opportunity value and contact custom fields</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useDynamicPricing"
                        checked={ghlConfig.useDynamicPricingForValue !== false}
                        onChange={(e) => setGhlConfig((c) => ({ ...c, useDynamicPricingForValue: e.target.checked }))}
                        className="rounded border-input accent-primary"
                      />
                      <Label htmlFor="useDynamicPricing" className="text-sm font-semibold cursor-pointer flex items-center gap-1.5">Use quoted amount for opportunity value <GhlHelpIcon anchor="quoted-amount-value" /></Label>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Label className="text-sm font-semibold">Quoted amount field (contact custom field)</Label>
                        <GhlHelpIcon anchor="quoted-amount-field" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">Select a HighLevel contact field or enter a custom key (e.g. quoted_cleaning_price).</p>
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
                </section>

                {/* Section: Opportunity defaults + Calendars & booking */}
                <section className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30 dark:bg-muted/20">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Defaults, calendars & booking
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Assigned user, source, calendars, redirect, and event tags</p>
                  </div>
                  <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-sm font-semibold">Opportunity assigned to</Label>
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
                      <Label className="text-sm font-semibold">Opportunity source</Label>
                      <GhlHelpIcon anchor="opportunity-source" />
                    </div>
                    <Input
                      value={ghlConfig.opportunitySource ?? ''}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, opportunitySource: e.target.value || undefined }))}
                      placeholder="e.g. Quote Widget"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-sm font-semibold">Opportunity tags</Label>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-sm font-semibold">Appointment calendar</Label>
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
                    <Label className="text-sm font-semibold">Call calendar</Label>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label className="text-sm font-semibold">Appointment user</Label>
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
                      <Label className="text-sm font-semibold">Call user</Label>
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
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="redirectAfterAppointment"
                      checked={ghlConfig.redirectAfterAppointment === true}
                      onChange={(e) => setGhlConfig((c) => ({ ...c, redirectAfterAppointment: e.target.checked }))}
                      className="rounded border-input accent-primary"
                    />
                    <Label htmlFor="redirectAfterAppointment" className="text-sm font-semibold cursor-pointer flex items-center gap-1.5">Redirect after appointment booking <GhlHelpIcon anchor="redirect-after-appointment" /></Label>
                  </div>
                  {ghlConfig.redirectAfterAppointment && (
                    <div>
                      <Label className="text-sm font-semibold">Appointment redirect URL</Label>
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
                  </div>
                </section>

                {/* Section: Tags & automation */}
                <section className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30 dark:bg-muted/20">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      Tags & automation
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Apply tags when address is in/out of service, or when booking or quote events happen</p>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">In-service tags <GhlHelpIcon anchor="service-area-tags" /></Label>
                      <TagPicker
                        value={Array.isArray(ghlConfig.inServiceTags) ? ghlConfig.inServiceTags.join(', ') : ''}
                        onChange={(csv) => setGhlConfig((c) => ({ ...c, inServiceTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                        suggestions={ghlTags.map((t) => t.name)}
                        placeholder="Search or type a tag…"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Out-of-service tags</Label>
                      <TagPicker
                        value={Array.isArray(ghlConfig.outOfServiceTags) ? ghlConfig.outOfServiceTags.join(', ') : ''}
                        onChange={(csv) => setGhlConfig((c) => ({ ...c, outOfServiceTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                        suggestions={ghlTags.map((t) => t.name)}
                        placeholder="Search or type a tag…"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">Appointment booked tags <GhlHelpIcon anchor="appointment-booked-tags" /></Label>
                      <TagPicker
                        value={Array.isArray(ghlConfig.appointmentBookedTags) ? ghlConfig.appointmentBookedTags.join(', ') : ''}
                        onChange={(csv) => setGhlConfig((c) => ({ ...c, appointmentBookedTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                        suggestions={ghlTags.map((t) => t.name)}
                        placeholder="Search or type a tag…"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">Quote completed tags <GhlHelpIcon anchor="quote-completed-tags" /></Label>
                      <TagPicker
                        value={Array.isArray(ghlConfig.quoteCompletedTags) ? ghlConfig.quoteCompletedTags.join(', ') : ''}
                        onChange={(csv) => setGhlConfig((c) => ({ ...c, quoteCompletedTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                        suggestions={ghlTags.map((t) => t.name)}
                        placeholder="Search or type a tag…"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">Disqualified lead tags</Label>
                      <p className="text-xs text-muted-foreground mb-1.5">Applied to the contact in HighLevel when a lead is disqualified by a survey option (e.g. &quot;Disqualify lead&quot;).</p>
                      <TagPicker
                        value={Array.isArray(ghlConfig.disqualifiedLeadTags) ? ghlConfig.disqualifiedLeadTags.join(', ') : ''}
                        onChange={(csv) => setGhlConfig((c) => ({ ...c, disqualifiedLeadTags: csv.split(',').map((s) => s.trim()).filter(Boolean) }))}
                        suggestions={ghlTags.map((t) => t.name)}
                        placeholder="e.g. Disqualified, Out of Scope"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </section>

                {/* Section: Form behavior */}
                <section className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30 dark:bg-muted/20">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4 text-primary" />
                      Form behavior
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">When the form is embedded in HighLevel</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="formIsIframed"
                        checked={ghlConfig.formIsIframed === true}
                        onChange={(e) => setGhlConfig((c) => ({ ...c, formIsIframed: e.target.checked }))}
                        className="rounded border-input accent-primary"
                      />
                      <Label htmlFor="formIsIframed" className="text-sm font-semibold cursor-pointer">Form is iframed (pre-fill from GHL)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      We fetch name, phone, email, and address from GHL and land the user on the address step. Use iframe URL: <code className="bg-muted px-1 rounded text-[11px]">?contactId=&#123;&#123;Contact.Id&#125;&#125;</code>
                    </p>
                  </div>
                </section>

                {loadingGhlLists && <p className="text-sm text-muted-foreground">Loading pipelines, users, calendars…</p>}
                <Button onClick={saveGhlConfig} disabled={savingSection === 'ghl-config'} className="w-full h-11 font-semibold flex items-center gap-2 rounded-xl">
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
