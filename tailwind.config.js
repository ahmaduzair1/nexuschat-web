/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          primary: '#00C896',
          glow: '#00FFB2',
          dark: '#00A67E',
          subtle: '#0A3D2E',
        },
        navy: {
          bg: '#0A0E1A',
        },
        graphite: {
          surface: '#141926',
          light: '#1E2436',
          elevated: '#252B3B',
        },
        gold: {
          accent: '#FFD700',
          subtle: '#C9A84C',
          muted: '#8B7A3E',
        },
        silver: {
          text: '#E8ECF4',
          secondary: '#B0B8C9',
          muted: '#7A8599',
          faint: '#4A5168',
        },
        error: {
          red: '#FF4B6E',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
        emerald: '0 0 24px rgba(0, 200, 150, 0.25)',
      },
      backgroundImage: {
        'emerald-grad': 'linear-gradient(135deg, #00A67E, #00C896, #00FFB2)',
        'story-ring': 'linear-gradient(135deg, #00FFB2, #00C896, #FFD700)',
        'surface-grad': 'linear-gradient(180deg, #141926, #0A0E1A)',
      },
    },
  },
  plugins: [],
};
