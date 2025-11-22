// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './frontend/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './frontend/components/**/*.{js,ts,jsx,tsx,mdx}',
    './frontend/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config