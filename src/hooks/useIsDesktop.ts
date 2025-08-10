'use client';
import { useEffect, useState } from 'react';

export function useIsDesktop(breakpoint = 768) {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const on = () => setIs(window.innerWidth >= breakpoint);
    on(); 
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [breakpoint]);
  return is;
}