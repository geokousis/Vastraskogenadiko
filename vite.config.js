import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function githubPagesBase() {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (!repo) return '/';
  if (repo.endsWith('.github.io')) return '/';
  return `/${repo}/`;
}

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? githubPagesBase() : '/'
});
