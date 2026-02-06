'use client';

import React, { useRef, useState } from 'react';

interface SpotlightCardProps {
    children: React.ReactNode;
    className?: string;
    spotlightColor?: string;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
    children,
    className = '',
    spotlightColor = 'rgba(255, 255, 255, 0.2)'
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setSpotlightPos({ x: mouseX, y: mouseY });
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl transition-colors duration-500 ${className} ${isHovered ? 'border-white/20' : ''}`}
        >
            {/* Dynamic Spotlight Glow */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
                style={{
                    opacity: isHovered ? 1 : 0,
                    background: `radial-gradient(600px circle at ${spotlightPos.x}px ${spotlightPos.y}px, ${spotlightColor}, transparent 40%)`,
                }}
            />

            {/* Content Container */}
            <div className="relative z-10 h-full">
                {children}
            </div>
        </div>
    );
};

export default SpotlightCard;
