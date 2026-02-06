'use client';

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface CountUpProps {
    to: number;
    from?: number;
    direction?: "up" | "down";
    delay?: number;
    duration?: number; // duration in seconds
    className?: string;
    startWhen?: boolean;
    separator?: string;
    decimals?: number;
    decimal?: string;
    onStart?: () => void;
    onEnd?: () => void;
    once?: boolean;
}

export default function CountUp({
    to,
    from = 0,
    direction = "up",
    delay = 0,
    duration = 2,
    className = "",
    startWhen = true,
    separator = ",",
    decimals = 0,
    decimal = ".",
    onStart,
    onEnd,
    once = true,
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? to : from);

    // Calculate damping and stiffness based on duration for a smooth effect
    const damping = 20 + duration * 2;
    const stiffness = 100;

    const springValue = useSpring(motionValue, {
        damping,
        stiffness,
    });

    const isInView = useInView(ref, { margin: "0px", once });

    useEffect(() => {
        if (isInView && startWhen) {
            if (typeof onStart === "function") onStart();

            const timeoutId = setTimeout(() => {
                motionValue.set(direction === "down" ? from : to);
            }, delay * 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
            if (ref.current) {
                const options = {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                };

                const formattedNumber = Intl.NumberFormat("en-IN", options).format(
                    Number(latest.toFixed(decimals))
                );

                let displayValue = formattedNumber;

                if (separator !== ",") {
                    displayValue = displayValue.split(",").join(separator);
                }

                if (decimal !== ".") {
                    displayValue = displayValue.replace(".", decimal);
                }

                ref.current.textContent = displayValue;
            }

            if (latest === (direction === "down" ? from : to)) {
                if (typeof onEnd === "function") onEnd();
            }
        });
    }, [springValue, decimals, separator, decimal, direction, from, to, onEnd]);

    return <span className={className} ref={ref} />;
}
