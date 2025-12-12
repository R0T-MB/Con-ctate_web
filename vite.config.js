// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // El bloque de viteStaticCopy ha sido eliminado porque ya no es necesario.
    // Las redirecciones ahora se gestionan a través de netlify.toml
  ],
})