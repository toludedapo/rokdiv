/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        farm: {
          // Greens
          'forest':       '#0E1A0A',   // base bg
          'deep':         '#162010',   // card bg
          'mid':          '#1C2A14',   // card surface / inputs
          'border':       '#2D4020',   // borders
          'muted':        '#4A6336',   // muted text / labels
          'leaf':         '#7AB548',   // primary accent
          'lime':         '#9FD46A',   // light accent / positive text
          // Golds
          'gold':         '#E0A030',   // revenue / amounts
          'gold-light':   '#E8B75A',   // warm text
          'gold-dim':     '#B07820',   // dim gold
          // Reds
          'terra':        '#DC3C28',   // danger/debt
          'terra-light':  '#F07060',   // danger text
          'terra-dim':    'rgba(220,60,40,0.15)',
          // Neutrals
          'cream':        '#F0EDE8',   // body text
          'mist':         '#A8B8A0',   // secondary text
          'ghost':        '#6A806A',   // very muted
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'card':    '0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'elevated':'0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)',
        'glow':    '0 4px 14px rgba(122,181,72,0.35)',
        'gold-glow':'0 4px 14px rgba(224,160,48,0.3)',
      }
    }
  },
  plugins: []
}
