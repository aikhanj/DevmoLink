'use client';
import { useEffect, useMemo } from 'react';

export function usePrefetchNext(urls: (string|undefined)[]) {
  const validUrls = useMemo(() => urls.filter(Boolean) as string[], [urls]);
  
  useEffect(() => {
    validUrls.forEach((url) => { 
      const img = new Image(); 
      img.src = url; 
    });
  }, [validUrls]);
}