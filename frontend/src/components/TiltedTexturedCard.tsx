'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltedTexturedCardProps {
    children: React.ReactNode;
    className?: string;
    spotlightColor?: string;
}

const TiltedTexturedCard: React.FC<TiltedTexturedCardProps> = ({
    children,
    className = '',
    spotlightColor = 'rgba(255, 255, 255, 0.2)'
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Mouse position within the card for the tilt effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth springs for rotation
    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    // Tilt transformation
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

    // Mouse position within the card for the spotlight effect
    const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Relative mouse position for tilt (-0.5 to 0.5)
        const xPct = (mouseX / width) - 0.5;
        const yPct = (mouseY / height) - 0.5;

        x.set(xPct);
        y.set(yPct);

        // Pixel position for spotlight
        setSpotlightPos({ x: mouseX, y: mouseY });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    return (
        <div className="perspective-1000 w-full h-full">
            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={handleMouseLeave}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                className={`relative h-full overflow-hidden rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl transition-colors duration-500 ${className} ${isHovered ? 'border-white/20' : ''}`}
            >
                {/* Grainy Texture Overlay */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* Dynamic Spotlight Glow */}
                <div
                    className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
                    style={{
                        opacity: isHovered ? 1 : 0,
                        background: `radial-gradient(600px circle at ${spotlightPos.x}px ${spotlightPos.y}px, ${spotlightColor}, transparent 40%)`,
                    }}
                />

                {/* Content Container (lifts off slightly for 3D depth) */}
                <div style={{ transform: "translateZ(50px)" }} className="relative z-10 h-full">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

export default TiltedTexturedCard;
