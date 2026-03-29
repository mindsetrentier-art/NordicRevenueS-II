import React, { useId } from 'react';

export function Logo({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const bgId = `bg-gradient-${id}`;
  const textId = `text-gradient-${id}`;
  const barId1 = `bar-gradient-1-${id}`;
  const barId2 = `bar-gradient-2-${id}`;
  const barId3 = `bar-gradient-3-${id}`;
  const barId4 = `bar-gradient-4-${id}`;
  const barId5 = `bar-gradient-5-${id}`;
  const arrowId = `arrow-gradient-${id}`;

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
      <rect width="400" height="400" rx="64" fill={`url(#${bgId})`}/>
      
      {/* Grid lines */}
      <path d="M50 50 L50 350 M100 50 L100 350 M150 50 L150 350 M200 50 L200 350 M250 50 L250 350 M300 50 L300 350 M350 50 L350 350" stroke="rgba(255,255,255,0.05)" strokeWidth="2"/>
      <path d="M50 50 L350 50 M50 100 L350 100 M50 150 L350 150 M50 200 L350 200 M50 250 L350 250 M50 300 L350 300 M50 350 L350 350" stroke="rgba(255,255,255,0.05)" strokeWidth="2"/>

      {/* NR Text */}
      <text x="200" y="160" fontFamily="Arial, sans-serif" fontSize="120" fontWeight="900" fill={`url(#${textId})`} textAnchor="middle" style={{ letterSpacing: '-5px' }}>
        NR
      </text>

      {/* Chart Bars */}
      <rect x="100" y="260" width="30" height="40" rx="4" fill={`url(#${barId1})`}/>
      <rect x="140" y="240" width="30" height="60" rx="4" fill={`url(#${barId2})`}/>
      <rect x="180" y="200" width="30" height="100" rx="4" fill={`url(#${barId3})`}/>
      <rect x="220" y="180" width="30" height="120" rx="4" fill={`url(#${barId4})`}/>
      <rect x="260" y="140" width="30" height="160" rx="4" fill={`url(#${barId5})`}/>

      {/* Arrow */}
      <path d="M80 280 Q 200 280 300 120" stroke={`url(#${arrowId})`} strokeWidth="12" strokeLinecap="round" fill="none"/>
      <path d="M280 120 L310 110 L300 140 Z" fill="#FBBF24"/>

      {/* Bottom Text */}
      <text x="200" y="360" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" fill="#E2E8F0" textAnchor="middle" letterSpacing="4">
        NORDICREVENUES II
      </text>

      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A"/>
          <stop offset="1" stopColor="#020617"/>
        </linearGradient>
        <linearGradient id={textId} x1="100" y1="40" x2="300" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93C5FD"/>
          <stop offset="1" stopColor="#3B82F6"/>
        </linearGradient>
        <linearGradient id={barId1} x1="115" y1="260" x2="115" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8"/>
          <stop offset="1" stopColor="#0284C7"/>
        </linearGradient>
        <linearGradient id={barId2} x1="155" y1="240" x2="155" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8"/>
          <stop offset="1" stopColor="#0284C7"/>
        </linearGradient>
        <linearGradient id={barId3} x1="195" y1="200" x2="195" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24"/>
          <stop offset="1" stopColor="#D97706"/>
        </linearGradient>
        <linearGradient id={barId4} x1="235" y1="180" x2="235" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24"/>
          <stop offset="1" stopColor="#D97706"/>
        </linearGradient>
        <linearGradient id={barId5} x1="275" y1="140" x2="275" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24"/>
          <stop offset="1" stopColor="#D97706"/>
        </linearGradient>
        <linearGradient id={arrowId} x1="80" y1="280" x2="300" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8"/>
          <stop offset="0.5" stopColor="#FDE047"/>
          <stop offset="1" stopColor="#F59E0B"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
