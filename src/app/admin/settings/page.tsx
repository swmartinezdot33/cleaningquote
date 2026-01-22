'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2, Save, RotateCw, Eye, EyeOff, Sparkles, ArrowLeft, Copy, Code, ChevronDown, FileText, Upload, MapPin, Plus } from 'lucide-react';
import { GHLTestWizard } from '@/components/GHLTestWizard';

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
  const [widgetTitle, setWidgetTitle] = useState('Raleigh Cleaning Company');
  const [widgetSubtitle, setWidgetSubtitle] = useState("Let's get your professional cleaning price!");
  const [widgetPrimaryColor, setWidgetPrimaryColor] = useState('#f61590');
  const [isSavingWidget, setIsSavingWidget] = useState(false);
  const [widgetMessage, setWidgetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Tracking Codes State
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState('');
  const [googleTagManagerId, setGoogleTagManagerId] = useState('');
  const [metaPixelId, setMetaPixelId] = useState('');
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
  const [isLoadingFormSettings, setIsLoadingFormSettings] = useState(false);
  const [isSavingFormSettings, setIsSavingFormSettings] = useState(false);
  const [formSettingsMessage, setFormSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GHL Configuration States
  const [ghlConfigLoaded, setGhlConfigLoaded] = useState(false);
  const [createContact, setCreateContact] = useState(true);
  const [createOpportunity, setCreateOpportunity] = useState(false);
  const [createNote, setCreateNote] = useState(true);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [opportunityStatus, setOpportunityStatus] = useState<string>('open');
  const [opportunityValue, setOpportunityValue] = useState<number>(0);
  const [useDynamicPricingForValue, setUseDynamicPricingForValue] = useState<boolean>(true);
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

  // Load pipelines when connection status changes to connected
  useEffect(() => {
    if (isAuthenticated && connectionStatus === 'connected' && createOpportunity) {
      loadPipelines();
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
      }
    } catch (error) {
      console.error('Auth check failed:', error);
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
      setMessage({ type: 'error', text: 'Please enter a GHL API token' });
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
        setMessage({ type: 'success', text: 'GHL API token saved successfully!' });
        setGhlToken('');
        setGhlTokenDisplay(`****${ghlToken.slice(-4)}`);
        setConnectionStatus('connected');
        setTimeout(() => loadSettings(), 500);
      } else {
        const errorText = data.error || 'Failed to save GHL API token';
        const detailsText = data.details ? ` Details: ${data.details}` : '';
        setMessage({
          type: 'error',
          text: errorText + detailsText,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save GHL API token. Please try again.',
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
        setMessage({ type: 'success', text: 'Connected to GHL successfully!' });
        setConnectionStatus('connected');
      } else {
        const errorText = data.error || data.message || 'Failed to connect to GHL';
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
        setWidgetTitle(data.title || 'Raleigh Cleaning Company');
        setWidgetSubtitle(data.subtitle || "Let's get your professional cleaning price!");
        setWidgetPrimaryColor(data.primaryColor || '#f61590');
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
    return `<!-- Raleigh Cleaning Company Quote Widget -->
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
        setSelectedAppointmentCalendarId(config.appointmentCalendarId || '');
        setSelectedCallCalendarId(config.callCalendarId || '');
        setSelectedAppointmentUserId(config.appointmentUserId || '');
        setSelectedCallUserId(config.callUserId || '');
        setQuotedAmountField(config.quotedAmountField || '');
        
        // Load redirect settings
        setRedirectAfterAppointment(config.redirectAfterAppointment === true);
        setAppointmentRedirectUrl(config.appointmentRedirectUrl || '');
        
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
          pipelineId: selectedPipelineId || undefined,
          pipelineStageId: selectedStageId || undefined,
          opportunityStatus,
          opportunityMonetaryValue: opportunityValue || undefined,
          useDynamicPricingForValue,
          inServiceTags: Array.from(selectedInServiceTags).length > 0 ? Array.from(selectedInServiceTags) : undefined,
          outOfServiceTags: Array.from(selectedOutOfServiceTags).length > 0 ? Array.from(selectedOutOfServiceTags) : undefined,
          appointmentCalendarId: selectedAppointmentCalendarId || undefined,
          callCalendarId: selectedCallCalendarId || undefined,
          appointmentUserId: selectedAppointmentUserId || undefined,
          callUserId: selectedCallUserId || undefined,
          quotedAmountField: quotedAmountField || undefined,
          redirectAfterAppointment,
          appointmentRedirectUrl: appointmentRedirectUrl || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConfigMessage({ type: 'success', text: 'GHL configuration saved successfully!' });
      } else {
        setConfigMessage({
          type: 'error',
          text: data.error || 'Failed to save GHL configuration',
        });
      }
    } catch (error) {
      setConfigMessage({
        type: 'error',
        text: 'Failed to save GHL configuration. Please try again.',
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
          message: 'Failed to check availability. Verify calendar is properly configured in GHL.',
          checking: false,
        });
      } else {
        setCallCalendarAvailability({
          available: false,
          message: 'Failed to check availability. Verify calendar is properly configured in GHL.',
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
      const response = await fetch('/api/admin/ghl-custom-fields', {
        headers: {
          'x-admin-password': password,
        },
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
        setGoogleAnalyticsId(data.trackingCodes.googleAnalyticsId || '');
        setGoogleTagManagerId(data.trackingCodes.googleTagManagerId || '');
        setMetaPixelId(data.trackingCodes.metaPixelId || '');
        setCustomHeadCode(data.trackingCodes.customHeadCode || '');
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
        body: JSON.stringify({
          googleAnalyticsId,
          googleTagManagerId,
          metaPixelId,
          customHeadCode,
        }),
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
      if (!googleAnalyticsId) {
        loadTrackingCodes();
      }
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
                <div>
                  <Label htmlFor="password">Admin Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin();
                      }
                    }}
                  />
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
            <Sparkles className="h-8 w-8 text-[#f61590]" />
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
              className="bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('ghl-unified')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                    <Sparkles className="h-6 w-6 text-[#f61590]" />
                    GoHighLevel Integration
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Configure your GHL token and CRM integration settings
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">API Token & Authentication</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="token" className="text-base font-semibold">
                        GHL Private Integration Token (PIT)
                      </Label>
                      <p className="text-sm text-gray-600 mt-1 mb-3">
                        Enter your GoHighLevel API token. <strong className="text-[#f61590]">We strongly recommend using a Location-level PIT token</strong> (sub-account level) for better security and reliability. Keep this secret - never share it publicly.
                      </p>
                      <div className="mt-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          💡 Recommended: Location-level PIT Token
                        </p>
                        <p className="text-xs text-blue-800">
                          Location-level (sub-account) PIT tokens are scoped to a specific location and provide better security. All API calls will use the Location ID you provide below to ensure proper sub-account integration.
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
                          Enter your GoHighLevel Location ID. This is required for GHL API integration. You can find this in your GHL dashboard URL after /location/
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
                          Required GHL Scopes:
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
                          <strong>Important:</strong> We recommend using a <strong>Location-level PIT token</strong> (sub-account level) for all integrations. Location-level tokens don't need the locations.readonly scope and provide better security by scoping to a specific location. All API calls will automatically use your Location ID for sub-account operations.
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

                    {/* GHL Test Wizard */}
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Comprehensive Endpoint Test</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Test all GHL API endpoints at once and get detailed feedback on each one. This helps diagnose issues with your GHL integration.
                      </p>
                      {isAuthenticated && password && (
                        <GHLTestWizard adminPassword={password} />
                      )}
                    </div>

                    {/* About GHL Integration */}
                    <div className="mt-8 pt-8 border-t border-gray-200 space-y-6 text-sm text-gray-700">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">What does this do?</h4>
                        <p>
                          When enabled, the quote form will automatically create contacts and opportunities in your
                          GoHighLevel CRM whenever a customer generates a quote. This includes:
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                          <li>Creating a new contact with customer information</li>
                          <li>Creating an opportunity with the quote value</li>
                          <li>Adding a detailed note with all quote information</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">How to get your GHL PIT token</h4>
                        <p>
                          1. Log in to your GoHighLevel dashboard<br />
                          2. Navigate to the specific Location (sub-account) you want to integrate<br />
                          3. Go to Settings → Integrations → API<br />
                          4. <strong>Create a Location-level Private Integration Token</strong> (recommended) or use an existing one<br />
                          5. Copy the token and paste it above<br />
                          6. Enter the Location ID from your dashboard URL (found after /location/)
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Required API Scopes</h4>
                        <p className="mb-2">
                          When creating your Private Integration Token, make sure to enable these scopes:
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">contacts.write</p>
                              <p className="text-xs text-blue-800">Required to create and update customer contacts</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">contacts.readonly</p>
                              <p className="text-xs text-blue-800">Required to view customer contact information</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">opportunities.write</p>
                              <p className="text-xs text-blue-800">Required to create quote opportunities in your pipeline</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">opportunities.readonly</p>
                              <p className="text-xs text-blue-800">Required to fetch pipeline and stage information</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">calendars.write</p>
                              <p className="text-xs text-blue-800">Required to book and create appointments for customers</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">calendars.readonly</p>
                              <p className="text-xs text-blue-800">Required to view available calendars</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">locations.readonly</p>
                              <p className="text-xs text-blue-800">Required to fetch calendars, tags, custom fields, and location information</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">locations/customFields.readonly</p>
                              <p className="text-xs text-blue-800">Required to view custom fields for mapping survey questions</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">locations/tags.readonly</p>
                              <p className="text-xs text-blue-800">Required to view available tags for service area tagging</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">✓</span>
                            <div>
                              <p className="font-semibold text-blue-900">locations/tags.write</p>
                              <p className="text-xs text-blue-800">Required to apply tags to customers (in-service/out-of-service)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Field Mapping</h4>
                        <p>
                          To map your survey questions to GHL fields (native fields like firstName, lastName, email, phone, or custom fields), 
                          go to the <strong>Survey Builder</strong> page. There you can edit each question and select which GHL field it should map to.
                        </p>
                        <Button
                          onClick={() => router.push('/admin/survey-builder')}
                          variant="outline"
                          className="mt-3 flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Go to Survey Builder
                        </Button>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Security</h4>
                        <p>Your GHL token is stored securely in encrypted storage and is never exposed to the client.</p>
                      </div>
                    </div>
                  </div>
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
                            className="w-5 h-5 text-[#f61590] rounded cursor-pointer"
                          />
                          <label htmlFor="create-contact" className="cursor-pointer flex-1">
                            <div className="font-semibold text-gray-900">Create/Update Contact</div>
                            <div className="text-sm text-gray-600">Automatically create or update contact with customer info (name, email, phone)</div>
                          </label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            id="create-opportunity"
                            checked={createOpportunity}
                            onChange={(e) => setCreateOpportunity(e.target.checked)}
                            className="w-5 h-5 text-[#f61590] rounded cursor-pointer"
                          />
                          <label htmlFor="create-opportunity" className="cursor-pointer flex-1">
                            <div className="font-semibold text-gray-900">Create Opportunity</div>
                            <div className="text-sm text-gray-600">Automatically create a sales opportunity with the quote details</div>
                          </label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            id="create-note"
                            checked={createNote}
                            onChange={(e) => setCreateNote(e.target.checked)}
                            className="w-5 h-5 text-[#f61590] rounded cursor-pointer"
                          />
                          <label htmlFor="create-note" className="cursor-pointer flex-1">
                            <div className="font-semibold text-gray-900">Create Note</div>
                            <div className="text-sm text-gray-600">Add a note to the contact with the complete quote summary</div>
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
                              No pipelines found. Please create a pipeline in GHL first.
                            </div>
                          ) : (
                            <>
                              {/* Pipeline Selection */}
                              <div>
                                <Label className="text-base font-semibold mb-2 block">Select Pipeline</Label>
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
                              </div>

                              {/* Stage Selection */}
                              {selectedPipelineId && (
                                <div>
                                  <Label className="text-base font-semibold mb-2 block">Select Starting Stage</Label>
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
                                    className="w-4 h-4 text-[#f61590] cursor-pointer"
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
                                    className="w-4 h-4 text-[#f61590] cursor-pointer"
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
                            </>
                          )}
                        </div>
                      )}

                      {/* Service Area Tags */}
                      <div className="mt-8 pt-8 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-6 text-lg">Service Area Tags</h4>
                        
                        <div className="space-y-6">
                          {/* In-Service Tags */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-base font-semibold">Tags for In-Service Customers</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={loadTags}
                                disabled={isLoadingTags}
                                className="text-xs h-6"
                              >
                                <RotateCw className={`h-3 w-3 ${isLoadingTags ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                            
                            {/* Search input for filtering tags */}
                            <div className="mb-2">
                              <Input
                                type="text"
                                placeholder="Search tags..."
                                value={inServiceTagSearch}
                                onChange={(e) => setInServiceTagSearch(e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            
                            {/* Create New Tag - outside scrollable container */}
                            <div className="mb-2 flex gap-2 items-center">
                              <Input
                                type="text"
                                placeholder="Create new tag..."
                                value={newInServiceTagName}
                                onChange={(e) => setNewInServiceTagName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateTag(newInServiceTagName, 'in-service');
                                  }
                                }}
                                className="h-8 text-sm"
                                disabled={isCreatingTag}
                              />
                              <Button
                                type="button"
                                onClick={() => handleCreateTag(newInServiceTagName, 'in-service')}
                                disabled={isCreatingTag || !newInServiceTagName.trim()}
                                size="sm"
                                className="h-8"
                              >
                                {isCreatingTag ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            
                            <div className="mt-2 p-3 border-2 border-gray-200 rounded-lg max-h-40 overflow-y-auto space-y-2">

                              {/* Filtered Existing Tags */}
                              {ghlTags.length > 0 ? (
                                (() => {
                                  const searchLower = inServiceTagSearch.toLowerCase();
                                  const filteredTags = ghlTags.filter((tag) =>
                                    tag.name.toLowerCase().includes(searchLower)
                                  );
                                  
                                  if (filteredTags.length === 0 && inServiceTagSearch) {
                                    return (
                                      <p className="text-sm text-gray-500 italic py-2">
                                        No tags match "{inServiceTagSearch}". Create a new tag above.
                                      </p>
                                    );
                                  }
                                  
                                  return filteredTags.map((tag) => (
                                    <label key={tag.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                      <input
                                        type="checkbox"
                                        checked={selectedInServiceTags.has(tag.name)}
                                        onChange={(e) => {
                                          const newTags = new Set(selectedInServiceTags);
                                          if (e.target.checked) {
                                            newTags.add(tag.name);
                                          } else {
                                            newTags.delete(tag.name);
                                          }
                                          setSelectedInServiceTags(newTags);
                                        }}
                                        className="w-4 h-4 rounded text-[#f61590]"
                                      />
                                      <span className="text-sm text-gray-700">{tag.name}</span>
                                    </label>
                                  ));
                                })()
                              ) : (
                                <p className="text-sm text-gray-500 italic">No tags available. Click refresh to load from GHL.</p>
                              )}
                            </div>

                            <div className="mt-3 flex gap-2 flex-wrap">
                              {Array.from(selectedInServiceTags).map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTags = new Set(selectedInServiceTags);
                                      newTags.delete(tag);
                                      setSelectedInServiceTags(newTags);
                                    }}
                                    className="hover:text-emerald-900"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>

                            <p className="text-sm text-gray-600 mt-2">
                              Select tags from your GHL location or create new tags. These will be automatically applied to customers within your service area.
                            </p>
                          </div>

                          {/* Out-of-Service Tags */}
                          <div>
                            <Label className="text-base font-semibold">Tags for Out-of-Service Customers</Label>
                            
                            {/* Search input for filtering tags */}
                            <div className="mt-2 mb-2">
                              <Input
                                type="text"
                                placeholder="Search tags..."
                                value={outOfServiceTagSearch}
                                onChange={(e) => setOutOfServiceTagSearch(e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            
                            {/* Create New Tag - outside scrollable container */}
                            <div className="mb-2 flex gap-2 items-center">
                              <Input
                                type="text"
                                placeholder="Create new tag..."
                                value={newOutOfServiceTagName}
                                onChange={(e) => setNewOutOfServiceTagName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateTag(newOutOfServiceTagName, 'out-of-service');
                                  }
                                }}
                                className="h-8 text-sm"
                                disabled={isCreatingTag}
                              />
                              <Button
                                type="button"
                                onClick={() => handleCreateTag(newOutOfServiceTagName, 'out-of-service')}
                                disabled={isCreatingTag || !newOutOfServiceTagName.trim()}
                                size="sm"
                                className="h-8"
                              >
                                {isCreatingTag ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            
                            <div className="mt-2 p-3 border-2 border-gray-200 rounded-lg max-h-40 overflow-y-auto space-y-2">
                              {ghlTags.length > 0 ? (
                                (() => {
                                  const searchLower = outOfServiceTagSearch.toLowerCase();
                                  const filteredTags = ghlTags.filter((tag) =>
                                    tag.name.toLowerCase().includes(searchLower)
                                  );
                                  
                                  if (filteredTags.length === 0 && outOfServiceTagSearch) {
                                    return (
                                      <p className="text-sm text-gray-500 italic py-2">
                                        No tags match "{outOfServiceTagSearch}".
                                      </p>
                                    );
                                  }
                                  
                                  return filteredTags.map((tag) => (
                                    <label key={tag.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                      <input
                                        type="checkbox"
                                        checked={selectedOutOfServiceTags.has(tag.name)}
                                        onChange={(e) => {
                                          const newTags = new Set(selectedOutOfServiceTags);
                                          if (e.target.checked) {
                                            newTags.add(tag.name);
                                          } else {
                                            newTags.delete(tag.name);
                                          }
                                          setSelectedOutOfServiceTags(newTags);
                                        }}
                                        className="w-4 h-4 rounded text-[#f61590]"
                                      />
                                      <span className="text-sm text-gray-700">{tag.name}</span>
                                    </label>
                                  ));
                                })()
                              ) : (
                                <p className="text-sm text-gray-500 italic">No tags available. Click refresh to load from GHL.</p>
                              )}
                            </div>

                            <div className="mt-3 flex gap-2 flex-wrap">
                              {Array.from(selectedOutOfServiceTags).map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTags = new Set(selectedOutOfServiceTags);
                                      newTags.delete(tag);
                                      setSelectedOutOfServiceTags(newTags);
                                    }}
                                    className="hover:text-red-900"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>

                            <p className="text-sm text-gray-600 mt-2">
                              Select tags from your GHL location or add custom tags. These tags will automatically be applied to customers outside your service area.
                            </p>
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
                                  <p>You must also assign users to this calendar in GHL Calendar settings. This selection only sets who receives the appointment - the calendar itself needs users assigned in GHL to generate available time slots.</p>
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
                                  <p>You must also assign users to this calendar in GHL Calendar settings. This selection only sets who receives the call - the calendar itself needs users assigned in GHL to generate available time slots.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quoted Amount Field Mapping */}
                      <div className="mt-8 pt-8 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">Custom Fields</h4>
                        
                        <div>
                          <Label htmlFor="quoted-amount-field" className="text-base font-semibold">
                            GHL Field for Quoted Amount (Custom Field)
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
                            Select a GHL custom field where the quoted amount will be stored. Leave empty to skip.
                          </p>
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
                            Save GHL Configuration
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-800">
                    <p className="font-semibold">⚠️ GHL not connected</p>
                    <p className="text-sm mt-1">Please verify your GHL API token above before configuring integration features.</p>
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
                    Add Google Analytics, Google Tag Manager, Meta Pixel, and custom tracking codes
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
                  <Label htmlFor="ga-id" className="text-base font-semibold">
                    Google Analytics ID
                  </Label>
                  <Input
                    id="ga-id"
                    value={googleAnalyticsId}
                    onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Your Google Analytics 4 measurement ID (starts with G-)
                  </p>
                </div>

                <div>
                  <Label htmlFor="gtm-id" className="text-base font-semibold">
                    Google Tag Manager ID
                  </Label>
                  <Input
                    id="gtm-id"
                    value={googleTagManagerId}
                    onChange={(e) => setGoogleTagManagerId(e.target.value)}
                    placeholder="GTM-XXXXXXX"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Your Google Tag Manager container ID (starts with GTM-)
                  </p>
                </div>

                <div>
                  <Label htmlFor="meta-pixel-id" className="text-base font-semibold">
                    Meta Pixel ID
                  </Label>
                  <Input
                    id="meta-pixel-id"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="123456789012345"
                    className="mt-3"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Your Meta Pixel ID for Facebook/Instagram conversion tracking
                  </p>
                </div>

                <div>
                  <Label htmlFor="custom-code" className="text-base font-semibold">
                    Custom Head Code
                  </Label>
                  <textarea
                    id="custom-code"
                    value={customHeadCode}
                    onChange={(e) => setCustomHeadCode(e.target.value)}
                    placeholder="&lt;script&gt;...&lt;/script&gt;"
                    className="mt-2 w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Any additional tracking or custom scripts to add to the page head
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
              className="bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer"
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
              className="bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer"
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
                    placeholder="e.g., Raleigh Cleaning Company"
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
                        placeholder="#f61590"
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
              className="bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer"
              onClick={() => toggleCard('embed')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <Code className="h-5 w-5 text-[#f61590]" />
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
