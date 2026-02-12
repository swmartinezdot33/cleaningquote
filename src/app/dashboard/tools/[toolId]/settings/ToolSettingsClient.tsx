'use client';

import { useState, useEffect, useRef } from 'react';
import { useDashboardApi } from '@/lib/dashboard-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ChevronDown, Code, FileText, Save, CheckCircle, AlertCircle, Copy, Upload, BookOpen, Settings, HelpCircle, Pencil, User, Briefcase, Calendar, Tag, LayoutTemplate, MapPin, DollarSign, Palette, Webhook } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
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
type CardId = 'widget' | 'form' | 'tracking' | 'form-tracking' | 'ghl-config' | 'service-area' | 'pricing-structure';

const GHL_CONFIG_HELP = '/help/ghl-config';
function GhlHelpIcon({ anchor }: { anchor: string }) {
  return (
    <Link href={`${GHL_CONFIG_HELP}#${anchor}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-muted-foreground hover:text-primary shrink-0" title="Help">
      <HelpCircle className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function ToolSettingsClient({ toolId, toolSlug }: { toolId: string; toolSlug?: string }) {
  const { api } = useDashboardApi();
  const [widget, setWidget] = useState({ title: '', subtitle: '', primaryColor: '#7c3aed' });
  const [form, setForm] = useState<Record<string, string>>({});
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
    webhookEnabled?: boolean;
    webhookUrl?: string;
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
  const [quotedAmountFieldOpen, setQuotedAmountFieldOpen] = useState(false);
  const quotedAmountFieldRef = useRef<HTMLDivElement>(null);
  const [loadingGhlLists, setLoadingGhlLists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<CardId | null>(null);
  const [expandedRuleIndex, setExpandedRuleIndex] = useState<number | null>(null);
  const [sectionMessage, setSectionMessage] = useState<{ card: CardId; type: 'success' | 'error'; text: string } | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<CardId>>(new Set());
  const [queryLinkCopied, setQueryLinkCopied] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgServiceAreas, setOrgServiceAreas] = useState<{ id: string; name: string }[]>([]);
  const [assignedServiceAreaIds, setAssignedServiceAreaIds] = useState<string[]>([]);
  const [savingServiceAreaAssignments, setSavingServiceAreaAssignments] = useState(false);
  const [pricingStructures, setPricingStructures] = useState<{ id: string; name: string }[]>([]);
  const [selectedPricingStructureId, setSelectedPricingStructureId] = useState<string | null>(null);
  const [isDefaultQuoter, setIsDefaultQuoter] = useState(false);
  const [defaultQuoterSaving, setDefaultQuoterSaving] = useState(false);

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
          api(`/api/dashboard/tools/${toolId}/widget-settings`),
          api(`/api/dashboard/tools/${toolId}/form-settings`),
          api(`/api/dashboard/tools/${toolId}/ghl-settings`),
          api(`/api/dashboard/tools/${toolId}/tracking-codes`),
          api(`/api/dashboard/tools/${toolId}/ghl-config`),
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
        const toolRes = await api(`/api/dashboard/tools/${toolId}`);
        if (toolRes.ok) {
          const { tool: toolData } = await toolRes.json();
          setIsDefaultQuoter(!!toolData?.isDefaultQuoter);
          const oid = toolData?.org_id;
          if (oid) {
            setOrgId(oid);
            const [areasRes, assignRes, pricingRes] = await Promise.all([
              api(`/api/dashboard/orgs/${oid}/service-areas`),
              api(`/api/dashboard/tools/${toolId}/service-area-assignments`),
              api(`/api/dashboard/tools/${toolId}/pricing-structures`),
            ]);
            if (areasRes.ok) {
              const areasData = await areasRes.json();
              setOrgServiceAreas(areasData.serviceAreas ?? []);
            }
            if (assignRes.ok) {
              const assignData = await assignRes.json();
              setAssignedServiceAreaIds(assignData.serviceAreaIds ?? []);
            }
            if (pricingRes.ok) {
              const pricingData = await pricingRes.json();
              setPricingStructures(pricingData.pricingStructures ?? []);
              setSelectedPricingStructureId(pricingData.selectedPricingStructureId ?? null);
            }
          }
        }
      } catch {
        setSectionMessage({ card: 'widget', type: 'error', text: 'Failed to load settings' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toolId, api]);

  useEffect(() => {
    if (!ghlStatus?.connected) return;
    const loadLists = async () => {
      setLoadingGhlLists(true);
      try {
        const [pipeRes, usrRes, calRes, tagRes, fieldsRes] = await Promise.all([
          api(`/api/dashboard/tools/${toolId}/ghl-pipelines`),
          api(`/api/dashboard/tools/${toolId}/ghl-users`),
          api(`/api/dashboard/tools/${toolId}/ghl-calendars`),
          api(`/api/dashboard/tools/${toolId}/ghl-tags`),
          api(`/api/dashboard/tools/${toolId}/ghl-custom-fields`),
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
  }, [toolId, ghlStatus?.connected, api]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quotedAmountFieldRef.current && !quotedAmountFieldRef.current.contains(e.target as Node)) {
        setQuotedAmountFieldOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveWidget = async () => {
    setSavingSection('widget');
    clearMessage('widget');
    try {
      const res = await api(`/api/dashboard/tools/${toolId}/widget-settings`, {
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
      const res = await api(`/api/dashboard/tools/${toolId}/form-settings`, {
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

  const saveTracking = async () => {
    setSavingSection('tracking');
    clearMessage('tracking');
    try {
      const res = await api(`/api/dashboard/tools/${toolId}/tracking-codes`, {
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

  const saveFormAndTracking = async () => {
    setSavingSection('form-tracking');
    clearMessage('form-tracking');
    try {
      const [formRes, trackingRes] = await Promise.all([
        api(`/api/dashboard/tools/${toolId}/form-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }),
        api(`/api/dashboard/tools/${toolId}/tracking-codes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customHeadCode: customHeadCode.trim(),
            trackingQuoteSummary: trackingQuoteSummary.trim(),
            trackingAppointmentBooking: trackingAppointmentBooking.trim(),
          }),
        }),
      ]);
      const formOk = formRes.ok;
      const trackingOk = trackingRes.ok;
      if (formOk && trackingOk) {
        setSectionMessage({ card: 'form-tracking', type: 'success', text: 'Query parameters and tracking saved.' });
      } else if (!formOk && !trackingOk) {
        setSectionMessage({ card: 'form-tracking', type: 'error', text: 'Failed to save query parameters and tracking.' });
      } else {
        setSectionMessage({ card: 'form-tracking', type: 'success', text: formOk ? 'Tracking saved.' : 'Query parameters saved.' });
      }
    } catch {
      setSectionMessage({ card: 'form-tracking', type: 'error', text: 'Failed to save.' });
    } finally {
      setSavingSection(null);
    }
  };

  const saveGhlConfig = async () => {
    setSavingSection('ghl-config');
    clearMessage('ghl-config');
    try {
      const res = await api(`/api/dashboard/tools/${toolId}/ghl-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ghlConfig),
      });
      const data = await res.json();
      if (res.ok) {
        // Also persist form (e.g. internalToolOnly) when saving from Advanced Config
        const formRes = await api(`/api/dashboard/tools/${toolId}/form-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        setSectionMessage({
          card: 'ghl-config',
          type: 'success',
          text: formRes.ok ? 'Advanced configuration saved.' : (data.message ?? 'HighLevel configuration saved'),
        });
      } else {
        setSectionMessage({ card: 'ghl-config', type: 'error', text: data.error ?? 'Failed to save HighLevel config' });
      }
    } catch {
      setSectionMessage({ card: 'ghl-config', type: 'error', text: 'Failed to save Advanced Configuration' });
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
        pricingStructureId: null as string | null,
      }));
      const res = await api(`/api/dashboard/tools/${toolId}/service-area-assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSectionMessage({ card: 'service-area', type: 'error', text: data.error ?? 'Failed to save assignments' });
        return;
      }
      const formRes = await api(`/api/dashboard/tools/${toolId}/form-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (formRes.ok) {
        setSectionMessage({ card: 'service-area', type: 'success', text: 'Service area settings saved.' });
      } else {
        setSectionMessage({ card: 'service-area', type: 'success', text: 'Service area assignments saved.' });
      }
    } catch {
      setSectionMessage({ card: 'service-area', type: 'error', text: 'Failed to save service area settings' });
    } finally {
      setSavingServiceAreaAssignments(false);
    }
  };

  const savePricingStructure = async () => {
    setSavingSection('pricing-structure');
    clearMessage('pricing-structure');
    try {
      const res = await api(`/api/dashboard/tools/${toolId}/pricing-structures`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingStructureId: selectedPricingStructureId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSectionMessage({ card: 'pricing-structure', type: 'success', text: 'Pricing structure saved. Quotes for this tool will use the selected structure.' });
      } else {
        setSectionMessage({ card: 'pricing-structure', type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setSectionMessage({ card: 'pricing-structure', type: 'error', text: 'Failed to save pricing structure' });
    } finally {
      setSavingSection(null);
    }
  };

  const selectClass = 'mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm bg-background';
  const inputClass = 'mt-3';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingDots size="lg" className="text-primary" />
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
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <Palette className="h-5 w-5 text-primary" />
                  Site Customization
                </CardTitle>
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
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefaultQuoter}
                      disabled={defaultQuoterSaving}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        setIsDefaultQuoter(checked);
                        setDefaultQuoterSaving(true);
                        try {
                          const res = await api(`/api/dashboard/tools/${toolId}/default-quoter`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ set: checked }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            setIsDefaultQuoter(!checked);
                            setSectionMessage({ card: 'widget', type: 'error', text: data.error ?? 'Failed to update default quoter' });
                          }
                        } catch {
                          setIsDefaultQuoter(!checked);
                          setSectionMessage({ card: 'widget', type: 'error', text: 'Failed to update default quoter' });
                        } finally {
                          setDefaultQuoterSaving(false);
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <span className="font-medium text-foreground">Use as default quoter</span>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        When checked, this tool&apos;s quote form opens in a modal when users click &quot;New Quote&quot; on the Quotes page. Only one tool per organization can be the default.
                      </p>
                    </div>
                  </label>
                  {defaultQuoterSaving && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <LoadingDots size="sm" className="text-current" /> Updating...
                    </p>
                  )}
                </div>
                <Button onClick={saveWidget} disabled={savingSection === 'widget'} className="w-full h-11 font-semibold flex items-center gap-2">
                  {savingSection === 'widget' ? <><LoadingDots size="sm" className="text-current" /> Saving...</> : <><Save className="h-4 w-4" /> Save Widget Settings</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Pricing Structure */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('pricing-structure')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <DollarSign className="h-6 w-6 text-primary" />
                  Pricing Structure
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Choose which pricing structure this tool uses for quotes. Create and edit structures in{' '}
                  <Link href="/dashboard/pricing-structures" className="text-primary hover:underline font-medium">Pricing structures</Link>.
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('pricing-structure') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('pricing-structure') && (
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4">
                {sectionMessage?.card === 'pricing-structure' && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200' : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p className="font-medium">{sectionMessage.text}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="pricing-structure-select" className="text-base font-semibold">Pricing structure for this tool</Label>
                  <select
                    id="pricing-structure-select"
                    value={selectedPricingStructureId ?? ''}
                    onChange={(e) => setSelectedPricingStructureId(e.target.value || null)}
                    className={selectClass}
                  >
                    <option value="">Tool default pricing</option>
                    {pricingStructures.map((ps) => (
                      <option key={ps.id} value={ps.id}>{ps.name}</option>
                    ))}
                  </select>
                  {pricingStructures.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No pricing structures yet. Create one in{' '}
                      <Link href="/dashboard/pricing-structures" className="text-primary hover:underline">Pricing structures</Link>, then select it here.
                    </p>
                  )}
                </div>
                <Button onClick={savePricingStructure} disabled={savingSection === 'pricing-structure'} className="gap-2">
                  {savingSection === 'pricing-structure' ? <LoadingDots size="sm" className="text-current" /> : <Save className="h-4 w-4" />}
                  {savingSection === 'pricing-structure' ? 'Saving…' : 'Save pricing structure'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Service Area(s) */}
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
                  Service Area(s)
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
                  <div>
                    <p className="text-muted-foreground text-sm">
                      No service areas yet. Create one in{' '}
                      <Link href="/dashboard/service-areas" className="text-primary hover:underline">Service Areas</Link>, then return here to assign them to this tool.
                    </p>
                    <Button
                      onClick={saveServiceAreaAssignments}
                      disabled={savingServiceAreaAssignments}
                      className="gap-2 mt-3"
                    >
                      {savingServiceAreaAssignments ? <LoadingDots size="sm" className="text-current" /> : null}
                      Save service area settings
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      When a user enters an address, we check if it falls inside any of the selected areas below.
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
                                } else {
                                  setAssignedServiceAreaIds((prev) => prev.filter((id) => id !== area.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-input accent-primary"
                            />
                            <span className="font-medium">{area.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={saveServiceAreaAssignments}
                      disabled={savingServiceAreaAssignments}
                      className="gap-2"
                    >
                      {savingServiceAreaAssignments ? <LoadingDots size="sm" className="text-current" /> : null}
                      Save service area assignments
                    </Button>
                  </>
                )}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="openSurveyInNewTabServiceArea" className="text-base font-semibold cursor-pointer">
                        Open survey in new tab after service area check success
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        When enabled, after the user enters their address and passes the service area check, a new tab opens to continue the survey. Contact info is pre-filled and they skip to house details. Only works when the widget is embedded in an iframe.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        id="openSurveyInNewTabServiceArea"
                        checked={String(form.openSurveyInNewTab) === 'true'}
                        onChange={(e) => setForm((f) => ({ ...f, openSurveyInNewTab: e.target.checked ? 'true' : 'false' }))}
                        className="w-4 h-4 rounded border-input accent-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Query Parameters & Tracking */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('form-tracking')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <Code className="h-5 w-5 text-primary" />
                  Query Parameters & Tracking
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  URL query parameters for pre-fill and tracking/analytics code (every page, quote summary, appointment booking).
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('form-tracking') ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          {isCardExpanded('form-tracking') && (
            <CardContent className="pt-8 pb-8">
              <div className="space-y-8">
                {(sectionMessage?.card === 'form' || sectionMessage?.card === 'tracking' || sectionMessage?.card === 'form-tracking') && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sectionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sectionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p>{sectionMessage.text}</p>
                  </div>
                )}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold">Tracking & Analytics</h3>
                  <p className="text-sm text-muted-foreground">Three code boxes: every page, quote summary, appointment booking.</p>
                  <div>
                    <Label htmlFor="custom-head-code-ft" className="text-base font-semibold">1. Every page (e.g. Meta PageView)</Label>
                    <textarea
                      id="custom-head-code-ft"
                      value={customHeadCode}
                      onChange={(e) => setCustomHeadCode(e.target.value)}
                      rows={4}
                      className="mt-2 w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                      placeholder="<script>...</script>"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tracking-quote-summary-ft" className="text-base font-semibold">2. Quote Summary only (e.g. Meta Conversion)</Label>
                    <textarea
                      id="tracking-quote-summary-ft"
                      value={trackingQuoteSummary}
                      onChange={(e) => setTrackingQuoteSummary(e.target.value)}
                      rows={4}
                      className="mt-2 w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                      placeholder="<script>...</script>"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tracking-appointment-booking-ft" className="text-base font-semibold">3. Appointment booking only</Label>
                    <textarea
                      id="tracking-appointment-booking-ft"
                      value={trackingAppointmentBooking}
                      onChange={(e) => setTrackingAppointmentBooking(e.target.value)}
                      rows={4}
                      className="mt-2 w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                      placeholder="<script>...</script>"
                    />
                  </div>
                </section>
                <section className="space-y-4 border-t border-border pt-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Query parameters
                  </h3>
                  <p className="text-sm text-muted-foreground">Configure which URL query parameters pre-fill the form.</p>
                  {['firstNameParam', 'lastNameParam', 'emailParam', 'phoneParam', 'addressParam'].map((key) => (
                    <div key={key}>
                      <Label htmlFor={`ft-${key}`} className="text-base font-semibold">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                      <Input
                        id={`ft-${key}`}
                        value={(form[key] as string) ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={`e.g. ${key === 'emailParam' ? 'email' : key === 'phoneParam' ? 'phone' : key.toLowerCase().replace('param', '')}`}
                        className={inputClass}
                      />
                    </div>
                  ))}
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
                        <Label className="text-base font-semibold">Query link (copy and replace placeholders)</Label>
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
                </section>
                <Button onClick={saveFormAndTracking} disabled={savingSection === 'form-tracking'} className="w-full h-11 font-semibold flex items-center gap-2">
                  {savingSection === 'form-tracking' ? <><LoadingDots size="sm" className="text-current" /> Saving...</> : <><Save className="h-4 w-4" /> Save query parameters & tracking</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Advanced Configuration (per-tool CRM / HighLevel) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border overflow-visible">
          <CardHeader
            className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border pb-6 cursor-pointer"
            onClick={() => toggleCard('ghl-config')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <Settings className="h-5 w-5 text-primary" />
                  Advanced Configuration
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  Configure what happens when quotes and bookings are submitted. Set your CRM connection in Settings first; this card is per-tool.
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
                <section className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 overflow-visible">
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
                      <p className="text-xs text-muted-foreground mb-2">Search and select a HighLevel contact field. Type to narrow the list.</p>
                    {customFields.length > 0 ? (
                      <div className="relative max-w-md" ref={quotedAmountFieldRef}>
                        <Input
                          type="text"
                          placeholder="Type to search fields..."
                          value={quotedAmountFieldOpen ? quotedAmountFieldSearch : (() => {
                            const saved = (ghlConfig.quotedAmountField ?? '').trim();
                            const norm = (s: string) => s.toLowerCase().replace(/^contact\./, '');
                            const sel = customFields.find((f) => saved && (f.key === saved || norm(f.key) === norm(saved)));
                            return sel ? `${sel.name} (${sel.key})` : quotedAmountFieldSearch || '';
                          })()}
                          onChange={(e) => {
                            setQuotedAmountFieldSearch(e.target.value);
                            setQuotedAmountFieldOpen(true);
                          }}
                          onFocus={() => setQuotedAmountFieldOpen(true)}
                          className={inputClass}
                        />
                        {quotedAmountFieldOpen && (() => {
                          const q = quotedAmountFieldSearch.trim().toLowerCase();
                          const searchNorm = q.replace(/^contact\./, '');
                          const filtered = customFields.filter((f) => {
                            if (!q) return true;
                            const keyNorm = f.key.toLowerCase().replace(/^contact\./, '');
                            const nameLower = f.name.toLowerCase();
                            return nameLower.includes(q) || f.key.toLowerCase().includes(q) || keyNorm.includes(searchNorm) || searchNorm.includes(keyNorm) || (searchNorm.length >= 2 && nameLower.includes(searchNorm));
                          });
                          return (
                            <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-input bg-popover py-1 shadow-md bg-background">
                              {filtered.map((f) => (
                                <li
                                  key={f.key}
                                  className="cursor-pointer px-3 py-2 text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                                  onClick={() => {
                                    setGhlConfig((c) => ({ ...c, quotedAmountField: f.key }));
                                    setQuotedAmountFieldSearch('');
                                    setQuotedAmountFieldOpen(false);
                                  }}
                                >
                                  {f.name} ({f.key})
                                </li>
                              ))}
                              {filtered.length === 0 && (
                                <li className="px-3 py-2 text-sm text-muted-foreground">No fields match your search.</li>
                              )}
                            </ul>
                          );
                        })()}
                      </div>
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
                    <div className="flex items-start gap-3 mt-4 pt-4 border-t border-border">
                      <input
                        type="checkbox"
                        id="internalToolOnlyFormBehavior"
                        checked={String(form.internalToolOnly ?? '') === 'true'}
                        onChange={(e) => setForm((f) => ({ ...f, internalToolOnly: e.target.checked ? 'true' : 'false' }))}
                        className="mt-0.5 w-4 h-4 rounded border-input accent-primary shrink-0"
                      />
                      <div className="min-w-0">
                        <Label htmlFor="internalToolOnlyFormBehavior" className="text-sm font-semibold cursor-pointer">Internal tool only</Label>
                        <p className="text-xs text-muted-foreground mt-1">Collect contact info at the end of the survey instead of the beginning. On the quote summary, show a &quot;Save quote&quot; button instead of Book appointment / Schedule callback.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Webhooks */}
                <section className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30 dark:bg-muted/20">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Webhook className="h-4 w-4 text-primary" />
                      Webhooks
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Send events to Zapier or another CRM when address is in/out of service, quote summary is viewed, or an appointment is booked</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="webhookEnabled"
                        checked={ghlConfig.webhookEnabled === true}
                        onChange={(e) => setGhlConfig((c) => ({ ...c, webhookEnabled: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded border-input accent-primary shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="webhookEnabled" className="text-sm font-semibold cursor-pointer">Enable webhook</Label>
                        <p className="text-xs text-muted-foreground mt-1">We will POST a JSON payload to your URL for: out of service area, in service area, quote summary viewed, appointment booked.</p>
                      </div>
                    </div>
                    {ghlConfig.webhookEnabled && (
                      <div>
                        <Label htmlFor="webhookUrl" className="text-sm font-semibold">Webhook URL</Label>
                        <Input
                          id="webhookUrl"
                          type="url"
                          value={ghlConfig.webhookUrl ?? ''}
                          onChange={(e) => setGhlConfig((c) => ({ ...c, webhookUrl: e.target.value }))}
                          placeholder="https://hooks.zapier.com/..."
                          className="mt-2 max-w-md"
                        />
                      </div>
                    )}
                  </div>
                </section>

                {loadingGhlLists && <p className="text-sm text-muted-foreground">Loading pipelines, users, calendars…</p>}
                <Button onClick={saveGhlConfig} disabled={savingSection === 'ghl-config'} className="w-full h-11 font-semibold flex items-center gap-2 rounded-xl">
                  {savingSection === 'ghl-config' ? <><LoadingDots size="sm" className="text-current" /> Saving...</> : <><Save className="h-4 w-4" /> Save Advanced Configuration</>}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

    </div>
  );
}
