import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt = '', 
  fallback, 
  size = 'md',
  className,
  ...props 
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(fallback);

  return (
    <div 
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full items-center justify-center bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !imgError ? (
        <img 
          src={src} 
          alt={alt} 
          onError={() => setImgError(true)}
          className="aspect-square h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
