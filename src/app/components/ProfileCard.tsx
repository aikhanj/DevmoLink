import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { XMarkIcon, HeartIcon } from '@heroicons/react/24/solid';
import CardPhoto from '@/components/media/CardPhoto';
import { pickVariant } from '@/lib/images';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { PhotoMeta } from '@/types/db';

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
    photos?: string[]; // Legacy format
    photo?: PhotoMeta; // New optimized format
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
  imageComponent?: React.ReactNode; // Optional external image component
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, isActive, onSwipe, imageComponent }) => {
  const { name, age, programmingLanguages = [], photos: rawPhotos = [], photo, description } = profile;
  const desktop = useIsDesktop();

  // Support both legacy photos array and new photo object
  const photos = useMemo(() => {
    if (photo?.variants && Object.keys(photo.variants).length > 0) {
      // Use variants for optimized loading
      return Object.values(photo.variants).filter(Boolean);
    }
    return Array.from(new Set(rawPhotos.filter(Boolean)));
  }, [rawPhotos, photo]);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [pressStart, setPressStart] = useState({ x: 0, y: 0, time: 0 });
  const [swipeHint, setSwipeHint] = useState<'left' | 'right' | null>(null);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const resetState = () => {
    setIsPressed(false);
    setSwipeHint(null);
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleStart = (clientX: number, clientY: number, e: React.TouchEvent | React.MouseEvent) => {
    if (!isActive) return;
    
    if ('touches' in e) {
      // For swipeable cards, just track basic state but don't prevent TinderCard
      setPressStart({ x: clientX, y: clientY, time: Date.now() });
      setIsPressed(true);
    } else {
      e.stopPropagation(); // Prevent immediate TinderCard activation
      setPressStart({ x: clientX, y: clientY, time: Date.now() });
      setIsPressed(true);
      
      holdTimer.current = setTimeout(() => {
        // After hold time, let TinderCard take over by re-dispatching the event
        const newEvent = new MouseEvent('mousedown', {
          bubbles: true,
          clientX,
          clientY,
        });
        (e.target as HTMLElement).dispatchEvent(newEvent);
      }, HOLD_MS);
    }
  };

  const handleMove = (clientX: number, _clientY: number) => {
    if (!isActive || isPressed) return; // Skip hint updates for swipeable cards to avoid jitter
    
    const element = document.querySelector('.profile-card') as HTMLElement;
    if (element) {
      const rect = element.getBoundingClientRect();
      const deltaX = clientX - rect.left - rect.width / 2;
      const threshold = 50;
      const newHint = deltaX > threshold ? 'right' : deltaX < -threshold ? 'left' : null;
      if (newHint !== swipeHint) {
        setSwipeHint(newHint);
      }
    } else {
      setSwipeHint(null);
    }
  };

  const handleEnd = (clientX: number, _clientY: number, e: React.TouchEvent | React.MouseEvent) => {
    if (!isActive) return;
    
    resetState();
    
    const deltaTime = Date.now() - pressStart.time;
    if (deltaTime < HOLD_MS && e.target instanceof HTMLElement) {
      // Quick tap - navigate photos
      const rect = e.target.getBoundingClientRect();
      const clickX = clientX - rect.left;
      if (photos.length > 1) {
        const isLeftSide = clickX < rect.width / 2;
        setPhotoIdx((prev) => 
          isLeftSide 
            ? (prev - 1 + photos.length) % photos.length 
            : (prev + 1) % photos.length
        );
      }
    }
  };

  // When photo changes, determine loading state before paint to avoid flicker
  useLayoutEffect(() => {
    setImageError(false);
    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      // Image is already in cache and decoded; skip loading animation
      setImageLoading(false);
    } else {
      setImageLoading(true);
    }
  }, [photoIdx, photos]);

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

  // Render optimized image if using variants, otherwise fall back to regular img
  const renderImage = () => {
    // If an external image component is provided (from CardStack), use it
    if (imageComponent) {
      return imageComponent;
    }

    // If we have photo variants, use the optimized CardPhoto component
    if (photo?.variants && Object.keys(photo.variants).length > 0) {
      const src = pickVariant(photo.variants, { desktop });
      if (src) {
        return (
          <CardPhoto
            src={src}
            blurDataURL={photo.blurDataURL}
            desktop={desktop}
            priority={isActive} // Only prioritize the active card
          />
        );
      }
    }

    // Fall back to legacy img tag for backwards compatibility
    return (
      <img
        ref={imgRef}
        src={photos[photoIdx]}
        alt={`${name} photo ${photoIdx + 1}`}
        className={`w-full h-full object-cover bg-gray-900 ${imageLoading && !imageError ? 'opacity-0 transition-opacity duration-300' : 'opacity-100'}`}
        draggable={false}
        onError={() => {
          console.error(`Failed to load image for ${name}:`, {
            url: photos[photoIdx],
            photoIndex: photoIdx,
            totalPhotos: photos.length,
            allPhotos: photos
          });
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          setImageLoading(false);
          console.log(`Successfully loaded image for ${name}:`, {
            url: photos[photoIdx],
            photoIndex: photoIdx
          });
        }}
      />
    );
  };

  return (
    <div
      className="profile-card relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden cursor-pointer select-none"
      style={{ height: '100%' }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY, e)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={(e) => handleEnd(e.clientX, e.clientY, e)}
      onMouseLeave={() => resetState()}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY, e);
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={(e) => {
        const touch = e.changedTouches[0];
        handleEnd(touch.clientX, touch.clientY, e);
      }}
    >
      {photos && photos.length > 0 ? (
        <>
          {/* Loading overlay (full card) */}
          {(imageLoading && !imageError) && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-40">
              <div className="w-8 h-8 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
          )}
          {imageError && (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-40 gap-3">
              <p className="text-white/70 text-sm">Failed to load image</p>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/10"
                  onClick={() => {
                    setImageLoading(true);
                    setImageError(false);
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {renderImage()}
          
          <ul className="absolute top-3 inset-x-4 flex gap-1 z-30">
            {photos.map((_, i) => (
              <li key={i} className={`flex-1 h-0.5 rounded-full ${i === photoIdx ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </ul>
          
          {/* Swipe Hint Overlays */}
          {swipeHint === 'left' && (
            <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center z-20 transition-all duration-300 ease-out animate-in fade-in">
              <div className="bg-red-500/90 backdrop-blur-sm rounded-2xl px-8 py-4 flex items-center gap-3 shadow-xl">
                <XMarkIcon className="w-8 h-8 text-white" />
                <span className="text-white text-2xl font-bold tracking-wider">NOPE</span>
              </div>
            </div>
          )}
          {swipeHint === 'right' && (
            <div className="absolute inset-0 bg-emerald-500/70 flex items-center justify-center z-20 transition-all duration-300 ease-out animate-in fade-in">
              <div className="bg-emerald-500/90 backdrop-blur-sm rounded-2xl px-8 py-4 flex items-center gap-3 shadow-xl">
                <HeartIcon className="w-8 h-8 text-white" />
                <span className="text-white text-2xl font-bold tracking-wider">LIKE</span>
              </div>
            </div>
          )}

          {/* Profile Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-20">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{name}</h2>
                {age && <span className="text-xl text-white/80">{age}</span>}
              </div>
              
              {/* Progressive info reveal */}
              {(() => {
                const visibleInfo = getVisibleInfo();
                return (
                  <div>
                    {/* Basic Info */}
                    {visibleInfo.showBasicInfo && profile.gender && (
                      <div className="mt-2">
                        <span className={`px-3 py-1 text-xs rounded-full border ${
                          profile.gender.toLowerCase() === 'male' 
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : profile.gender.toLowerCase() === 'female'
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {profile.gender}
                        </span>
                      </div>
                    )}
                    
                    {/* Professions */}
                    {visibleInfo.showProfessions && profile.professions && profile.professions.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {profile.professions.map(profession => (
                            <span key={profession} className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {profession}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Skills */}
                    {visibleInfo.showSkills && (
                      <div className="mt-2 space-y-2">
                        {profile.skills?.languages && profile.skills.languages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {profile.skills.languages.slice(0, 4).map(skill => (
                              <span key={skill} className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        {!profile.skills && programmingLanguages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {programmingLanguages.slice(0, 4).map(skill => (
                              <span key={skill} className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Experience and Interests */}
                    {visibleInfo.showExperience && profile.experienceLevel && (
                      <div className="mt-2">
                        <span className="px-3 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          {profile.experienceLevel}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bottom buttons for inactive cards */}
          {!isActive && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-6 z-30">
              <button
                onClick={() => onSwipe('left')}
                className="w-14 h-14 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow-lg transition-all"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => onSwipe('right')}
                className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center shadow-lg transition-all"
              >
                <HeartIcon className="w-6 h-6 text-white" />
              </button>
            </div>
          )}

          {/* Action hints */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-30">
            <div className="flex items-center gap-1">
              <XMarkIcon className="w-4 h-4 text-red-400/60" />
              <div className="text-red-400/60 text-xs">Swipe left</div>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-emerald-400/60 text-xs">Swipe right</div>
              <HeartIcon className="w-4 h-4 text-emerald-400/60" />
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center">
          <p className="text-gray-400">No photo available</p>
          {/* Debug info */}
          <div className="absolute bottom-2 left-2 text-xs text-red-400 bg-black/50 p-1 rounded">
            {JSON.stringify({ name, photos: photos?.length || 0 })}
          </div>
        </div>
      )}

      {/* Bottom content overlay for more details */}
      <div className="absolute bottom-0 left-0 right-0 transform translate-y-full bg-gray-900/95 backdrop-blur-md p-6 transition-transform duration-300 hover:translate-y-0 z-10">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">About {name}</h3>
            {description && (
              <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
            )}
          </div>
          
          {programmingLanguages && programmingLanguages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Programming Languages</h4>
              <div className="flex flex-wrap gap-2">
                {programmingLanguages.slice(0, 6).map((lang, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30"
                  >
                    {lang}
                  </span>
                ))}
                {programmingLanguages.length > 6 && (
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">
                    +{programmingLanguages.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Progress indicator */}
        <div className="mt-4 text-xs text-white/50 flex justify-between items-center">
          <span>{photoIdx + 1} / {photos.length} photos</span>
          <span className="text-xs text-gray-500">
            {photoIdx === 0 && "Basic info"}
            {photoIdx === 1 && "Profession"}
            {photoIdx === 2 && "Skills"}
            {photoIdx >= 3 && "More details"}
          </span>
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(ProfileCard); 