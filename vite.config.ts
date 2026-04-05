import fs from 'fs';
import matter from 'gray-matter';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';

function markdownMetadataPlugin(): Plugin {
  return {
    name: 'markdown-metadata-plugin',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.md')) {
        return null;
      }

      const [filepath] = id.split('?');
      const stats = fs.statSync(filepath);
      const {data, content} = matter(code);
      const metadata = {
        mtimeMs: stats.mtimeMs,
        frontmatter: data,
      };

      return {
        code: `export const metadata = ${JSON.stringify(metadata)};\nexport default ${JSON.stringify(content)};`,
        map: null,
      };
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [markdownMetadataPlugin(), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
