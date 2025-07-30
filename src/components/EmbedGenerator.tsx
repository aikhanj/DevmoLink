'use client';

import React, { useState } from 'react';
import { EmbedConfig } from '@/types/farcaster';
import { useFarcaster } from './FarcasterProvider';

interface EmbedGeneratorProps {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  aspectRatio?: '3:2' | '1:1';
  onEmbedGenerated?: (embed: EmbedConfig) => void;
}

export function EmbedGenerator({
  title,
  description,
  imageUrl,
  url,
  aspectRatio = '3:2',
  onEmbedGenerated
}: EmbedGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmbed, setGeneratedEmbed] = useState<EmbedConfig | null>(null);
  const { openUrl } = useFarcaster();

  const generateEmbed = async () => {
    setIsGenerating(true);
    
    try {
      // Generate dynamic image if not provided
      const finalImageUrl = imageUrl || await generateDynamicImage(title, description);
      const finalUrl = url || window.location.href;
      
      const embed: EmbedConfig = {
        title: title.length > 100 ? title.substring(0, 97) + '...' : title,
        description: description.length > 200 ? description.substring(0, 197) + '...' : description,
        image: finalImageUrl,
        url: finalUrl,
        aspectRatio
      };
      
      setGeneratedEmbed(embed);
      if (onEmbedGenerated) {
        onEmbedGenerated(embed);
      }
    } catch (error) {
      console.error('Failed to generate embed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareToFarcaster = async () => {
    if (!generatedEmbed) return;
    
    try {
      const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
        `${generatedEmbed.title}\n\n${generatedEmbed.description}`
      )}&embeds[]=${encodeURIComponent(generatedEmbed.url)}`;
      
      await openUrl(shareUrl);
    } catch {
      // Fallback to opening in new tab
      window.open(
        `https://warpcast.com/~/compose?text=${encodeURIComponent(
          `${generatedEmbed.title}\n\n${generatedEmbed.description}`
        )}&embeds[]=${encodeURIComponent(generatedEmbed.url)}`,
        '_blank'
      );
    }
  };

  const copyEmbedCode = () => {
    if (!generatedEmbed) return;
    
    const embedCode = `
<meta property="og:title" content="${generatedEmbed.title}" />
<meta property="og:description" content="${generatedEmbed.description}" />
<meta property="og:image" content="${generatedEmbed.image}" />
<meta property="og:url" content="${generatedEmbed.url}" />
<meta property="fc:frame" content='{"version":"next","image":"${generatedEmbed.image}","buttons":[{"label":"Open","action":"link","target":"${generatedEmbed.url}"}]}' />
<meta property="fc:frame:image" content="${generatedEmbed.image}" />
<meta property="fc:frame:image:aspect_ratio" content="${generatedEmbed.aspectRatio === '3:2' ? '1.91:1' : '1:1'}" />
<meta property="fc:frame:button:1" content="Open" />
<meta property="fc:frame:button:1:action" content="link" />
<meta property="fc:frame:button:1:target" content="${generatedEmbed.url}" />
    `.trim();
    
    navigator.clipboard.writeText(embedCode);
    // You could add a toast notification here
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Generate Embed</h3>
        <button
          onClick={generateEmbed}
          disabled={isGenerating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{title}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{description}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => {
              // This would require lifting state up or using a callback
              console.log('Aspect ratio changed:', e.target.value);
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="3:2">3:2 (1.91:1)</option>
            <option value="1:1">1:1 (Square)</option>
          </select>
        </div>
      </div>

      {generatedEmbed && (
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium text-gray-900">Preview</h4>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={generatedEmbed.image}
              alt={generatedEmbed.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h5 className="font-medium text-gray-900 mb-1">{generatedEmbed.title}</h5>
              <p className="text-sm text-gray-600 mb-2">{generatedEmbed.description}</p>
              <a
                href={generatedEmbed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {generatedEmbed.url}
              </a>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={shareToFarcaster}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Share to Farcaster
            </button>
            <button
              onClick={copyEmbedCode}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Copy Embed Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Dynamic image generation utility
async function generateDynamicImage(title: string, description: string): Promise<string> {
  try {
    // This would call your image generation API
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    
    if (response.ok) {
      const { imageUrl } = await response.json();
      return imageUrl;
    }
  } catch (error) {
    console.error('Failed to generate dynamic image:', error);
  }
  
  // Fallback to default image
  return `${process.env.NEXT_PUBLIC_DOMAIN}/icon.png`;
}

// Quick share component for easy sharing
export function QuickShare({ text, url }: { text: string; url?: string }) {
  const { openUrl } = useFarcaster();
  
  const handleShare = async () => {
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${
      url ? `&embeds[]=${encodeURIComponent(url)}` : ''
    }`;
    
    try {
      await openUrl(shareUrl);
    } catch {
      window.open(shareUrl, '_blank');
    }
  };
  
  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center space-x-2 bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors text-sm"
    >
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
      </svg>
      <span>Share</span>
    </button>
  );
} 