/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0a0a0f', // Deep dark
                primary: '#bf00ff', // Neon Purple
                secondary: '#ff00aa', // Neon Pink
                accent: '#00ffff', // Cyan
                surface: '#12121a', // Slightly lighter dark for cards
                'surface-highlight': '#1a1a24',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Orbitron', 'sans-serif'],
            },
            boxShadow: {
                'neon-purple': '0 0 10px #bf00ff, 0 0 20px #bf00ffaa',
                'neon-pink': '0 0 10px #ff00aa, 0 0 20px #ff00aaaa',
                'neon-accent': '0 0 10px #00ffff, 0 0 20px #00ffffaa',
            }
        },
    },
    plugins: [],
}
