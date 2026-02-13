'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
import { copyToClipboard } from '@/lib/utils';

interface TestLog {
  timestamp: string;
  message: string;
  data?: any;
}

interface TestResult {
  success: boolean;
  summary?: {
    schemasFound: number;
    quoteSchemaFound: boolean;
    creationSuccess: boolean;
    endpointTestsPassed: number;
    endpointTestsTotal: number;
  };
  logs: string[];
  errors?: any[];
  results?: any;
  error?: string;
}

export function GHLCustomObjectsTest({ adminPassword }: { adminPassword: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const runTest = async () => {
    setIsRunning(true);
    setError(null);
    setTestResult(null);
    setShowLogs(true);
    setShowDetails(false);

    try {
      const response = await fetch('/api/admin/ghl-custom-objects-test', {
        method: 'GET',
        headers: {
          'x-admin-password': adminPassword,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to run test`);
      }

      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run test');
    } finally {
      setIsRunning(false);
    }
  };

  const copyLogs = async () => {
    if (!testResult?.logs) return;
    const logsText = testResult.logs.join('\n');
    const ok = await copyToClipboard(logsText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetTest = () => {
    setTestResult(null);
    setError(null);
    setShowLogs(true);
    setShowDetails(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">GHL Custom Objects Test</h2>
        <p className="text-gray-600">
          Test the custom objects endpoint with detailed logging. All logs are shown here - no need to check server logs!
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Test Failed</h3>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!testResult && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            <strong>What this test does:</strong>
          </p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Lists all custom object schemas in your GHL account</li>
            <li>Fetches the Quote schema details and field definitions</li>
            <li>Tests creating a custom object record</li>
            <li>Tests different endpoint variations</li>
            <li>Shows all logs directly in the response (no server logs needed!)</li>
          </ul>
        </div>
      )}

      {/* Test Button */}
      {!testResult && (
        <div className="mb-6">
          <button
            onClick={runTest}
            disabled={isRunning}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <LoadingDots size="sm" className="text-current" />
                Running Test...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Test Custom Objects Endpoint
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {testResult && (
        <>
          {/* Summary Card */}
          <div className={`mb-6 p-6 rounded-lg border ${
            testResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 ${
                  testResult.success ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  {testResult.success 
                    ? '✅ Custom Objects Test PASSED!' 
                    : '⚠️ Custom Objects Test - Issues Found'}
                </h3>
                {testResult.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                    <div className="bg-white rounded p-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Schemas Found</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {testResult.summary.schemasFound}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className={`text-xs font-medium mb-1 ${
                        testResult.summary.quoteSchemaFound ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Quote Schema
                      </p>
                      <p className={`text-2xl font-bold ${
                        testResult.summary.quoteSchemaFound ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {testResult.summary.quoteSchemaFound ? '✓' : '✗'}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className={`text-xs font-medium mb-1 ${
                        testResult.summary.creationSuccess ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Creation Test
                      </p>
                      <p className={`text-2xl font-bold ${
                        testResult.summary.creationSuccess ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {testResult.summary.creationSuccess ? '✓' : '✗'}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Endpoints Passed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {testResult.summary.endpointTestsPassed}/{testResult.summary.endpointTestsTotal}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className={`text-xs font-medium mb-1 ${
                        testResult.success ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        Overall
                      </p>
                      <p className={`text-2xl font-bold ${
                        testResult.success ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {testResult.success ? '✓' : '⚠'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {testResult.success ? (
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Errors Section */}
          {testResult.errors && testResult.errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Errors ({testResult.errors.length})
              </h3>
              <div className="space-y-2">
                {testResult.errors.map((err: any, index: number) => (
                  <div key={index} className="bg-white rounded p-3 border border-red-100">
                    <p className="text-sm font-medium text-red-900">
                      {err.step || 'Unknown step'}: {err.schemaKey || ''}
                    </p>
                    <p className="text-xs text-red-700 mt-1 font-mono">{err.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs Section */}
          {testResult.logs && testResult.logs.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>Test Logs ({testResult.logs.length} entries)</span>
                </button>
                <button
                  onClick={copyLogs}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Logs'}
                </button>
              </div>
              {showLogs && (
                <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                    {testResult.logs.join('\n')}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Detailed Results */}
          {testResult.results && (
            <div className="mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium mb-3"
              >
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>Detailed Results</span>
              </button>
              {showDetails && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(testResult.results, null, 2)}
                  </pre>
                </div>
              )}
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
    </div>
  );
}
