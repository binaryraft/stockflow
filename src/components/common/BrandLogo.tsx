"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
    className?: string;
    size?: number;
}

export function BrandLogo({ className, size = 40 }: BrandLogoProps) {
    return (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: size, height: size }}
        >
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-xl"
            >
                <defs>
                    {/* Main Diamond Gradient */}
                    <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#004d40" /> {/* Deep Emerald Green */}
                        <stop offset="50%" stopColor="#00c853" /> {/* Royal Emerald */}
                        <stop offset="100%" stopColor="#004d40" />
                    </linearGradient>

                    {/* Blue Accent Gradient */}
                    <linearGradient id="blueAccent" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2962ff" /> {/* Royal Blue */}
                        <stop offset="100%" stopColor="#0039cb" />
                    </linearGradient>

                    {/* Gold highlight */}
                    <linearGradient id="goldEdge" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ffd600" />
                        <stop offset="100%" stopColor="#ffab00" />
                    </linearGradient>

                    <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* The Diamond Silhouette */}
                {/* Left Side: 'E' */}
                <path
                    d="M50 10 L20 50 L50 90 V75 H35 V60 H45 V50 H35 V35 H50 Z"
                    fill="url(#diamondGradient)"
                />

                {/* Right Side: 'C' (Mirrored side of diamond) */}
                <path
                    d="M50 10 L80 50 L50 90 V75 C65 75 70 65 70 50 C70 35 65 25 50 25 V10 Z"
                    fill="url(#blueAccent)"
                />

                {/* Center Vertical "Facet" / Shine */}
                <rect x="49" y="10" width="2" height="80" fill="url(#goldEdge)" opacity="0.6" />

                {/* Top & Bottom Sparkle Points */}
                <circle cx="50" cy="10" r="1.5" fill="#ffffff" />
                <circle cx="50" cy="90" r="1.5" fill="#ffffff" />

                {/* Floating Facets for extra 'Diamond' depth */}
                <path
                    d="M50 25 L65 40 L50 55 Z"
                    fill="white"
                    fillOpacity="0.1"
                />
                <path
                    d="M50 75 L65 60 L50 45 Z"
                    fill="white"
                    fillOpacity="0.05"
                />
            </svg>

            <style jsx>{`
        svg {
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
          transition: transform 0.3s ease;
        }
        div:hover svg {
          transform: scale(1.05) rotate(2deg);
        }
      `}</style>
        </div>
    );
}
