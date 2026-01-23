'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TestLog {
  timestamp: string;
  message: string;
  data?: any;
}

interface TestResult {
  success: boolean;
  logs: string[];
  errors?: any[];
  results?: {
    ghlCustomFields?: any[];
    ghlCustomFieldsCount?: number;
    surveyQuestions?: {
      total: number;
      withMappings: number;
      withoutMappings: number;
      questions: any[];
      mappings: any[];
    };
    mappingTest?: {
      testBody: any;
      mappedFields: any[];
      nativeFields: any[];
      skippedFields: any[];
      customFields: Record<string, string>;
      summary: {
        totalFields: number;
        mappedCount: number;
        nativeCount: number;
        skippedCount: number;
        customFieldsCount: number;
      };
    };
    fieldValidation?: {
      validKeys: string[];
      invalidKeys: string[];
      ghlFieldKeys: string[];
      mappedKeys: string[];
      suggestions?: Array<{
        questionId: string;
        questionLabel: string;
        suggestedFields: Array<{ key: string; name: string; matchScore: number }>;
      }>;
    };
    contactPayload?: any;
  };
  error?: string;
}

export function GHLCustomFieldsTest({ adminPassword }: { adminPassword: string }) {
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
      const response = await fetch('/api/admin/ghl-custom-fields-test', {
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

  const copyLogs = () => {
    if (!testResult?.logs) return;
    const logsText = testResult.logs.join('\n');
    navigator.clipboard.writeText(logsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetTest = () => {
    setTestResult(null);
    setError(null);
    setShowLogs(true);
    setShowDetails(false);
  };

  const results = testResult?.results;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">GHL Custom Fields Mapping Test</h2>
        <p className="text-gray-600">
          Test custom fields mapping with detailed logging. See all GHL custom fields, survey question mappings, and test the mapping logic.
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

      {/* Test Button */}
      <div className="mb-6 flex gap-3">
        <Button
          onClick={runTest}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Run Custom Fields Test
            </>
          )}
        </Button>
        {testResult && (
          <>
            <Button
              onClick={copyLogs}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy Logs'}
            </Button>
            <Button
              onClick={resetTest}
              variant="outline"
            >
              Reset
            </Button>
          </>
        )}
      </div>

      {/* Results Summary */}
      {testResult && (
        <div className="mb-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {results?.ghlCustomFieldsCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">GHL Custom Fields</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {results?.surveyQuestions?.withMappings || 0}
                  </div>
                  <div className="text-sm text-gray-600">Questions with Mappings</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {results?.mappingTest?.summary?.mappedCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">Fields Mapped in Test</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mapping Test Summary */}
          {results?.mappingTest && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-4">Mapping Test Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Test Fields:</span>
                    <span className="font-semibold">{results.mappingTest.summary.totalFields}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mapped to Custom Fields:</span>
                    <span className="font-semibold text-green-600">{results.mappingTest.summary.mappedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mapped to Native Fields:</span>
                    <span className="font-semibold text-blue-600">{results.mappingTest.summary.nativeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Skipped (No Mapping):</span>
                    <span className="font-semibold text-red-600">{results.mappingTest.summary.skippedCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Field Validation */}
          {results?.fieldValidation && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-4">Field Key Validation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valid Custom Field Keys:</span>
                    <span className="font-semibold text-green-600">{results.fieldValidation.validKeys.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invalid Custom Field Keys:</span>
                    <span className="font-semibold text-red-600">{results.fieldValidation.invalidKeys.length}</span>
                  </div>
                  {results.fieldValidation.invalidKeys.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-sm font-semibold text-red-900 mb-2">Invalid Keys (not found in GHL):</p>
                      <ul className="list-disc list-inside text-sm text-red-800">
                        {results.fieldValidation.invalidKeys.map((key, idx) => (
                          <li key={idx}>{key}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mapping Suggestions */}
          {results?.fieldValidation?.suggestions && results.fieldValidation.suggestions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <span className="text-blue-600">💡</span>
                  <span className="text-blue-900">Suggested Field Mappings</span>
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  These are potential GHL field matches for your survey questions. Configure these mappings in the Survey Builder.
                </p>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {results.fieldValidation.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="p-4 bg-white rounded border border-blue-200">
                      <div className="font-semibold text-gray-900 mb-1">{suggestion.questionLabel}</div>
                      <div className="text-xs text-gray-500 font-mono mb-2">ID: {suggestion.questionId}</div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Suggested GHL Fields:</p>
                        {suggestion.suggestedFields.map((field, fieldIdx) => (
                          <div 
                            key={fieldIdx} 
                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{field.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{field.key}</div>
                            </div>
                            <div className="text-xs text-blue-600 font-semibold">
                              Match: {field.matchScore}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded border border-blue-300">
                  <p className="text-sm text-blue-900">
                    <strong>Next Steps:</strong> Go to <strong>Admin → Survey Builder</strong> and edit each question to set the GHL Field Mapping.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Toggle Details */}
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="outline"
            className="w-full"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show Details
              </>
            )}
          </Button>

          {/* Detailed Results */}
          {showDetails && (
            <div className="space-y-4">
              {/* GHL Custom Fields */}
              {results?.ghlCustomFields && results.ghlCustomFields.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">GHL Custom Fields ({results.ghlCustomFields.length})</h3>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Key</th>
                            <th className="px-3 py-2 text-left font-semibold">Name</th>
                            <th className="px-3 py-2 text-left font-semibold">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {results.ghlCustomFields.map((field: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-mono text-xs">{field.key}</td>
                              <td className="px-3 py-2">{field.name}</td>
                              <td className="px-3 py-2 text-gray-600">{field.type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Survey Questions Mappings */}
              {results?.surveyQuestions && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">
                      Survey Questions ({results.surveyQuestions.total})
                    </h3>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span>With Mappings:</span>
                        <span className="font-semibold text-green-600">{results.surveyQuestions.withMappings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Without Mappings:</span>
                        <span className="font-semibold text-red-600">{results.surveyQuestions.withoutMappings}</span>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Question ID</th>
                            <th className="px-3 py-2 text-left font-semibold">Label</th>
                            <th className="px-3 py-2 text-left font-semibold">GHL Mapping</th>
                            <th className="px-3 py-2 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {results.surveyQuestions.questions.map((q: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-mono text-xs">{q.id}</td>
                              <td className="px-3 py-2">{q.label}</td>
                              <td className="px-3 py-2 font-mono text-xs">{q.mapping || '-'}</td>
                              <td className="px-3 py-2">
                                {q.hasMapping ? (
                                  <span className="text-green-600">✓ Mapped</span>
                                ) : (
                                  <span className="text-red-600">✗ No Mapping</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mapped Fields */}
              {results?.mappingTest?.mappedFields && results.mappingTest.mappedFields.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">Mapped Custom Fields</h3>
                    <div className="space-y-2">
                      {results.mappingTest.mappedFields.map((field: any, idx: number) => (
                        <div key={idx} className="p-3 bg-green-50 rounded border border-green-200 text-sm">
                          <div className="font-semibold text-green-900">{field.field}</div>
                          <div className="text-green-700">→ {field.mapping} = {field.value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skipped Fields */}
              {results?.mappingTest?.skippedFields && results.mappingTest.skippedFields.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">Skipped Fields (No Mapping)</h3>
                    <div className="space-y-2">
                      {results.mappingTest.skippedFields.map((field: any, idx: number) => (
                        <div key={idx} className="p-3 bg-red-50 rounded border border-red-200 text-sm">
                          <div className="font-semibold text-red-900">{field.field}</div>
                          <div className="text-red-700">Reason: {field.reason} (Value: {String(field.value)})</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Payload */}
              {results?.contactPayload && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">Contact Payload (Dry Run)</h3>
                    <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(results.contactPayload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Toggle Logs */}
          <Button
            onClick={() => setShowLogs(!showLogs)}
            variant="outline"
            className="w-full"
          >
            {showLogs ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Logs
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show Logs
              </>
            )}
          </Button>

          {/* Logs */}
          {showLogs && testResult.logs && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Detailed Logs</h3>
                  <Button
                    onClick={copyLogs}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-3 w-3" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
                  {testResult.logs.map((log, idx) => (
                    <div key={idx} className="mb-1 whitespace-pre-wrap">{log}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {testResult.errors && testResult.errors.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-4 text-red-600">Errors</h3>
                <div className="space-y-2">
                  {testResult.errors.map((err: any, idx: number) => (
                    <div key={idx} className="p-3 bg-red-50 rounded border border-red-200 text-sm">
                      <div className="font-semibold text-red-900">{err.step || 'Unknown'}</div>
                      <div className="text-red-700">{err.error || JSON.stringify(err)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
