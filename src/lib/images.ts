export function pickVariant(
  variants: Record<string, string> | undefined,
  opts: { desktop: boolean }
) {
  if (!variants) return undefined;
  // Mobile ≈512, Desktop ≈768 (cards are ~60vw)
  return opts.desktop ? variants['768'] ?? variants['512'] ?? variants['1080'] ?? variants['256']
                      : variants['512'] ?? variants['768'] ?? variants['256'] ?? variants['1080'];
}

// Prefetch next image URLs
export function prefetchImages(urls: (string | undefined)[]) {
  urls.filter(Boolean).forEach((u) => {
    const img = new Image();
    img.src = u!;
  });
}