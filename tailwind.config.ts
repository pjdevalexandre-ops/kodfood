import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/componentes/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        loja: {
          DEFAULT: "var(--cor-loja, #B4412B)",
          hover: "var(--cor-loja-hover, #9A3623)",
          suave: "var(--cor-loja-suave, #F8EBE8)",
        },
        neutro: {
          fundo: "#FAF7F2",
          superficie: "#FFFFFF",
          borda: "#E7E2D9",
          bordaForte: "#D1CABE",
          texto: "#1C1917",
          secundario: "#66615B",
          suave: "#8C857B",
        },
      },
      fontFamily: {
        titulo: ["var(--font-titulo)", "Georgia", "serif"],
        corpo: ["var(--font-corpo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
