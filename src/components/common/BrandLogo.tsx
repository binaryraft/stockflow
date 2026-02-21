"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
    className?: string;
    size?: number;
}

/**
 * EC BILLS - LUXURY MINIMAL LOGO
 * Concept: A minimalist, continuous-line 'E' that curves into a 'C', 
 * symbolizing the flow of commerce and infinite business growth.
 */
export function BrandLogo({ className, size = 40 }: BrandLogoProps) {
    return (
        <div
            className={cn("relative flex items-center justify-center group", className)}
            style={{ width: size, height: size }}
        >
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full overflow-visible"
            >
                <defs>
                    {/* Ultra-Luxury Gold Gradient */}
                    <linearGradient id="luxuryGold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#D4AF37" /> {/* Metallic Gold */}
                        <stop offset="50%" stopColor="#F9E076" /> {/* Bright Gold Shine */}
                        <stop offset="100%" stopColor="#996515" /> {/* Golden Brown Shadow */}
                    </linearGradient>

                    {/* Subtle Emerald Glow for the intersection */}
                    <radialGradient id="emeraldMist" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#1B854A" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#1B854A" stopOpacity="0" />
                    </radialGradient>

                    <filter id="royalGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* The "E-C Flow" Symbol */}
                <g filter="url(#royalGlow)">
                    {/* Minimalist 'E' forming the outer frame */}
                    <path
                        d="M85 25 H25 V75 H85 M25 50 H65"
                        stroke="url(#luxuryGold)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="logo-base transition-all duration-700"
                    />

                    {/* The 'C' curve nested elegantly within the 'E' */}
                    <path
                        d="M75 35 Q55 35 55 50 Q55 65 75 65"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.6"
                        className="logo-accent transition-all duration-700"
                    />

                    {/* A single Emerald diamond at the heart of the 'E' */}
                    <rect
                        x="18" y="46" width="8" height="8"
                        fill="#1B854A"
                        transform="rotate(45 22 50)"
                        className="animate-sparkle"
                    />
                </g>

                {/* Ambient Aura */}
                <circle cx="50" cy="50" r="40" fill="url(#emeraldMist)" />

            </svg>

            <style jsx>{`
                .logo-base {
                    stroke-dasharray: 200;
                    stroke-dashoffset: 0;
                }
                div:hover .logo-base {
                    stroke: white;
                    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
                    transform: scale(1.05);
                }
                div:hover .logo-accent {
                    stroke: #D4AF37;
                    opacity: 1;
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 0.6; transform: rotate(45deg) scale(1); }
                    50% { opacity: 1; transform: rotate(45deg) scale(1.2); }
                }
                .animate-sparkle {
                    animation: sparkle 3s ease-in-out infinite;
                    transform-origin: center;
                }
            `}</style>
        </div>
    );
}
