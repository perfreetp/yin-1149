/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#E8F3FF',
          100: '#B9D8FF',
          200: '#8ABEFF',
          300: '#5BA3FF',
          400: '#2C89FF',
          500: '#165DFF',
          600: '#0E42D2',
          700: '#0A2BA6',
          800: '#061B7A',
          900: '#030F4E',
        },
        danger: {
          50: '#FFECE8',
          100: '#FDCDC5',
          200: '#FBACA3',
          300: '#F98B81',
          400: '#F76B60',
          500: '#F53F3F',
          600: '#CB2634',
          700: '#A11229',
          800: '#77091F',
          900: '#4D0514',
        },
        success: {
          50: '#E8FFEA',
          100: '#B3FBB9',
          200: '#80F78D',
          300: '#4EF362',
          400: '#20ED3B',
          500: '#00B42A',
          600: '#009A2E',
          700: '#007D31',
          800: '#005F30',
          900: '#00422B',
        },
        warning: {
          50: '#FFF7E8',
          100: '#FFE7BA',
          200: '#FFD58B',
          300: '#FFC35C',
          400: '#FFB02E',
          500: '#FF7D00',
          600: '#D95A00',
          700: '#A33E00',
          800: '#6D2700',
          900: '#471800',
        },
        neutral: {
          50: '#F7F8FA',
          100: '#F2F3F5',
          200: '#E5E6EB',
          300: '#C9CDD4',
          400: '#86909C',
          500: '#4E5969',
          600: '#272E3B',
          700: '#1D2129',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        lg: '8px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        breathe: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 63, 63, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(245, 63, 63, 0)' },
        },
      },
    },
  },
  plugins: [],
};
