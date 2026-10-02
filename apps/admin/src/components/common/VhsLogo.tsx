import React from 'react';

export const VhsLogo: React.FC<{ className?: string; width?: number }> = ({ className = '', width = 120 }) => {
  return (
    <svg 
      width={width} 
      viewBox="0 0 240 140" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cuerpo del casete */}
      <rect x="10" y="10" width="220" height="120" rx="12" fill="#0D1117" stroke="#1E293B" strokeWidth="4"/>
      
      {/* Etiqueta superior */}
      <rect x="25" y="25" width="190" height="40" rx="4" fill="#131B2E" stroke="#00D4FF" strokeWidth="2"/>
      <text x="120" y="52" fill="#00D4FF" fontSize="20" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" letterSpacing="2">goroTV</text>
      
      {/* Ventana de cinta central */}
      <rect x="50" y="75" width="140" height="40" rx="8" fill="#0B0F19" stroke="#7B2FBE" strokeWidth="2"/>
      
      {/* Bobina izquierda */}
      <circle cx="85" cy="95" r="12" fill="#1E293B" stroke="#00D4FF" strokeWidth="1.5"/>
      <circle cx="85" cy="95" r="4" fill="#0D1117"/>
      
      {/* Bobina derecha */}
      <circle cx="155" cy="95" r="12" fill="#1E293B" stroke="#00D4FF" strokeWidth="1.5"/>
      <circle cx="155" cy="95" r="4" fill="#0D1117"/>
      
      {/* Cinta conectando bobinas */}
      <line x1="85" y1="83" x2="155" y2="83" stroke="#7B2FBE" strokeWidth="2"/>
      
      {/* Detalles inferiores */}
      <circle cx="35" cy="110" r="5" fill="#1E293B"/>
      <circle cx="205" cy="110" r="5" fill="#1E293B"/>
      <line x1="90" y1="120" x2="150" y2="120" stroke="#1E293B" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
};
