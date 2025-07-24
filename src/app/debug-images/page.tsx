"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface ImageTest {
  type: string;
  index?: number;
  url: string;
  status?: number;
  accessible: boolean;
  contentType?: string;
  contentLength?: string;
  error?: string;
}

interface DebugResult {
  email: string;
  profile: {
    name: string;
    avatarUrl?: string;
    photos?: string[];
    photoCount: number;
  };
  imageTests: ImageTest[];
  summary: {
    totalImages: number;
    accessibleImages: number;
    failedImages: number;
  };
}

export default function DebugImagesPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  const debugImages = async () => {
    if (!email.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(`/api/debug-images?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to debug images');
        return;
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadAllProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-images');
      const data = await response.json();
      setAllProfiles(data.profiles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <p className="text-white">Please sign in to access debug tools</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-[#00FFAB] mb-8">🔍 Image Debug Tool</h1>
        
        <div className="bg-[#18181b] rounded-xl p-6 mb-8">
          <h2 className="text-xl text-white mb-4">Debug Specific User</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter user email to debug (e.g., user@example.com)"
              className="flex-1 px-4 py-2 bg-[#030712] text-white rounded-lg border border-gray-600 focus:border-[#00FFAB] focus:outline-none"
            />
            <button
              onClick={debugImages}
              disabled={loading || !email.trim()}
              className="px-6 py-2 bg-[#00FFAB] text-[#030712] rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00CC7A] transition-colors"
            >
              {loading ? 'Debugging...' : 'Debug Images'}
            </button>
          </div>
          
          <button
            onClick={loadAllProfiles}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Load All Profiles With Images
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-8">
            <h3 className="text-red-400 font-semibold mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-[#18181b] rounded-xl p-6 mb-8">
            <h2 className="text-xl text-white mb-4">🎯 Debug Results for {result.email}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#030712] p-4 rounded-lg">
                <h3 className="text-[#00FFAB] font-semibold mb-2">Summary</h3>
                <div className="text-white text-sm space-y-1">
                  <p>Total Images: {result.summary.totalImages}</p>
                  <p className="text-green-400">✅ Accessible: {result.summary.accessibleImages}</p>
                  <p className="text-red-400">❌ Failed: {result.summary.failedImages}</p>
                </div>
              </div>
              
              <div className="bg-[#030712] p-4 rounded-lg">
                <h3 className="text-[#00FFAB] font-semibold mb-2">Profile Info</h3>
                <div className="text-white text-sm space-y-1">
                  <p>Name: {result.profile.name}</p>
                  <p>Photo Count: {result.profile.photoCount}</p>
                  <p>Has Avatar: {result.profile.avatarUrl ? '✅' : '❌'}</p>
                </div>
              </div>
              
              <div className="bg-[#030712] p-4 rounded-lg">
                <h3 className="text-[#00FFAB] font-semibold mb-2">Quick Test</h3>
                {result.profile.avatarUrl && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 mb-1">Avatar Test:</p>
                    <img 
                      src={result.profile.avatarUrl} 
                      alt="Avatar test"
                      className="w-12 h-12 rounded-full object-cover"
                      onError={() => console.log('Avatar failed to load')}
                      onLoad={() => console.log('Avatar loaded successfully')}
                    />
                  </div>
                )}
              </div>
            </div>

                         <div className="space-y-4">
               <h3 className="text-[#00FFAB] font-semibold">Detailed Test Results</h3>
               <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
               {result.imageTests.map((test, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    test.accessible 
                      ? 'bg-green-900/20 border-green-500' 
                      : 'bg-red-900/20 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">
                      {test.accessible ? '✅' : '❌'} {test.type.toUpperCase()}
                      {test.index !== undefined && ` #${test.index + 1}`}
                    </h4>
                    {test.status && (
                      <span className={`px-2 py-1 rounded text-xs font-mono ${
                        test.status === 200 ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
                      }`}>
                        {test.status}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="break-all">
                      <span className="text-gray-400">URL: </span>
                      <span className="text-blue-300">{test.url}</span>
                    </div>
                    
                    {test.contentType && (
                      <div>
                        <span className="text-gray-400">Type: </span>
                        <span className="text-white">{test.contentType}</span>
                      </div>
                    )}
                    
                    {test.contentLength && (
                      <div>
                        <span className="text-gray-400">Size: </span>
                        <span className="text-white">{test.contentLength} bytes</span>
                      </div>
                    )}
                    
                    {test.error && (
                      <div>
                        <span className="text-gray-400">Error: </span>
                        <span className="text-red-300">{test.error}</span>
                      </div>
                    )}
                  </div>
                  
                  {test.accessible && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-1">Preview:</p>
                      <img 
                        src={test.url} 
                        alt="Image preview"
                        className="max-w-[200px] max-h-[200px] object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

                 {allProfiles.length > 0 && (
           <div className="bg-[#18181b] rounded-xl p-6 mb-8">
             <h2 className="text-xl text-white mb-4">📊 All Profiles With Images ({allProfiles.length})</h2>
             <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
               {allProfiles.map((profile, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#030712] rounded-lg">
                  <div>
                    <span className="text-white font-semibold">{profile.name || 'Unknown'}</span>
                    <span className="text-gray-400 ml-2 text-sm">({profile.email})</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={profile.hasAvatar ? 'text-green-400' : 'text-gray-500'}>
                      Avatar: {profile.hasAvatar ? '✅' : '❌'}
                    </span>
                    <span className="text-blue-400">
                      Photos: {profile.photoCount}
                    </span>
                    <button
                      onClick={() => {
                        setEmail(profile.email);
                        debugImages();
                      }}
                      className="px-3 py-1 bg-[#00FFAB] text-[#030712] rounded text-xs font-semibold hover:bg-[#00CC7A] transition-colors"
                    >
                      Debug
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 