/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        farm: {
          green:        '#3B6D11',
          'green-mid':  '#639922',
          'green-light':'#EAF3DE',
          amber:        '#BA7517',
          'amber-mid':  '#EF9F27',
          'amber-light':'#FAEEDA',
          terra:        '#993C1D',
          'terra-light':'#FAECE7',
          ivory:        '#F5F3EE',
        }
      },
      fontFamily: {
        mono: ['ui-monospace','SFMono-Regular','Menlo','monospace'],
      }
    }
  },
  plugins: []
}
