'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { layoutTree, type LayoutMode } from '@/lib/tree-layout';
import type { TreeNode } from '@/lib/tree-data';

type Props = {
  nodes: TreeNode[];
  currentUserPersonId: number | null;
};

const ROOT_ID = 1;

function fullNameFor(id: number, byId: Map<number, TreeNode>): string {
  const chain: string[] = [];
  let cur: number | null = id;
  while (cur != null) {
    const n = byId.get(cur);
    if (!n) break;
    chain.push(n.name.replace(/ Koja$/, ''));
    cur = n.fid;
  }
  const last = chain[chain.length - 1];
  // Don't double-append Koja if the root already carries it
  return chain.join(' ') + (last === 'Hanna' ? '' : ' Koja');
}

export function FamilyTree({ nodes, currentUserPersonId }: Props) {
  const { t } = useLanguage();
  const router = useRouter();

  const [mode, setMode] = useState<LayoutMode>('horizontal');
  const [search, setSearch] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ id: number; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const pulseRef = useRef<SVGCircleElement | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const transformRef = useRef<{ tx: number; ty: number; scale: number }>({ tx: 0, ty: 0, scale: 1 });

  const byId = useMemo(() => {
    const m = new Map<number, TreeNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const layout = useMemo(() => layoutTree(nodes, ROOT_ID, mode), [nodes, mode]);

  const links = useMemo(() => {
    const out: { d: string; id: number }[] = [];
    const isVert = mode === 'vertical';
    for (const n of nodes) {
      if (n.fid == null) continue;
      const parent = layout.positions.get(n.fid);
      const child = layout.positions.get(n.id);
      if (!parent || !child) continue;
      let d: string;
      if (isVert) {
        const my = (parent.y + child.y) / 2;
        d = `M${parent.x},${parent.y} C${parent.x},${my} ${child.x},${my} ${child.x},${child.y}`;
      } else {
        const mx = (parent.x + child.x) / 2;
        d = `M${parent.x},${parent.y} C${mx},${parent.y} ${mx},${child.y} ${child.x},${child.y}`;
      }
      out.push({ d, id: n.id });
    }
    return out;
  }, [nodes, layout, mode]);

  const applyTransform = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    const { tx, ty, scale } = transformRef.current;
    g.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);
  }, []);

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const W = container.clientWidth;
    const H = container.clientHeight;
    const { minX, maxX, minY, maxY } = layout.bounds;
    const contentW = maxX - minX + 100;
    const contentH = maxY - minY + 60;
    const fitScale = Math.min(W / contentW, H / contentH) * 0.9;
    transformRef.current = {
      tx: (W - contentW * fitScale) / 2 - minX * fitScale + 50 * fitScale,
      ty: (H - contentH * fitScale) / 2 - minY * fitScale + 30 * fitScale,
      scale: fitScale,
    };
    applyTransform();
  }, [layout, applyTransform]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  // Deliberately NOT fitting on window resize. Mobile browsers fire resize
  // when their URL bar shows/hides during scrolling and that resets the
  // user's pan/zoom. Initial fit happens above; mode changes re-fit via
  // the dependency on `fitToView`. User can tap Reset to re-fit manually.

  // Pan + zoom (mouse + touch)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    // Pinch-zoom baseline captured on two-finger touchstart.
    let pinch: {
      baseDist: number;
      baseScale: number;
      baseTx: number;
      baseTy: number;
      cx: number;
      cy: number;
    } | null = null;

    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      container.classList.add('cursor-grabbing');
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      transformRef.current.tx += e.clientX - lastX;
      transformRef.current.ty += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyTransform();
    };
    const onMouseUp = () => {
      dragging = false;
      container.classList.remove('cursor-grabbing');
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      transformRef.current.tx = cx - (cx - transformRef.current.tx) * factor;
      transformRef.current.ty = cy - (cy - transformRef.current.ty) * factor;
      transformRef.current.scale *= factor;
      applyTransform();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        dragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        pinch = null;
      } else if (e.touches.length === 2) {
        dragging = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const rect = container.getBoundingClientRect();
        pinch = {
          baseDist: Math.hypot(dx, dy) || 1,
          baseScale: transformRef.current.scale,
          baseTx: transformRef.current.tx,
          baseTy: transformRef.current.ty,
          cx: (t1.clientX + t2.clientX) / 2 - rect.left,
          cy: (t1.clientY + t2.clientY) / 2 - rect.top,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // Prevent the page from scrolling when the user pans the tree.
      if (e.cancelable) e.preventDefault();
      if (pinch && e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const dist = Math.hypot(dx, dy) || 1;
        const ratio = dist / pinch.baseDist;
        transformRef.current.scale = pinch.baseScale * ratio;
        transformRef.current.tx = pinch.cx - (pinch.cx - pinch.baseTx) * ratio;
        transformRef.current.ty = pinch.cy - (pinch.cy - pinch.baseTy) * ratio;
        applyTransform();
      } else if (dragging && e.touches.length === 1) {
        const t = e.touches[0];
        transformRef.current.tx += t.clientX - lastX;
        transformRef.current.ty += t.clientY - lastY;
        lastX = t.clientX;
        lastY = t.clientY;
        applyTransform();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        dragging = false;
        pinch = null;
      } else if (e.touches.length === 1 && pinch) {
        // Lifted one finger mid-pinch — fall back to single-finger pan.
        pinch = null;
        dragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [applyTransform]);

  const zoomBy = (factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    transformRef.current.tx = cx - (cx - transformRef.current.tx) * factor;
    transformRef.current.ty = cy - (cy - transformRef.current.ty) * factor;
    transformRef.current.scale *= factor;
    applyTransform();
  };

  const animateTo = useCallback(
    (toTx: number, toTy: number, toScale: number, duration = 650) => {
      const from = { ...transformRef.current };
      const start = performance.now();
      const step = (now: number) => {
        const u = Math.min(1, (now - start) / duration);
        const e = 1 - Math.pow(1 - u, 3);
        transformRef.current = {
          tx: from.tx + (toTx - from.tx) * e,
          ty: from.ty + (toTy - from.ty) * e,
          scale: from.scale + (toScale - from.scale) * e,
        };
        applyTransform();
        if (u < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    [applyTransform]
  );

  const focusNode = useCallback(
    (id: number) => {
      const container = containerRef.current;
      const pos = layout.positions.get(id);
      if (!container || !pos) return;
      const targetScale = 1.3;
      const targetTx = container.clientWidth / 2 - pos.x * targetScale;
      const targetTy = container.clientHeight / 2 - pos.y * targetScale;
      animateTo(targetTx, targetTy, targetScale);

      // Draw pulse ring
      if (pulseRef.current && gRef.current?.contains(pulseRef.current)) {
        pulseRef.current.remove();
      }
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      const ns = 'http://www.w3.org/2000/svg';
      const pulse = document.createElementNS(ns, 'circle');
      pulse.setAttribute('class', 'node-pulse');
      pulse.setAttribute('cx', String(pos.x));
      pulse.setAttribute('cy', String(pos.y));
      pulse.setAttribute('r', '10');
      gRef.current?.appendChild(pulse);
      pulseRef.current = pulse;
      pulseTimerRef.current = window.setTimeout(() => {
        pulse.remove();
        pulseRef.current = null;
      }, 4200);
    },
    [layout, animateTo]
  );

  // Search suggestions
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as { node: TreeNode; score: number }[];
    const out: { node: TreeNode; score: number }[] = [];
    for (const n of nodes) {
      const name = n.name.toLowerCase();
      if (name === q) out.push({ node: n, score: 0 });
      else if (name.startsWith(q)) out.push({ node: n, score: 1 });
      else if (name.includes(q)) out.push({ node: n, score: 2 });
    }
    out.sort((a, b) => a.score - b.score || a.node.name.localeCompare(b.node.name));
    return out.slice(0, 12);
  }, [search, nodes]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('#tree-search') || target.closest('#tree-search-suggestions')) return;
      setSuggestOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div>
      {/* TOOLBAR */}
      <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-border py-4">
        <div className="relative min-w-[240px] flex-1" id="tree-search">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            placeholder={t('tree.search.placeholder')}
            className="w-full border border-[var(--color-border-dark)] bg-cream px-4 py-2.5 text-sm focus:outline-1 focus:outline-olive"
            autoComplete="off"
          />
          {suggestOpen && search.trim() ? (
            <div
              id="tree-search-suggestions"
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[300px] overflow-y-auto border border-[var(--color-border-dark)] bg-cream shadow-lg"
            >
              {suggestions.length === 0 ? (
                <div className="font-display p-4 text-center italic text-ink-muted">
                  {t('tree.search.empty')}
                </div>
              ) : (
                suggestions.map(({ node }) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => {
                      focusNode(node.id);
                      setSearch(node.name);
                      setSuggestOpen(false);
                    }}
                    className="font-display flex w-full items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-start last:border-b-0 hover:bg-parchment-deep"
                  >
                    <span className="text-[17px] font-medium text-ink">{node.name}</span>
                    <span className="max-w-[55%] truncate text-xs italic text-ink-muted">
                      {fullNameFor(node.id, byId)}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        {currentUserPersonId ? (
          <button
            type="button"
            onClick={() => focusNode(currentUserPersonId)}
            className="font-display rounded-sm border border-[var(--color-border-dark)] px-4 py-1.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep hover:text-olive-deep"
          >
            {t('tree.findme')}
          </button>
        ) : null}

        <div className="keep-ltr inline-flex overflow-hidden rounded-sm border border-[var(--color-border-dark)]">
          <button
            type="button"
            onClick={() => setMode('vertical')}
            className={
              'flex items-center px-3 py-2 transition-colors ' +
              (mode === 'vertical' ? 'bg-olive-deep text-cream' : 'text-ink-muted hover:text-ink')
            }
            title="Top-down view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="4" cy="9" r="1.5" />
              <circle cx="12" cy="9" r="1.5" />
              <circle cx="4" cy="14" r="1" />
              <circle cx="12" cy="14" r="1" />
              <path d="M8 4.5 L4 7.5 M8 4.5 L12 7.5 M4 10 L4 13 M12 10 L12 13" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setMode('horizontal')}
            className={
              'flex items-center px-3 py-2 transition-colors ' +
              (mode === 'horizontal' ? 'bg-olive-deep text-cream' : 'text-ink-muted hover:text-ink')
            }
            title="Side view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="3" cy="8" r="1.5" />
              <circle cx="9" cy="4" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="14" cy="4" r="1" />
              <circle cx="14" cy="12" r="1" />
              <path d="M4.5 8 L7.5 4 M4.5 8 L7.5 12 M10 4 L13 4 M10 12 L13 12" />
            </svg>
          </button>
        </div>

        <div className="font-display italic text-ink-muted">
          {nodes.length} {t('tree.people')}
        </div>
        <button
          type="button"
          onClick={() => {
            setSearch('');
            fitToView();
          }}
          className="font-display rounded-sm border border-[var(--color-border-dark)] px-4 py-1.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep hover:text-olive-deep"
        >
          {t('tree.reset')}
        </button>
      </div>

      {/* CANVAS */}
      <div
        ref={containerRef}
        className="relative h-[600px] cursor-grab overflow-hidden border border-[var(--color-border-dark)] select-none md:h-[720px]"
        style={{
          background: 'linear-gradient(var(--color-parchment) 0%, var(--color-parchment-deep) 100%)',
          boxShadow: 'inset 0 0 60px rgba(20, 30, 46, 0.1)',
          touchAction: 'none',
        }}
      >
        <svg ref={svgRef} className="h-full w-full">
          <g ref={gRef}>
            {/* Links */}
            {links.map((l) => (
              <path key={l.id} className="tree-link" d={l.d} stroke="var(--color-border-dark)" strokeWidth={1.75} fill="none" opacity={0.75} />
            ))}
            {/* ClipPaths for photo nodes — one per node that has a photo. */}
            <defs>
              {nodes.map((n) => {
                const p = layout.positions.get(n.id);
                if (!p || !n.photoUrl) return null;
                return (
                  <clipPath id={`photo-clip-${n.id}`} key={n.id}>
                    <circle cx={p.x} cy={p.y} r={9} />
                  </clipPath>
                );
              })}
            </defs>
            {/* Nodes */}
            {nodes.map((n) => {
              const p = layout.positions.get(n.id);
              if (!p) return null;
              const isSelf = currentUserPersonId === n.id;
              const claimed = n.claim === 'approved';
              const fill = isSelf
                ? 'var(--color-terracotta)'
                : claimed
                ? 'var(--color-olive-deep)'
                : 'var(--color-cream)';
              const stroke = isSelf
                ? 'var(--color-terracotta-deep)'
                : claimed
                ? 'var(--color-olive-deep)'
                : 'var(--color-border-dark)';
              const ringStroke = isSelf ? 'var(--color-terracotta-deep)' : 'var(--color-gold)';
              const isVert = mode === 'vertical';
              const labelX = isVert ? p.x : p.x + 13;
              const labelY = isVert ? p.y + 22 : p.y + 4;
              const idX = isVert ? p.x : p.x + 13;
              const idY = isVert ? p.y + 34 : p.y + 15;
              const anchor = isVert ? 'middle' : 'start';

              const isFemale = n.gender === 'F';
              return (
                <g
                  key={n.id}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/profile/${n.id}`);
                  }}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setTooltip({
                      id: n.id,
                      x: e.clientX - rect.left + 12,
                      y: e.clientY - rect.top + 12,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {n.photoUrl ? (
                    <>
                      <circle cx={p.x} cy={p.y} r={9} fill={fill} stroke={ringStroke} strokeWidth={1.5} />
                      <image
                        href={n.photoUrl}
                        x={p.x - 9}
                        y={p.y - 9}
                        width={18}
                        height={18}
                        clipPath={`url(#photo-clip-${n.id})`}
                        preserveAspectRatio="xMidYMid slice"
                        pointerEvents="none"
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={9}
                        fill="none"
                        stroke={ringStroke}
                        strokeWidth={1.5}
                        pointerEvents="none"
                      />
                    </>
                  ) : isFemale ? (
                    <rect
                      x={p.x - 7}
                      y={p.y - 7}
                      width={14}
                      height={14}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={1.5}
                      transform={`rotate(45 ${p.x} ${p.y})`}
                    />
                  ) : (
                    <circle cx={p.x} cy={p.y} r={7} fill={fill} stroke={stroke} strokeWidth={1.5} />
                  )}
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={anchor}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                    className="font-display"
                    fontSize={11}
                    fontWeight={500}
                    fill="var(--color-ink)"
                  >
                    {n.name}
                  </text>
                  {/* Deceased cross at the node's top-right corner — easy to revert. */}
                  {n.isDeceased ? (
                    <text
                      x={p.x + 7}
                      y={p.y - 5}
                      fontSize={10}
                      fontWeight={600}
                      fill="var(--color-ink-muted)"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      &dagger;
                    </text>
                  ) : null}
                  <text
                    x={idX}
                    y={idY}
                    textAnchor={anchor}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                    fontSize={8}
                    fill="var(--color-ink-muted)"
                  >
                    #{n.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="font-display absolute left-4 top-4 border border-[var(--color-border-dark)] bg-cream px-4 py-3 text-xs">
          <div className="mb-1.5 font-semibold">{t('tree.legend')}</div>
          <LegendRow swatch="var(--color-olive-deep)" label={t('tree.legend.claimed')} />
          <LegendRow swatch="var(--color-cream)" outline label={t('tree.legend.unclaimed')} />
          <LegendRow swatch="var(--color-terracotta)" label={t('tree.legend.you')} />
          <div className="mt-1.5 border-t border-dotted border-border pt-1.5">
            <LegendRow swatch="var(--color-ink-muted)" label={t('tree.legend.male')} />
            <LegendRow swatch="var(--color-ink-muted)" shape="diamond" label={t('tree.legend.female')} />
            <div className="flex items-center gap-2 py-0.5">
              <span className="block h-3 w-3 text-center leading-none text-ink-muted">†</span>
              <span>{t('tree.legend.deceased')}</span>
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 end-4 flex flex-col gap-1 border border-[var(--color-border-dark)] bg-cream p-1">
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            className="font-display h-8 w-8 text-lg font-semibold text-ink-soft hover:bg-parchment-deep"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            className="font-display h-8 w-8 text-lg font-semibold text-ink-soft hover:bg-parchment-deep"
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              fitToView();
            }}
            className="font-display h-8 w-8 text-lg font-semibold text-ink-soft hover:bg-parchment-deep"
            title="Reset"
          >
            ◈
          </button>
        </div>

        {/* Tooltip */}
        {tooltip ? (
          <div
            className="font-display pointer-events-none absolute z-50 whitespace-nowrap border border-gold bg-ink px-3 py-2 text-sm text-cream"
            style={{ left: tooltip.x, top: tooltip.y, opacity: 1 }}
          >
            <TooltipContent node={byId.get(tooltip.id)!} byId={byId} />
          </div>
        ) : null}
      </div>

      <p className="font-display mt-4 text-center italic text-ink-muted">{t('tree.help')}</p>
    </div>
  );
}

function LegendRow({
  swatch,
  outline,
  label,
  shape = 'circle',
}: {
  swatch: string;
  outline?: boolean;
  label: string;
  shape?: 'circle' | 'diamond';
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        className="block h-3 w-3"
        style={{
          background: swatch,
          border: outline ? '1px solid var(--color-border-dark)' : 'none',
          borderRadius: shape === 'circle' ? '50%' : 0,
          transform: shape === 'diamond' ? 'rotate(45deg)' : undefined,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function TooltipContent({ node, byId }: { node: TreeNode; byId: Map<number, TreeNode> }) {
  const childCount = useMemo(() => {
    let c = 0;
    for (const n of byId.values()) if (n.fid === node.id) c++;
    return c;
  }, [byId, node.id]);
  return (
    <>
      <strong className="text-[15px]">{node.name}</strong>
      <br />#{node.id}
      {childCount > 0 ? ` · ${childCount} children` : ''}
    </>
  );
}
