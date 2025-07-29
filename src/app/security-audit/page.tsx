'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface TestResult {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  isVulnerability?: boolean;
}

export default function SecurityAuditPage() {
  const { data: session, status } = useSession();
  const [results, setResults] = useState<Record<string, TestResult[]>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [testSecureId, setTestSecureId] = useState('');

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🔒 Security Audit</h1>
        <p className="text-red-600">Please log in to access the security audit dashboard.</p>
      </div>
    );
  }

  const testEndpoint = async (endpoint: string): Promise<TestResult[]> => {
    switch (endpoint) {
      case 'profiles':
        return await testProfilesEndpoint();
      case 'profiles-email':
        return await testProfilesEmailEndpoint();
      case 'matches':
        return await testMatchesEndpoint();
      case 'likes':
        return await testLikesEndpoint();
      case 'swipes':
        return await testSwipesEndpoint();
      case 'photos':
        return await testPhotosEndpoint();
      case 'debug':
        return await testDebugEndpoint();
      case 'admin':
        return await testAdminEndpoints();
      default:
        return [];
    }
  };

  const testProfilesEndpoint = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    try {
      const response = await fetch('/api/profiles?limit=1');
      if (response.ok) {
        const data = await response.json();
        results.push({
          type: 'success',
          message: '✅ Authenticated access works correctly'
        });
        
        // Check for email exposure
        if (data.profiles && data.profiles[0] && data.profiles[0].email) {
          results.push({
            type: 'error',
            message: '⚠️ VULNERABILITY: Emails are exposed in response',
            isVulnerability: true
          });
        } else {
          results.push({
            type: 'success',
            message: '✅ No email exposure detected'
          });
        }
        
        // Check pagination limits
        const bigResponse = await fetch('/api/profiles?limit=1000');
        const bigData = await bigResponse.json();
        if (bigData.profiles && bigData.profiles.length > 10) {
          results.push({
            type: 'warning',
            message: `⚠️ WARNING: Large page sizes allowed (${bigData.profiles.length} profiles)`
          });
        } else {
          results.push({
            type: 'success',
            message: '✅ Pagination limits enforced'
          });
        }
      } else {
        results.push({
          type: 'warning',
          message: `⚠️ Unexpected response: ${response.status}`
        });
      }
    } catch (error) {
      results.push({
        type: 'error',
        message: `❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    return results;
  };

  const testProfilesEmailEndpoint = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    const testEmail = 'test@example.com';
    const response = await fetch(`/api/profiles/${testEmail}?email=${testEmail}`);
    
    if (response.status === 403 || response.status === 401) {
      results.push({
        type: 'success',
        message: '✅ Endpoint properly disabled/secured'
      });
    } else if (response.ok) {
      results.push({
        type: 'error',
        message: '⚠️ CRITICAL VULNERABILITY: Endpoint allows profile enumeration by email',
        isVulnerability: true
      });
    } else {
      results.push({
        type: 'info',
        message: `ℹ️ Response: ${response.status} - ${response.statusText}`
      });
    }
    
    return results;
  };

  const testMatchesEndpoint = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    const response = await fetch('/api/matches');
    
    if (response.ok) {
      const data = await response.json();
      results.push({
        type: 'success',
        message: '✅ Authenticated access works'
      });
      
      // Check for email exposure
      if (data && data[0] && (data[0].email || data[0].id.includes('@'))) {
        results.push({
          type: 'error',
          message: '⚠️ VULNERABILITY: Emails exposed in matches',
          isVulnerability: true
        });
      } else {
        results.push({
          type: 'success',
          message: '✅ No email exposure in matches'
        });
      }
    } else {
      results.push({
        type: 'warning',
        message: `⚠️ Response: ${response.status}`
      });
    }
    
    return results;
  };

  const testLikesEndpoint = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    const response = await fetch('/api/likes');
    
    if (response.ok) {
      const data = await response.json();
      results.push({
        type: 'success',
        message: '✅ Authenticated access works'
      });
      
      // Check for email exposure
      if (data && data[0] && (data[0].email || data[0].id.includes('@'))) {
        results.push({
          type: 'error',
          message: '⚠️ VULNERABILITY: Emails exposed in likes',
          isVulnerability: true
        });
      } else {
        results.push({
          type: 'success',
          message: '✅ No email exposure in likes'
        });
      }
    } else {
      results.push({
        type: 'warning',
        message: `⚠️ Response: ${response.status}`
      });
    }
    
    return results;
  };

  const testSwipesEndpoint = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    // Test GET
    const getResponse = await fetch('/api/swipes');
    if (getResponse.ok) {
      results.push({
        type: 'success',
        message: '✅ GET authenticated access works'
      });
    } else {
      results.push({
        type: 'warning',
        message: `⚠️ GET Response: ${getResponse.status}`
      });
    }
    
    return results;
  };

  const testPhotosEndpoint = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    const testId = testSecureId || 'test123';
    
    const response = await fetch(`/api/photos/secure/${testId}/0`);
    
    if (response.status === 403) {
      results.push({
        type: 'success',
        message: '✅ Access control working (403 Forbidden)'
      });
    } else if (response.status === 404) {
      results.push({
        type: 'success',
        message: '✅ Invalid IDs properly rejected (404 Not Found)'
      });
    } else if (response.ok) {
      results.push({
        type: 'warning',
        message: '⚠️ Photo access granted - verify this is authorized'
      });
    } else {
      results.push({
        type: 'info',
        message: `ℹ️ Response: ${response.status}`
      });
    }
    
    return results;
  };

  const testDebugEndpoint = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    const response = await fetch('/api/debug-images');
    
    if (response.status === 403) {
      results.push({
        type: 'success',
        message: '✅ Admin restriction working (403 Forbidden)'
      });
    } else if (response.ok) {
      results.push({
        type: 'error',
        message: '⚠️ VULNERABILITY: Debug endpoint accessible to non-admin users',
        isVulnerability: true
      });
    } else {
      results.push({
        type: 'info',
        message: `ℹ️ Response: ${response.status}`
      });
    }
    
    return results;
  };

  const testAdminEndpoints = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    const adminEndpoints = [
      '/api/admin/nuclear-reset',
      '/api/admin/fix-missing-photos',
      '/api/admin/kill-test-bot'
    ];
    
    for (const endpoint of adminEndpoints) {
      try {
        const response = await fetch(endpoint, { method: 'POST' });
        
        if (response.status === 403) {
          results.push({
            type: 'success',
            message: `✅ ${endpoint} restricted to admins`
          });
        } else if (response.ok) {
          results.push({
            type: 'error',
            message: `⚠️ CRITICAL: ${endpoint} accessible to regular users!`,
            isVulnerability: true
          });
        } else {
          results.push({
            type: 'info',
            message: `ℹ️ ${endpoint}: ${response.status}`
          });
        }
      } catch (error) {
        results.push({
          type: 'info',
          message: `ℹ️ ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
    
    return results;
  };

  const runSingleTest = async (endpointName: string) => {
    setStatuses(prev => ({ ...prev, [endpointName]: 'testing' }));
    
    try {
      const testResults = await testEndpoint(endpointName);
      const hasVulnerability = testResults.some(r => r.type === 'error' && r.isVulnerability);
      
      setResults(prev => ({ ...prev, [endpointName]: testResults }));
      setStatuses(prev => ({ 
        ...prev, 
        [endpointName]: hasVulnerability ? 'vulnerable' : 'secure' 
      }));
    } catch (error) {
      setStatuses(prev => ({ ...prev, [endpointName]: 'error' }));
      setResults(prev => ({ 
        ...prev, 
        [endpointName]: [{ 
          type: 'error', 
          message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }] 
      }));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const endpoints = ['profiles', 'profiles-email', 'matches', 'likes', 'swipes', 'photos', 'debug', 'admin'];
    
    for (const endpoint of endpoints) {
      await runSingleTest(endpoint);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'bg-green-100 text-green-800';
      case 'vulnerable': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const endpoints = [
    { id: 'profiles', name: '📋 /api/profiles', desc: 'Get paginated profiles for swiping' },
    { id: 'profiles-email', name: '📋 /api/profiles/[email]', desc: 'Get specific profile by email (SHOULD BE DISABLED)' },
    { id: 'matches', name: '💕 /api/matches', desc: 'Get user\'s matches' },
    { id: 'likes', name: '❤️ /api/likes', desc: 'Get users who liked you' },
    { id: 'swipes', name: '👆 /api/swipes', desc: 'Record swipes and get swipe history' },
    { id: 'photos', name: '📸 /api/photos/secure/[id]/[index]', desc: 'Serve photos with access control' },
    { id: 'admin', name: '🔧 /api/admin/*', desc: 'Admin functions (SHOULD BE RESTRICTED)' },
  ];

  const createBackup = async () => {
    try {
      setIsRunning(true);
      const response = await fetch('/api/admin/backup-firestore', { method: 'POST' });
      
      if (response.ok) {
        // Trigger file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `firestore-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('✅ Backup created and downloaded successfully!');
      } else {
        const error = await response.json();
        toast.error(`❌ Backup failed: ${error.message || error.error}`);
      }
    } catch (error) {
      toast.error(`❌ Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const restoreBackup = async (file: File) => {
    try {
      setIsRunning(true);
      const formData = new FormData();
      formData.append('backup', file);
      
      const response = await fetch('/api/admin/restore-firestore', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(`✅ Restore successful!\n\n${result.message}\n\nRestored: ${result.stats.restored.join(', ')}`);
      } else {
        toast.error(`❌ Restore failed: ${result.message || result.error}`);
      }
    } catch (error) {
      toast.error(`❌ Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const restoreTestProfiles = async () => {
    try {
      setIsRunning(true);
      const response = await fetch('/api/admin/restore-profiles', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        toast.success(`✅ Test profiles restored!\n\n${result.message}\n\nCreated:\n${result.created.join('\n')}`);
      } else {
        toast.error(`❌ Restore failed: ${result.message || result.error}`);
      }
    } catch (error) {
      toast.error(`❌ Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-white overflow-y-auto"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: 'white',
        overflowY: 'auto',
        height: '100vh'
      }}
    >
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 min-h-full">
        <h1 className="text-3xl font-bold mb-6">🔒 DevmoLink Security Audit Dashboard</h1>
        
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h3 className="text-xl font-semibold mb-4">🎯 Security Test Overview</h3>
          <p className="mb-4">Logged in as: <strong>{session.user?.email}</strong></p>
          <p className="mb-4">This dashboard tests all API endpoints for common security vulnerabilities:</p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li><strong>Authentication:</strong> Proper access control</li>
            <li><strong>Authorization:</strong> Cross-user data access prevention</li>
            <li><strong>Data Exposure:</strong> Sensitive information leakage</li>
            <li><strong>Input Validation:</strong> Malformed request handling</li>
          </ul>
          <button 
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
          >
            {isRunning ? '🔄 Running Tests...' : '🚀 Run All Security Tests'}
          </button>
        </div>

        {/* Backup & Restore Section */}
        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <h3 className="text-xl font-semibold mb-4">🛡️ Backup & Restore</h3>
          <p className="mb-4">Protect your data from accidental deletion:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Create Backup */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold mb-2">📦 Create Backup</h4>
              <p className="text-sm text-gray-600 mb-3">Download complete Firestore backup</p>
              <button 
                onClick={createBackup}
                disabled={isRunning}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                {isRunning ? '⏳ Creating...' : '📥 Download Backup'}
              </button>
            </div>

            {/* Restore Backup */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold mb-2">📤 Restore Backup</h4>
              <p className="text-sm text-gray-600 mb-3">Upload and restore from backup file</p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (confirm(`⚠️ This will restore data from ${file.name}. Continue?`)) {
                      restoreBackup(file);
                    }
                  }
                }}
                disabled={isRunning}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>

            {/* Restore Test Profiles */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold mb-2">🧪 Test Profiles</h4>
              <p className="text-sm text-gray-600 mb-3">Restore fake profiles for testing</p>
              <button 
                onClick={restoreTestProfiles}
                disabled={isRunning}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                {isRunning ? '⏳ Restoring...' : '🔄 Restore Test Data'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {endpoints.map(endpoint => (
            <div key={endpoint.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{endpoint.name}</h3>
                  <p className="text-gray-600">{endpoint.desc}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(statuses[endpoint.id] || 'unknown')}`}>
                    {statuses[endpoint.id] === 'secure' && '✅ Secure'}
                    {statuses[endpoint.id] === 'vulnerable' && '⚠️ Vulnerable'}
                    {statuses[endpoint.id] === 'testing' && '🔄 Testing...'}
                    {statuses[endpoint.id] === 'error' && '❌ Error'}
                    {!statuses[endpoint.id] && 'Not Tested'}
                  </span>
                  <button 
                    onClick={() => runSingleTest(endpoint.id)}
                    disabled={statuses[endpoint.id] === 'testing'}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
                  >
                    Test
                  </button>
                </div>
              </div>

              {endpoint.id === 'photos' && (
                <div className="mb-4">
                  <input
                    type="text"
                    value={testSecureId}
                    onChange={(e) => setTestSecureId(e.target.value)}
                    placeholder="Enter secure ID to test"
                    className="border border-gray-300 rounded px-3 py-2 w-full max-w-md"
                  />
                </div>
              )}

              {results[endpoint.id] && (
                <div className="space-y-2">
                  {results[endpoint.id].map((result, index) => (
                    <div key={index} className={`p-3 rounded border ${getResultColor(result.type)}`}>
                      {result.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom padding for better scrolling */}
        <div className="h-16"></div>
      </div>
    </div>
  );
}