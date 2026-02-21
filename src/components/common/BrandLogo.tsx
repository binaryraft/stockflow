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
                className="w-full h-full drop-shadow-2xl overflow-visible"
            >
                <defs>
                    {/* Royal Black Metallic Gradient for the 'E' */}
                    <linearGradient id="blackMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1a1a1a" />
                        <stop offset="50%" stopColor="#000000" />
                        <stop offset="100%" stopColor="#333333" />
                    </linearGradient>

                    {/* Mesmerizing Emerald Gradient for the 'C' */}
                    <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2e7d32" /> {/* Dark Green */}
                        <stop offset="50%" stopColor="#1B854A" /> {/* User's Green */}
                        <stop offset="100%" stopColor="#a5d6a7" /> {/* Light Shine */}
                    </linearGradient>

                    {/* Gold Filigree Line */}
                    <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ffd700" />
                        <stop offset="50%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#ffd700" />
                    </linearGradient>

                    <filter id="nanoGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <filter id="emeraldAura" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="glow" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0.1   0 0 0 0 0.52   0 0 0 0 0.29   0 0 0 0.4 0" />
                    </filter>
                </defs>

                {/* The "E" Structure - Optimized from Image geometry */}
                <g filter="url(#nanoGlow)">
                    {/* The Black 'E' Body */}
                    <path
                        d="M20 2 Q10 2 5 15 V85 L20 100 V95 Q20 80 20 80 H20 V75 H20 V25 H95 V2 H20 Z M20 40 H50 V55 H20 V40 Z"
                        fill="url(#blackMetallic)"
                        className="logo-e transition-all duration-500"
                    />

                    {/* The Green Inverted 'C' Body */}
                    <g filter="url(#emeraldAura)">
                        <path
                            d="M95 95 H25 V80 H80 V50 Q80 35 60 35 Q45 35 45 55 V70 H70 V60 H55 V55 Q55 45 60 45 Q65 45 65 55 V80 H95 V95 Z"
                            fill="url(#emeraldGradient)"
                            className="logo-c animate-pulse-subtle"
                        />
                    </g>

                    {/* Refined Gold Filigree Accent on the 'E' top edge */}
                    <path
                        d="M20 2 H95"
                        stroke="url(#goldLine)"
                        strokeWidth="1"
                        strokeLinecap="round"
                    />

                    {/* Mesmerizing Sparkle point */}
                    <circle cx="92" cy="7" r="1.5" fill="white">
                        <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
                    </circle>
                </g>

                <style jsx>{`
                    .logo-e:hover {
                        filter: brightness(1.3);
                        transform: translate(-1px, -1px);
                    }
                    .logo-c {
                        transition: filter 0.3s ease;
                    }
                    div:hover .logo-c {
                        filter: brightness(1.2) drop-shadow(0 0 8px #1B854A);
                    }
                    @keyframes pulse-subtle {
                        0%, 100% { filter: brightness(1); }
                        50% { filter: brightness(1.1); }
                    }
                    .animate-pulse-subtle {
                        animation: pulse-subtle 4s ease-in-out infinite;
                    }
                `}</style>
            </svg>
        </div>
    );
}
