import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608bfa',
          500: '#3b66f5',
          600: '#2547ea',
          700: '#1e37d6',
          800: '#1f2fad',
          900: '#1f2c89',
          950: '#171c54',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#0a0b0f',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-slate': 'linear-gradient(to right, rgb(148 163 184 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.08) 1px, transparent 1px)',
        'brand-gradient': 'linear-gradient(135deg, #3b66f5 0%, #7c3aed 50%, #ec4899 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(59,102,245,0.15) 0%, rgba(124,58,237,0.15) 50%, rgba(236,72,153,0.15) 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        blob: 'blob 10s infinite ease-in-out',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
