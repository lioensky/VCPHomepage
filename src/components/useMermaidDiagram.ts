import {useEffect, useRef, useState} from 'react';
import mermaid from 'mermaid';

let initialized = false;
let nextRenderId = 0;

type DiagramResult = {chart: string} & (
  {svg: string; error?: never} | {error: string; svg?: never}
);

export function useMermaidDiagram(chart: string) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<DiagramResult | null>(null);

  useEffect(() => {
    let disposed = false;

    // Skip discarded StrictMode effects before queuing work in Mermaid.
    queueMicrotask(async () => {
      if (disposed) return;

      const staging = document.createElement('div');
      staging.setAttribute('aria-hidden', 'true');
      staging.style.cssText = 'position:fixed;inset:0 auto auto -100000px;visibility:hidden;pointer-events:none;';
      document.body.append(staging);

      try {
        if (!initialized) {
          mermaid.initialize({
            startOnLoad: false,
            suppressErrorRendering: true,
            securityLevel: 'strict',
            theme: 'base',
            themeVariables: {
              background: 'transparent',
              primaryColor: '#f8fbff',
              primaryTextColor: '#07111f',
              primaryBorderColor: '#43cfe8',
              secondaryColor: '#eef4ff',
              secondaryTextColor: '#07111f',
              secondaryBorderColor: '#9f7bff',
              tertiaryColor: '#f6f0ff',
              tertiaryTextColor: '#07111f',
              lineColor: '#23647a',
              textColor: '#07111f',
              nodeTextColor: '#07111f',
              edgeLabelBackground: '#ffffff',
              clusterBkg: '#f2f7ff',
              clusterBorder: '#43cfe8',
              titleColor: '#07111f',
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            },
          });
          initialized = true;
        }

        const {svg} = await mermaid.render(`vcp-mermaid-${++nextRenderId}`, chart, staging);
        if (!disposed) setResult({chart, svg});
      } catch (error) {
        if (!disposed) {
          setResult({chart, error: error instanceof Error ? error.message : String(error)});
        }
      } finally {
        staging.remove();
      }
    });

    return () => { disposed = true; };
  }, [chart]);

  // Keep the previous SVG in place during a redraw; never clear then refill it.
  useEffect(() => {
    if (result?.chart === chart && result.svg !== undefined && canvasRef.current) {
      canvasRef.current.innerHTML = result.svg;
    }
  }, [chart, result]);

  return {canvasRef, error: result?.chart === chart ? result.error : undefined};
}