'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  success: boolean;
  status?: number;
  message: string;
  endpoint: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

interface ComprehensiveTestResult {
  success: boolean;
  message: string;
  error?: string;
  locationId?: string;
  token?: string;
  results?: TestResult[];
  summary?: TestSummary;
}

export function GHLTestWizard({ adminPassword }: { adminPassword: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<ComprehensiveTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setIsRunning(true);
    setError(null);
    setTestResults(null);

    try {
      const response = await fetch('/api/admin/ghl-settings?comprehensive=true', {
        method: 'PUT',
        headers: {
          'x-admin-password': adminPassword,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to run test`);
      }

      const data = await response.json();
      setTestResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run test');
    } finally {
      setIsRunning(false);
    }
  };

  const resetTest = () => {
    setTestResults(null);
    setError(null);
  };

  // Get status icon and color based on result
  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (result: TestResult) => {
    if (result.success) {
      return 'bg-green-50 border-green-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  const getProgressPercentage = () => {
    if (!testResults?.summary) return 0;
    const total = testResults.summary.total;
    const passed = testResults.summary.passed;
    return Math.round((passed / total) * 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage === 100) return 'bg-green-600';
    if (percentage >= 75) return 'bg-blue-600';
    if (percentage >= 50) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">HighLevel API Connection Test</h2>
        <p className="text-gray-600">
          Test all HighLevel API endpoints at once and get detailed feedback on each one.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Test Failed</h3>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!testResults && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-3">
            <strong>What to expect:</strong> This test checks if each GHL endpoint is accessible and has proper authentication & permissions. All working endpoints show green.
          </p>
          <p className="text-sm text-blue-700">
            ✅ Green = Endpoint working (HTTP 200, 400, or 404)  
            ❌ Red = Authentication or permission error (HTTP 401/403)
          </p>
        </div>
      )}

      {/* Test Button */}
      {!testResults && (
        <div className="mb-6">
          <button
            onClick={runTest}
            disabled={isRunning}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Test All Endpoints
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {testResults && (
        <>
          {/* Summary Card */}
          <div className={`mb-6 p-6 rounded-lg border ${
            testResults.success
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${
                  testResults.success ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  {testResults.success 
                    ? '✅ All HighLevel API endpoints are working!' 
                    : '⚠️ Endpoints tested - Some returned no data (404), which is normal'}
                </h3>
                {testResults.locationId && (
                  <p className={`text-sm mt-1 ${
                    testResults.success ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    Location: <span className="font-mono">{testResults.locationId}</span>
                  </p>
                )}
              </div>
              {testResults.success ? (
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              )}
            </div>

            {/* Summary Stats */}
            {testResults.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {testResults.summary.total}
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs font-medium text-green-600 mb-1">Passed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {testResults.summary.passed}
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs font-medium text-red-600 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {testResults.summary.failed}
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs font-medium text-yellow-600 mb-1">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {testResults.summary.warnings}
                  </p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {testResults.summary && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Success Rate</span>
                  <span className="text-sm font-bold text-gray-900">
                    {getProgressPercentage()}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Detailed Results */}
          {testResults.results && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Endpoint Results</h3>
              <div className="space-y-2">
                {testResults.results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result)} transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">{result.name}</p>
                            <p className="text-xs text-gray-600 font-mono mt-1 truncate">
                              {result.endpoint}
                            </p>
                          </div>
                          {result.status && (
                            <span className={`text-xs font-mono px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${
                              result.status === 200
                                ? 'bg-green-200 text-green-800'
                                : result.status === 404
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-red-200 text-red-800'
                            }`}>
                              {result.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-2 text-gray-700">{result.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={runTest}
              disabled={isRunning}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Run Again
            </button>
            <button
              onClick={resetTest}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              Clear Results
            </button>
          </div>
        </>
      )}

      {/* Info Box - What gets tested */}
      {testResults && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📋 What gets tested?</h4>
          <ul className="text-sm text-blue-800 space-y-1 grid grid-cols-2">
            <li>✓ Contacts (list, create/update)</li>
            <li>✓ Opportunities (list, create)</li>
            <li>✓ Pipelines (list)</li>
            <li>✓ Tags (list, create)</li>
            <li>✓ Calendars (list)</li>
            <li>✓ Appointments (create)</li>
            <li>✓ Custom Fields (list)</li>
            <li>✓ Notes (create)</li>
          </ul>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🟢 Status Legend</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>✅ Green:</strong> Endpoint is working and accessible</li>
              <li className="text-xs text-blue-700 ml-4">HTTP 200 = Data returned</li>
              <li className="text-xs text-blue-700 ml-4">HTTP 404 = No data yet (endpoint still working)</li>
              <li className="text-xs text-blue-700 ml-4">HTTP 400 = Request syntax OK but no data (still working)</li>
              <li><strong>❌ Red:</strong> Authentication or permission error</li>
              <li className="text-xs text-blue-700 ml-4">HTTP 401 = Invalid or expired token</li>
              <li className="text-xs text-blue-700 ml-4">HTTP 403 = Missing required scopes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
