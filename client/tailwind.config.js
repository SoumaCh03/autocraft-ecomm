/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          500: '#3b6bff',
          600: '#2952e3',
          700: '#1a3abf',
          900: '#0d1f6b',
        },
        accent: {
          400: '#00d4ff',
          500: '#00b8e6',
        },
        dark: {
          bg:      '#080c14',
          card:    '#0e1422',
          border:  '#1a2236',
          text:    '#e8eaf0',
          muted:   '#94a3b8',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'glow':        'glow 2s ease-in-out infinite alternate',
        'slide-up':    'slideUp 0.5s ease-out',
        'fade-in':     'fadeIn 0.6s ease-out',
        'marquee':     'marquee 30s linear infinite',
      },
      keyframes: {
        float:    { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
        glow:     { from: { boxShadow: '0 0 20px #3b6bff33' }, to: { boxShadow: '0 0 40px #3b6bff88' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        marquee:  { '0%': { transform: 'translateX(0%)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(59,107,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,107,255,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      }
    },
  },
  plugins: [],
}
