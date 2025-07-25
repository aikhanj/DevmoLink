"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface FixResult {
  success: boolean;
  email: string;
  foundPhotos: number;
  currentPhotos: number;
  totalPhotos: number;
  newPhotos: string[];
  allPhotos: string[];
}

interface AllUsersResult {
  email: string;
  name: string;
  success: boolean;
  data: FixResult | null;
  error: string | null;
}

export default function FixPhotosPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [allResults, setAllResults] = useState<AllUsersResult[]>([]);
  const [fixingAll, setFixingAll] = useState(false);

  const fixPhotos = async (email: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/fix-missing-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to fix photos');
        return;
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fixAllUsers = async () => {
    setFixingAll(true);
    setError(null);
    setAllResults([]);
    
    try {
      // First get all profiles
      const profilesResponse = await fetch('/api/profiles');
      const profiles = await profilesResponse.json();
      
      if (!profilesResponse.ok) {
        setError('Failed to fetch profiles');
        return;
      }

      // Fix photos for each user
      const results = [];
      for (const profile of profiles) {
        if (profile.email) {
          try {
            const response = await fetch('/api/admin/fix-missing-photos', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: profile.email }),
            });
            
            const data = await response.json();
            results.push({
              email: profile.email,
              name: profile.name,
              success: response.ok,
              data: response.ok ? data : null,
              error: !response.ok ? data.error : null
            });
                     } catch (err) {
             results.push({
               email: profile.email,
               name: profile.name,
               success: false,
               data: null,
               error: err instanceof Error ? err.message : 'Unknown error'
             });
           }
        }
      }
      
      setAllResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fix all users');
    } finally {
      setFixingAll(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <p className="text-white">Please sign in to access this tool</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-[#00FFAB] mb-8">🔧 Fix Missing Photos Tool</h1>
        
        <div className="bg-[#18181b] rounded-xl p-6 mb-8">
          <h2 className="text-xl text-white mb-4">Fix Photos for Specific User</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter user email (e.g., user@example.com)"
              className="flex-1 px-4 py-2 bg-[#030712] text-white rounded-lg border border-gray-600 focus:border-[#00FFAB] focus:outline-none"
            />
            <button
              onClick={() => fixPhotos(email)}
              disabled={loading || !email.trim()}
              className="px-6 py-2 bg-[#00FFAB] text-[#030712] rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00CC7A] transition-colors"
            >
              {loading ? 'Fixing...' : 'Fix Photos'}
            </button>
          </div>
          
          <div className="border-t border-gray-600 pt-4">
            <h3 className="text-lg text-white mb-2">Quick Fix Options</h3>
            <div className="flex gap-4">
              <button
                onClick={() => fixPhotos('ademi.smkv@gmail.com')}
                disabled={loading || fixingAll}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                Fix Ademi&apos;s Photos
              </button>
              <button
                onClick={fixAllUsers}
                disabled={loading || fixingAll}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-purple-700 transition-colors"
              >
                {fixingAll ? 'Fixing All Users...' : 'Fix All Users'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-8">
            <h3 className="text-red-400 font-semibold mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-[#18181b] rounded-xl p-6 mb-8">
            <h2 className="text-xl text-white mb-4">✅ Fix Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#030712] p-4 rounded-lg">
                <h3 className="text-[#00FFAB] font-semibold mb-2">Summary</h3>
                <div className="text-white text-sm space-y-1">
                  <p>Email: {result.email}</p>
                  <p>Photos found in storage: {result.foundPhotos}</p>
                  <p>Photos previously in profile: {result.currentPhotos}</p>
                  <p className="text-green-400">Total photos now: {result.totalPhotos}</p>
                </div>
              </div>
              
              <div className="bg-[#030712] p-4 rounded-lg">
                <h3 className="text-[#00FFAB] font-semibold mb-2">Status</h3>
                <div className="text-white text-sm space-y-1">
                  <p className="text-green-400">✅ Photos successfully linked!</p>
                  <p>Profile updated with photo URLs</p>
                  <p>ProfileCard should now show photos</p>
                </div>
              </div>
            </div>

            {result.newPhotos && result.newPhotos.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[#00FFAB] font-semibold">New Photos Added</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {result.newPhotos.map((url: string, index: number) => (
                    <div key={index} className="bg-[#030712] p-2 rounded-lg">
                      <img 
                        src={url} 
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
              <h4 className="text-blue-400 font-semibold mb-2">Next Steps</h4>
              <ol className="text-blue-300 text-sm space-y-1 list-decimal list-inside">
                <li>Go back to the main app</li>
                <li>Look for the user&apos;s profile in the cards</li>
                <li>Their photos should now be visible!</li>
                <li>Use the debug tool to verify: <code>/debug-images</code></li>
                <li>If photos still don&apos;t show, check the console for errors</li>
              </ol>
            </div>
          </div>
        )}

        {allResults.length > 0 && (
          <div className="bg-[#18181b] rounded-xl p-6 mb-8">
            <h2 className="text-xl text-white mb-4">🔄 Bulk Fix Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#030712] p-4 rounded-lg">
                <h3 className="text-[#00FFAB] font-semibold mb-2">Summary</h3>
                <div className="text-white text-sm space-y-1">
                  <p>Total users processed: {allResults.length}</p>
                  <p className="text-green-400">✅ Successful: {allResults.filter(r => r.success).length}</p>
                  <p className="text-red-400">❌ Failed: {allResults.filter(r => !r.success).length}</p>
                </div>
              </div>
              
              <div className="bg-[#030712] p-4 rounded-lg">
                <h3 className="text-[#00FFAB] font-semibold mb-2">Photos Found</h3>
                <div className="text-white text-sm space-y-1">
                  <p>Users with new photos: {allResults.filter(r => r.success && r.data && r.data.foundPhotos > 0).length}</p>
                  <p>Total photos linked: {allResults.reduce((sum, r) => sum + (r.data?.foundPhotos || 0), 0)}</p>
                </div>
              </div>
              
              <div className="bg-[#030712] p-4 rounded-lg">
                <h3 className="text-[#00FFAB] font-semibold mb-2">Status</h3>
                <div className="text-white text-sm space-y-1">
                  <p className="text-green-400">✅ Bulk fix completed!</p>
                  <p>All profiles updated</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[#00FFAB] font-semibold">Detailed Results</h3>
              <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                {allResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      result.success 
                        ? 'bg-green-900/20 border-green-500' 
                        : 'bg-red-900/20 border-red-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-white">
                        {result.success ? '✅' : '❌'} {result.name || result.email}
                      </h4>
                      {result.success && result.data && result.data.foundPhotos > 0 && (
                        <span className="px-2 py-1 rounded text-xs bg-green-700 text-green-100">
                          +{result.data.foundPhotos} photos
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-gray-400">Email: </span>
                      <span className="text-blue-300">{result.email}</span>
                    </div>
                    
                    {result.success && result.data ? (
                      <div className="text-sm mt-1">
                        <span className="text-gray-400">Result: </span>
                        <span className="text-green-300">
                          Found {result.data.foundPhotos} photos, total now {result.data.totalPhotos}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm mt-1">
                        <span className="text-gray-400">Error: </span>
                        <span className="text-red-300">{result.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 