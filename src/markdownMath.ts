const fencedCodeBlockPattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
const inlineCodePattern = /(`+[^`]*?`+)/g;

function normalizeMathInText(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) => `$$${expression}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression: string) => `$${expression}$`);
}

function normalizeOutsideInlineCode(segment: string): string {
  return segment
    .split(inlineCodePattern)
    .map((part, index) => index % 2 === 1 ? part : normalizeMathInText(part))
    .join('');
}

/**
 * Converts standard LaTeX delimiters to remark-math delimiters while leaving
 * fenced and inline code untouched.
 *
 * Supported input:
 * - \[ display math \] -> $$ display math $$
 * - \( inline math \)  -> $ inline math $
 */
export function normalizeMarkdownMath(markdown: string): string {
  return markdown
    .split(fencedCodeBlockPattern)
    .map((segment, index) => index % 2 === 1 ? segment : normalizeOutsideInlineCode(segment))
    .join('');
}