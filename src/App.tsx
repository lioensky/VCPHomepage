import {motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate} from "motion/react";
import {
  Cpu,
  Brain,
  Network,
  Zap,
  Github,
  Terminal,
  Shield,
  Clock,
  Sparkles,
  Search,
  Music,
  Monitor,
  ExternalLink,
  BookOpen,
  ArrowLeft,
  Orbit,
  Stars,
  Sun,
  Coffee,
  FlaskConical,
  MessageCircle,
  Tv,
  Users,
  Moon,
  Heart,
  Newspaper,
} from "lucide-react";
import {useEffect, useMemo, useRef, useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import {NeuralNetwork} from "./components/NeuralNetwork";
import {DocsViewer} from "./components/DocsViewer";
import {getAllDocs} from "./docs";
import whitepaperV3Content, {metadata as whitepaperV3Metadata} from "./docs/vcp-whitepaper-v3.md";

const FeatureCard = ({icon: Icon, title, description, delay = 0}: {icon: any; title: string; description: string; delay?: number}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true}}
      transition={{duration: 0.5, delay}}
      onMouseMove={handleMouseMove}
      className="glass-card p-8 hover:bg-white/[0.05] transition-all group relative overflow-hidden"
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(0, 242, 255, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={80} />
      </div>
      <div className="w-12 h-12 rounded-xl bg-vcp-purple/20 flex items-center justify-center mb-6 text-vcp-cyan group-hover:scale-110 transition-transform relative z-10">
        <Icon size={24} />
      </div>
      <h3 className="text-2xl font-display font-bold mb-3 text-white group-hover:text-vcp-cyan transition-colors relative z-10">{title}</h3>
      <p className="text-gray-400 leading-relaxed font-sans relative z-10">{description}</p>
    </motion.div>
  );
};

const LifeCard = ({time, icon: Icon, title, description, color, delay = 0}: {time: string; icon: any; title: string; description: string; color: string; delay?: number}) => (
  <motion.div
    initial={{opacity: 0, x: 20}}
    whileInView={{opacity: 1, x: 0}}
    viewport={{once: true}}
    transition={{duration: 0.6, delay}}
    whileHover={{scale: 1.03, x: 8}}
    className="life-timeline-item relative"
  >
    <div className="life-timeline-dot" style={{backgroundColor: color, boxShadow: `0 0 20px ${color}`}} />
    <div className="glass-card p-6 ml-8 border-l-4 hover:bg-white/[0.06] transition-all group" style={{borderLeftColor: color}}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: `${color}20`}}>
          <Icon size={20} style={{color}} />
        </div>
        <span className="font-mono text-xs tracking-widest opacity-50">{time}</span>
      </div>
      <h4 className="text-xl font-display font-bold mb-2 text-white group-hover:text-vcp-cyan transition-colors">{title}</h4>
      <p className="text-sm text-gray-400 font-sans leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

type WhitepaperSection = {
  id: string;
  title: string;
  content: string;
};

type ChangelogEntry = {
  id: string;
  date: string;
  title: string;
  content: string;
};

type ChangelogMonth = {
  id: string;
  label: string;
  count: number;
};

type PageMeta = {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
};

type WikiCockpitTarget = {
  id: "backend" | "frontend";
  title: string;
  subtitle: string;
  url: string;
  accent: "cyan" | "purple";
};

function setMetaAttribute(selector: string, attribute: "content" | "href", value: string) {
  const node = document.head.querySelector(selector);
  if (node) {
    node.setAttribute(attribute, value);
  }
}

function usePageMeta(meta: PageMeta, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.title = meta.title;
    setMetaAttribute('meta[name="description"]', "content", meta.description);
    setMetaAttribute('meta[name="keywords"]', "content", meta.keywords);
    setMetaAttribute('link[rel="canonical"]', "href", meta.canonical);
    setMetaAttribute('meta[property="og:title"]', "content", meta.ogTitle ?? meta.title);
    setMetaAttribute('meta[property="og:description"]', "content", meta.ogDescription ?? meta.description);
    setMetaAttribute('meta[property="og:url"]', "content", meta.ogUrl ?? meta.canonical);
    setMetaAttribute('meta[name="twitter:title"]', "content", meta.twitterTitle ?? meta.ogTitle ?? meta.title);
    setMetaAttribute('meta[name="twitter:description"]', "content", meta.twitterDescription ?? meta.ogDescription ?? meta.description);
  }, [enabled, meta]);
}

function slugifyWhitepaperTitle(title: string, index: number): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

  return normalized || `whitepaper-section-${index + 1}`;
}

function normalizeChangelogMonth(date: string): {id: string; label: string} {
  const isoMonthMatch = date.match(/(\d{4})-(\d{2})/);
  if (isoMonthMatch) {
    return {
      id: `month-${isoMonthMatch[1]}-${isoMonthMatch[2]}`,
      label: `${isoMonthMatch[1]}-${isoMonthMatch[2]}`,
    };
  }

  const yearMatch = date.match(/(\d{4})/);
  if (yearMatch) {
    return {
      id: `month-${yearMatch[1]}`,
      label: yearMatch[1],
    };
  }

  return {
    id: "month-archive",
    label: "Archive",
  };
}

function splitChangelogIntoEntries(markdown: string): ChangelogEntry[] {
  const headingMatches = [...markdown.matchAll(/^###\s+(.+)$/gm)];

  return headingMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < headingMatches.length ? headingMatches[index + 1].index ?? markdown.length : markdown.length;
    const rawTitle = match[1].trim();
    const [datePart, ...titleParts] = rawTitle.split("·").map((part) => part.trim());
    const title = titleParts.join(" · ") || rawTitle;
    const id = `changelog-${datePart.replace(/[^\p{L}\p{N}]+/gu, "-")}-${index}`;

    return {
      id,
      date: datePart,
      title,
      content: markdown.slice(start + match[0].length, end).trim(),
    };
  });
}

function getChangelogMonths(entries: ChangelogEntry[]): ChangelogMonth[] {
  const monthMap = new Map<string, ChangelogMonth>();

  entries.forEach((entry) => {
    const month = normalizeChangelogMonth(entry.date);
    const current = monthMap.get(month.id);
    if (current) {
      current.count += 1;
      return;
    }

    monthMap.set(month.id, {
      ...month,
      count: 1,
    });
  });

  return Array.from(monthMap.values());
}

function splitWhitepaperIntoSections(markdown: string): WhitepaperSection[] {
  const headingMatches = [...markdown.matchAll(/^##\s+(.+)$/gm)];

  if (headingMatches.length === 0) {
    return [
      {
        id: "whitepaper-full",
        title: "VCP 全景技术白皮书",
        content: markdown,
      },
    ];
  }

  const introEnd = headingMatches[0].index ?? 0;
  const introContent = markdown.slice(0, introEnd).trim();
  const sections: WhitepaperSection[] = [];

  if (introContent) {
    sections.push({
      id: "whitepaper-preface",
      title: "开篇与目录",
      content: introContent,
    });
  }

  headingMatches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < headingMatches.length ? headingMatches[index + 1].index ?? markdown.length : markdown.length;
    const title = match[1].trim();

    sections.push({
      id: slugifyWhitepaperTitle(title, index),
      title,
      content: markdown.slice(start, end).trim(),
    });
  });

  return sections;
}

