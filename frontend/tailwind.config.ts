import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    200: '#fecdd3',
                    300: '#fda4af',
                    400: '#fb7185',
                    500: '#f43f5e',
                    600: '#e11d48',
                    700: '#be123c',
                    800: '#9f1239',
                    900: '#881337',
                    950: '#4c0519',
                },
                dark: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#E91E63',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px rgb(244 63 94 / 0.4), 0 0 20px rgb(244 63 94 / 0.2)' },
                    '100%': { boxShadow: '0 0 10px rgb(244 63 94 / 0.6), 0 0 40px rgb(244 63 94 / 0.3)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            },
            animation: {
                glow: 'glow 2s ease-in-out infinite alternate',
                float: 'float 3s ease-in-out infinite',
            }
        },
    },
    plugins: [],
};

export default config;
