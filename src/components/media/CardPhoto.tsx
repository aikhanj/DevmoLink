'use client';
import Image from 'next/image';

export default function CardPhoto({
  src,
  blurDataURL,
  desktop,
  priority = false,
}: {
  src: string;
  blurDataURL?: string;
  desktop: boolean;
  priority?: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt=""
        fill
        priority={priority}   // only set on the top-most card
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        sizes={desktop ? '60vw' : '100vw'}
        className="object-cover"
      />
    </div>
  );
}