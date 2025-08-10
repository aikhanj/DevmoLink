import React from 'react';
import CardPhoto from '@/components/media/CardPhoto';
import { pickVariant } from '@/lib/images';
import { usePrefetchNext } from '@/hooks/usePrefetchNext';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { PhotoMeta } from '@/types/db';

interface Profile {
  id: string;
  name: string;
  photo?: PhotoMeta;
  [key: string]: any;
}

interface SwipeCardImageProps {
  photo: PhotoMeta | undefined;
  desktop: boolean;
  priority?: boolean;
}

function SwipeCardImage({ photo, desktop, priority = false }: SwipeCardImageProps) {
  const src = pickVariant(photo?.variants, { desktop }) || '';
  if (!src) return null;
  
  return (
    <CardPhoto 
      src={src} 
      blurDataURL={photo?.blurDataURL} 
      desktop={desktop} 
      priority={priority}
    />
  );
}

interface CardStackProps {
  cards: Profile[];
  index: number;
  children: (profile: Profile, isTop: boolean, imageComponent: React.ReactNode) => React.ReactNode;
}

export default function CardStack({ cards, index, children }: CardStackProps) {
  const desktop = useIsDesktop();

  const current = cards[index];
  const next1 = cards[index + 1];
  const next2 = cards[index + 2];

  // Prefetch upcoming images
  const next1Url = pickVariant(next1?.photo?.variants, { desktop });
  const next2Url = pickVariant(next2?.photo?.variants, { desktop });
  usePrefetchNext([next1Url, next2Url]);

  return (
    <>
      {/* Background card (next in stack) */}
      {next1 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full flex justify-center" style={{ height: 500 }}>
          <div className="w-full max-w-md mx-auto">
            {children(next1, false, <SwipeCardImage photo={next1.photo} desktop={desktop} />)}
          </div>
        </div>
      )}
      
      {/* Top card (swipeable) - only this one gets priority */}
      {current && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full flex justify-center" style={{ height: 500 }}>
          <div className="w-full max-w-md mx-auto">
            {children(current, true, <SwipeCardImage photo={current.photo} desktop={desktop} priority />)}
          </div>
        </div>
      )}
    </>
  );
}

// Memoized version to prevent unnecessary re-renders
export const MemoCardStack = React.memo(CardStack);