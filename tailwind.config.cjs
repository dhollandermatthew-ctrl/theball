/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{ts,tsx,js,jsx}"
    ],
    theme: {
      extend: {
        keyframes: {
          'task-flash': {
            '0%':   { boxShadow: '0 0 0 0 rgba(99,102,241,0.7)', backgroundColor: 'rgb(238 242 255)' },
            '40%':  { boxShadow: '0 0 0 6px rgba(99,102,241,0.2)', backgroundColor: 'rgb(238 242 255)' },
            '100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)', backgroundColor: 'transparent' },
          },
          'check-pop': {
            '0%':   { transform: 'scale(1)' },
            '35%':  { transform: 'scale(1.45)' },
            '65%':  { transform: 'scale(0.88)' },
            '100%': { transform: 'scale(1)' },
          },
          'check-ring': {
            '0%':   { opacity: '0.6', transform: 'scale(1)' },
            '100%': { opacity: '0',   transform: 'scale(2.4)' },
          },
          'particle-fly': {
            '0%':   { transform: 'translate(-50%, -50%) scale(1.2)', opacity: '1' },
            '70%':  { opacity: '1' },
            '100%': { transform: 'translate(calc(-50% + var(--tx, 0px)), calc(-50% + var(--ty, -50px))) scale(0.2)', opacity: '0' },
          },
        },
        animation: {
          'task-flash':   'task-flash 1.4s ease-out forwards',
          'check-pop':    'check-pop 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          'check-ring':   'check-ring 0.45s ease-out forwards',
          'particle-fly': 'particle-fly 0.75s ease-out forwards',
        },
      },
    },
    plugins: [],
  };