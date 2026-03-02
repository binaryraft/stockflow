"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface BrandLogoProps {
    className?: string;
    size?: number;
    /** If true, shows a glowing ring animation around the logo */
    glow?: boolean;
}

/**
 * ECBills Brand Logo - Uses the custom inverted-C negative-space-E design.
 * Scalable and embedded with premium animation effects.
 */
export function BrandLogo({ className, size = 40, glow = false }: BrandLogoProps) {
    return (
        <div
            className={cn(
                "relative flex items-center justify-center shrink-0",
                glow && "ecbills-logo-glow",
                className
            )}
            style={{ width: size, height: size }}
        >
            {/* Ambient glow ring - shown when glow=true */}
            {glow && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full pointer-events-none"
                />
            )}

            {/* The actual logo SVG - upscaled clean 2D E mark */}
            <Image
                src="/logo.svg"
                alt="ECBills Logo"
                width={size}
                height={size}
                className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(34,197,94,0.45)] transition-transform duration-300 hover:scale-110"
                priority
            />
        </div>
    );
}
