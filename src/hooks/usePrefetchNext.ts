'use client';
import { useEffect } from 'react';

export function usePrefetchNext(urls: (string|undefined)[]) {
  useEffect(() => {
    urls.filter(Boolean).forEach((u) => { const img = new Image(); img.src = u!; });
  }, [urls.join('|')]);
}