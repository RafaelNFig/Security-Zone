/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // Diz ao Tailwind para escanear a página principal
    "./index.html", 
    // Diz ao Tailwind para escanear todos os arquivos de componente na pasta src/
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}