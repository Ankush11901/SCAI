import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ═══════════════════════════════════════════════════════════════════════
      // SCAI BRAND COLORS
      // ═══════════════════════════════════════════════════════════════════════
      colors: {
        scai: {
          // Background scale (dark to light)
          page: '#030303',
          card: '#0A0A0A',
          surface: '#111111',
          input: '#1A1A1A',
          
          // Border scale
          border: '#222222',
          'border-dim': '#1A1A1A',
          'border-bright': '#333333',
          
          // Text scale
          text: '#FFFFFF',
          'text-sec': '#A3A3A3',
          'text-muted': '#666666',
          
          // Brand colors (green gradient)
          brand1: '#40EDC3',  // Primary mint/teal
          brand2: '#7FFBA9',  // Secondary green
          brand3: '#D3F89A',  // Accent lime
        },
        
        // Semantic colors
        success: '#059669',
        error: '#dc2626',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // GRADIENTS (as background images)
      // ═══════════════════════════════════════════════════════════════════════
      backgroundImage: {
        'gradient-primary': 'linear-gradient(90.72deg, #40EDC3 0%, #7FFBA9 49.62%, #D3F89A 100%)',
        'gradient-secondary': 'linear-gradient(125deg, #222222 81.95%, #D3F89A 100%)',
        'glow-radial': 'radial-gradient(circle, rgba(64,237,195,0.5) 0%, rgba(127,251,169,0.3) 30%, rgba(211,248,154,0.1) 60%, transparent 80%)',
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // SHADOWS
      // ═══════════════════════════════════════════════════════════════════════
      boxShadow: {
        'glow': '0 0 30px -10px rgba(64, 237, 195, 0.25)',
        'glow-lg': '0 0 60px -20px rgba(64, 237, 195, 0.4)',
        'card': '0 20px 50px -10px rgba(0, 0, 0, 0.8)',
        'modal': '0 0 100px rgba(0, 0, 0, 1)',
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // TYPOGRAPHY
      // ═══════════════════════════════════════════════════════════════════════
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      
      fontSize: {
        'display': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // SPACING
      // ═══════════════════════════════════════════════════════════════════════
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // BORDER RADIUS
      // ═══════════════════════════════════════════════════════════════════════
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // ANIMATIONS
      // ═══════════════════════════════════════════════════════════════════════
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounce: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'overlay-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'dialog-in': {
          from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'dialog-out': {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        fadeIn: 'fadeIn 0.3s ease-out',
        pulse: 'pulse 2s ease-in-out infinite',
        bounce: 'bounce 1.4s infinite ease-in-out',
        'overlay-in': 'overlay-in 0.25s ease-out forwards',
        'overlay-out': 'overlay-out 0.2s ease-in forwards',
        'dialog-in': 'dialog-in 0.3s ease-out forwards',
        'dialog-out': 'dialog-out 0.2s ease-in forwards',
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // Z-INDEX
      // ═══════════════════════════════════════════════════════════════════════
      zIndex: {
        'dropdown': '10',
        'sticky': '20',
        'sidebar': '30',
        'modal': '40',
        'tooltip': '50',
        'toast': '60',
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // WIDTH / MAX-WIDTH
      // ═══════════════════════════════════════════════════════════════════════
      width: {
        'sidebar': '256px',
      },
      maxWidth: {
        'article': '800px',
      },
    },
  },
  plugins: [],
}

export default config

