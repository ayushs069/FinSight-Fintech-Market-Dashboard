/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kotakBlue: "#0C1A33",
        kotakRed: "#E60026",
      },
    },
  },
  plugins: [],
};
