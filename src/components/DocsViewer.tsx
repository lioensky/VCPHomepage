import {useEffect, useMemo, useRef} from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';

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

type MermaidBlockProps = {
  chart: string;
};

function MermaidBlock({chart}: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = useMemo(() => `mermaid-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    let disposed = false;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });

    async function renderChart() {
      if (!containerRef.current) {
        return;
      }

      try {
        const {svg} = await mermaid.render(renderId, chart);
        if (!disposed && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        if (!disposed && containerRef.current) {
          containerRef.current.innerHTML = `<pre class="mermaid-error">${String(error)}</pre>`;
        }
      }
    }

    renderChart();

    return () => {
      disposed = true;
    };
  }, [chart, renderId]);

  return <div ref={containerRef} className="mermaid-diagram" />;
}

function extractCode(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map(extractCode).join('');
  }

  if (children && typeof children === 'object' && 'props' in children) {
    return extractCode((children as {props?: {children?: React.ReactNode}}).props?.children ?? '');
  }

  return '';
}

export function DocsViewer({documents, activeSlug, onSelect}: DocsViewerProps) {
  const activeDoc = documents.find((doc) => doc.slug === activeSlug) ?? documents[0];

  if (!activeDoc) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-8">
      <aside className="glass-card p-4 md:p-6 xl:sticky xl:top-28 h-fit">
        <div className="mb-6">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-vcp-cyan mb-3">
            Auto Imported Docs
          </div>
          <h3 className="text-2xl font-display font-bold text-white">
            文档分页
          </h3>
          <p className="text-sm text-gray-400 mt-3 leading-relaxed">
            只需向 <code>src/docs</code> 目录添加 Markdown 文档，即可自动接入首页文档中心，并按最后编辑时间排序。
          </p>
        </div>

        <div className="space-y-3">
          {documents.map((doc) => {
            const isActive = doc.slug === activeDoc.slug;
            return (
              <button
                key={doc.slug}
                type="button"
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

        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex, rehypeSlug]}
          components={{
            code({className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match?.[1];
              const content = extractCode(children).trim();

              if (language === 'mermaid') {
                return <MermaidBlock chart={content} />;
              }

              const isInline = !className;
              if (isInline) {
                return (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            a({href, children, ...props}) {
              return (
                <a href={href} target="_blank" rel="noreferrer" {...props}>
                  {children}
                </a>
              );
            },
          }}
        >
          {activeDoc.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}