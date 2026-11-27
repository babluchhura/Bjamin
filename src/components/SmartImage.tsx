import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { resolveEstateImageUrl } from '../lib/estateImages';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  eager?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  eager = false,
}) => {
  const resolvedSrc = resolveEstateImageUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0B281F] via-[#12382B] to-[#1B4D3C] text-white/90 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-11 h-11 rounded-md border border-[#B88E2F]/50 flex items-center justify-center mb-3">
          <MapPin className="w-5 h-5 text-[#D1AA48]" />
        </div>
        <span className="font-display text-lg font-semibold tracking-tight text-white">
          {fallbackTitle || alt}
        </span>
        <span className="text-xs text-white/70 mt-1">Bolangir Jamin</span>
      </div>
    );
  }

  const isExternal = /^https?:\/\//i.test(resolvedSrc);

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy={isExternal ? 'no-referrer' : undefined}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