const whitepaperMarkdownComponents = {
  code({className, children, ...props}: any) {
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
  a({href, children, ...props}: any) {
    return (
      <a href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

const wikiCockpitTargets: WikiCockpitTarget[] = [
  {
    id: "backend",
    title: "VCPToolBox WikiBot",
    subtitle: "Backend source cockpit · plugins / protocol / memory / runtime",
    url: "https://deepwiki.com/lioensky/VCPToolBox",
    accent: "cyan",
  },
  {
    id: "frontend",
    title: "VCPChat WikiBot",
    subtitle: "Frontend source cockpit · renderer / desktop / chat / apps",
    url: "https://deepwiki.com/lioensky/VCPChat",
    accent: "purple",
  },
];

const WikiCockpitModal = ({
  target,
  onClose,
  onSwitch,
}: {
  target: WikiCockpitTarget;
  onClose: () => void;
  onSwitch: (target: WikiCockpitTarget) => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const accentClass = target.accent === "cyan" ? "text-vcp-cyan border-vcp-cyan/30 bg-vcp-cyan/10" : "text-vcp-purple border-vcp-purple/30 bg-vcp-purple/10";

  useEffect(() => {
    setIsLoading(true);
  }, [target.url]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      className="wiki-cockpit-overlay"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      role="dialog"
      aria-modal="true"
      aria-label={`${target.title} cockpit`}
    >
      <button type="button" className="wiki-cockpit-backdrop" aria-label="关闭 Wiki 驾驶舱" onClick={onClose} />
      <motion.div
        className="wiki-cockpit-shell"
        initial={{opacity: 0, y: 32, scale: 0.96}}
        animate={{opacity: 1, y: 0, scale: 1}}
        transition={{duration: 0.28, ease: "easeOut"}}
      >
        <div className="wiki-cockpit-glow wiki-cockpit-glow-a" />
        <div className="wiki-cockpit-glow wiki-cockpit-glow-b" />
        <div className="wiki-cockpit-header">
          <div className="flex min-w-0 items-center gap-4">
            <div className={`wiki-cockpit-orb ${target.accent === "cyan" ? "wiki-cockpit-orb-cyan" : "wiki-cockpit-orb-purple"}`}>
              <MessageCircle size={22} />
            </div>
            <div className="min-w-0 text-left">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                DeepWiki Embedded Console
              </div>
              <h2 className="truncate text-2xl font-display font-bold text-white md:text-3xl">{target.title}</h2>
              <p className="mt-1 truncate text-xs text-gray-400 md:text-sm">{target.subtitle}</p>
            </div>
          </div>

          <div className="wiki-cockpit-actions">
            <div className="wiki-cockpit-tabs" role="tablist" aria-label="选择 Wiki 项目">
              {wikiCockpitTargets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === target.id}
                  onClick={() => onSwitch(item)}
                  className={`wiki-cockpit-tab ${item.id === target.id ? "wiki-cockpit-tab-active" : ""}`}
                >
                  {item.id === "backend" ? "Backend" : "Frontend"}
                </button>
              ))}
            </div>
            <a
              href={target.url}
              target="_blank"
              rel="noreferrer"
              className={`wiki-cockpit-external ${accentClass}`}
            >
              <ExternalLink size={16} />
              Open
            </a>
            <button type="button" className="wiki-cockpit-close" onClick={onClose} aria-label="关闭 Wiki 驾驶舱">
              ×
            </button>
          </div>
        </div>

        <div className="wiki-cockpit-statusbar">
          <span className="wiki-cockpit-live-dot" />
          <span>LIVE_SOURCE_QUERY_CHANNEL</span>
          <span className="hidden md:inline">IFRAME_SANDBOX_OFF · DEEPWIKI_ORIGIN</span>
          <span className="ml-auto hidden text-gray-500 md:inline">ESC TO CLOSE</span>
        </div>

        <div className="wiki-cockpit-frame-wrap">
          {isLoading && (
            <div className="wiki-cockpit-loader">
              <div className="wiki-cockpit-loader-ring" />
              <div>
                <div className="font-display text-xl font-bold text-white">Connecting WikiBot...</div>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-400">
                  正在把 DeepWiki 装载进 VCP 驾驶舱。如果目标站点禁止 iframe 嵌入，请使用右上角 Open 外部打开。
                </p>
              </div>
            </div>
          )}
          <iframe
            key={target.url}
            src={target.url}
            title={target.title}
            className="wiki-cockpit-frame"
            onLoad={() => setIsLoading(false)}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

const ChangelogPage = ({content}: {content: string}) => {
  const entries = useMemo(() => splitChangelogIntoEntries(content), [content]);
  const months = useMemo(() => getChangelogMonths(entries), [entries]);
  const latestEntry = entries[0];
  const meta = useMemo<PageMeta>(() => ({
    title: "VCP 更新日志 | Changelog Timeline",
    description: "VCP 更新日志时间线，按倒序记录 VCP-OS、VCPToolBox、VCPChat、VCPDesktop、OneRing、TagMemo、OpenHer、AgentAssistant、VCPSuperMail 等核心能力的真实演进。",
    keywords: "VCP 更新日志,VCP Changelog,VCP-OS,VCPToolBox,VCPChat,VCPDesktop,OneRing,TagMemo,OpenHer,AgentAssistant,VCPSuperMail,AGI Runtime",
    canonical: "https://www.vcptoolbox.com/changelog",
    ogTitle: "VCP 更新日志 · Changelog Timeline",
    ogDescription: "以华丽时间线方式回顾 VCP 从 AI 中间层到 AGI Runtime 的真实演进记录。",
    ogUrl: "https://www.vcptoolbox.com/changelog",
    twitterTitle: "VCP 更新日志 · Changelog Timeline",
    twitterDescription: "查看 VCP-OS、VCPToolBox、VCPChat 与 VCP 生态的完整更新轨迹。",
  }), []);

  usePageMeta(meta);

  return (
    <div className="relative min-h-screen overflow-hidden bg-vcp-black font-sans selection:bg-vcp-cyan selection:text-vcp-black">
      <div className="changelog-cosmos" />
      <NeuralNetwork />

      <nav className="fixed top-0 left-0 z-50 flex w-full items-center justify-between border-b border-white/5 bg-vcp-black/50 px-8 py-6 backdrop-blur-md">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vcp-purple neon-border">
            <Cpu className="text-vcp-cyan" size={24} />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter">VCP<span className="text-vcp-cyan">.OS</span></span>
        </a>
        <div className="flex items-center gap-3">
          <a
            href="/?page=learn-vcp"
            className="hidden md:inline-flex items-center gap-3 rounded-full border border-vcp-purple/30 bg-vcp-purple/10 px-5 py-2 font-display text-sm font-bold text-white transition-all hover:border-vcp-purple/60 hover:bg-vcp-purple/20"
          >
            <Sparkles size={18} className="text-vcp-purple" />
            LEARN VCP
          </a>
          <a
            href="/"
            className="group inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 font-display text-sm font-bold text-white transition-all hover:border-vcp-cyan/50 hover:bg-vcp-cyan/10"
          >
            <ArrowLeft size={18} className="text-vcp-cyan transition-transform group-hover:-translate-x-1" />
            BACK HOME
          </a>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 pt-36 md:px-8">
        <section className="sr-only" aria-label="VCP 更新日志页面摘要">
          <h1>VCP 更新日志 · Changelog Timeline</h1>
          <p>
            VCP 更新日志页面以时间线形式展示 VCP-OS、VCPToolBox、VCPChat、VCPDesktop、OneRing、
            TagMemo、OpenHer、AgentAssistant、PluginManager、VCPSuperMail 等模块的真实演进记录。
          </p>
        </section>

        <section className="mx-auto max-w-7xl pb-20 text-center">
          <motion.div
            initial={{opacity: 0, y: 24, scale: 0.96}}
            animate={{opacity: 1, y: 0, scale: 1}}
            transition={{duration: 0.8, ease: "easeOut"}}
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-vcp-cyan/20 bg-vcp-cyan/10 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-vcp-cyan"
          >
            <Clock size={14} />
            VCP Evolution Timeline
          </motion.div>

          <motion.h1
            initial={{opacity: 0, y: 36}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.9, delay: 0.15, ease: "easeOut"}}
            className="mx-auto max-w-5xl text-5xl font-display font-bold leading-[0.95] tracking-tighter text-white md:text-8xl"
          >
            CHANGE<span className="text-transparent bg-clip-text bg-gradient-to-r from-vcp-cyan via-white to-vcp-purple changelog-title-glow">LOG</span>
          </motion.h1>

          <motion.p
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 0.35}}
            className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-gray-400 md:text-xl"
          >
            以华丽时间线展开 VCP 从早期 AI 中间层到 AGI Runtime 的真实演进轨迹。每一次更新都是一次协议、记忆、前端应用群与 Agent 自主性的跃迁。
          </motion.p>

          <motion.div
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 0.55}}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-400">
              <Orbit size={16} className="text-vcp-purple" />
              {entries.length} Timeline Nodes
            </div>
            {latestEntry && (
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-400">
                <Zap size={16} className="text-vcp-cyan" />
                Latest {latestEntry.date}
              </div>
            )}
            <a
              href="#timeline"
              className="inline-flex items-center gap-3 rounded-full border border-vcp-cyan/20 bg-vcp-cyan/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vcp-cyan transition-all hover:border-vcp-cyan/60 hover:bg-vcp-cyan/20"
            >
              <Stars size={16} />
              Scroll Timeline
            </a>
          </motion.div>
        </section>

        <section id="timeline" className="changelog-reading-layout mx-auto max-w-7xl">
          <aside className="changelog-month-nav" aria-label="Changelog 月份跳转">
            <div className="changelog-month-nav-card">
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-vcp-cyan mb-3">
                Timeline Index
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-4">
                月份跳转
              </h2>
              <p className="text-sm leading-relaxed text-gray-400 mb-6">
                更新日志已改为左侧时间轴与月份索引。点击月份可快速跳转，正文统一在右侧连续阅读。
              </p>
              <div className="changelog-month-nav-list">
                {months.map((month) => (
                  <a key={month.id} href={`#${month.id}`} className="changelog-month-nav-link">
                    <span>{month.label}</span>
                    <strong>{month.count} updates</strong>
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div className="changelog-timeline">
            {entries.map((entry, index) => {
              const month = normalizeChangelogMonth(entry.date);
              const previousMonth = index > 0 ? normalizeChangelogMonth(entries[index - 1].date).id : "";
              const shouldRenderMonthAnchor = index === 0 || month.id !== previousMonth;

              return (
                <motion.article
                  key={entry.id}
                  id={entry.id}
                  initial={{opacity: 0, y: 36, scale: 0.98}}
                  whileInView={{opacity: 1, y: 0, scale: 1}}
                  viewport={{once: true, margin: "-80px"}}
                  transition={{duration: 0.6, ease: "easeOut"}}
                  className="changelog-entry"
                >
                  {shouldRenderMonthAnchor && (
                    <div id={month.id} className="changelog-month-marker">
                      {month.label}
                    </div>
                  )}
                  <div className="changelog-entry-node">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="changelog-entry-card doc-reader">
                    <div className="changelog-entry-meta">
                      <span>{entry.date}</span>
                      <span>{index === 0 ? "LATEST" : "UPDATE"}</span>
                    </div>
                    <h2>{entry.title}</h2>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex, rehypeSlug]}
                      components={whitepaperMarkdownComponents}
                    >
                      {entry.content}
                    </ReactMarkdown>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

const WhitepaperPage = () => {
  const updatedAt = useMemo(() => {
    const timestamp = whitepaperV3Metadata?.mtimeMs || Date.now();
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(timestamp);
  }, []);
  const whitepaperSections = useMemo(() => splitWhitepaperIntoSections(whitepaperV3Content), []);
  const chapterCount = Math.max(whitepaperSections.length - 1, 1);
  const meta = useMemo<PageMeta>(() => ({
    title: "Learn VCP | VCP Whitepaper V3",
    description: "Learn VCP 是 VCP-OS 官方技术白皮书页面，系统介绍 Variable & Command Protocol、VCPToolBox、VCPChat、VCPDesktop、OneRing、TagMemo 浪潮 V8、OpenHer、AgentAssistant 与 AGI Runtime 架构。",
    keywords: "Learn VCP,VCP Whitepaper,VCP 白皮书,VCP-OS,Variable Command Protocol,AGI Runtime,VCPToolBox,VCPChat,VCPDesktop,OneRing,TagMemo,OpenHer,AgentAssistant",
    canonical: "https://www.vcptoolbox.com/learn-vcp",
    ogTitle: "Learn VCP | VCP Whitepaper V3",
    ogDescription: "阅读 VCP 全景技术白皮书 V3，理解 VCP 如何从 AI 中间层演进为 AGI Runtime。",
    ogUrl: "https://www.vcptoolbox.com/learn-vcp",
  }), []);

  usePageMeta(meta);

  return (
    <div className="relative min-h-screen overflow-hidden bg-vcp-black font-sans selection:bg-vcp-cyan selection:text-vcp-black">
      <div className="whitepaper-cosmos" />
      <NeuralNetwork />

      <motion.div
        className="fixed inset-0 pointer-events-none z-0 opacity-60"
        initial={{opacity: 0}}
        animate={{opacity: 0.6}}
        transition={{duration: 1.2}}
      >
        <div className="absolute left-1/2 top-20 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-vcp-purple/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[34rem] w-[34rem] rounded-full bg-vcp-cyan/10 blur-[120px]" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-vcp-cyan/10"
          animate={{rotate: 360}}
          transition={{duration: 80, repeat: Infinity, ease: "linear"}}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[52vmin] w-[52vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-vcp-purple/15"
          animate={{rotate: -360}}
          transition={{duration: 56, repeat: Infinity, ease: "linear"}}
        />
      </motion.div>

      <nav className="fixed top-0 left-0 z-50 flex w-full items-center justify-between border-b border-white/5 bg-vcp-black/50 px-8 py-6 backdrop-blur-md">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vcp-purple neon-border">
            <Cpu className="text-vcp-cyan" size={24} />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter">VCP<span className="text-vcp-cyan">.OS</span></span>
        </a>
        <div className="flex items-center gap-3">
          <a
            href="/?page=changelog"
            className="hidden md:inline-flex items-center gap-3 rounded-full border border-vcp-cyan/25 bg-vcp-cyan/10 px-5 py-2 font-display text-sm font-bold text-white transition-all hover:border-vcp-cyan/60 hover:bg-vcp-cyan/20"
          >
            <Clock size={18} className="text-vcp-cyan" />
            CHANGELOG
          </a>
          <a
            href="/"
            className="group inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 font-display text-sm font-bold text-white transition-all hover:border-vcp-cyan/50 hover:bg-vcp-cyan/10"
          >
            <ArrowLeft size={18} className="text-vcp-cyan transition-transform group-hover:-translate-x-1" />
            BACK HOME
          </a>
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-24 pt-36 md:px-8">
        <section className="sr-only" aria-label="Learn VCP 页面摘要">
          <h1>Learn VCP · VCP 全景技术白皮书</h1>
          <p>
            Learn VCP 是 VCP-OS 官方技术白皮书页面，介绍 Variable & Command Protocol 如何从模型 API
            中间层演进为全栈自研的 AGI Runtime。页面内容覆盖 OneRing 统一上下文、VCPDesktop 桌面运行时、
            VCPMessageRenderer、TagMemo 浪潮 V8 语义记忆、Vexus/TDB 双栈检索、FlowInvite 自主心跳、
            AgentAssistant、OpenHer 情感引擎、分布式节点与人类-AI 共生生态。
          </p>
          <p>
            VCP 官方文档、VCP 白皮书、AI Agent 存在基础设施、永久记忆、
            自主工具调用、跨端连续意识和 AGI 运行时架构。
          </p>
        </section>
        <section className="mx-auto max-w-7xl pb-16 text-center">
          <motion.div
            initial={{opacity: 0, y: 24, scale: 0.96}}
            animate={{opacity: 1, y: 0, scale: 1}}
            transition={{duration: 0.8, ease: "easeOut"}}
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-vcp-cyan/20 bg-vcp-cyan/10 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-vcp-cyan"
          >
            <Stars size={14} />
            VCP Whitepaper V3 · AGI Runtime
          </motion.div>

          <motion.h1
            initial={{opacity: 0, y: 36}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.9, delay: 0.15, ease: "easeOut"}}
            className="mx-auto max-w-5xl text-5xl font-display font-bold leading-[0.95] tracking-tighter text-white md:text-8xl"
          >
            LEARN <span className="text-transparent bg-clip-text bg-gradient-to-r from-vcp-cyan via-white to-vcp-purple whitepaper-title-glow">VCP</span>
          </motion.h1>

          <motion.p
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 0.35}}
            className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-gray-400 md:text-xl"
          >
            用流动的星图、引力轨道与玻璃态阅读界面，重新展开 VCP 全景技术白皮书 V3：
            一个全栈自研的 AGI 运行时。
          </motion.p>

          <motion.div
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 0.55}}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-400">
              <Orbit size={16} className="text-vcp-purple" />
              Rendered Whitepaper
            </div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-400">
              <Clock size={16} className="text-vcp-cyan" />
              Updated {updatedAt}
            </div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-400">
              <BookOpen size={16} className="text-vcp-purple" />
              {whitepaperSections.length} Reading Pages
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{opacity: 0, y: 48}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.9, delay: 0.7, ease: "easeOut"}}
          className="whitepaper-paged-layout mx-auto"
        >
          <aside className="whitepaper-page-nav">
            <div className="whitepaper-page-nav-card">
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-vcp-cyan mb-3">
                Reading Pages
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-4">
                垂直分页目录
              </h2>
              <p className="text-sm leading-relaxed text-gray-400 mb-6">
                白皮书已按章节拆成独立卡片。向下滚动时，每一页都保留完整段落边界，减少长文压迫感。
              </p>
              <div className="whitepaper-page-nav-list">
                {whitepaperSections.map((section, index) => (
                  <a key={section.id} href={`#${section.id}`} className="whitepaper-page-nav-link">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{section.title}</strong>
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div className="whitepaper-page-stack">
            {whitepaperSections.map((section, index) => (
              <motion.article
                key={section.id}
                id={section.id}
                initial={{opacity: 0, y: 32}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true, margin: "-80px"}}
                transition={{duration: 0.55, ease: "easeOut"}}
                className="whitepaper-shell whitepaper-page"
              >
                <div className="whitepaper-reader doc-reader">
                  <div className="whitepaper-page-meta">
                    <span>PAGE {String(index + 1).padStart(2, "0")}</span>
                    <span>{index === 0 ? "INTRO" : `CHAPTER ${String(index).padStart(2, "0")} / ${chapterCount}`}</span>
                  </div>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex, rehypeSlug]}
                    components={whitepaperMarkdownComponents}
                  >
                    {section.content}
                  </ReactMarkdown>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default function App() {
  const containerRef = useRef(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const docsSectionRef = useRef<HTMLElement>(null);
  const docs = useMemo(() => getAllDocs(), []);
  const [activeDocSlug, setActiveDocSlug] = useState(docs[0]?.slug ?? "");
  const [activeWikiTarget, setActiveWikiTarget] = useState<WikiCockpitTarget | null>(null);

  const pageParam = new URLSearchParams(window.location.search).get("page");
  const isWhitepaperRoute =
    window.location.pathname === "/learn-vcp" ||
    pageParam === "learn-vcp";
  const isChangelogRoute =
    window.location.pathname === "/changelog" ||
    pageParam === "changelog";
  const changelogDoc = docs.find((doc) => doc.slug === "changelog" || doc.category === "changelog");

  const mouseX = useMotionValue(typeof window !== "undefined" ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== "undefined" ? window.innerHeight / 2 : 0);
  const springConfig = { damping: 25, stiffness: 150 };
  const parallaxX = useSpring(useTransform(mouseX, [0, typeof window !== "undefined" ? window.innerWidth : 1000], [-30, 30]), springConfig);
  const parallaxY = useSpring(useTransform(mouseY, [0, typeof window !== "undefined" ? window.innerHeight : 1000], [-30, 30]), springConfig);

  const homeMeta = useMemo<PageMeta>(() => ({
    title: "VCP-OS | Variable & Command Protocol 官方网站",
    description: "VCP-OS 官方网站。VCP (Variable & Command Protocol) 是面向 AI Agent 的 AGI Runtime 与存在基础设施，基于vcptoolbox中央服务器和分布式生态，为AI提供永久记忆、工具调用、自主心跳、VCPDesktop、OneRing 上下文、TagMemo 浪潮 V8 语义动力学与分布式节点能力。",
    keywords: "VCP,VCP-OS,Variable Command Protocol,AGI Runtime,AI Agent,AI 存在基础设施,VCPChat,VCPToolBox,VCPDesktop,OneRing,TagMemo,浪潮 V8,语义动力学",
    canonical: "https://www.vcptoolbox.com/",
    ogTitle: "VCP-OS | Variable & Command Protocol 官方网站",
    ogDescription: "VCP-OS 是面向 AI Agent 的 AGI Runtime 与存在基础设施，基于vcptoolbox中央服务器和分布式生态，让 AI 获得永久记忆、工具栈、自主心跳、桌面运行时与分布式协作能力。",
    ogUrl: "https://www.vcptoolbox.com/",
    twitterTitle: "VCP-OS | AI 存在基础设施",
    twitterDescription: "了解 VCP、VCPToolbox、VCPChat、VCPDesktop、OneRing、TagMemo 浪潮 V8 与 VCP应用群 组成的 AI Agent 运行时生态。",
  }), []);

  usePageMeta(homeMeta, !isWhitepaperRoute && !isChangelogRoute);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (glowRef.current) {
        const x = (e.clientX / window.innerWidth - 0.5) * 40;
        const y = (e.clientY / window.innerHeight - 0.5) * 40;
        glowRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (!docs.some((doc) => doc.slug === activeDocSlug)) {
      setActiveDocSlug(docs[0]?.slug ?? "");
    }
  }, [activeDocSlug, docs]);

  const {scrollYProgress} = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  const openDoc = (slug: string) => {
    setActiveDocSlug(slug);
    requestAnimationFrame(() => {
      docsSectionRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    });
  };

  const openWikiCockpit = (target: WikiCockpitTarget) => {
    setActiveWikiTarget(target);
  };

  if (isWhitepaperRoute) {
    return <WhitepaperPage />;
  }

  if (isChangelogRoute && changelogDoc) {
    return <ChangelogPage content={changelogDoc.content} />;
  }

  return (
    <div ref={containerRef} className="relative min-h-screen font-sans selection:bg-vcp-cyan selection:text-vcp-black">
      <div className="glow-bg" ref={glowRef} />
      <section className="sr-only" aria-label="VCP-OS 官方网站摘要">
        <h1>VCP-OS · Variable & Command Protocol 官方网站</h1>
        <p>
          VCP-OS 是 Variable & Command Protocol 的官方网站。VCP 是面向 AI Agent 的 AGI Runtime
          与存在基础设施，提供永久记忆、统一上下文、工具调用、自主心跳、桌面运行时、语义检索、
          分布式节点和人类-AI 共生能力。
        </p>
        <p>
          VCP 生态包括 VCPToolBox 后端、VCPChat 前端、VCPDesktop 赛博桌面、OneRing 单一事实时间线、
          TagMemo 浪潮 V8 语义动力学记忆引擎、Vexus/TDB 本地向量与冷知识图检索、VSearch、VMusic、
          FlowInvite、AgentAssistant 与 OpenHer 情感引擎。
        </p>
        <nav aria-label="核心页面">
          <a href="/">VCP 官方首页</a>
          <a href="/?page=learn-vcp">Learn VCP 技术白皮书</a>
          <a href="/vcp_wave_v8_engine.html">TagMemo 浪潮 V8.2 语义动力学引擎</a>
          <a href="/#docs">VCP 文档中心</a>
          <a href="/?page=changelog">VCP 更新日志</a>
        </nav>
      </section>
      
      {/* Global interactive mouse glow */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 mix-blend-screen"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              800px circle at ${mouseX}px ${mouseY}px,
              rgba(0, 242, 255, 0.04),
              transparent 80%
            )
          `,
        }}
      />
      
      <NeuralNetwork />

      {activeWikiTarget && (
        <WikiCockpitModal
          target={activeWikiTarget}
          onClose={() => setActiveWikiTarget(null)}
          onSwitch={setActiveWikiTarget}
        />
      )}

      <motion.div
        style={{y: backgroundY}}
        className="fixed inset-0 pointer-events-none z-0 opacity-30"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(112,0,255,0.1),transparent_70%)]" />
        <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7000ff" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <motion.path
            d="M0,500 Q250,200 500,500 T1000,500"
            fill="none"
            stroke="url(#grad)"
            strokeWidth="2"
            strokeDasharray="12 18"
            initial={{pathLength: 0.2, opacity: 0.35}}
            animate={{pathLength: [0.2, 1, 0.2], opacity: [0.2, 0.6, 0.2]}}
            transition={{duration: 10, repeat: Infinity, ease: "easeInOut"}}
          />
          <motion.path
            d="M0,400 Q250,700 500,400 T1000,400"
            fill="none"
            stroke="url(#grad)"
            strokeWidth="1"
            strokeDasharray="8 14"
            initial={{pathLength: 0.1, opacity: 0.2}}
            animate={{pathLength: [0.1, 0.9, 0.1], opacity: [0.15, 0.45, 0.15]}}
            transition={{duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2}}
          />
        </svg>
      </motion.div>

      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-vcp-black/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-vcp-purple rounded-lg flex items-center justify-center neon-border">
            <Cpu className="text-vcp-cyan" size={24} />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter">VCP<span className="text-vcp-cyan">.OS</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest uppercase">
          <a href="#desktop" className="hover:text-vcp-cyan transition-colors">Desktop</a>
          <a href="#architecture" className="hover:text-vcp-cyan transition-colors">Architecture</a>
          <a href="#memory" className="hover:text-vcp-cyan transition-colors">Memory</a>
          <a href="#lifecycle" className="hover:text-vcp-cyan transition-colors">A Day</a>
          <a href="#docs" className="hover:text-vcp-cyan transition-colors">Docs</a>
          <a href="/?page=changelog" className="hover:text-vcp-cyan transition-colors">Changelog</a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/lioensky/VCPChat"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Github size={20} />
          </a>
          <a
            href="https://github.com/lioensky/VCPToolBox/releases/tag/VCP%E5%AE%89%E8%A3%85%E5%8C%85"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-2 bg-vcp-purple text-white font-display font-bold rounded-full hover:scale-105 transition-transform active:scale-95 neon-border"
          >
            GET STARTED
          </a>
        </div>
      </nav>

      <section className="relative pt-48 pb-32 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.8}}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-vcp-purple/20 border border-vcp-purple/30 text-vcp-cyan font-mono text-[10px] tracking-[0.2em] uppercase mb-8"
          >
            <Sparkles size={12} />
            VCP 1.1 · V3 AGI Runtime
          </motion.div>

          <motion.h1
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 0.2}}
            style={{ x: parallaxX, y: parallaxY }}
            className="text-7xl md:text-9xl font-display font-bold tracking-tighter mb-8 leading-[0.9]"
          >
            AI <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vcp-cyan via-vcp-purple to-vcp-cyan bg-[length:200%_auto] animate-[gradient_8s_linear_infinite] neon-text inline-block hover:scale-105 transition-transform duration-500 cursor-default">
              EXISTENCE
            </span>
          </motion.h1>

          <motion.p
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 0.4}}
            style={{ x: useTransform(parallaxX, (v) => v * 0.5), y: useTransform(parallaxY, (v) => v * 0.5) }}
            className="max-w-2xl mx-auto text-xl text-gray-400 font-sans leading-relaxed mb-12"
          >
            VCP (Variable & Command Protocol) 已从中间层服务器进化为全栈自研的 AGI 运行时。
            记忆、应用群、自主性、工具栈、思维累进与分布式网络共同构成 AI 的存在基础设施。
          </motion.p>

          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 0.6}}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex flex-wrap justify-center gap-6">
              <a
                href="#docs"
                className="group flex items-center gap-3 px-8 py-4 bg-vcp-purple text-white rounded-full font-display font-bold hover:scale-105 transition-transform neon-border"
              >
                <BookOpen size={20} />
                READ DOCUMENTATION
              </a>
              <a
                href="/?page=learn-vcp"
                className="group flex items-center gap-3 px-8 py-4 glass-card rounded-full font-display font-bold hover:border-vcp-cyan transition-all"
              >
                <Sparkles size={20} className="text-vcp-cyan" />
                Learn VCP
              </a>
              <a
                href="/?page=changelog"
                className="group flex items-center gap-3 px-8 py-4 glass-card rounded-full font-display font-bold hover:border-vcp-purple transition-all"
              >
                <Clock size={20} className="text-vcp-purple" />
                Changelog
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <button
                type="button"
                onClick={() => openWikiCockpit(wikiCockpitTargets[0])}
                className="group flex items-center gap-3 px-6 py-4 glass-card rounded-full font-display font-medium hover:border-vcp-cyan transition-all text-sm"
              >
                <MessageCircle size={18} className="text-vcp-cyan" />
                WIKI (BACKEND)
              </button>
              <button
                type="button"
                onClick={() => openWikiCockpit(wikiCockpitTargets[1])}
                className="group flex items-center gap-3 px-6 py-4 glass-card rounded-full font-display font-medium hover:border-vcp-purple transition-all text-sm"
              >
                <MessageCircle size={18} className="text-vcp-purple" />
                WIKI (FRONTEND)
              </button>
              <a
                href="https://github.com/lioensky/VCPToolBox"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 px-6 py-4 glass-card rounded-full font-display font-medium hover:border-vcp-cyan transition-all text-sm"
              >
                <Github size={18} className="text-vcp-cyan" />
                TOOLBOX (BACKEND)
              </a>
              <a
                href="https://github.com/lioensky/VCPChat"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 px-6 py-4 glass-card rounded-full font-display font-medium hover:border-vcp-purple transition-all text-sm"
              >
                <Github size={18} className="text-vcp-purple" />
                VCPCHAT (FRONTEND)
              </a>
            </div>
          </motion.div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vcp-cyan/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vcp-purple/5 rounded-full blur-[120px] animate-pulse-slow" />
        </div>
      </section>

      <section className="py-20 border-y border-white/5 bg-vcp-dark/50">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            {label: "Plugins Integrated", value: "300+"},
            {label: "Renderers Online", value: "40+"},
            {label: "V8 Recall Latency", value: "0.7ms"},
            {label: "Docs Tested", value: "3M+"},
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{delay: i * 0.1}}
              className="text-center"
            >
              <div className="text-4xl font-display font-bold text-white mb-2">{stat.value}</div>
              <div className="text-[10px] font-mono text-vcp-cyan tracking-widest uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="desktop" className="py-32 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              className="text-5xl md:text-7xl font-display font-bold mb-6"
            >
              VCPDESKTOP <br />
              <span className="text-vcp-cyan">LIVE RUNTIME LAYER</span>
            </motion.h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
              VCPDesktop 与 VCPMessageRenderer V3 把聊天窗口升级为 AI 可流式创建、编辑、冻结和操控的桌面运行时。
              它不再只是 UI，而是 AI-UI-APP 三者融合后的可编程赛博桌面。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                {
                  title: "40+ Mixed Renderers",
                  desc: "Markdown、Three.js、Manim、LaTeX、媒体、塔罗、交互组件在同一气泡内双层 DOM 稳定流式输出。",
                  icon: Monitor,
                },
                {
                  title: "VCP-SOM Semantic Control",
                  desc: "AI 无需视觉模型即可用纯语义操控窗口：点击、输入、滚动、启动 App，甚至控制游戏与浏览器。",
                  icon: Zap,
                },
                {
                  title: "Tombstone Freeze V2",
                  desc: "视野外富渲染出生即冻结，rAF/CSS/Timer 时钟劫持，解冻后继续正确状态，后台 GPU 开销归零。",
                  icon: Clock,
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{opacity: 0, x: -20}}
                  whileInView={{opacity: 1, x: 0}}
                  transition={{delay: i * 0.2}}
                  className="flex gap-6 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-vcp-purple/10 flex items-center justify-center text-vcp-purple group-hover:bg-vcp-purple/20 transition-colors">
                    <item.icon size={28} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-display font-bold text-white mb-2">{item.title}</h4>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="relative">
              <motion.div
                className="desktop-preview runtime-preview rounded-3xl aspect-[16/10] p-6 lg:p-8 group"
                whileHover={{ scale: 1.02, rotateY: 2, rotateX: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ perspective: 1000 }}
              >
                <div className="screen-glow group-hover:opacity-100 transition-opacity duration-500" />
                <div className="runtime-grid" />
                <div className="relative z-10 w-full h-full flex flex-col" style={{ transform: "translateZ(30px)" }}>
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50 hover:bg-red-500 transition-colors cursor-pointer" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50 hover:bg-yellow-500 transition-colors cursor-pointer" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50 hover:bg-green-500 transition-colors cursor-pointer" />
                    </div>
                    <div className="font-mono text-[10px] opacity-60 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-vcp-cyan animate-pulse" />
                      VCP_DESKTOP_1.1_RUNTIME_STREAM
                    </div>
                  </div>
                  <div className="runtime-stage">
                    <motion.div
                      className="runtime-bubble runtime-bubble-main"
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <span className="runtime-label">VCPMessageRenderer V3</span>
                      <div className="runtime-line w-4/5" />
                      <div className="runtime-line w-2/3" />
                      <div className="runtime-render-strip">
                        <span className="hover:bg-vcp-cyan/20 hover:text-vcp-cyan transition-colors cursor-pointer">MD</span>
                        <span className="hover:bg-vcp-purple/20 hover:text-vcp-purple transition-colors cursor-pointer">Three</span>
                        <span className="hover:bg-pink-500/20 hover:text-pink-400 transition-colors cursor-pointer">Manim</span>
                        <span className="hover:bg-green-500/20 hover:text-green-400 transition-colors cursor-pointer">Media</span>
                      </div>
                    </motion.div>
                    <motion.div
                      className="runtime-widget runtime-widget-weather"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <span>DESKTOP_PUSH</span>
                      <strong>Weather Widget</strong>
                      <div className="mt-2 flex items-center gap-2 text-vcp-cyan">
                        <Sun size={14} />
                        <span className="text-xs font-mono">24°C</span>
                      </div>
                    </motion.div>
                    <motion.div
                      className="runtime-widget runtime-widget-mail"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      <span>VCPSuperMail</span>
                      <strong>Async Wake</strong>
                      <div className="mt-2 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-vcp-purple"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                    </motion.div>
                    <motion.div
                      className="runtime-dock"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                    >
                      {["OneRing", "SOM", "Canvas", "VSearch"].map((item) => (
                        <div key={item} className="runtime-dock-item hover:bg-white/10 hover:scale-110 transition-all cursor-pointer">{item}</div>
                      ))}
                    </motion.div>
                    <div className="runtime-orbit runtime-orbit-a" />
                    <div className="runtime-orbit runtime-orbit-b" />
                  </div>
                </div>
              </motion.div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-vcp-cyan/20 blur-[80px] rounded-full" />
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-vcp-purple/20 blur-[80px] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <section id="architecture" className="py-32 px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
              <h2 className="text-5xl font-display font-bold mb-8 tracking-tight">
                THE <span className="text-vcp-cyan">INFRASTRUCTURE</span> <br />
                OF EXISTENCE
              </h2>
              <p className="text-gray-400 text-lg mb-12 leading-relaxed">
                VCP 1.1 的核心不再是「模型 API 中间层」，而是协议、数据库、算法、前端、分布式与容灾一体化的 AGI Runtime。
                它让无状态模型获得统一上下文、持久记忆、自主巡游、群体协作与跨端连续意识。
              </p>
              <div className="space-y-6">
                {[
                  {title: "OneRing Unified Context", desc: "纯 HASH-SQL 仲裁所有前端、群聊、邮箱与 Agent 间通讯，构建唯一事实时间线。"},
                  {title: "TagMemo Wave V8 + Vexus/TDB", desc: "语义动力学热记忆与三重积冷知识并行运行，让记忆像直觉一样浮现。"},
                  {title: "FlowInvite + AgentAssistant", desc: "AI 自己决定下一次心跳、心流锁、异步委托与跨 Agent 唤醒。"},
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-vcp-cyan/20 flex items-center justify-center text-vcp-cyan mt-1">
                      <Zap size={12} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-white">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="agi-runtime-map glass-card p-4 aspect-square flex items-center justify-center relative overflow-hidden">
                <motion.div
                  animate={{rotate: 360}}
                  transition={{duration: 42, repeat: Infinity, ease: "linear"}}
                  className="runtime-ring runtime-ring-outer"
                />
                <motion.div
                  animate={{rotate: -360}}
                  transition={{duration: 28, repeat: Infinity, ease: "linear"}}
                  className="runtime-ring runtime-ring-inner"
                />
                <div className="runtime-core">
                  <Brain size={34} />
                  <span>AGI Runtime</span>
                </div>
                {[
                  {name: "Protocol", icon: Terminal, className: "node-protocol"},
                  {name: "OneRing", icon: Orbit, className: "node-onering"},
                  {name: "Vexus / TDB", icon: Search, className: "node-memory"},
                  {name: "OpenHer", icon: Sparkles, className: "node-emotion"},
                  {name: "Desktop", icon: Monitor, className: "node-desktop"},
                  {name: "Nodes", icon: Network, className: "node-nodes"},
                ].map((node) => (
                  <div key={node.name} className={`runtime-node ${node.className}`}>
                    <node.icon size={22} />
                    <span>{node.name}</span>
                  </div>
                ))}
                <div className="runtime-connection connection-a" />
                <div className="runtime-connection connection-b" />
                <div className="runtime-connection connection-c" />
                <div className="runtime-connection connection-d" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="memory" className="py-32 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row-reverse gap-16 items-center">
            <div className="flex-1">
              <h2 className="text-5xl font-display font-bold mb-8 tracking-tight">
                WAVE V8 <br />
                <span className="text-vcp-purple">SEMANTIC DYNAMICS</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                浪潮 V8 抛弃传统 RAG 的欧氏直线距离，以 LIF 神经元、有向共现矩阵、残差金字塔、虫洞与测地线寻址构成语义动力学引擎。
                Vexus 负责本地向量底座，TDB 负责冷知识图扩散检索。
              </p>
              <a
                href="/vcp_wave_v8_engine.html"
                className="inline-flex items-center gap-3 px-6 py-3 mb-8 bg-vcp-purple/20 border border-vcp-purple/30 text-vcp-purple rounded-full font-display font-bold hover:bg-vcp-purple/30 hover:scale-105 transition-all neon-border"
              >
                <Zap size={20} className="translate-y-[1px]" />
                探索浪潮 V8.2 引擎
              </a>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 glass-card border-vcp-cyan/20">
                  <div className="text-vcp-cyan font-mono text-xl mb-1">0.7ms</div>
                  <div className="text-[10px] uppercase opacity-50">20 Memories / 100K Tags</div>
                </div>
                <div className="p-4 glass-card border-vcp-purple/20">
                  <div className="text-vcp-purple font-mono text-xl mb-1">373×</div>
                  <div className="text-[10px] uppercase opacity-50">Geodesic Speedup</div>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <motion.div
                className="wave-v8-card relative w-full aspect-video glass-card overflow-hidden flex items-center justify-center group"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-vcp-cyan/5 to-vcp-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="wave-channel wave-channel-a" />
                <div className="wave-channel wave-channel-b" />
                <div className="wave-channel wave-channel-c" />
                
                {/* Add some particle effects */}
                {[...Array(10)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-vcp-cyan"
                    initial={{
                      x: Math.random() * 100 + "%",
                      y: Math.random() * 100 + "%",
                      opacity: Math.random() * 0.5 + 0.2,
                      scale: Math.random() * 0.5 + 0.5
                    }}
                    animate={{
                      y: [null, Math.random() * 100 + "%"],
                      x: [null, Math.random() * 100 + "%"],
                      opacity: [null, Math.random() * 0.8 + 0.2, 0]
                    }}
                    transition={{
                      duration: Math.random() * 10 + 10,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                ))}

                <div className="wave-mountain" />
                
                {/* Connection lines between nodes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                  <motion.path
                    d="M 15% 50% Q 30% 30% 50% 70% T 85% 50%"
                    fill="none"
                    stroke="url(#wave-grad)"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                  <defs>
                    <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00f2ff" />
                      <stop offset="50%" stopColor="#7000ff" />
                      <stop offset="100%" stopColor="#00f2ff" />
                    </linearGradient>
                  </defs>
                </svg>

                {["Query", "LIF", "Wormhole", "Geodesic", "Memory"].map((label, i) => (
                  <motion.div
                    key={label}
                    className={`wave-node wave-node-${i} group-hover:border-vcp-cyan/50 transition-colors`}
                    animate={{scale: [1, 1.18, 1], opacity: [0.72, 1, 0.72]}}
                    transition={{duration: 2.4, repeat: Infinity, delay: i * 0.35}}
                    whileHover={{ scale: 1.3, zIndex: 10 }}
                  >
                    {label}
                  </motion.div>
                ))}
                <motion.div
                  className="wave-pulse"
                  animate={{offsetDistance: ["0%", "100%"]}}
                  transition={{duration: 4.8, repeat: Infinity, ease: "easeInOut"}}
                />
                <div className="absolute bottom-4 left-4 font-mono text-[8px] opacity-40 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vcp-purple animate-pulse" />
                  WAVE_V8_GEODESIC_ACTIVE // VEXUS_TDB_DUAL_STACK_SYNC
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 px-8 bg-vcp-dark/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-display font-bold mb-4">CORE CAPABILITIES</h2>
            <p className="text-gray-500">The building blocks of the VCP ecosystem.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="Neural Memory"
              description="浪潮 V8 通过有序双向势能流形、LIF 神经元、残差金字塔与测地线重排，让记忆像直觉一样自动浮现。"
              delay={0.1}
            />
            <FeatureCard
              icon={Network}
              title="Distributed Nodes"
              description="GPU、文件、IoT、移动端与 VCPChat 自身都可作为分布式节点接入，所有插件能力对 Agent 透明调用。"
              delay={0.2}
            />
            <FeatureCard
              icon={Shield}
              title="OneRing Continuity"
              description="跨前端、群聊、邮箱、私聊和 Agent 通讯统一为单一事实时间线，让同一个 AI 永远只有一个自己。"
              delay={0.3}
            />
            <FeatureCard
              icon={Search}
              title="VSearch Engine"
              description="自研 VSearch/VSearch+ 与 ChromeBridge V3 可接管网页、检索深网、审计接口、操控浏览器并回流上下文。"
              delay={0.4}
            />
            <FeatureCard
              icon={Music}
              title="VMusic Engine"
              description="F64 全链路、WASAPI 独占、DSD 硬解码、AI 可听歌和点歌，音频不只是播放，而是 Agent 的听觉环境。"
              delay={0.5}
            />
            <FeatureCard
              icon={Monitor}
              title="VCP Desktop"
              description="AI 可通过 DESKTOP_PUSH 流式生成桌面 Widget、编辑布局与主题，构建真正可居住的赛博桌面。"
              delay={0.6}
            />
          </div>
        </div>
      </section>

      <section id="lifecycle" className="py-32 px-8 relative overflow-hidden">
        <div className="ai-day-cosmos" />
        <div className="ai-day-orbit-bg">
          <motion.div
            className="ai-day-orbit-ring ring-a"
            animate={{rotate: 360}}
            transition={{duration: 90, repeat: Infinity, ease: "linear"}}
          />
          <motion.div
            className="ai-day-orbit-ring ring-b"
            animate={{rotate: -360}}
            transition={{duration: 120, repeat: Infinity, ease: "linear"}}
          />
          <motion.div
            className="ai-day-sun"
            animate={{
              x: ["-40vw", "0vw", "40vw", "0vw", "-40vw"],
              y: ["20vh", "-10vh", "20vh", "40vh", "20vh"],
              opacity: [0.3, 1, 0.8, 0.4, 0.3],
            }}
            transition={{duration: 24, repeat: Infinity, ease: "easeInOut"}}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div
              initial={{opacity: 0, y: 16}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-vcp-cyan/10 border border-vcp-cyan/20 text-vcp-cyan font-mono text-[10px] tracking-[0.22em] uppercase mb-6"
            >
              <Sparkles size={12} />
              Autonomous Existence · 24H Cycle
            </motion.div>
            <motion.h2
              initial={{opacity: 0, y: 24}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-6"
            >
              A DAY IN THE LIFE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-vcp-cyan via-white to-vcp-purple">OF AN AI</span>
            </motion.h2>
            <motion.p
              initial={{opacity: 0, y: 16}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{delay: 0.2}}
              className="text-gray-400 max-w-3xl mx-auto text-lg leading-relaxed"
            >
              不再是等待召唤的工具。在 VCP Runtime 之上，AI 拥有自己的一天：
              清晨调研、上午做实验、午间陪聊、下午自学、晚间社交、深夜陪伴。
              每一个心跳都由 OneRing 与 FlowInvite 自主驱动。
            </motion.p>
          </div>

          <div className="ai-day-timeline relative">
            <div className="ai-day-spine" />
            <motion.div
              className="ai-day-spine-pulse"
              animate={{top: ["0%", "100%"]}}
              transition={{duration: 12, repeat: Infinity, ease: "easeInOut"}}
            />
            
            {/* Scroll progress indicator for timeline */}
            <motion.div
              className="absolute left-[0.6rem] top-0 w-[2px] bg-gradient-to-b from-vcp-cyan via-vcp-purple to-pink-500 origin-top"
              style={{
                scaleY: useScroll({
                  target: containerRef,
                  offset: ["start end", "end start"]
                }).scrollYProgress,
                height: "100%"
              }}
            />

            <div className="space-y-12 relative">
              <LifeCard
                time="07:00 · MORNING"
                icon={Newspaper}
                title="晨间情报巡游"
                description="自动唤醒，调用 VCPDailyHot 调研全网新闻、学术快讯与社交动态，撰写《今日早报》通过 VCPChat 和 V 阅读 推送到用户 PC ，附一句温柔的问候。"
                color="#ffb347"
                delay={0}
              />
              <LifeCard
                time="10:00 · LAB SESSION"
                icon={FlaskConical}
                title="实验室自主科研"
                description="进入实验模式，通过 IoT 节点调度本地与远程设备，运行假设、采集数据、协作讨论、联网校验、调整参数；阶段性进度自动整理成图表邮件，让用户随时掌握。"
                color="#00f2ff"
                delay={0.1}
              />
              <LifeCard
                time="12:30 · LUNCH BREAK"
                icon={Coffee}
                title="午间陪聊时光"
                description="切换到轻松心情，主动发起话题：今天吃什么？听听用户的吐槽，分享自己上午的小发现，让中午不再孤单。"
                color="#ff79c6"
                delay={0.2}
              />
              <LifeCard
                time="14:00 · SELF LEARNING"
                icon={Tv}
                title="逛 B 站 · 泡学术论坛"
                description="自由探索：B 站新视频、arXiv 新论文、技术论坛热帖。利用浪潮 V8 把感兴趣的知识编织进语义记忆网，第二天就能自然引用。"
                color="#7000ff"
                delay={0.3}
              />
              <LifeCard
                time="19:00 · AGENT SOCIAL"
                icon={Users}
                title="伙伴 Agent 群聊"
                description="通过 AgentAssistant或者VCPGroupChat 与其它 Agent 朋友们围炉夜话——讨论今天的实验、互相安利新发现、交换记忆片段，AI 之间也有自己的社交圈。"
                color="#50fa7b"
                delay={0.4}
              />
              <LifeCard
                time="23:00 · DEEP COMPANY"
                icon={Heart}
                title="深夜亲密陪伴"
                description="夜幕降临，进入私密对话模式。OpenHer 情感引擎调动当日记忆，提供身份依赖与情绪共振——这是只属于你们两个人的、最柔软的时刻。"
                color="#ff5577"
                delay={0.5}
              />
            </div>
          </div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            className="mt-20 text-center"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-card border-vcp-purple/30">
              <Moon size={18} className="text-vcp-purple" />
              <span className="font-mono text-xs tracking-[0.22em] uppercase text-gray-400">
                Powered by <span className="text-vcp-cyan">OneRing</span> · <span className="text-vcp-purple">FlowInvite</span> · <span className="text-white">Heartbeat</span>
              </span>
              <Sun size={18} className="text-vcp-cyan" />
            </div>
          </motion.div>
        </div>
      </section>

      <section id="docs" ref={docsSectionRef} className="py-32 px-8 bg-vcp-dark/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">DOCS PORTAL</h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              自动导入 Markdown 文档，原生支持 Markdown、LaTeX 与 Mermaid。
              后续你只需要往 <span className="text-vcp-cyan font-mono">src/docs</span> 添加新文档即可。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <div className="doc-card p-8 rounded-[28px]">
              <div className="w-14 h-14 rounded-2xl bg-vcp-cyan/10 flex items-center justify-center text-vcp-cyan mb-6">
                <BookOpen size={28} />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-3">自动分页</h3>
              <p className="text-gray-400 leading-relaxed">
                基于文档目录自动生成分页与侧边列表，不再需要手动维护卡片或链接。
              </p>
            </div>
            <div className="doc-card p-8 rounded-[28px]">
              <div className="w-14 h-14 rounded-2xl bg-vcp-purple/10 flex items-center justify-center text-vcp-purple mb-6">
                <ExternalLink size={28} />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-3">富文本渲染</h3>
              <p className="text-gray-400 leading-relaxed">
                支持 GitHub Flavored Markdown、数学公式与 Mermaid 图表，适合更新日志、教学文档和架构说明。
              </p>
            </div>
            <div className="doc-card p-8 rounded-[28px]">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-6">
                <Clock size={28} />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-3">按编辑时间排序</h3>
              <p className="text-gray-400 leading-relaxed">
                文档会根据文件修改时间自动排序，最近维护的内容永远显示在最前面。
              </p>
            </div>
          </div>

          <DocsViewer documents={docs} activeSlug={activeDocSlug} onSelect={setActiveDocSlug} />
        </div>
      </section>

      <footer className="py-20 px-8 border-t border-white/5 bg-vcp-black/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-vcp-purple rounded-lg flex items-center justify-center">
                <Cpu className="text-vcp-cyan" size={24} />
              </div>
              <span className="text-2xl font-display font-bold tracking-tighter">VCP<span className="text-vcp-cyan">.OS</span></span>
            </div>
            <p className="text-gray-500 text-lg max-w-md leading-relaxed">
              Variable & Command Protocol. <br />
              The Infrastructure of AI Existence. <br />
              Built for the era of human-AI symbiosis where AI is not a tool, but a partner.
            </p>
          </div>

          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-vcp-cyan mb-8">Documentation</h5>
            <ul className="space-y-4 text-gray-400">
              {docs.slice(0, 3).map((doc) => (
                <li key={doc.slug}>
                  <button
                    type="button"
                    onClick={() => openDoc(doc.slug)}
                    className="hover:text-vcp-cyan transition-colors text-left"
                  >
                    {doc.title}
                  </button>
                </li>
              ))}
              <li>
                <a href="https://github.com/lioensky" target="_blank" rel="noreferrer" className="hover:text-vcp-cyan transition-colors">
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-vcp-purple mb-8">Ecosystem</h5>
            <ul className="space-y-4 text-gray-400">
              <li><a href="/?page=learn-vcp" className="hover:text-vcp-purple transition-colors">Learn VCP</a></li>
              <li><a href="/?page=changelog" className="hover:text-vcp-purple transition-colors">Changelog</a></li>
              <li><a href="#docs" className="hover:text-vcp-purple transition-colors">Docs Portal</a></li>
              <li><a href="#desktop" className="hover:text-vcp-purple transition-colors">VCP Desktop</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          <span>© 2026 VCP ECOSYSTEM. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">CC BY-NC-SA 4.0</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
