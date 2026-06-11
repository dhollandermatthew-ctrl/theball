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
        },
        animation: {
          'task-flash': 'task-flash 1.4s ease-out forwards',
        },
      },
    },
    plugins: [],
  };