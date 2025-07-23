import React, { useState } from 'react';
import clsx from 'clsx';

interface ProfileCardProps {
  profile: {
    name: string;
    age?: number;
    email?: string;
    university?: string;
    skills?: string[];
    timezone?: string;
    photos: string[];
  };
  // kept for API parity but unused inside the component now
  onSwipe: (dir: 'left' | 'right') => void;
  isActive: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onSwipe: _onSwipe, isActive: _isActive }) => {
  const photos = profile.photos || [];
  const [photoIdx, setPhotoIdx] = useState(0);

  // Responsive width handled via Tailwind (no direct window usage)
  const cardWidth = 'w-[90vw] md:max-w-xs';

  /**
   * Determine whether the click happened on the left or right half of the card
   * and update the currently displayed photo accordingly.
   *
   * Left side  -> show previous photo
   * Right side -> show next photo
   */
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setIsMouseDown(true);
    setMouseDownPos({ x: e.clientX, y: e.clientY });
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!isMouseDown) return;
    
    const deltaX = Math.abs(e.clientX - mouseDownPos.x);
    const deltaY = Math.abs(e.clientY - mouseDownPos.y);
    
    // Only handle as click if mouse didn't move much (not a drag)
    if (deltaX < 10 && deltaY < 10) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const isLeftSide = clickX < rect.width / 2;
      
      console.log('Photo navigation click detected:', { isLeftSide, clickX, width: rect.width });
      
      setPhotoIdx((prev) => {
        const newIdx = isLeftSide 
          ? (prev - 1 + photos.length) % photos.length
          : (prev + 1) % photos.length;
        console.log(`Photo changed: ${prev} → ${newIdx}`);
        return newIdx;
      });
    }
    
    setIsMouseDown(false);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0];
    setIsMouseDown(true);
    setMouseDownPos({ x: touch.clientX, y: touch.clientY });
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!isMouseDown) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - mouseDownPos.x);
    const deltaY = Math.abs(touch.clientY - mouseDownPos.y);
    
    // Only handle as tap if finger didn't move much (not a swipe)
    if (deltaX < 10 && deltaY < 10) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = touch.clientX - rect.left;
      const isLeftSide = clickX < rect.width / 2;
      
      console.log('Photo navigation tap detected:', { isLeftSide, clickX, width: rect.width });
      
      setPhotoIdx((prev) => {
        const newIdx = isLeftSide 
          ? (prev - 1 + photos.length) % photos.length
          : (prev + 1) % photos.length;
        console.log(`Photo changed: ${prev} → ${newIdx}`);
        return newIdx;
      });
    }
    
    setIsMouseDown(false);
  }

  return (
    <div
      className={clsx(
        'relative z-20 select-none',
        cardWidth,
        'mx-auto',
        'rounded-3xl bg-[#141c27] shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-[#00FFAB]/10',
        'overflow-hidden'
      )}
      style={{ minHeight: 500 }}
    >
      {/* Photo Carousel */}
      <div 
        className="relative pressable" 
        style={{ height: '75%' }} 
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left click zone indicator */}
        <div className="absolute left-0 top-0 w-1/2 h-full z-10 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-black/50 rounded-full p-2">
            <span className="text-white text-2xl">‹</span>
          </div>
        </div>
        {/* Right click zone indicator */}
        <div className="absolute right-0 top-0 w-1/2 h-full z-10 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-black/50 rounded-full p-2">
            <span className="text-white text-2xl">›</span>
          </div>
        </div>
        {photos.length > 0 ? (
          <img
            src={photos[photoIdx]}
            alt={`${profile.name} photo ${photoIdx + 1}`}
            className="w-full aspect-[3/4] object-cover cursor-pointer rounded-t-3xl"
            style={{ borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem' }}
            draggable={false}
            onMouseDown={handleMouseDown}
          />
        ) : (
          <div className="w-full h-[70vw] max-h-[350px] bg-gray-800 flex items-center justify-center text-5xl text-gray-400">
            ?
          </div>
        )}
        {/* Gradient overlay for text legibility */}
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#141c27] to-transparent" />
        {/* Dots indicator */}
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
          {photos.map((_, i) => (
            <span
              key={i}
              className={clsx('h-2 w-2 rounded-full', i === photoIdx ? 'bg-emerald-400' : 'bg-gray-500/40')}
            />
          ))}
        </div>
      </div>
      {/* Info Area */}
      <div className="px-6 pt-4 pb-20">
        <div className="flex items-center gap-3">
          <span className="text-gray-100 text-xl font-bold">
            {profile.name}
            {profile.age ? `, ${profile.age}` : ''}
          </span>
        </div>
        <div className="text-gray-400 text-sm mt-1">{profile.university || profile.email}</div>
        <div className="flex flex-wrap gap-2 mt-3">
          {(profile.skills || []).map((skill) => (
            <span key={skill} className="bg-teal-600/20 text-teal-400 px-3 py-1 rounded-full text-xs font-medium">
              {skill}
            </span>
          ))}
          {profile.timezone && (
            <span className="bg-cyan-600/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-medium">
              {profile.timezone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard; 