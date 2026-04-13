import React, { useId } from 'react';

export function Logo({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const bgId = `bg-gradient-${id}`;
  const mainLineId = `main-line-gradient-${id}`;
  const glowId = `glow-filter-${id}`;

  return (
    <svg 
      viewBox="0 0 400 400" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Deep Nordic Slate Background */}
        <linearGradient id={bgId} x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A"/>
          <stop offset="1" stopColor="#020617"/>
        </linearGradient>
        
        {/* Crisp Ice Blue to White Gradient for the Insight Line */}
        <linearGradient id={mainLineId} x1="80" y1="280" x2="320" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7"/>
          <stop offset="0.5" stopColor="#38BDF8"/>
          <stop offset="1" stopColor="#F8FAFC"/>
        </linearGradient>

        {/* Subtle Glow Effect */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="400" height="400" rx="80" fill={`url(#${bgId})`}/>

      {/* Minimalist Grid */}
      <g stroke="#1E293B" strokeWidth="2" opacity="0.6">
        <line x1="100" y1="0" x2="100" y2="400" />
        <line x1="200" y1="0" x2="200" y2="400" />
        <line x1="300" y1="0" x2="300" y2="400" />
        <line x1="0" y1="100" x2="400" y2="100" />
        <line x1="0" y1="200" x2="400" y2="200" />
        <line x1="0" y1="300" x2="400" y2="300" />
      </g>

      {/* Raw Data (Scattered Points) */}
      <g fill="#334155" opacity="0.8">
        <circle cx="90" cy="240" r="4" />
        <circle cx="110" cy="290" r="3" />
        <circle cx="130" cy="210" r="5" />
        <circle cx="150" cy="260" r="4" />
        <circle cx="170" cy="170" r="3" />
        <circle cx="190" cy="230" r="6" />
        <circle cx="210" cy="190" r="4" />
        <circle cx="230" cy="270" r="3" />
        <circle cx="250" cy="200" r="5" />
        <circle cx="270" cy="150" r="4" />
        <circle cx="290" cy="220" r="3" />
        <circle cx="310" cy="160" r="5" />
        <circle cx="330" cy="190" r="4" />
      </g>
      <g fill="#1E293B">
        <circle cx="80" cy="200" r="5" />
        <circle cx="120" cy="160" r="4" />
        <circle cx="160" cy="280" r="6" />
        <circle cx="200" cy="140" r="3" />
        <circle cx="240" cy="250" r="5" />
        <circle cx="280" cy="180" r="4" />
        <circle cx="320" cy="240" r="5" />
      </g>

      {/* Actionable Insights Line (Clear, upward trend) */}
      <path 
        d="M 80 280 L 160 160 L 240 240 L 320 120" 
        stroke={`url(#${mainLineId})`} 
        strokeWidth="32" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />

      {/* Glowing Dot at the peak */}
      <circle cx="320" cy="120" r="16" fill="#FFFFFF" filter={`url(#${glowId})`}/>
      <circle cx="320" cy="120" r="6" fill="#0284C7" />
    </svg>
  );
}
