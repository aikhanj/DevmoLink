import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, HeartIcon } from '@heroicons/react/24/solid';

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
    gender?: string;
    professions?: string[];
    skills?: {
      languages?: string[];
      frameworks?: string[];
    };
    experienceLevel?: string;
    interests?: string[];
    tools?: string[];
  };
  onSwipe: (dir: 'left' | 'right') => void;
  isActive: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, isActive, onSwipe }) => {
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
      // Each photo shows only one type of info
      showBasicInfo: photoIdx === 0,           // Photo 0: Basic info only
      showProfessions: photoIdx === 1,         // Photo 1: Professions only  
      showSkills: photoIdx === 2,              // Photo 2: Skills & Tools only
      showTools: photoIdx === 2,               // Photo 2: Skills & Tools only
      showExperience: photoIdx >= 3,           // Photo 3+: Experience & Interests
      showInterests: photoIdx >= 3,            // Photo 3+: Experience & Interests
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
      className="profile-card relative w-full h-[35rem] rounded-xl overflow-hidden bg-gray-900 shadow-lg will-change-transform select-none"
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
            className="w-full h-full min-h-[35rem] object-cover bg-gray-900"
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
        
                 {/* Basic Info: Name, Age, Gender (Photo 0 only) */}
         {visibleInfo.showBasicInfo && (
           <div className="animate-in fade-in duration-300">
             <h2 className="text-white text-lg font-semibold">
               {name}, {age}
             </h2>
                           {profile.gender && profile.gender.toLowerCase() !== 'other' && (
                <div className="mt-2">
                  <span className={`px-3 py-1 text-xs rounded-full border ${
                    profile.gender.toLowerCase() === 'male' 
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : profile.gender.toLowerCase() === 'female'
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                      : profile.gender.toLowerCase() === 'non-binary'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                  }`}>
                    {profile.gender}
                  </span>
                </div>
              )}
           </div>
         )}
        
        {/* Professions (Photo 1 only) */}
        {visibleInfo.showProfessions && profile.professions && profile.professions.length > 0 && (
          <div className="mt-3 animate-in fade-in duration-300">
            <div className="flex flex-wrap gap-2">
              {profile.professions.map(profession => (
                <span key={profession} className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {profession}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Skills and Tools (Photo 2 only) */}
        {(visibleInfo.showSkills || visibleInfo.showTools) && (
          <div className="mt-3 space-y-3 animate-in fade-in duration-300">
            {/* Skills */}
            {visibleInfo.showSkills && (
              <>
                {/* Programming Languages from skills object */}
                {profile.skills?.languages && profile.skills.languages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.languages.slice(0, 4).map(skill => (
                      <span key={skill} className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Frameworks */}
                {profile.skills?.frameworks && profile.skills.frameworks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.frameworks.slice(0, 3).map(skill => (
                      <span key={skill} className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Fallback to old programmingLanguages for backward compatibility */}
                {!profile.skills && programmingLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {programmingLanguages.slice(0, 4).map(skill => (
                      <span key={skill} className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {/* Tools */}
            {visibleInfo.showTools && profile.tools && profile.tools.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.tools.slice(0, 4).map(tool => (
                  <span key={tool} className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Experience Level and Interests (Photo 3+) */}
        {(visibleInfo.showExperience || visibleInfo.showInterests) && (
          <div className="mt-3 space-y-3 animate-in fade-in duration-300">
            {/* Experience Level */}
            {visibleInfo.showExperience && profile.experienceLevel && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Experience:</span>
                <span className="px-3 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  {profile.experienceLevel}
                </span>
              </div>
            )}
            
            {/* Interests */}
            {visibleInfo.showInterests && profile.interests && profile.interests.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Looking for:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.slice(0, 3).map(interest => (
                    <span key={interest} className="px-2 py-1 text-xs rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Description (if no categorized info to show) */}
        {photoIdx >= 4 && description && (
          <div className="mt-3 animate-in fade-in duration-300">
            <p className="text-gray-400 text-sm">
              {description}
            </p>
          </div>
        )}
        
        {/* Progress indicator */}
        <div className="mt-4 text-xs text-white/50 flex justify-between items-center">
          <span>{photoIdx + 1} / {photos.length} photos</span>
          <span className="text-xs text-gray-500">
            {photoIdx === 0 && "Basic info"}
            {photoIdx === 1 && "Profession"}
            {photoIdx === 2 && "Skills & Tools"}
            {photoIdx >= 3 && "Experience & Interests"}
          </span>
        </div>
      </div>
      {isActive && (
        <div className="absolute left-1/2 -translate-x-1/2 z-30" style={{ bottom: -70 }}>
          <div className="flex items-center justify-center gap-8 h-14 px-6 rounded-full backdrop-blur-md bg-white/10 shadow-lg border border-white/10" style={{ minWidth: 200 }}>
            <button
              aria-label="Reject"
              onClick={() => onSwipe('left')}
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl hover:scale-110 transition bg-transparent transform-gpu"
            >
              <XMarkIcon className="w-8 h-8 text-red-400" />
            </button>
            <button
              aria-label="Like"
              onClick={() => onSwipe('right')}
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl hover:scale-110 transition bg-transparent transform-gpu"
            >
              <HeartIcon className="w-8 h-8 text-emerald-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCard; 