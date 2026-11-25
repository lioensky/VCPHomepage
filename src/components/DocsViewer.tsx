import {isValidElement, memo, type ReactNode} from 'react';
import ReactMarkdown, {type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import {normalizeMarkdownMath} from '../markdownMath';
import {useMermaidDiagram} from './useMermaidDiagram';

export type DocItem = {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
  updatedAtLabel: string;
  mtimeMs: number;
  content: string;
};

type DocsViewerProps = {
  documents: DocItem[];
  activeSlug: string;
  onSelect: (slug: string) => void;
};

function MermaidBlock({chart}: {chart: string}) {
  const {canvasRef, error} = useMermaidDiagram(chart);

  return (
    <div className="mermaid-diagram">
      <div ref={canvasRef} hidden={error !== undefined} />
      {error !== undefined && (
        <div className="mermaid-error" role="status">
          图表暂无法显示
          <details><summary>查看图表源码</summary><pre>{chart}</pre></details>
        </div>
      )}
    </div>
  );
}

const docMarkdownComponents: Components = {
  pre({node, children, ...props}) {
    if (isValidElement<{className?: string; children?: ReactNode}>(children) &&
        children.props.className?.split(/\s+/).includes('language-mermaid') &&
        typeof children.props.children === 'string') {
      return <MermaidBlock chart={children.props.children.trim()} />;
    }
    return <pre {...props}>{children}</pre>;
  },
  code({node, className, children, ...props}) {
    const isInline = !className && !String(children).includes('\n') &&
      node?.position?.start.line === node?.position?.end.line;
    return <code className={isInline ? 'inline-code' : className} {...props}>{children}</code>;
  },
  a({node, href, children, ...props}) {
    return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
  },
};

const DocMarkdown = memo(function DocMarkdown({content}: {content: string}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex, rehypeSlug]}
      components={docMarkdownComponents}
    >
      {normalizeMarkdownMath(content)}
    </ReactMarkdown>
  );
});

export function DocsViewer({documents, activeSlug, onSelect}: DocsViewerProps) {
  const activeDoc = documents.find((doc) => doc.slug === activeSlug) ?? documents[0];

  if (!activeDoc) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-8">
      <aside className="glass-card docs-sidebar p-4 md:p-6 xl:sticky xl:top-28">
        <div className="mb-6">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-vcp-cyan mb-3">
            THE OPEN ARCHIVE
          </div>
          <h3 className="text-2xl font-display font-bold text-white">
            藏书目录
          </h3>
          <p className="text-sm text-gray-400 mt-3 leading-relaxed">
            从入门指引到工程原理，循目录展开一卷。文档按最近更新时间排列，记录仍在继续。
          </p>
        </div>

        <div className="docs-sidebar-list space-y-3">
          {documents.map((doc) => {
            const isActive = doc.slug === activeDoc.slug;
            return (
              <button
                key={doc.slug}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(doc.slug)}
                className={`w-full text-left rounded-2xl border px-4 py-4 transition-all ${
                  isActive
                    ? 'border-vcp-cyan/50 bg-vcp-cyan/10 shadow-[0_0_20px_rgba(0,242,255,0.08)]'
                    : 'border-white/8 bg-white/[0.02] hover:border-vcp-purple/40 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="font-display font-bold text-white text-lg leading-tight">
                    {doc.title}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500 whitespace-nowrap">
                    {isActive ? 'OPEN' : 'DOC'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                  {doc.summary}
                </p>
                <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-gray-500">
                  Updated {doc.updatedAtLabel}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <article className="glass-card p-6 md:p-10 doc-reader">
        <header className="border-b border-white/8 pb-6 mb-8">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-vcp-purple mb-3">
            {activeDoc.slug}
          </div>
          <h3 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
            {activeDoc.title}
          </h3>
          <p className="text-gray-400 text-base md:text-lg max-w-3xl leading-relaxed">
            {activeDoc.summary}
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-gray-400">
            <span>Last Updated</span>
            <span className="text-vcp-cyan">{activeDoc.updatedAtLabel}</span>
          </div>
        </header>

        <DocMarkdown key={activeDoc.slug} content={activeDoc.content} />
      </article>
    </div>
  );
}