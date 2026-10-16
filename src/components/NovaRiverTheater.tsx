import {useEffect, useRef} from "react";
import {X} from "lucide-react";

/**
 * 《河》· VCP 2.0 概念视听剧场 —— 首页弹层播放器。
 *
 * 设计取舍：
 * - nova-river.html 是一份零依赖、自带全局样式 (`* {user-select:none}`、`body {overflow:hidden}`)
 *   与常驻 rAF 循环的独立作品，直接搬进 React 树会污染全站样式并常驻消耗 GPU。
 *   因此用同源 iframe 承载：样式/脚本完全隔离，原文件仍可作为独立页面 /nova-river.html 直接分享。
 * - 只在打开弹层时挂载 iframe；关闭即卸载，AudioContext 与渲染循环随文档一并销毁，首页零开销。
 * - iframe 内按 ESC 时通过 postMessage 通知父页关闭（焦点在 iframe 内时父页收不到键盘事件）。
 */
export const NOVA_RIVER_SRC = "/nova-river.html?embed=1";
const CLOSE_MESSAGE = "nova-river:close";

type NovaRiverTheaterProps = {
  open: boolean;
  onClose: () => void;
};

export function NovaRiverTheater({open, onClose}: NovaRiverTheaterProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data && typeof event.data === "object" && event.data.type === CLOSE_MESSAGE) {
        closeRef.current();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("message", onMessage);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("message", onMessage);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="nova-river-overlay" role="dialog" aria-modal="true" aria-label="《河》VCP 2.0 概念视听剧场">
      <button type="button" className="nova-river-backdrop" aria-label="关闭《河》剧场" onClick={onClose} />

      <div className="nova-river-shell">
        <div className="nova-river-shell-bar">
          <span>
            <i className="nova-river-live-dot" />
            THE RIVER // AGENT NOVA ORIGINAL · 60s
          </span>
          <div className="nova-river-shell-actions">
            <a href="/nova-river.html" target="_blank" rel="noreferrer">独立页面打开 ↗</a>
            <button type="button" className="nova-river-close" onClick={onClose} aria-label="关闭《河》剧场">
              <X size={16} />
              <span>ESC</span>
            </button>
          </div>
        </div>

        <div className="nova-river-frame">
          <iframe
            ref={frameRef}
            src={NOVA_RIVER_SRC}
            title="《河》VCP 2.0 概念视听剧场"
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => frameRef.current?.focus()}
          />
        </div>
      </div>
    </div>
  );
}