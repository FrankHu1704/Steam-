/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7fe",
          400: "#5b8def",
          500: "#2f66e0",
          600: "#1f4fc4",
          900: "#0a1628",
        },
      },
    },
  },
  plugins: [],
};
