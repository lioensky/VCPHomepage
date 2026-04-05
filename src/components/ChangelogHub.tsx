import type {SiteDoc} from '../docs';

type ChangelogHubProps = {
  changelogs: SiteDoc[];
  onOpenDoc: (slug: string) => void;
};

export function ChangelogHub({changelogs, onOpenDoc}: ChangelogHubProps) {
  const latest = changelogs[0];
  const archives = changelogs.slice(1);

  return (
    <div className="glass-card p-6 md:p-8 rounded-[28px]">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-vcp-cyan mb-3">
            Changelog Hub
          </div>
          <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
            更新日志专区
          </h3>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
            这里集中管理所有标记为 <code>category: changelog</code> 的文档。适合维护版本发布记录、修复说明与功能迭代历史。
          </p>
        </div>
        <div className="text-sm text-gray-500">
          共 <span className="text-vcp-cyan font-mono">{changelogs.length}</span> 篇更新日志
        </div>
      </div>

      {latest ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] gap-6">
          <button
            type="button"
            onClick={() => onOpenDoc(latest.slug)}
            className="text-left rounded-[24px] border border-vcp-cyan/30 bg-vcp-cyan/8 p-6 hover:bg-vcp-cyan/12 transition-all"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-vcp-cyan mb-4">
              Latest Release
            </div>
            <h4 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
              {latest.title}
            </h4>
            <p className="text-gray-300 leading-relaxed mb-6">
              {latest.summary}
            </p>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-gray-400">
              <span>Updated</span>
              <span className="text-vcp-cyan">{latest.updatedAtLabel}</span>
            </div>
          </button>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.02] p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-vcp-purple mb-4">
              管理规范
            </div>
            <ul className="space-y-3 text-sm text-gray-400 leading-relaxed">
              <li>1. 文件统一放在 <code>src/docs</code> 目录</li>
              <li>2. Frontmatter 写明 <code>category: changelog</code></li>
              <li>3. 标题建议使用日期或版本号</li>
              <li>4. 使用 <code>summary</code> 简述本次核心变更</li>
              <li>5. 最近编辑的日志会自动排在最前面</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-gray-500">
          暂无更新日志文档。
        </div>
      )}

      {archives.length > 0 && (
        <div className="mt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500 mb-4">
            Archive
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archives.map((doc) => (
              <button
                key={doc.slug}
                type="button"
                onClick={() => onOpenDoc(doc.slug)}
                className="text-left rounded-[20px] border border-white/8 bg-white/[0.02] p-5 hover:border-vcp-purple/35 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h5 className="text-lg font-display font-bold text-white leading-tight">
                    {doc.title}
                  </h5>
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500 whitespace-nowrap">
                    Log
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  {doc.summary}
                </p>
                <div className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
                  {doc.updatedAtLabel}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}