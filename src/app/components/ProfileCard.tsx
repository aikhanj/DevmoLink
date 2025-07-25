import React, { useState, useRef, useEffect } from 'react';

// How long the user must hold before the swipe interaction is forwarded (ms)
const HOLD_MS = 150;

interface ProfileCardProps {
  profile: {
    name: string;
    age?: number;
    email?: string;
    university?: string;
    programmingLanguages?: string[];
    themes?: string[];
    timezone?: string;
    photos: string[];
    description?: string;
  };
  onSwipe: (dir: 'left' | 'right') => void;
  isActive: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  const { name, age, programmingLanguages = [], themes = [], timezone, photos: rawPhotos = [], description } = profile;
  
  const photos = Array.from(new Set(rawPhotos.filter(Boolean)));
  const [photoIdx, setPhotoIdx] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [pressStart, setPressStart] = useState({ x: 0, y: 0, time: 0 });
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const resetState = () => {
    setIsPressed(false);
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleStart = (clientX: number, clientY: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent immediate TinderCard activation
    setIsPressed(true);
    setPressStart({ x: clientX, y: clientY, time: Date.now() });
    
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      // After hold time, let TinderCard take over by re-dispatching the event
      const newEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY
      });
      (e.target as HTMLElement).dispatchEvent(newEvent);
    }, HOLD_MS);
  };

  const handleEnd = (clientX: number, clientY: number) => {
    if (!isPressed) return;
    
    const timeDiff = Date.now() - pressStart.time;
    const deltaX = Math.abs(clientX - pressStart.x);
    const deltaY = Math.abs(clientY - pressStart.y);
    
    resetState();
    
    // If it was a quick tap (under hold time) and didn't move much, change photo
    if (timeDiff < HOLD_MS && deltaX < 10 && deltaY < 10) {
      const rect = document.querySelector('.profile-card')?.getBoundingClientRect();
      if (rect) {
        const clickX = clientX - rect.left;
        const isLeftSide = clickX < rect.width / 2;
        setPhotoIdx((prev) => 
          isLeftSide 
            ? (prev - 1 + photos.length) % photos.length 
            : (prev + 1) % photos.length
        );
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => () => resetState(), []);

  // Progressive information reveal based on photo index
  const getVisibleInfo = () => {
    const info = {
      showName: photoIdx >= 0,           // Always show name/age
      showSkills: photoIdx >= 0,         // Photo 1+: Show programming languages immediately
      showThemes: photoIdx >= 1,         // Photo 2+: Show project themes
      showTimezone: photoIdx >= 2,       // Photo 3+: Show timezone
      showDescription: photoIdx >= 3,    // Photo 4+: Show description (if exists)
      showAllSkills: photoIdx >= 4,      // Photo 5+: Show all programming languages (not just 3)
    };
    return info;
  };

  const visibleInfo = getVisibleInfo();

  // Preload all profile photos
  useEffect(() => {
    photos.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, [photos]);

  return (
    <div
      className="profile-card relative w-full h-full rounded-xl overflow-hidden bg-gray-900 shadow-lg will-change-transform select-none"
      onMouseDown={(e) => handleStart(e.clientX, e.clientY, e)}
      onMouseUp={(e) => handleEnd(e.clientX, e.clientY)}
      onMouseLeave={resetState}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY, e);
      }}
      onTouchEnd={(e) => {
        const touch = e.changedTouches[0];
        handleEnd(touch.clientX, touch.clientY);
      }}
    >
      {photos && photos.length > 0 ? (
        <>
          <img
            src={photos[photoIdx]}
            alt={`${name} photo ${photoIdx + 1}`}
            className="w-full h-full object-cover"
            draggable={false}
            onError={(e) => {
              console.error(`Failed to load image for ${name}:`, {
                url: photos[photoIdx],
                photoIndex: photoIdx,
                totalPhotos: photos.length,
                allPhotos: photos
              });
              // Try to show placeholder or next photo
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
            onLoad={() => {
              console.log(`Successfully loaded image for ${name}:`, {
                url: photos[photoIdx],
                photoIndex: photoIdx
              });
            }}
          />
          <ul className="absolute top-3 inset-x-4 flex gap-1 z-10">
            {photos.map((_, i) => (
              <li key={i} className={`flex-1 h-0.5 rounded-full ${i === photoIdx ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </ul>
        </>
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <p className="text-gray-400">No photo available</p>
          {/* Debug info */}
          <div className="absolute bottom-2 left-2 text-xs text-red-400 bg-black/50 p-1 rounded">
            {JSON.stringify({ name, photos: photos?.length || 0 })}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progressive information reveal */}
        {visibleInfo.showName && (
          <h2 className="text-white text-lg font-semibold animate-in fade-in duration-300">
            {name}, {age}
          </h2>
        )}
        
        {visibleInfo.showDescription && description && (
          <p className="text-gray-400 text-sm mt-1 animate-in fade-in duration-300">
            {description}
          </p>
        )}
        
        {visibleInfo.showSkills && programmingLanguages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in duration-300">
            {(visibleInfo.showAllSkills ? programmingLanguages : programmingLanguages.slice(0, 3)).map(s => (
              <span key={s} className="px-3 py-1 text-xs rounded-full bg-white/10 text-emerald-300">
                {s}
              </span>
            ))}
          </div>
        )}
        
        {visibleInfo.showThemes && themes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in duration-300">
            {themes.slice(0, 3).map(theme => (
              <span key={theme} className="px-3 py-1 text-xs rounded-full bg-white/10 text-blue-300">
                {theme}
              </span>
            ))}
          </div>
        )}
        
        {visibleInfo.showTimezone && timezone && (
          <div className="mt-2 animate-in fade-in duration-300">
            <span className="px-3 py-1 text-xs rounded-full bg-white/10 text-gray-300">
              📍 {timezone}
            </span>
          </div>
        )}
        
        {/* Progress indicator */}
        <div className="mt-3 text-xs text-white/50">
          {photoIdx + 1} / {photos.length} photos
        </div>
      </div>
    </div>
  );
};

export default ProfileCard; 