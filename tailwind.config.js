/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
            },
            colors: {
                'primary': '#1675F2',   // Blue (Brand)
                'secondary': '#F2E96D', // Yellow (Accent)
                'light-bg': '#F1F2F0',  // Off-white
                'dark-text': '#566873', // Dark Grey
                'medium-text': '#6B7C88', // Computed lighter grey based on dark-text
                'light-text': '#3084F2',  // Lighter Blue (Secondary Brand)
            },
        },
    },
    plugins: [],
}
