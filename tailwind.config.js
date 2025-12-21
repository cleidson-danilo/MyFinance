/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./transacoes.html",
    "./planejamento.html",
    "./cartoes.html",
    "./relatorios.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#db2777',
        secondary: '#fce7f3',
        dark: '#1e293b',
      }
    },
  },
  plugins: [],
}
