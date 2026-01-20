'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2, Save, RotateCw, Eye, EyeOff, Sparkles, ArrowLeft, Copy, Code, ChevronDown } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ghlToken, setGhlToken] = useState('');
  const [ghlTokenDisplay, setGhlTokenDisplay] = useState('');
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

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/ghl-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ token: ghlToken }),
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
<div id="cleaning-quote-widget"></div>
<script src="${baseUrl}/widget.js" data-base-url="${baseUrl}" data-container-id="cleaning-quote-widget"><\/script>`;
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
        setGhlConfigLoaded(true);

        // Load pipelines if token is connected
        if (connectionStatus === 'connected') {
          await loadPipelines();
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

  // Save GHL configuration
  const handleSaveGHLConfig = async () => {
    if (createOpportunity && (!selectedPipelineId || !selectedStageId)) {
      setConfigMessage({ type: 'error', text: 'Please select a pipeline and stage for opportunities' });
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
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password">Admin Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-2"
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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={() => router.push('/admin')}
            variant="outline"
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-[#f61590]" />
            <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Configure GoHighLevel API integration</p>
        </motion.div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-xl border-2 mb-6">
            <CardHeader className="bg-gradient-to-r from-[#f61590]/5 via-transparent to-transparent border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>GoHighLevel API Token</CardTitle>
                  <CardDescription>
                    Configure your GHL PIT token to enable CRM integration
                  </CardDescription>
                </div>
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
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="token" className="text-base font-semibold">
                    GHL Permanent Integration Token (PIT)
                  </Label>
                  <p className="text-sm text-gray-600 mt-1 mb-3">
                    Enter your GoHighLevel API token. Keep this secret - never share it publicly.
                  </p>
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
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Required GHL Scopes:
                    </p>
                    <ul className="text-xs text-amber-800 space-y-1 ml-6 list-disc">
                      <li><strong>contacts.write</strong> - Create/update contacts and add notes</li>
                      <li><strong>opportunities.read</strong> - Read pipelines for configuration</li>
                      <li><strong>opportunities.write</strong> - Create opportunities from quotes</li>
                      <li><strong>calendars.write</strong> - Create appointments for bookings</li>
                      <li><strong>locations.read</strong> - Access location information</li>
                    </ul>
                    <p className="text-xs text-amber-700 mt-2 italic">
                      Make sure your PIT token has these scopes enabled in your GHL account settings.
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
                    disabled={isSaving || !ghlToken.trim()}
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
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-xl border-2">
            <CardHeader>
              <CardTitle>About GHL Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-700">
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
                    2. Go to Settings → Integrations → API<br />
                    3. Create a new API key or use an existing Permanent Integration Token<br />
                    4. Copy the token and paste it above
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Security</h4>
                  <p>Your GHL token is stored securely in encrypted storage and is never exposed to the client.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-xl border-2">
            <CardHeader className="bg-gradient-to-r from-[#f61590]/5 via-transparent to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <Sparkles className="h-6 w-6 text-[#f61590]" />
                GHL Integration Configuration
              </CardTitle>
              <CardDescription>
                Configure what happens when a customer gets a quote. Choose which GHL features to enable and set default values for opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {connectionStatus !== 'connected' ? (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-800">
                  <p className="font-semibold">⚠️ GHL not connected</p>
                  <p className="text-sm mt-1">Please verify your GHL API token above before configuring integration features.</p>
                </div>
              ) : (
                <div className="space-y-6">
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
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Select Features</h3>
                    
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
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ChevronDown className="h-4 w-4" />
                        Opportunity Settings
                      </h3>

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
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-xl border-2">
            <CardHeader className="bg-gradient-to-r from-[#f61590]/5 via-transparent to-transparent border-b">
              <CardTitle>Widget Customization</CardTitle>
              <CardDescription>
                Customize the title and subtitle displayed on your cleaning quote widget
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
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
                    Widget Title
                  </Label>
                  <Input
                    id="widget-title"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    placeholder="e.g., Raleigh Cleaning Company"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    This title is displayed prominently at the top of the quote widget.
                  </p>
                </div>

                <div>
                  <Label htmlFor="widget-subtitle" className="text-base font-semibold">
                    Widget Subtitle
                  </Label>
                  <Input
                    id="widget-subtitle"
                    value={widgetSubtitle}
                    onChange={(e) => setWidgetSubtitle(e.target.value)}
                    placeholder="e.g., Let's get your professional cleaning price!"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    This subtitle appears below the title to introduce the quote form.
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
                    This color is used for buttons, headers, and accent elements throughout the quote widget.
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
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-xl border-2">
            <CardHeader className="bg-gradient-to-r from-[#f61590]/5 via-transparent to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-[#f61590]" />
                Embed Quote Widget
              </CardTitle>
              <CardDescription>
                Copy this code and paste it anywhere on your website to embed the quote calculator
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
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
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
