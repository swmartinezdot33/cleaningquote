'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2, Save, RotateCw, Eye, EyeOff, Sparkles, ArrowLeft } from 'lucide-react';

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
        setMessage({
          type: 'error',
          text: data.error || 'Failed to save GHL API token',
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
        setMessage({
          type: 'error',
          text: data.message || 'Failed to connect to GHL',
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
      </div>
    </main>
  );
}
