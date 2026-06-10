import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8f0f9',
          100: '#c5d8ef',
          200: '#9fbfe4',
          300: '#79a5d9',
          400: '#5991d1',
          500: '#185FA5',
          600: '#145494',
          700: '#104880',
          800: '#0c3c6d',
          900: '#082f58',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
