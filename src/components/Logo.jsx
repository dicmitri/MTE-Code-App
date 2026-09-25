import React from 'react';

// Pass size={null} to size the logo with classes instead (height plus aspect-[26/5]).
export const Logo = ({ size = 48, className = "", centerImage = false }) => {
  // The image is roughly 5.2 times wider than it is tall.
  const sizeStyle = size
    ? {
      width: `${size * 5.2}px`,
      maxWidth: '100%',
      height: `${size}px`
    }
    : undefined;

  return (
    <div
      className={`flex items-center ${className}`}
      style={sizeStyle}
    >
      <img
        src="/logo.png"
        alt="MedTech Europe - The Code App"
        className="h-full w-full"
        style={{
          objectFit: 'contain',
          objectPosition: centerImage ? 'center' : 'left center'
        }}
      />
    </div>
  );
};
