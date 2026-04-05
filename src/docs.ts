export type LoadedDocModule = {
  default: string;
  metadata?: {
    mtimeMs?: number;
    frontmatter?: {
      title?: unknown;
      summary?: unknown;
      updatedAt?: unknown;
      category?: unknown;
    };
  };
};

export type SiteDocCategory = 'guide' | 'changelog' | 'note';

export type SiteDoc = {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
  updatedAtLabel: string;
  mtimeMs: number;
  content: string;
  category: SiteDocCategory;
};

const docModules = import.meta.glob<LoadedDocModule>('./docs/*.md', {
  eager: true,
}) as Record<string, LoadedDocModule>;

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(timestamp);
}

function normalizeCategory(value: unknown): SiteDocCategory {
  if (value === 'changelog' || value === 'note' || value === 'guide') {
    return value;
  }
  return 'guide';
}

export function getAllDocs(): SiteDoc[] {
  return Object.entries(docModules)
    .map(([path, module]) => {
      const content = module.default ?? '';
      const data = module.metadata?.frontmatter ?? {};
      const slug = path.split('/').pop()?.replace(/\.md$/, '') ?? 'untitled';
      const mtimeMs = module.metadata?.mtimeMs ?? 0;
      const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : slug;
      const summary =
        typeof data.summary === 'string' && data.summary.trim()
          ? data.summary.trim()
          : '暂未提供摘要。';
      const updatedAt =
        typeof data.updatedAt === 'string' && data.updatedAt.trim()
          ? data.updatedAt.trim()
          : new Date(mtimeMs || Date.now()).toISOString();
      const normalizedTimestamp = Date.parse(updatedAt) || mtimeMs || Date.now();

      return {
        slug,
        title,
        summary,
        updatedAt,
        updatedAtLabel: formatDate(normalizedTimestamp),
        mtimeMs: normalizedTimestamp,
        content,
        category: normalizeCategory(data.category),
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export function getDocsByCategory(category: SiteDocCategory): SiteDoc[] {
  return getAllDocs().filter((doc) => doc.category === category);
}