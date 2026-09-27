import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./kit/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
