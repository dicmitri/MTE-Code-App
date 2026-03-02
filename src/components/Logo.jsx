import React from 'react';

export const Logo = ({ size = 48, className = "", centerImage = false }) => {
  // The image is roughly 5.2 times wider than it is tall.
  const fullWidth = size * 5.2;

  return (
    <div 
      className={`flex items-center ${className}`}
      style={{
        width: `${fullWidth}px`,
        maxWidth: '100%',
        height: `${size}px`
      }}
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
