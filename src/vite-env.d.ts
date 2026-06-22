/// <reference types="vite/client" />

declare module '*.md' {
  export const metadata: {
    mtimeMs?: number;
    frontmatter?: Record<string, unknown>;
  };
  const content: string;
  export default content;
}