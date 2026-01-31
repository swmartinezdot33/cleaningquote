'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2, Save, RotateCw, Eye, EyeOff, Sparkles, ArrowLeft, Copy, Code, ChevronDown, FileText, Upload, MapPin, Plus } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ghlToken, setGhlToken] = useState('');
  const [ghlTokenDisplay, setGhlTokenDisplay] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'testing'>(
    'unknown'
  );
  const [widgetTitle, setWidgetTitle] = useState('Get Your Quote');
  const [widgetSubtitle, setWidgetSubtitle] = useState("Let's get your professional cleaning price!");
  const [widgetPrimaryColor, setWidgetPrimaryColor] = useState('#0d9488');
  const [isSavingWidget, setIsSavingWidget] = useState(false);
  const [widgetMessage, setWidgetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [isTokenSectionExpanded, setIsTokenSectionExpanded] = useState(false);

  // Tracking Codes State (custom head code only – loads on quote summary page)
  const [customHeadCode, setCustomHeadCode] = useState('');
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Settings State
  const [firstNameParam, setFirstNameParam] = useState('');
  const [lastNameParam, setLastNameParam] = useState('');
  const [emailParam, setEmailParam] = useState('');
  const [phoneParam, setPhoneParam] = useState('');
  const [addressParam, setAddressParam] = useState('');
  const [openSurveyInNewTab, setOpenSurveyInNewTab] = useState(false);
  const [isLoadingFormSettings, setIsLoadingFormSettings] = useState(false);
  const [isSavingFormSettings, setIsSavingFormSettings] = useState(false);
  const [formSettingsMessage, setFormSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GHL Configuration States
  const [ghlConfigLoaded, setGhlConfigLoaded] = useState(false);
  const [createContact, setCreateContact] = useState(true);
  const [createOpportunity, setCreateOpportunity] = useState(false);
  const [createNote, setCreateNote] = useState(true);
  const [createQuoteObject, setCreateQuoteObject] = useState(true);
  const [pipelineRoutingRules, setPipelineRoutingRules] = useState<Array<{ 
    utmParam: string; 
    match: string; 
    value: string; 
    pipelineId: string; 
    pipelineStageId: string;
    opportunityStatus?: string;
    opportunityAssignedTo?: string;
    opportunitySource?: string;
    opportunityTags?: string[];
  }>>([]);
  const [expandedRuleIndex, setExpandedRuleIndex] = useState<number | null>(null);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [opportunityStatus, setOpportunityStatus] = useState<string>('open');
  const [opportunityValue, setOpportunityValue] = useState<number>(0);
  const [useDynamicPricingForValue, setUseDynamicPricingForValue] = useState<boolean>(true);
  const [selectedOpportunityAssignedTo, setSelectedOpportunityAssignedTo] = useState<string>('');
  const [opportunitySource, setOpportunitySource] = useState<string>('');
  const [selectedOpportunityTags, setSelectedOpportunityTags] = useState<Set<string>>(new Set());
  const [opportunityTagsSearch, setOpportunityTagsSearch] = useState<string>('');
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [pipelinesError, setPipelinesError] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Service Area and Tags State
  const [inServiceTags, setInServiceTags] = useState<string>('');
  const [outOfServiceTags, setOutOfServiceTags] = useState<string>('');
  const [serviceAreaFile, setServiceAreaFile] = useState<File | null>(null);
  const [serviceAreaMessage, setServiceAreaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUploadingServiceArea, setIsUploadingServiceArea] = useState(false);
  const [serviceAreaType, setServiceAreaType] = useState<'none' | 'direct' | 'network'>('none');
  const [networkLinkUrl, setNetworkLinkUrl] = useState<string | null>(null);
  const [polygonCoordinateCount, setPolygonCoordinateCount] = useState<number>(0);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedAppointmentCalendarId, setSelectedAppointmentCalendarId] = useState<string>('');
  const [selectedCallCalendarId, setSelectedCallCalendarId] = useState<string>('');
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedAppointmentUserId, setSelectedAppointmentUserId] = useState<string>('');
  const [selectedCallUserId, setSelectedCallUserId] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [quotedAmountField, setQuotedAmountField] = useState<string>('');
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(false);
  const [customFieldsError, setCustomFieldsError] = useState<string | null>(null);
  const [quotedAmountSearch, setQuotedAmountSearch] = useState<string>('');
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [ghlTags, setGhlTags] = useState<any[]>([]);
  const [selectedInServiceTags, setSelectedInServiceTags] = useState<Set<string>>(new Set());
  const [selectedOutOfServiceTags, setSelectedOutOfServiceTags] = useState<Set<string>>(new Set());
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [newInServiceTagName, setNewInServiceTagName] = useState<string>('');
  const [newOutOfServiceTagName, setNewOutOfServiceTagName] = useState<string>('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [inServiceTagSearch, setInServiceTagSearch] = useState<string>('');
  // Calendar availability state
  const [appointmentCalendarAvailability, setAppointmentCalendarAvailability] = useState<{ available: boolean; message: string; checking: boolean } | null>(null);
  const [callCalendarAvailability, setCallCalendarAvailability] = useState<{ available: boolean; message: string; checking: boolean } | null>(null);
  const [outOfServiceTagSearch, setOutOfServiceTagSearch] = useState<string>('');

  // Post-Appointment Redirect Settings
  const [redirectAfterAppointment, setRedirectAfterAppointment] = useState<boolean>(false);
  const [appointmentRedirectUrl, setAppointmentRedirectUrl] = useState<string>('');
  
  // Post-Appointment Tags Settings
  const [appointmentBookedTags, setAppointmentBookedTags] = useState<Set<string>>(new Set());
  const [appointmentTagsSearch, setAppointmentTagsSearch] = useState<string>('');
  
  // Quote Completed Tags Settings
  const [quoteCompletedTags, setQuoteCompletedTags] = useState<Set<string>>(new Set());
  const [quoteTagsSearch, setQuoteTagsSearch] = useState<string>('');
  
  // New tag creation for appointment booked and quote completed
  const [newAppointmentTagName, setNewAppointmentTagName] = useState<string>('');
  const [newQuoteTagName, setNewQuoteTagName] = useState<string>('');

  // Google Maps API Key State
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [googleMapsApiKeyDisplay, setGoogleMapsApiKeyDisplay] = useState('');
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Collapsible Cards State
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const isCardExpanded = (cardId: string) => expandedCards.has(cardId);

  // Check authentication
  useEffect(() => {
    const storedPassword = sessionStorage.getItem('admin_password');
    if (storedPassword) {
      setPassword(storedPassword);
      checkAuth(storedPassword);
    }
  }, []);

  // Load current settings
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
      loadWidgetSettings();
      loadGHLConfig();
    }
  }, [isAuthenticated]);

  // Load pipelines and tags when connection status changes to connected and create opportunity is on
  useEffect(() => {
    if (isAuthenticated && connectionStatus === 'connected' && createOpportunity) {
      loadPipelines();
      if (ghlTags.length === 0) loadTags();
    }
  }, [connectionStatus, createOpportunity, isAuthenticated]);

  // Load users and calendars automatically when connection is established
  useEffect(() => {
    if (isAuthenticated && connectionStatus === 'connected') {
      // Load users and calendars automatically - no refresh button needed
      loadUsers();
      loadCalendars();
    }
  }, [connectionStatus, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCustomFields();
    }
  }, [isAuthenticated]);

  const checkAuth = async (pass: string) => {
    try {
      const response = await fetch('/api/admin/ghl-settings', {
        headers: {
          'x-admin-password': pass,
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_password', pass);
        setMessage(null); // Clear any previous error messages
      } else {
        // Authentication failed
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        setMessage({ 
          type: 'error', 
          text: errorData.error || errorData.message || `Authentication failed (${response.status})` 
        });
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_password');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to authenticate. Please check your connection and try again.' 
      });
      setIsAuthenticated(false);
      sessionStorage.removeItem('admin_password');
    }
  };

  const handleLogin = () => {
    if (password.trim()) {
      checkAuth(password);
    }
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/ghl-settings', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGhlTokenDisplay(data.maskedToken || '••••••••••••••••');
        setGhlLocationId(data.locationId || '');
        setConnectionStatus(data.connected ? 'connected' : 'disconnected');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToken = async () => {
    if (!ghlToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter a HighLevel API token' });
      return;
    }

    if (!ghlLocationId.trim()) {
      setMessage({ type: 'error', text: 'Please enter a Location ID' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/ghl-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ token: ghlToken, locationId: ghlLocationId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'HighLevel API token saved successfully!' });
        setGhlToken('');
        setGhlTokenDisplay(`****${ghlToken.slice(-4)}`);
        setConnectionStatus('connected');
        setTimeout(() => loadSettings(), 500);
      } else {
        const errorText = data.error || 'Failed to save HighLevel API token';
        const detailsText = data.details ? ` Details: ${data.details}` : '';
        setMessage({
          type: 'error',
          text: errorText + detailsText,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save HighLevel API token. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('testing');
    try {
      const response = await fetch('/api/admin/ghl-settings', {
        method: 'PUT',
        headers: {
          'x-admin-password': password,
        },
      });

      const data = await response.json();

      if (data.connected) {
        setMessage({ type: 'success', text: 'Connected to HighLevel successfully!' });
        setConnectionStatus('connected');
      } else {
        const errorText = data.error || data.message || 'Failed to connect to HighLevel';
        setMessage({
          type: 'error',
          text: errorText + (data.details ? ` (${data.details})` : ''),
        });
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to test connection. Please try again.',
      });
      setConnectionStatus('disconnected');
    } finally {
      setIsTesting(false);
    }
  };

  const loadWidgetSettings = async () => {
    try {
      const response = await fetch('/api/admin/widget-settings', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWidgetTitle(data.title || 'Get Your Quote');
        setWidgetSubtitle(data.subtitle || "Let's get your professional cleaning price!");
        setWidgetPrimaryColor(data.primaryColor || '#0d9488');
      }
    } catch (error) {
      console.error('Failed to load widget settings:', error);
    }
  };

  const handleSaveWidgetSettings = async () => {
    setIsSavingWidget(true);
    setWidgetMessage(null);
    try {
      const response = await fetch('/api/admin/widget-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          title: widgetTitle,
          subtitle: widgetSubtitle,
          primaryColor: widgetPrimaryColor,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWidgetMessage({ type: 'success', text: 'Widget settings saved successfully!' });
      } else {
        setWidgetMessage({
          type: 'error',
          text: data.error || 'Failed to save widget settings',
        });
      }
    } catch (error) {
      setWidgetMessage({
        type: 'error',
        text: 'Failed to save widget settings. Please try again.',
      });
    } finally {
      setIsSavingWidget(false);
    }
  };

  const getEmbedCode = () => {
    const baseUrl = window.location.origin;
    return `<!-- CleanQuote.io embed -->
<!-- You can pass GHL contact variables as data attributes to pre-fill the form -->
<!-- Example: data-first-name="{{contact.firstName}}" data-last-name="{{contact.lastName}}" -->
<div id="cleaning-quote-widget"></div>
<script src="${baseUrl}/widget.js" data-base-url="${baseUrl}" data-container-id="cleaning-quote-widget" data-first-name="{{contact.firstName}}" data-last-name="{{contact.lastName}}" data-phone="{{contact.phone}}" data-email="{{contact.email}}" data-address="{{contact.address}}" data-city="{{contact.city}}" data-state="{{contact.state}}" data-postal-code="{{contact.postalCode}}"><\/script>`;
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (error) {
      console.error('Failed to copy embed code:', error);
    }
  };

  // Load GHL configuration and pipelines
  const loadGHLConfig = async () => {
    try {
      const response = await fetch('/api/admin/ghl-config', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const config = data.config;
        setCreateContact(config.createContact !== false);
        setCreateOpportunity(config.createOpportunity === true);
        setCreateNote(config.createNote !== false);
        setSelectedPipelineId(config.pipelineId || '');
        setSelectedStageId(config.pipelineStageId || '');
        setOpportunityStatus(config.opportunityStatus || 'open');
        setOpportunityValue(config.opportunityMonetaryValue || 0);
        setUseDynamicPricingForValue(config.useDynamicPricingForValue !== false);
        setSelectedOpportunityAssignedTo(config.opportunityAssignedTo || '');
        setOpportunitySource(config.opportunitySource || '');
        setSelectedOpportunityTags(new Set(Array.isArray(config.opportunityTags) ? config.opportunityTags : []));
        setSelectedAppointmentCalendarId(config.appointmentCalendarId || '');
        setSelectedCallCalendarId(config.callCalendarId || '');
        setSelectedAppointmentUserId(config.appointmentUserId || '');
        setSelectedCallUserId(config.callUserId || '');
        setQuotedAmountField(config.quotedAmountField || '');
        
        // Load redirect settings
        setRedirectAfterAppointment(config.redirectAfterAppointment === true);
        setAppointmentRedirectUrl(config.appointmentRedirectUrl || '');
        
        // Load appointment booked tags
        if (config.appointmentBookedTags && Array.isArray(config.appointmentBookedTags)) {
          setAppointmentBookedTags(new Set(config.appointmentBookedTags));
        }
        
        // Load quote completed tags
        if (config.quoteCompletedTags && Array.isArray(config.quoteCompletedTags)) {
          setQuoteCompletedTags(new Set(config.quoteCompletedTags));
        }
        
        // Load saved tags
        if (config.inServiceTags && Array.isArray(config.inServiceTags)) {
          setSelectedInServiceTags(new Set(config.inServiceTags));
        }
        if (config.outOfServiceTags && Array.isArray(config.outOfServiceTags)) {
          setSelectedOutOfServiceTags(new Set(config.outOfServiceTags));
        }
        
        setGhlConfigLoaded(true);

        // Load pipelines, users, and calendars if token is connected
        // Note: Users and calendars will also be loaded automatically via useEffect when connectionStatus becomes 'connected'
        // But we load them here too in case connectionStatus is already 'connected' when this runs
        if (connectionStatus === 'connected') {
          await loadPipelines();
          await loadUsers();
          await loadCalendars();
          
          // Check availability for selected calendars
          if (config.appointmentCalendarId) {
            checkCalendarAvailability(config.appointmentCalendarId, 'appointment');
          }
          if (config.callCalendarId) {
            checkCalendarAvailability(config.callCalendarId, 'call');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load GHL config:', error);
    }
  };

  // Load pipelines from GHL
  const loadPipelines = async () => {
    setIsLoadingPipelines(true);
    setPipelinesError(null);
    try {
      const response = await fetch('/api/admin/ghl-pipelines', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPipelines(data.pipelines || []);
      } else {
        const data = await response.json();
        setPipelinesError(data.error || 'Failed to load pipelines');
      }
    } catch (error) {
      console.error('Failed to load pipelines:', error);
      setPipelinesError('Failed to load pipelines. Please check your GHL connection.');
    } finally {
      setIsLoadingPipelines(false);
    }
  };

  // Load users from GHL
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/ghl-users', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const loadedUsers = data.users || [];
        setUsers(loadedUsers);
        
        // Ensure selected user IDs are still valid after reload
        // If selected user is not in the list, keep the selection but it will show as invalid
        // This preserves the selection even if the user list changes
        return loadedUsers;
      } else {
        const data = await response.json();
        console.error('Failed to load users:', data.error || 'Unknown error');
        return [];
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      return [];
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Save GHL configuration
  const handleSaveGHLConfig = async () => {
    if (createOpportunity && (!selectedPipelineId || !selectedStageId)) {
      setConfigMessage({ type: 'error', text: 'Please select a pipeline and stage for opportunities' });
      return;
    }
    
    // Validate routing rules: each rule with a value must have pipelineId and pipelineStageId
    const invalidRules = pipelineRoutingRules.filter(rule => 
      (rule.value && rule.value.trim()) && (!rule.pipelineId || !rule.pipelineStageId)
    );
    if (invalidRules.length > 0) {
      setConfigMessage({ type: 'error', text: 'Each routing rule must have a value and both a pipeline and stage selected.' });
      return;
    }
    
    if (redirectAfterAppointment && !appointmentRedirectUrl) {
      setConfigMessage({ type: 'error', text: 'Please enter a redirect URL if redirection is enabled' });
      return;
    }
    
    if (redirectAfterAppointment && !appointmentRedirectUrl.startsWith('http')) {
      setConfigMessage({ type: 'error', text: 'Redirect URL must start with http:// or https://' });
      return;
    }

    setIsSavingConfig(true);
    setConfigMessage(null);
    try {
      const response = await fetch('/api/admin/ghl-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          createContact,
          createOpportunity,
          createNote,
          createQuoteObject,
          pipelineId: selectedPipelineId || undefined,
          pipelineStageId: selectedStageId || undefined,
          pipelineRoutingRules: pipelineRoutingRules.length > 0 ? pipelineRoutingRules : undefined,
          opportunityStatus,
          opportunityMonetaryValue: opportunityValue || undefined,
          useDynamicPricingForValue,
          opportunityAssignedTo: selectedOpportunityAssignedTo || undefined,
          opportunitySource: opportunitySource || undefined,
          opportunityTags: Array.from(selectedOpportunityTags).length > 0 ? Array.from(selectedOpportunityTags) : undefined,
          inServiceTags: Array.from(selectedInServiceTags).length > 0 ? Array.from(selectedInServiceTags) : undefined,
          outOfServiceTags: Array.from(selectedOutOfServiceTags).length > 0 ? Array.from(selectedOutOfServiceTags) : undefined,
          appointmentCalendarId: selectedAppointmentCalendarId || undefined,
          callCalendarId: selectedCallCalendarId || undefined,
          appointmentUserId: selectedAppointmentUserId || undefined,
          callUserId: selectedCallUserId || undefined,
          quotedAmountField: quotedAmountField || undefined,
          redirectAfterAppointment,
          appointmentRedirectUrl: appointmentRedirectUrl || undefined,
          appointmentBookedTags: Array.from(appointmentBookedTags).length > 0 ? Array.from(appointmentBookedTags) : undefined,
          quoteCompletedTags: Array.from(quoteCompletedTags).length > 0 ? Array.from(quoteCompletedTags) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConfigMessage({ type: 'success', text: 'HighLevel configuration saved successfully!' });
      } else {
        setConfigMessage({
          type: 'error',
          text: data.error || 'Failed to save HighLevel configuration',
        });
      }
    } catch (error) {
      setConfigMessage({
        type: 'error',
        text: 'Failed to save HighLevel configuration. Please try again.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUploadServiceArea = async () => {
    if (!serviceAreaFile) {
      setServiceAreaMessage({ type: 'error', text: 'Please select a KML file' });
      return;
    }

    setIsUploadingServiceArea(true);
    setServiceAreaMessage(null);

    try {
      const content = await serviceAreaFile.text();
      
      const response = await fetch('/api/admin/service-area/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ kmlContent: content }),
      });

      const data = await response.json();

      if (response.ok) {
        setServiceAreaMessage({ type: 'success', text: data.message });
        setServiceAreaFile(null);
        setServiceAreaType(data.type);
        if (data.type === 'network') {
          setNetworkLinkUrl(data.networkLink || null);
        }
        setPolygonCoordinateCount(data.polygonCount || 0);
      } else {
        setServiceAreaMessage({
          type: 'error',
          text: data.error || 'Failed to upload service area',
        });
      }
    } catch (error) {
      setServiceAreaMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload service area',
      });
    } finally {
      setIsUploadingServiceArea(false);
    }
  };

  const loadCalendars = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingCalendars(true);
    try {
      const response = await fetch('/api/admin/ghl-calendars', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCalendars(data.calendars || []);
      } else {
        const error = await response.json();
        console.error('Error loading calendars:', error);
        // Show user-friendly error message
        if (error.error) {
          console.log('Calendar error details:', error.error);
        }
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  // Check calendar availability using GHL free-slots API
  const checkCalendarAvailability = async (calendarId: string, type: 'appointment' | 'call') => {
    if (!calendarId) return;

    // Set checking state
    if (type === 'appointment') {
      setAppointmentCalendarAvailability({ available: false, message: 'Checking calendar configuration and availability...', checking: true });
    } else {
      setCallCalendarAvailability({ available: false, message: 'Checking calendar configuration and availability...', checking: true });
    }

    try {
      // Check availability for next 7 days using GHL's free-slots API
      // This uses the actual calendar configuration (office hours, availability rules, etc.)
      const now = new Date();
      const startTime = now.toISOString();
      const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `/api/admin/ghl-calendar-availability?calendarId=${calendarId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`,
        {
          headers: {
            'x-admin-password': password,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (type === 'appointment') {
          setAppointmentCalendarAvailability({
            available: data.available,
            message: data.message || (data.available 
              ? `Calendar configured and has ${data.slotCount || 0} available slot(s) in next 7 days` 
              : 'Calendar has no available slots. Check calendar configuration, assigned users, and availability settings.'),
            checking: false,
          });
        } else {
          setCallCalendarAvailability({
            available: data.available,
            message: data.message || (data.available 
              ? `Calendar configured and has ${data.slotCount || 0} available slot(s) in next 7 days` 
              : 'Calendar has no available slots. Check calendar configuration, assigned users, and availability settings.'),
            checking: false,
          });
        }
      } else {
        const error = await response.json();
        if (type === 'appointment') {
          setAppointmentCalendarAvailability({
            available: false,
            message: error.error || 'Unable to check calendar availability. Ensure calendar has assigned users and availability configured.',
            checking: false,
          });
        } else {
          setCallCalendarAvailability({
            available: false,
            message: error.error || 'Unable to check calendar availability. Ensure calendar has assigned users and availability configured.',
            checking: false,
          });
        }
      }
    } catch (error) {
      console.error('Error checking calendar availability:', error);
      if (type === 'appointment') {
        setAppointmentCalendarAvailability({
          available: false,
          message: 'Failed to check availability. Verify calendar is properly configured in HighLevel.',
          checking: false,
        });
      } else {
        setCallCalendarAvailability({
          available: false,
          message: 'Failed to check availability. Verify calendar is properly configured in HighLevel.',
          checking: false,
        });
      }
    }
  };

  const loadTags = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingTags(true);
    try {
      const response = await fetch('/api/admin/ghl-tags', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGhlTags(data.tags || []);
      } else {
        const error = await response.json();
        console.error('Error loading tags:', error);
        // Show user-friendly error message
        if (error.error) {
          console.log('Tag error details:', error.error);
        }
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const loadCustomFields = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingCustomFields(true);
    setCustomFieldsError(null);
    try {
      const response = await fetch(`/api/admin/ghl-custom-fields?t=${Date.now()}`, {
        headers: {
          'x-admin-password': password,
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out native fields and keep only custom fields
        const customFieldsOnly = data.fields?.filter((f: any) => f.type === 'custom' || f.fieldType === 'custom') || [];
        setCustomFields(customFieldsOnly);
      } else {
        const error = await response.json();
        console.error('Error loading custom fields:', error);
        setCustomFieldsError(error.error || 'Failed to load custom fields');
      }
    } catch (error) {
      console.error('Error loading custom fields:', error);
      setCustomFieldsError(error instanceof Error ? error.message : 'Failed to load custom fields');
    } finally {
      setIsLoadingCustomFields(false);
    }
  };

  const handleCreateTag = async (tagNameToCreate: string, section: 'in-service' | 'out-of-service') => {
    if (!tagNameToCreate.trim()) {
      return;
    }

    // Check if tag already exists
    const tagExists = ghlTags.some(tag => tag.name.toLowerCase() === tagNameToCreate.trim().toLowerCase());
    if (tagExists) {
      alert(`Tag "${tagNameToCreate.trim()}" already exists. Please select it from the list.`);
      return;
    }

    setIsCreatingTag(true);
    try {
      const response = await fetch('/api/admin/ghl-tags/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ name: tagNameToCreate.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh tags list to ensure consistency
        await loadTags();
        // Automatically select the newly created tag in the appropriate section
        if (section === 'in-service') {
          setSelectedInServiceTags(new Set([...selectedInServiceTags, data.tag.name]));
          setNewInServiceTagName('');
          setInServiceTagSearch(''); // Clear search to show the new tag
        } else {
          setSelectedOutOfServiceTags(new Set([...selectedOutOfServiceTags, data.tag.name]));
          setNewOutOfServiceTagName('');
          setOutOfServiceTagSearch(''); // Clear search to show the new tag
        }
      } else {
        const error = await response.json();
        console.error('Tag creation error:', error);
        const errorMessage = error.details || error.error || 'Unknown error';
        alert(`Failed to create tag: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create tag: ${errorMessage}`);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleCreateAppointmentOrQuoteTag = async (tagNameToCreate: string, section: 'appointment' | 'quote') => {
    if (!tagNameToCreate.trim()) {
      return;
    }

    // Check if tag already exists
    const tagExists = ghlTags.some(tag => tag.name.toLowerCase() === tagNameToCreate.trim().toLowerCase());
    if (tagExists) {
      alert(`Tag "${tagNameToCreate.trim()}" already exists. Please select it from the list.`);
      return;
    }

    setIsCreatingTag(true);
    try {
      const response = await fetch('/api/admin/ghl-tags/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ name: tagNameToCreate.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh tags list to ensure consistency
        await loadTags();
        // Automatically select the newly created tag and clear the input
        if (section === 'appointment') {
          setAppointmentBookedTags(new Set([...appointmentBookedTags, data.tag.id]));
          setNewAppointmentTagName('');
          setAppointmentTagsSearch(''); // Clear search to show the new tag
        } else {
          setQuoteCompletedTags(new Set([...quoteCompletedTags, data.tag.id]));
          setNewQuoteTagName('');
          setQuoteTagsSearch(''); // Clear search to show the new tag
        }
      } else {
        const error = await response.json();
        console.error('Tag creation error:', error);
        const errorMessage = error.details || error.error || 'Unknown error';
        alert(`Failed to create tag: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create tag: ${errorMessage}`);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const loadServiceAreaConfig = async () => {
    try {
      const response = await fetch('/api/admin/service-area/status', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setServiceAreaType(data.type || 'none');
        if (data.type === 'network') {
          setNetworkLinkUrl(data.networkLink || null);
        }
        setPolygonCoordinateCount(data.polygonCount || 0);
      }
    } catch (error) {
      console.error('Error loading service area config:', error);
    }
  };

  const loadGoogleMapsKey = async () => {
    setIsLoadingApiKey(true);
    try {
      const response = await fetch('/api/admin/google-maps-key', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGoogleMapsApiKeyDisplay(data.maskedKey || '••••••••••••••••');
      }
    } catch (error) {
      console.error('Error loading Google Maps API key:', error);
    } finally {
      setIsLoadingApiKey(false);
    }
  };

  const handleSaveGoogleMapsKey = async () => {
    if (!googleMapsApiKey.trim()) {
      setApiKeyMessage({ type: 'error', text: 'Please enter a Google Maps API key' });
      return;
    }

    setIsSavingApiKey(true);
    setApiKeyMessage(null);

    try {
      const response = await fetch('/api/admin/google-maps-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          apiKey: googleMapsApiKey,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setApiKeyMessage({ type: 'success', text: 'Google Maps API key saved successfully!' });
        setGoogleMapsApiKey('');
        setGoogleMapsApiKeyDisplay(`****${googleMapsApiKey.slice(-4)}`);
        setTimeout(() => loadGoogleMapsKey(), 500);
      } else {
        setApiKeyMessage({
          type: 'error',
          text: data.error || 'Failed to save Google Maps API key',
        });
      }
    } catch (error) {
      setApiKeyMessage({
        type: 'error',
        text: 'Failed to save Google Maps API key. Please try again.',
      });
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const loadTrackingCodes = async () => {
    setIsLoadingTracking(true);
    try {
      const response = await fetch('/api/admin/tracking-codes', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomHeadCode(data.trackingCodes?.customHeadCode || '');
      }
    } catch (error) {
      console.error('Error loading tracking codes:', error);
    } finally {
      setIsLoadingTracking(false);
    }
  };

  const loadFormSettings = async () => {
    setIsLoadingFormSettings(true);
    try {
      const response = await fetch('/api/admin/form-settings', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFirstNameParam(data.formSettings.firstNameParam || '');
        setLastNameParam(data.formSettings.lastNameParam || '');
        setEmailParam(data.formSettings.emailParam || '');
        setPhoneParam(data.formSettings.phoneParam || '');
        setAddressParam(data.formSettings.addressParam || '');
        setOpenSurveyInNewTab(data.formSettings.openSurveyInNewTab || false);
      }
    } catch (error) {
      console.error('Error loading form settings:', error);
    } finally {
      setIsLoadingFormSettings(false);
    }
  };

  const handleSaveTrackingCodes = async () => {
    setIsSavingTracking(true);
    setTrackingMessage(null);

    try {
      const response = await fetch('/api/admin/tracking-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ customHeadCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setTrackingMessage({ type: 'success', text: 'Tracking codes saved successfully!' });
      } else {
        setTrackingMessage({
          type: 'error',
          text: data.error || 'Failed to save tracking codes',
        });
      }
    } catch (error) {
      setTrackingMessage({
        type: 'error',
        text: 'Failed to save tracking codes. Please try again.',
      });
    } finally {
      setIsSavingTracking(false);
    }
  };

  const handleSaveFormSettings = async () => {
    setIsSavingFormSettings(true);
    setFormSettingsMessage(null);

    try {
      const response = await fetch('/api/admin/form-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          firstNameParam,
          lastNameParam,
          emailParam,
          phoneParam,
          addressParam,
          openSurveyInNewTab,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFormSettingsMessage({ type: 'success', text: 'Form settings saved successfully!' });
      } else {
        setFormSettingsMessage({
          type: 'error',
          text: data.error || 'Failed to save form settings',
        });
      }
    } catch (error) {
      setFormSettingsMessage({
        type: 'error',
        text: 'Failed to save form settings. Please try again.',
      });
    } finally {
      setIsSavingFormSettings(false);
    }
  };

  // Load calendars and tags when component mounts and authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (calendars.length === 0) {
        loadCalendars();
      }
      if (ghlTags.length === 0) {
        loadTags();
      }
      if (serviceAreaType === 'none') {
        loadServiceAreaConfig();
      }
      if (!googleMapsApiKeyDisplay) {
        loadGoogleMapsKey();
      }
      loadTrackingCodes();
      if (!firstNameParam) {
        loadFormSettings();
      }
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto mt-20">
          <Card className="shadow-2xl border-2">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Admin Access</CardTitle>
              <CardDescription className="text-center">
                Enter your admin password to access settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}
                <div>
                  <Label htmlFor="password">Admin Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setMessage(null); // Clear error when typing
                    }}
                    placeholder="Enter your password"
                    className="mt-3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Password is set in ADMIN_PASSWORD environment variable
                  </p>
                </div>
                <Button onClick={handleLogin} className="w-full" size="lg">
                  Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Button
            onClick={() => router.push('/admin')}
            variant="outline"
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>

          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600 text-lg">Configure your quote form and integrations</p>
        </motion.div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p>{message.text}</p>
          </motion.div>
        )}

        <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
            <CardHeader 
              className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('ghl-unified')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                    <Sparkles className="h-6 w-6 text-primary" />
                    HighLevel Integration
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Configure your HighLevel token and CRM integration settings
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      connectionStatus === 'connected'
                        ? 'bg-green-100 text-green-800'
                        : connectionStatus === 'testing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {connectionStatus === 'connected' && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-600" />
                        Connected
                      </>
                    )}
                    {connectionStatus === 'testing' && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Testing
                      </>
                    )}
                    {(connectionStatus === 'disconnected' || connectionStatus === 'unknown') && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        {connectionStatus === 'unknown' ? 'Unknown' : 'Disconnected'}
                      </>
                    )}
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform ${isCardExpanded('ghl-unified') ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>
            </CardHeader>
            {isCardExpanded('ghl-unified') && (
              <CardContent className="pt-8 pb-8">
              <div className="space-y-8">
                {/* API Token Section */}
                <div>
                  <button
                    type="button"
                    onClick={() => setIsTokenSectionExpanded(!isTokenSectionExpanded)}
                    className="w-full flex items-center justify-between text-left mb-6 pb-4 border-b border-gray-200 hover:opacity-80 transition-opacity"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">API Token & Authentication</h3>
                    <ChevronDown 
                      className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                        isTokenSectionExpanded ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  {isTokenSectionExpanded && (
                    <div className="space-y-6">
                    <div>
                      <Label htmlFor="token" className="text-base font-semibold">
                        HighLevel Private Integration Token (PIT)
                      </Label>
                      <p className="text-sm text-gray-600 mt-1 mb-3">
                        Enter your HighLevel Private Integration Token (PIT). <strong className="text-primary">We recommend a Location-level PIT token</strong> for better security. Keep this secret - never share it publicly.
                      </p>
                      <div className="mt-2 mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>💡 Location-level PIT tokens</strong> are scoped to a specific location and provide better security. Get yours from: HighLevel Dashboard → Location → Settings → Integrations → API. Location-level tokens don't require the locations.readonly scope.
                        </p>
                      </div>
                      <div className="relative">
                        <Input
                          id="token"
                          type={showToken ? 'text' : 'password'}
                          value={ghlToken}
                          onChange={(e) => setGhlToken(e.target.value)}
                          placeholder="ghl_pit_... (leave blank to keep current token)"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showToken ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="mt-4">
                        <Label htmlFor="locationId" className="text-base font-semibold">
                          Location ID <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-sm text-gray-600 mt-1 mb-3">
                          Enter your HighLevel Location ID. This is required for HighLevel API integration. You can find this in your HighLevel dashboard URL after /location/
                        </p>
                        <Input
                          id="locationId"
                          type="text"
                          value={ghlLocationId}
                          onChange={(e) => setGhlLocationId(e.target.value)}
                          placeholder="e.g., ve9EPM428h8vShlRW1KT"
                          className="font-mono"
                          required
                        />
                      </div>
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Required HighLevel Scopes:
                        </p>
                        <ul className="text-xs text-amber-800 space-y-1 ml-6 list-disc">
                          <li><strong>contacts.write</strong> - Create/update contacts and add notes <span className="font-bold text-amber-900">(REQUIRED)</span></li>
                          <li><strong>contacts.readonly</strong> - View customer contact information</li>
                          <li><strong>opportunities.readonly</strong> - Read pipelines for configuration</li>
                          <li><strong>opportunities.write</strong> - Create opportunities from quotes</li>
                          <li><strong>calendars.write</strong> - Create appointments for bookings</li>
                          <li><strong>calendars.readonly</strong> - View available calendars</li>
                          <li><strong>locations.readonly</strong> - Fetch calendars, tags, and location information</li>
                          <li><strong>locations/customFields.readonly</strong> - View custom fields for field mapping</li>
                          <li><strong>locations/tags.readonly</strong> - View available tags for service area</li>
                          <li><strong>locations/tags.write</strong> - Apply tags to customers (in-service/out-of-service)</li>
                        </ul>
                        <p className="text-xs text-amber-700 mt-2 italic">
                          <strong>Note:</strong> All API calls will automatically use your Location ID for sub-account operations.
                        </p>
                      </div>
                    </div>

                    {ghlTokenDisplay && ghlTokenDisplay !== '••••••••••••••••' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Current token: <span className="font-mono font-semibold">{ghlTokenDisplay}</span>
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSaveToken}
                        disabled={isSaving || !ghlToken.trim() || !ghlLocationId.trim()}
                        className="flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Token
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {isTesting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <RotateCw className="h-4 w-4" />
                            Test Connection
                          </>
                        )}
                      </Button>
                    </div>

                    {/* About HighLevel Integration */}
                    <div className="mt-8 pt-8 border-t border-gray-200 space-y-6 text-sm text-gray-700">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">What does this do?</h4>
                        <p>
                          When enabled, the quote form will automatically create contacts and opportunities in your
                          HighLevel CRM whenever a customer generates a quote. This includes:
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                          <li>Creating a new contact with customer information</li>
                          <li>Creating an opportunity with the quote value</li>
                          <li>Adding a detailed note with all quote information</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Security</h4>
                        <p>Your HighLevel token is stored securely in encrypted storage and is never exposed to the client.</p>
                      </div>
                    </div>
                    </div>
                  )}
                </div>

                {/* Integration Configuration Section */}
                {connectionStatus === 'connected' ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">Integration Configuration</h3>
                    
                    <div className="space-y-8">
                      {configMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-lg flex items-center gap-3 ${
                            configMessage.type === 'success'
                              ? 'bg-green-50 text-green-800 border border-green-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {configMessage.type === 'success' ? (
                            <CheckCircle className="h-5 w-5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                          )}
                          <p>{configMessage.text}</p>
                        </motion.div>
                      )}

                      {/* Feature Toggles */}
                      <div className="space-y-6">
                        <h4 className="font-semibold text-gray-900">Select Features</h4>
                        
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            id="create-contact"
                            checked={createContact}
                            onChange={(e) => setCreateContact(e.target.checked)}
                            className="w-5 h-5 text-primary rounded cursor-pointer"
                          />
                          <label htmlFor="create-contact" className="cursor-pointer flex-1">
                            <div className="font-semibold text-gray-900">Create/Update Contact</div>
                            <div className="text-sm text-gray-600">Automatically create or update contact with customer info (name, email, phone)</div>
                          </label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            id="create-note"
                            checked={createNote}
                            onChange={(e) => setCreateNote(e.target.checked)}
                            className="w-5 h-5 text-primary rounded cursor-pointer"
                          />
                          <label htmlFor="create-note" className="cursor-pointer flex-1">
                            <div className="font-semibold text-gray-900">Create Note</div>
                            <div className="text-sm text-gray-600">Add a note to the contact with the complete quote summary</div>
                          </label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            id="create-quote-object"
                            checked={createQuoteObject}
                            onChange={(e) => setCreateQuoteObject(e.target.checked)}
                            className="w-5 h-5 text-primary rounded cursor-pointer"
                          />
                          <label htmlFor="create-quote-object" className="cursor-pointer flex-1">
                            <div className="font-semibold text-gray-900">Create Quote (Custom Object)</div>
                            <div className="text-sm text-gray-600">Create a Quote custom object in HighLevel and link it to the contact</div>
                          </label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            id="create-opportunity"
                            checked={createOpportunity}
                            onChange={(e) => setCreateOpportunity(e.target.checked)}
                            className="w-5 h-5 text-primary rounded cursor-pointer"
                          />
                          <label htmlFor="create-opportunity" className="cursor-pointer flex-1">
                            <div className="font-semibold text-gray-900">Create Opportunity</div>
                            <div className="text-sm text-gray-600">Automatically create a sales opportunity with the quote details</div>
                          </label>
                        </div>
                      </div>

                      {/* Opportunity Configuration */}
                      {createOpportunity && (
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-4">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <ChevronDown className="h-4 w-4" />
                            Opportunity Settings
                          </h4>

                          {pipelinesError ? (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                              {pipelinesError}
                            </div>
                          ) : null}

                          {isLoadingPipelines ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading pipelines...
                            </div>
                          ) : pipelines.length === 0 ? (
                            <div className="text-sm text-gray-600">
                              No pipelines found. Please create a pipeline in HighLevel first.
                            </div>
                          ) : (
                            <>
                              {/* Pipeline Selection - Default */}
                              <div>
                                <Label className="text-base font-semibold mb-2 block">Default Pipeline</Label>
                                <select
                                  value={selectedPipelineId}
                                  onChange={(e) => {
                                    setSelectedPipelineId(e.target.value);
                                    setSelectedStageId(''); // Reset stage when pipeline changes
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                                >
                                  <option value="">-- Select a pipeline --</option>
                                  {pipelines.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="text-sm text-gray-500 mt-1">Used when no UTM routing rule matches.</div>
                              </div>

                              {/* Stage Selection - Default */}
                              {selectedPipelineId && (
                                <div>
                                  <Label className="text-base font-semibold mb-2 block">Default Starting Stage</Label>
                                  <select
                                    value={selectedStageId}
                                    onChange={(e) => setSelectedStageId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                                  >
                                    <option value="">-- Select a stage --</option>
                                    {pipelines
                                      .find((p) => p.id === selectedPipelineId)
                                      ?.stages?.map((s: any) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              )}

                              {/* Pipeline Routing by UTM */}
                              <div className="pt-4 border-t border-gray-300">
                                <div className="mb-4">
                                  <h5 className="font-semibold text-gray-900 mb-2">Pipeline Routing by UTM (Optional)</h5>
                                  <p className="text-sm text-gray-600 mb-3">
                                    First matching rule wins. Match is case-insensitive. If none match, the default pipeline is used.
                                  </p>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      setPipelineRoutingRules([
                                        ...pipelineRoutingRules,
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
                                        }
                                      ]);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Add Rule
                                  </Button>
                                </div>

                                {pipelineRoutingRules.length > 0 && (
                                  <div className="space-y-3">
                                    {pipelineRoutingRules.map((rule, idx) => (
                                      <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                          {/* UTM Param */}
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">UTM Param</label>
                                            <select
                                              value={rule.utmParam}
                                              onChange={(e) => {
                                                const newRules = [...pipelineRoutingRules];
                                                newRules[idx].utmParam = e.target.value;
                                                setPipelineRoutingRules(newRules);
                                              }}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                                            >
                                              <option value="utm_source">utm_source</option>
                                              <option value="utm_medium">utm_medium</option>
                                              <option value="utm_campaign">utm_campaign</option>
                                              <option value="utm_term">utm_term</option>
                                              <option value="utm_content">utm_content</option>
                                            </select>
                                          </div>

                                          {/* Match */}
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Match</label>
                                            <select
                                              value={rule.match}
                                              onChange={(e) => {
                                                const newRules = [...pipelineRoutingRules];
                                                newRules[idx].match = e.target.value;
                                                setPipelineRoutingRules(newRules);
                                              }}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                                            >
                                              <option value="contains">contains</option>
                                              <option value="equals">equals</option>
                                              <option value="starts_with">starts_with</option>
                                            </select>
                                          </div>

                                          {/* Value */}
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Value</label>
                                            <input
                                              type="text"
                                              value={rule.value}
                                              onChange={(e) => {
                                                const newRules = [...pipelineRoutingRules];
                                                newRules[idx].value = e.target.value;
                                                setPipelineRoutingRules(newRules);
                                              }}
                                              placeholder="e.g., google"
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                          </div>

                                          {/* Pipeline */}
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Pipeline</label>
                                            <select
                                              value={rule.pipelineId}
                                              onChange={(e) => {
                                                const newRules = [...pipelineRoutingRules];
                                                newRules[idx].pipelineId = e.target.value;
                                                newRules[idx].pipelineStageId = ''; // Reset stage
                                                setPipelineRoutingRules(newRules);
                                              }}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                                            >
                                              <option value="">-- Select --</option>
                                              {pipelines.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                  {p.name}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          {/* Stage */}
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Stage</label>
                                            <select
                                              value={rule.pipelineStageId}
                                              onChange={(e) => {
                                                const newRules = [...pipelineRoutingRules];
                                                newRules[idx].pipelineStageId = e.target.value;
                                                setPipelineRoutingRules(newRules);
                                              }}
                                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                                            >
                                              <option value="">-- Select --</option>
                                              {rule.pipelineId && pipelines
                                                .find((p) => p.id === rule.pipelineId)
                                                ?.stages?.map((s: any) => (
                                                  <option key={s.id} value={s.id}>
                                                    {s.name}
                                                  </option>
                                                ))}
                                            </select>
                                          </div>
                                        </div>

                                        {/* Per-Rule Opportunity Settings (Collapsible) */}
                                        <div className="border-t border-gray-200 pt-3 mt-3">
                                          <button
                                            type="button"
                                            onClick={() => setExpandedRuleIndex(expandedRuleIndex === idx ? null : idx)}
                                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                          >
                                            {expandedRuleIndex === idx ? '▼' : '▶'} Opportunity Settings for This Rule (Optional)
                                          </button>

                                          {expandedRuleIndex === idx && (
                                            <div className="mt-3 space-y-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                              {/* Status for this rule */}
                                              <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                                                <select
                                                  value={rule.opportunityStatus || ''}
                                                  onChange={(e) => {
                                                    const newRules = [...pipelineRoutingRules];
                                                    newRules[idx].opportunityStatus = e.target.value || undefined;
                                                    setPipelineRoutingRules(newRules);
                                                  }}
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                                                >
                                                  <option value="">-- Use default --</option>
                                                  <option value="open">Open</option>
                                                  <option value="won">Won</option>
                                                  <option value="lost">Lost</option>
                                                  <option value="abandoned">Abandoned</option>
                                                </select>
                                              </div>

                                              {/* Assigned User for this rule */}
                                              <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Assign to User</label>
                                                <select
                                                  value={rule.opportunityAssignedTo || ''}
                                                  onChange={(e) => {
                                                    const newRules = [...pipelineRoutingRules];
                                                    newRules[idx].opportunityAssignedTo = e.target.value || undefined;
                                                    setPipelineRoutingRules(newRules);
                                                  }}
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                                                >
                                                  <option value="">-- Use default --</option>
                                                  {users.map((user) => (
                                                    <option key={user.id} value={user.id}>
                                                      {user.name} {user.email ? `(${user.email})` : ''}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              {/* Source for this rule */}
                                              <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Source</label>
                                                <input
                                                  type="text"
                                                  value={rule.opportunitySource || ''}
                                                  onChange={(e) => {
                                                    const newRules = [...pipelineRoutingRules];
                                                    newRules[idx].opportunitySource = e.target.value || undefined;
                                                    setPipelineRoutingRules(newRules);
                                                  }}
                                                  placeholder="e.g., Google Ads"
                                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                              </div>

                                              {/* Tags for this rule */}
                                              <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tags</label>
                                                <div className="relative">
                                                  <input
                                                    type="text"
                                                    placeholder="Search tags..."
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                    onChange={(e) => {
                                                      // For now, just a search input - we can implement full multi-select if needed
                                                    }}
                                                  />
                                                  <p className="text-xs text-gray-500 mt-1">
                                                    {rule.opportunityTags && rule.opportunityTags.length > 0
                                                      ? `${rule.opportunityTags.length} tag(s) selected`
                                                      : 'No tags selected (uses default)'}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Remove Button */}
                                        <div className="flex justify-end pt-2 border-t border-gray-200 mt-3">
                                          <Button
                                            type="button"
                                            onClick={() => {
                                              setPipelineRoutingRules(pipelineRoutingRules.filter((_, i) => i !== idx));
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
                              </div>

                              {/* Status Selection */}
                              <div>
                                <Label className="text-base font-semibold mb-2 block">Opportunity Status</Label>
                                <select
                                  value={opportunityStatus}
                                  onChange={(e) => setOpportunityStatus(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                                >
                                  <option value="open">Open</option>
                                  <option value="won">Won</option>
                                  <option value="lost">Lost</option>
                                  <option value="abandoned">Abandoned</option>
                                </select>
                              </div>

                              {/* Monetary Value Options */}
                              <div className="space-y-3">
                                <Label className="text-base font-semibold">Opportunity Monetary Value</Label>
                                
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <input
                                    type="radio"
                                    id="use-dynamic-pricing"
                                    checked={useDynamicPricingForValue}
                                    onChange={() => setUseDynamicPricingForValue(true)}
                                    className="w-4 h-4 text-primary cursor-pointer"
                                  />
                                  <label htmlFor="use-dynamic-pricing" className="cursor-pointer flex-1">
                                    <div className="font-semibold text-gray-900">Use Dynamic Quote Price</div>
                                    <div className="text-sm text-gray-600">
                                      Use the quote price calculated from the customer's selections
                                    </div>
                                  </label>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <input
                                    type="radio"
                                    id="use-fixed-value"
                                    checked={!useDynamicPricingForValue}
                                    onChange={() => setUseDynamicPricingForValue(false)}
                                    className="w-4 h-4 text-primary cursor-pointer"
                                  />
                                  <label htmlFor="use-fixed-value" className="cursor-pointer flex-1">
                                    <div className="font-semibold text-gray-900">Use Fixed Value</div>
                                    <div className="text-sm text-gray-600">
                                      Set a fixed monetary value for all opportunities
                                    </div>
                                  </label>
                                </div>

                                {!useDynamicPricingForValue && (
                                  <Input
                                    type="number"
                                    value={opportunityValue || ''}
                                    onChange={(e) => setOpportunityValue(Number(e.target.value) || 0)}
                                    placeholder="e.g., 150"
                                    className="h-10"
                                  />
                                )}
                              </div>

                              {/* Opportunity Owner (Assigned To) */}
                              <div>
                                <Label className="text-base font-semibold mb-2 block">Assign to User (Owner)</Label>
                                <select
                                  value={selectedOpportunityAssignedTo}
                                  onChange={(e) => setSelectedOpportunityAssignedTo(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                                >
                                  <option value="">-- No owner (unassigned) --</option>
                                  {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name || u.email}
                                    </option>
                                  ))}
                                </select>
                                <div className="text-sm text-gray-500 mt-1">User who will own the opportunity in HighLevel</div>
                              </div>

                              {/* Opportunity Source */}
                              <div>
                                <Label className="text-base font-semibold mb-2 block">Source</Label>
                                <Input
                                  type="text"
                                  value={opportunitySource}
                                  onChange={(e) => setOpportunitySource(e.target.value)}
                                  placeholder="e.g. Website Quote"
                                  className="h-10"
                                />
                                <div className="text-sm text-gray-500 mt-1">Source to set on the opportunity in HighLevel</div>
                              </div>

                              {/* Opportunity Tags - multi-select from HighLevel tags */}
                              <div>
                                <Label className="text-base font-semibold mb-2 block">Tags</Label>
                                <div className="text-sm text-gray-500 mb-2">Select HighLevel tags to add to the opportunity</div>
                                <div className="mb-2">
                                  <input
                                    type="text"
                                    placeholder="Search tags..."
                                    value={opportunityTagsSearch}
                                    onChange={(e) => setOpportunityTagsSearch(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                  />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                                  {ghlTags
                                    .filter((tag) => tag.name.toLowerCase().includes(opportunityTagsSearch.toLowerCase()))
                                    .map((tag) => (
                                      <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => {
                                          const next = new Set(selectedOpportunityTags);
                                          if (next.has(tag.name)) next.delete(tag.name);
                                          else next.add(tag.name);
                                          setSelectedOpportunityTags(next);
                                        }}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                          selectedOpportunityTags.has(tag.name)
                                            ? 'bg-pink-500 text-white border border-pink-600'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:border-pink-400'
                                        }`}
                                      >
                                        {tag.name}
                                      </button>
                                    ))}
                                </div>
                                {selectedOpportunityTags.size > 0 && (
                                  <p className="text-sm text-gray-600 mt-2">{selectedOpportunityTags.size} tag(s) selected</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Custom Fields & Field Mapping */}
                      <div className="mt-8 pt-8 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">Custom Fields & Field Mapping</h4>
                        
                        <div className="space-y-6">
                          {/* Quoted Amount Field Mapping */}
                          <div>
                            <Label htmlFor="quoted-amount-field" className="text-base font-semibold">
                              HighLevel Field for Quoted Amount (Custom Field)
                            </Label>
                            <div className="flex gap-2 mt-2">
                              <div className="flex-1 relative">
                                <input
                                  type="text"
                                  placeholder="Search custom fields..."
                                  value={quotedAmountSearch}
                                  onChange={(e) => setQuotedAmountSearch(e.target.value)}
                                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900"
                                />
                                {quotedAmountSearch && customFields.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                                    {customFields
                                      .filter(field => 
                                        field.name?.toLowerCase().includes(quotedAmountSearch.toLowerCase()) ||
                                        field.key?.toLowerCase().includes(quotedAmountSearch.toLowerCase())
                                      )
                                      .map((field) => (
                                        <button
                                          key={field.key}
                                          type="button"
                                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                          onClick={() => {
                                            setQuotedAmountField(field.key);
                                            setQuotedAmountSearch('');
                                          }}
                                        >
                                          <div className="font-semibold text-gray-900">{field.name}</div>
                                          <div className="text-xs text-gray-500 font-mono">{field.key}</div>
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={loadCustomFields}
                                disabled={isLoadingCustomFields}
                                title="Refresh custom fields"
                              >
                                <RotateCw className={`h-4 w-4 ${isLoadingCustomFields ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                            
                            {quotedAmountField && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                                <p className="text-sm text-blue-800">
                                  Selected: <span className="font-mono font-semibold">{quotedAmountField}</span>
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setQuotedAmountField('')}
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 h-8 px-3"
                                >
                                  Clear
                                </Button>
                              </div>
                            )}
                            
                            {customFieldsError && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                {customFieldsError}
                              </div>
                            )}
                            
                            <p className="text-sm text-gray-600 mt-2">
                              Select a HighLevel custom field where the quoted amount will be stored. Leave empty to skip.
                            </p>
                          </div>

                          {/* Field Mapping */}
                          <div className="pt-6 border-t border-gray-200">
                            <h5 className="font-semibold text-gray-900 mb-2">Field Mapping</h5>
                            <p className="text-sm text-gray-600 mb-3">
                              To map your survey questions to HighLevel fields (native fields like firstName, lastName, email, phone, or custom fields), 
                              go to the <strong>Survey Builder</strong> page. There you can edit each question and select which HighLevel field it should map to.
                            </p>
                            <Button
                              onClick={() => router.push('/admin/survey-builder')}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Go to Survey Builder
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Calendar Selection for Appointments and Calls */}
                      <div className="mt-8 pt-8 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-6 text-lg">Appointment & Call Calendars</h4>
                        
                        <div className="space-y-6">
                          <div>
                            <Label htmlFor="appointment-calendar-select" className="text-base font-semibold">
                              Calendar for Appointments
                            </Label>
                            <div className="mt-2 flex gap-2">
                              <select
                                id="appointment-calendar-select"
                                value={selectedAppointmentCalendarId}
                                onChange={async (e) => {
                                  const newCalendarId = e.target.value;
                                  setSelectedAppointmentCalendarId(newCalendarId);
                                  // Reset user selection when calendar changes
                                  setSelectedAppointmentUserId('');
                                  // Load users when calendar is selected
                                  if (newCalendarId) {
                                    await loadUsers();
                                    // Check availability
                                    checkCalendarAvailability(newCalendarId, 'appointment');
                                  } else {
                                    setAppointmentCalendarAvailability(null);
                                  }
                                }}
                                className="flex-1 h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900"
                              >
                                <option value="">-- Select a calendar --</option>
                                {calendars.map((cal) => (
                                  <option key={cal.id} value={cal.id}>
                                    {cal.name}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={loadCalendars}
                                disabled={isLoadingCalendars}
                              >
                                <RotateCw className={`h-4 w-4 ${isLoadingCalendars ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Calendar for users to book cleaning appointments
                            </p>
                            {appointmentCalendarAvailability && (
                              <div className={`mt-2 text-xs flex items-center gap-2 ${
                                appointmentCalendarAvailability.checking 
                                  ? 'text-gray-500' 
                                  : appointmentCalendarAvailability.available 
                                    ? 'text-green-600' 
                                    : 'text-amber-600'
                              }`}>
                                {appointmentCalendarAvailability.checking ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>{appointmentCalendarAvailability.message}</span>
                                  </>
                                ) : appointmentCalendarAvailability.available ? (
                                  <>
                                    <CheckCircle className="h-3 w-3" />
                                    <span>{appointmentCalendarAvailability.message}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3 w-3" />
                                    <span>{appointmentCalendarAvailability.message}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {selectedAppointmentCalendarId && (
                              <div className="mt-3">
                                <Label htmlFor="appointment-user-select" className="text-sm font-semibold text-gray-700">
                                  Assign to User (Required)
                                </Label>
                                <div className="mt-1 flex gap-2">
                                  <select
                                    id="appointment-user-select"
                                    value={selectedAppointmentUserId}
                                    onChange={(e) => setSelectedAppointmentUserId(e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                                  >
                                    <option value="">-- Select a user --</option>
                                    {users.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.name} {user.email ? `(${user.email})` : ''}
                                      </option>
                                    ))}
                                    {/* Show selected user even if not in current list (will update when users load) */}
                                    {selectedAppointmentUserId && !users.find(u => u.id === selectedAppointmentUserId) && isLoadingUsers && (
                                      <option value={selectedAppointmentUserId} disabled>
                                        Loading users...
                                      </option>
                                    )}
                                    {selectedAppointmentUserId && !users.find(u => u.id === selectedAppointmentUserId) && !isLoadingUsers && (
                                      <option value={selectedAppointmentUserId} disabled>
                                        (Selected user not found - may have been removed)
                                      </option>
                                    )}
                                  </select>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Select which team member should be assigned appointments from this calendar
                                </p>
                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                  <p className="font-semibold mb-1">⚠️ Important:</p>
                                  <p>You must also assign users to this calendar in HighLevel Calendar settings. This selection only sets who receives the appointment - the calendar itself needs users assigned in HighLevel to generate available time slots.</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="call-calendar-select" className="text-base font-semibold">
                              Calendar for Calls
                            </Label>
                            <div className="mt-2 flex gap-2">
                              <select
                                id="call-calendar-select"
                                value={selectedCallCalendarId}
                                onChange={async (e) => {
                                  const newCalendarId = e.target.value;
                                  setSelectedCallCalendarId(newCalendarId);
                                  // Reset user selection when calendar changes
                                  setSelectedCallUserId('');
                                  // Load users when calendar is selected
                                  if (newCalendarId) {
                                    await loadUsers();
                                    // Check availability
                                    checkCalendarAvailability(newCalendarId, 'call');
                                  } else {
                                    setCallCalendarAvailability(null);
                                  }
                                }}
                                className="flex-1 h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900"
                              >
                                <option value="">-- Select a calendar --</option>
                                {calendars.map((cal) => (
                                  <option key={cal.id} value={cal.id}>
                                    {cal.name}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={loadCalendars}
                                disabled={isLoadingCalendars}
                              >
                                <RotateCw className={`h-4 w-4 ${isLoadingCalendars ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Calendar for users to schedule consultation calls
                            </p>
                            {callCalendarAvailability && (
                              <div className={`mt-2 text-xs flex items-center gap-2 ${
                                callCalendarAvailability.checking 
                                  ? 'text-gray-500' 
                                  : callCalendarAvailability.available 
                                    ? 'text-green-600' 
                                    : 'text-amber-600'
                              }`}>
                                {callCalendarAvailability.checking ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>{callCalendarAvailability.message}</span>
                                  </>
                                ) : callCalendarAvailability.available ? (
                                  <>
                                    <CheckCircle className="h-3 w-3" />
                                    <span>{callCalendarAvailability.message}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3 w-3" />
                                    <span>{callCalendarAvailability.message}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {selectedCallCalendarId && (
                              <div className="mt-3">
                                <Label htmlFor="call-user-select" className="text-sm font-semibold text-gray-700">
                                  Assign to User (Required)
                                </Label>
                                <div className="mt-1 flex gap-2">
                                  <select
                                    id="call-user-select"
                                    value={selectedCallUserId}
                                    onChange={(e) => setSelectedCallUserId(e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                                  >
                                    <option value="">-- Select a user --</option>
                                    {users.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.name} {user.email ? `(${user.email})` : ''}
                                      </option>
                                    ))}
                                    {/* Show selected user even if not in current list (will update when users load) */}
                                    {selectedCallUserId && !users.find(u => u.id === selectedCallUserId) && isLoadingUsers && (
                                      <option value={selectedCallUserId} disabled>
                                        Loading users...
                                      </option>
                                    )}
                                    {selectedCallUserId && !users.find(u => u.id === selectedCallUserId) && !isLoadingUsers && (
                                      <option value={selectedCallUserId} disabled>
                                        (Selected user not found - may have been removed)
                                      </option>
                                    )}
                                  </select>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Select which team member should be assigned calls from this calendar
                                </p>
                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                  <p className="font-semibold mb-1">⚠️ Important:</p>
                                  <p>You must also assign users to this calendar in HighLevel Calendar settings. This selection only sets who receives the call - the calendar itself needs users assigned in HighLevel to generate available time slots.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Post-Appointment Redirect Settings */}
                      <div className="mt-8 pt-8 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-4 text-lg">Post-Appointment Settings</h4>
                          
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                              <input
                                type="checkbox"
                                id="redirect-after-appointment"
                                checked={redirectAfterAppointment}
                                onChange={(e) => setRedirectAfterAppointment(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                              />
                              <label htmlFor="redirect-after-appointment" className="flex-1 cursor-pointer">
                                <p className="font-semibold text-gray-900">Redirect user after appointment booking</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  After showing the appointment confirmation for 5 seconds, redirect the user to a custom URL
                                </p>
                              </label>
                            </div>

                            {redirectAfterAppointment && (
                              <div className="ml-1 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <Label htmlFor="redirect-url" className="text-base font-semibold block mb-2">
                                  Redirect URL
                                </Label>
                                <Input
                                  id="redirect-url"
                                  type="url"
                                  placeholder="https://example.com/thank-you"
                                  value={appointmentRedirectUrl}
                                  onChange={(e) => setAppointmentRedirectUrl(e.target.value)}
                                  className="h-10"
                                />
                                <p className="text-sm text-gray-600 mt-2">
                                  Enter the full URL (including https://) where users should be redirected
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Appointment Booked Tags */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-4 text-lg">Tags to Add on Appointment Booked</h4>
                          <p className="text-sm text-gray-600 mb-4">Select tags to automatically add to the contact when they book an appointment</p>
                          
                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="Search tags..."
                              value={appointmentTagsSearch}
                              onChange={(e) => setAppointmentTagsSearch(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>

                          {/* Create New Tag Input */}
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <label className="text-sm font-medium text-gray-700 block mb-2">Create New Tag</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="New tag name..."
                                value={newAppointmentTagName}
                                onChange={(e) => setNewAppointmentTagName(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCreateAppointmentOrQuoteTag(newAppointmentTagName, 'appointment');
                                  }
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <Button
                                onClick={() => handleCreateAppointmentOrQuoteTag(newAppointmentTagName, 'appointment')}
                                disabled={isCreatingTag || !newAppointmentTagName.trim()}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                            {ghlTags
                              .filter(tag => tag.name.toLowerCase().includes(appointmentTagsSearch.toLowerCase()))
                              .map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => {
                                    const newTags = new Set(appointmentBookedTags);
                                    if (newTags.has(tag.id)) {
                                      newTags.delete(tag.id);
                                    } else {
                                      newTags.add(tag.id);
                                    }
                                    setAppointmentBookedTags(newTags);
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    appointmentBookedTags.has(tag.id)
                                      ? 'bg-pink-500 text-white border border-pink-600'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:border-pink-400'
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              ))}
                          </div>
                          {appointmentBookedTags.size > 0 && (
                            <p className="text-sm text-gray-600 mt-2">{appointmentBookedTags.size} tag(s) selected</p>
                          )}
                        </div>

                        {/* Quote Completed Tags */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-4 text-lg">Tags to Add on Quote Completed</h4>
                          <p className="text-sm text-gray-600 mb-4">Select tags to automatically add to the contact when a quote is completed (opportunity created)</p>
                          
                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="Search tags..."
                              value={quoteTagsSearch}
                              onChange={(e) => setQuoteTagsSearch(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>

                          {/* Create New Tag Input */}
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <label className="text-sm font-medium text-gray-700 block mb-2">Create New Tag</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="New tag name..."
                                value={newQuoteTagName}
                                onChange={(e) => setNewQuoteTagName(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCreateAppointmentOrQuoteTag(newQuoteTagName, 'quote');
                                  }
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <Button
                                onClick={() => handleCreateAppointmentOrQuoteTag(newQuoteTagName, 'quote')}
                                disabled={isCreatingTag || !newQuoteTagName.trim()}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                            {ghlTags
                              .filter(tag => tag.name.toLowerCase().includes(quoteTagsSearch.toLowerCase()))
                              .map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => {
                                    const newTags = new Set(quoteCompletedTags);
                                    if (newTags.has(tag.id)) {
                                      newTags.delete(tag.id);
                                    } else {
                                      newTags.add(tag.id);
                                    }
                                    setQuoteCompletedTags(newTags);
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    quoteCompletedTags.has(tag.id)
                                      ? 'bg-pink-500 text-white border border-pink-600'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:border-pink-400'
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              ))}
                          </div>
                          {quoteCompletedTags.size > 0 && (
                            <p className="text-sm text-gray-600 mt-2">{quoteCompletedTags.size} tag(s) selected</p>
                          )}
                        </div>

                        {/* In-Service Tags */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-4 text-lg">Tags for In-Service Customers</h4>
                          <p className="text-sm text-gray-600 mb-4">Select tags to automatically apply to customers within your service area</p>
                          
                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="Search tags..."
                              value={inServiceTagSearch}
                              onChange={(e) => setInServiceTagSearch(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                            {/* Create New Tag Input - Embedded in grid */}
                            <div className="col-span-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="New tag name..."
                                  value={newInServiceTagName}
                                  onChange={(e) => setNewInServiceTagName(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleCreateTag(newInServiceTagName, 'in-service');
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <Button
                                  onClick={() => handleCreateTag(newInServiceTagName, 'in-service')}
                                  disabled={isCreatingTag || !newInServiceTagName.trim()}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-3"
                                  size="sm"
                                >
                                  {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>

                            {ghlTags
                              .filter(tag => tag.name.toLowerCase().includes(inServiceTagSearch.toLowerCase()))
                              .map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => {
                                    const newTags = new Set(selectedInServiceTags);
                                    if (newTags.has(tag.name)) {
                                      newTags.delete(tag.name);
                                    } else {
                                      newTags.add(tag.name);
                                    }
                                    setSelectedInServiceTags(newTags);
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    selectedInServiceTags.has(tag.name)
                                      ? 'bg-emerald-500 text-white border border-emerald-600'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:border-emerald-400'
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              ))}
                          </div>
                          {selectedInServiceTags.size > 0 && (
                            <p className="text-sm text-gray-600 mt-2">{selectedInServiceTags.size} tag(s) selected</p>
                          )}
                        </div>

                        {/* Out-of-Service Tags */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-4 text-lg">Tags for Out-of-Service Customers</h4>
                          <p className="text-sm text-gray-600 mb-4">Select tags to automatically apply to customers outside your service area</p>
                          
                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="Search tags..."
                              value={outOfServiceTagSearch}
                              onChange={(e) => setOutOfServiceTagSearch(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                            {/* Create New Tag Input - Embedded in grid */}
                            <div className="col-span-full p-2 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="New tag name..."
                                  value={newOutOfServiceTagName}
                                  onChange={(e) => setNewOutOfServiceTagName(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleCreateTag(newOutOfServiceTagName, 'out-of-service');
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <Button
                                  onClick={() => handleCreateTag(newOutOfServiceTagName, 'out-of-service')}
                                  disabled={isCreatingTag || !newOutOfServiceTagName.trim()}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3"
                                  size="sm"
                                >
                                  {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>

                            {ghlTags
                              .filter(tag => tag.name.toLowerCase().includes(outOfServiceTagSearch.toLowerCase()))
                              .map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => {
                                    const newTags = new Set(selectedOutOfServiceTags);
                                    if (newTags.has(tag.name)) {
                                      newTags.delete(tag.name);
                                    } else {
                                      newTags.add(tag.name);
                                    }
                                    setSelectedOutOfServiceTags(newTags);
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    selectedOutOfServiceTags.has(tag.name)
                                      ? 'bg-red-500 text-white border border-red-600'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:border-red-400'
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              ))}
                          </div>
                          {selectedOutOfServiceTags.size > 0 && (
                            <p className="text-sm text-gray-600 mt-2">{selectedOutOfServiceTags.size} tag(s) selected</p>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveGHLConfig}
                        disabled={isSavingConfig}
                        className="w-full h-11 font-semibold flex items-center gap-2"
                      >
                        {isSavingConfig ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save HighLevel Configuration
                          </>
                        )}
                      </Button>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-800">
                    <p className="font-semibold">⚠️ HighLevel not connected</p>
                    <p className="text-sm mt-1">Please verify your HighLevel API token above before configuring integration features.</p>
                  </div>
                )}
              </div>
            </CardContent>
            )}
          </Card>
        </motion.div>


        {/* Service Area Management Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
            <CardHeader 
              className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('service-area')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                    Service Area Configuration
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Upload a KML file with your service area polygon, and configure tags for in-service and out-of-service customers
                  </CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('service-area') ? 'rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
            {isCardExpanded('service-area') && (
              <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {serviceAreaMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      serviceAreaMessage.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {serviceAreaMessage.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <p>{serviceAreaMessage.text}</p>
                  </motion.div>
                )}

                {/* KML Upload */}
                <div>
                  <Label className="text-base font-semibold">Upload Service Area Polygon (KML)</Label>
                  
                  {/* Status Display */}
                  {serviceAreaType !== 'none' && (
                    <div className={`mt-3 p-4 rounded-lg border-2 ${
                      serviceAreaType === 'network'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className={`font-semibold ${
                            serviceAreaType === 'network'
                              ? 'text-blue-900'
                              : 'text-emerald-900'
                          }`}>
                            {serviceAreaType === 'network' ? '🔗 NetworkLink Active' : '✓ Direct Polygon Active'}
                          </p>
                          <p className={`text-sm mt-1 ${
                            serviceAreaType === 'network'
                              ? 'text-blue-800'
                              : 'text-emerald-800'
                          }`}>
                            {serviceAreaType === 'network' 
                              ? `Automatically fetching from: ${networkLinkUrl}`
                              : `${polygonCoordinateCount} coordinates loaded`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <input
                      type="file"
                      accept=".kml,.kmz"
                      onChange={(e) => setServiceAreaFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="kml-file-input"
                    />
                    <label htmlFor="kml-file-input" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="font-semibold text-gray-700">Click to select KML file</p>
                      <p className="text-sm text-gray-600">or drag and drop</p>
                      {serviceAreaFile && (
                        <p className="text-sm text-emerald-600 mt-2">📁 {serviceAreaFile.name}</p>
                      )}
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Export your service area as a KML file from Google Maps or other mapping software. The system supports:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2 mt-1">
                    <li><strong>Direct KML files</strong> - Traditional KML with polygon coordinates. Uploads once and stores the data.</li>
                    <li><strong>NetworkLink references</strong> - KML files that link to a remote server. The system will automatically fetch and update the polygon data periodically, so you don't need to re-upload when your map changes!</li>
                  </ul>
                  {serviceAreaFile && (
                    <Button
                      onClick={handleUploadServiceArea}
                      disabled={isUploadingServiceArea}
                      className="w-full mt-4 h-10 font-semibold flex items-center gap-2"
                    >
                      {isUploadingServiceArea ? (
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

                {/* Open Survey in New Tab Setting */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label htmlFor="open-survey-new-tab" className="text-base font-semibold">
                        Open Survey Continuation in New Tab
                      </Label>
                      <p className="text-sm text-gray-600 mt-2">
                        When enabled, after the user enters their address and passes the service area check, a new tab will open to continue the survey. Their contact information will be pre-filled, and they'll skip directly to house detail questions.
                        <br />
                        <span className="text-xs text-gray-500 italic mt-1 block">
                          Note: This feature only works when the widget is embedded in an iframe. It will not open a new tab when users access the survey directly on your website.
                        </span>
                      </p>
                    </div>
                    <div className="ml-4 flex items-center">
                      <input
                        type="checkbox"
                        id="open-survey-new-tab"
                        checked={openSurveyInNewTab}
                        onChange={(e) => setOpenSurveyInNewTab(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Google Maps API Key Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
            <CardHeader 
              className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('google-maps')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <Code className="h-5 w-5 text-blue-600" />
                    Google Maps API Key
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Configure your Google Maps API key for address autocomplete and service area mapping
                  </CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('google-maps') ? 'rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
            {isCardExpanded('google-maps') && (
              <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {apiKeyMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      apiKeyMessage.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {apiKeyMessage.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <p>{apiKeyMessage.text}</p>
                  </motion.div>
                )}

                <div>
                  <Label htmlFor="google-maps-key" className="text-base font-semibold">
                    API Key
                  </Label>
                  <Input
                    id="google-maps-key"
                    type="password"
                    value={googleMapsApiKey}
                    onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                    placeholder="Leave blank to keep current key"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Current key: {googleMapsApiKeyDisplay}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Enter your Google Maps API key to enable Google Places Autocomplete for address input and service area mapping features.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">How to get a Google Maps API Key:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
                    <li>Create a new project or select an existing one</li>
                    <li>Enable the "Places API" and "Maps JavaScript API"</li>
                    <li>Go to "Credentials" and create an API key</li>
                    <li>Copy the API key and paste it above</li>
                  </ol>
                </div>

                <Button
                  onClick={handleSaveGoogleMapsKey}
                  disabled={isSavingApiKey}
                  className="w-full h-11 font-semibold flex items-center gap-2"
                >
                  {isSavingApiKey ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Google Maps API Key
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Tracking Codes Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
            <CardHeader 
              className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('tracking')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <Code className="h-5 w-5 text-purple-600" />
                    Tracking & Analytics
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Custom tracking code that loads only on the quote summary page so you can track when quotes are given
                  </CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('tracking') ? 'rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
            {isCardExpanded('tracking') && (
              <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {trackingMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      trackingMessage.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {trackingMessage.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <p>{trackingMessage.text}</p>
                  </motion.div>
                )}

                <div>
                  <Label htmlFor="custom-code" className="text-base font-semibold">
                    Custom Head Code
                  </Label>
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-1">
                    Note: This code only loads on the quote summary page — not on the landing page or confirmation pages.
                  </p>
                  <textarea
                    id="custom-code"
                    value={customHeadCode}
                    onChange={(e) => setCustomHeadCode(e.target.value)}
                    placeholder="&lt;script&gt;...&lt;/script&gt; Paste tracking scripts here."
                    className="mt-2 w-full h-40 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Use this to fire conversions when a quote is shown (e.g. Google Ads, Meta Pixel, GTM). Scripts run only on /quote/[id].
                  </p>
                </div>

                <Button
                  onClick={handleSaveTrackingCodes}
                  disabled={isSavingTracking}
                  className="w-full h-11 font-semibold flex items-center gap-2"
                >
                  {isSavingTracking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Tracking Codes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
            <CardHeader 
              className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('form-settings')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Query Parameter Settings</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Configure which URL query parameters should pre-fill the form fields. Example: ?firstName=John&email=test@example.com
                  </CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('form-settings') ? 'rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
            {isCardExpanded('form-settings') && (
              <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {formSettingsMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      formSettingsMessage.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {formSettingsMessage.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <p>{formSettingsMessage.text}</p>
                  </motion.div>
                )}

                <div>
                  <Label htmlFor="first-name-param" className="text-base font-semibold">
                    First Name Parameter
                  </Label>
                  <Input
                    id="first-name-param"
                    value={firstNameParam}
                    onChange={(e) => setFirstNameParam(e.target.value)}
                    placeholder="e.g., firstName, first_name"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    The query parameter name to use for first name (e.g., ?firstName=John)
                  </p>
                </div>

                <div>
                  <Label htmlFor="last-name-param" className="text-base font-semibold">
                    Last Name Parameter
                  </Label>
                  <Input
                    id="last-name-param"
                    value={lastNameParam}
                    onChange={(e) => setLastNameParam(e.target.value)}
                    placeholder="e.g., lastName, last_name"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    The query parameter name to use for last name (e.g., ?lastName=Doe)
                  </p>
                </div>

                <div>
                  <Label htmlFor="email-param" className="text-base font-semibold">
                    Email Parameter
                  </Label>
                  <Input
                    id="email-param"
                    value={emailParam}
                    onChange={(e) => setEmailParam(e.target.value)}
                    placeholder="e.g., email, email_address"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    The query parameter name to use for email (e.g., ?email=test@example.com)
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone-param" className="text-base font-semibold">
                    Phone Parameter
                  </Label>
                  <Input
                    id="phone-param"
                    value={phoneParam}
                    onChange={(e) => setPhoneParam(e.target.value)}
                    placeholder="e.g., phone, phone_number"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    The query parameter name to use for phone (e.g., ?phone=555-1234)
                  </p>
                </div>

                <div>
                  <Label htmlFor="address-param" className="text-base font-semibold">
                    Address Parameter
                  </Label>
                  <Input
                    id="address-param"
                    value={addressParam}
                    onChange={(e) => setAddressParam(e.target.value)}
                    placeholder="e.g., address, location"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    The query parameter name to use for address (e.g., ?address=123+Main+St)
                  </p>
                </div>

                <Button
                  onClick={handleSaveFormSettings}
                  disabled={isSavingFormSettings}
                  className="w-full h-11 font-semibold flex items-center gap-2"
                >
                  {isSavingFormSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Form Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
            <CardHeader 
              className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('customization')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Site Customization</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Customize the title, subtitle, and primary color for your entire site
                  </CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('customization') ? 'rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
            {isCardExpanded('customization') && (
              <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {widgetMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      widgetMessage.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {widgetMessage.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <p>{widgetMessage.text}</p>
                  </motion.div>
                )}

                <div>
                  <Label htmlFor="widget-title" className="text-base font-semibold">
                    Site Title
                  </Label>
                  <Input
                    id="widget-title"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    placeholder="e.g., Acme Cleaning"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    This title is displayed prominently at the top of the site and used as the page title.
                  </p>
                </div>

                <div>
                  <Label htmlFor="widget-subtitle" className="text-base font-semibold">
                    Site Subtitle
                  </Label>
                  <Input
                    id="widget-subtitle"
                    value={widgetSubtitle}
                    onChange={(e) => setWidgetSubtitle(e.target.value)}
                    placeholder="e.g., Let's get your professional cleaning price!"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    This subtitle appears below the title throughout the site.
                  </p>
                </div>

                <div>
                  <Label htmlFor="widget-primary-color" className="text-base font-semibold">
                    Primary Brand Color
                  </Label>
                  <div className="mt-2 flex gap-3 items-center">
                    <input
                      id="widget-primary-color"
                      type="color"
                      value={widgetPrimaryColor}
                      onChange={(e) => setWidgetPrimaryColor(e.target.value)}
                      className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={widgetPrimaryColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^#[0-9A-F]{6}$/i.test(val) || val.length <= 7) {
                            setWidgetPrimaryColor(val);
                          }
                        }}
                        placeholder="#0d9488"
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    This color is used for buttons, headers, accents, and branding elements throughout the entire site.
                  </p>
                </div>

                <Button
                  onClick={handleSaveWidgetSettings}
                  disabled={isSavingWidget}
                  className="w-full h-11 font-semibold flex items-center gap-2"
                >
                  {isSavingWidget ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Widget Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
            <CardHeader 
              className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('embed')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <Code className="h-5 w-5 text-primary" />
                    Embed Quote Widget
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Copy this code and paste it anywhere on your website to embed the quote calculator
                  </CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform flex-shrink-0 ${isCardExpanded('embed') ? 'rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
            {isCardExpanded('embed') && (
              <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <code className="text-green-400 font-mono text-sm whitespace-pre-wrap break-words">
                    {getEmbedCode()}
                  </code>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCopyEmbed}
                    variant={copiedEmbed ? 'secondary' : 'default'}
                    className="flex-1 h-11 font-semibold flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedEmbed ? 'Copied!' : 'Copy Embed Code'}
                  </Button>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Copy the embed code above</li>
                    <li>Paste it into your website's HTML where you want the widget to appear</li>
                    <li>The widget will automatically load and be responsive</li>
                    <li>Customize the title and subtitle using the settings above</li>
                  </ol>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-900 mb-2">⚠️ Important:</h4>
                  <p className="text-sm text-amber-800">
                    Make sure your website is accessible from the same domain as this admin panel, or update the
                    data-base-url attribute in the embed code to point to your actual website URL.
                  </p>
                </div>
              </div>
            </CardContent>
            )}
          </Card>
        </motion.div>
        </div>
      </div>
    </main>
  );
}
