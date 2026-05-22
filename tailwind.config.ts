import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                serif: ["DM Sans", "system-ui", "sans-serif"],
                sans: ["DM Sans", "system-ui", "sans-serif"],
                inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                heading: ["Abcfavoritvariable", "Arial", "ui-sans-serif", "system-ui", "sans-serif"],
                accent: ["Martinaplantijn", "cursive"],
            },
            colors: {
                ov: {
                    navy: "#0c1754",
                    electric: "#2545ff",
                    lilac: "#d9d4ff",
                    yellow: "#ffc13a",
                    offwhite: "#f9f8f6",
                    white: "#ffffff",
                    black: "#171417",
                    gray: "#222222",
                    cool: "#eaebf8",
                    border: "#cccccc",
                    orange: "#ff5b22",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar-background))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    primary: "hsl(var(--sidebar-primary))",
                    "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
                    accent: "hsl(var(--sidebar-accent))",
                    "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
                    border: "hsl(var(--sidebar-border))",
                    ring: "hsl(var(--sidebar-ring))",
                },
                oxford: {
                    blue: "hsl(var(--oxford-blue))",
                    gold: "hsl(var(--oxford-gold))",
                    cream: "hsl(var(--oxford-cream))",
                    dark: "hsl(var(--oxford-dark))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                "ov-card": "var(--radius-cards, 16px)",
                "ov-badge": "var(--radius-badges, 16px)",
                "ov-pill": "var(--radius-buttons, 100px)",
            },
            spacing: {
                "ov-8": "var(--spacing-8, 8px)",
                "ov-16": "var(--spacing-16, 16px)",
                "ov-24": "var(--spacing-24, 24px)",
                "ov-32": "var(--spacing-32, 32px)",
                "ov-40": "var(--spacing-40, 40px)",
                "ov-48": "var(--spacing-48, 48px)",
                "ov-64": "var(--spacing-64, 64px)",
                "ov-128": "var(--spacing-128, 128px)",
            },
            fontSize: {
                "ov-caption": ["12px", { lineHeight: "1.4" }],
                "ov-body-sm": ["14px", { lineHeight: "1.43" }],
                "ov-body": ["16px", { lineHeight: "1.6" }],
                "ov-subheading": ["20px", { lineHeight: "1.4" }],
                "ov-heading-sm": ["24px", { lineHeight: "1.1", letterSpacing: "-0.48px" }],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "slide-in-right": {
                    "0%": { opacity: "0", transform: "translateX(50px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.6s ease-out forwards",
                "slide-in-right": "slide-in-right 0.6s ease-out forwards",
            },
        },
    },
    plugins: [tailwindcssAnimate],
} satisfies Config;
