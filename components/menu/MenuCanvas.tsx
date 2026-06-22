"use client";

import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { MenuSection, PageTemplate, MenuConfig } from "@/types/menu";
import { formatPrice } from "@/lib/utils";

interface MenuCanvasProps {
  template: PageTemplate;
  sections: MenuSection[];
  config: MenuConfig;
  pageIndex: number;
  scale?: number;
}

export interface MenuCanvasHandle {
  exportHighRes: () => Promise<Blob>;
}

function drawTypeIcon(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, size: number) {
  const half = size / 2;
  ctx.save();
  if (type === "veg" || type === "vegan") {
    ctx.strokeStyle = "#2e7d32";
    ctx.lineWidth = size * 0.12;
    ctx.strokeRect(x, y, size, size);
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.arc(x + half, y + half, half * 0.55, 0, Math.PI * 2);
    ctx.fill();
    if (type === "vegan") {
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${size * 0.45}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("V", x + half, y + half + 1);
    }
  } else if (type === "non-veg") {
    ctx.strokeStyle = "#b71c1c";
    ctx.lineWidth = size * 0.12;
    ctx.strokeRect(x, y, size, size);
    ctx.fillStyle = "#b71c1c";
    ctx.beginPath();
    ctx.moveTo(x + half, y + size * 0.2);
    ctx.lineTo(x + size * 0.2, y + size * 0.8);
    ctx.lineTo(x + size * 0.8, y + size * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSpiceIcon(ctx: CanvasRenderingContext2D, level: string, x: number, y: number, size: number) {
  if (!level) return;
  const count = level === "mild" ? 1 : level === "medium" ? 2 : 3;
  ctx.save();
  ctx.font = `${size}px serif`;
  for (let i = 0; i < count; i++) {
    ctx.fillText("🌶", x + i * (size + 2), y);
  }
  ctx.restore();
}

const RENDER_SCALE = 3;

const MenuCanvas = forwardRef<MenuCanvasHandle, MenuCanvasProps>(function MenuCanvas(
  { template, sections, config, pageIndex, scale = 1 },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(
    (canvas: HTMLCanvasElement, renderScale: number) => {
      const W = template.width * renderScale;
      const H = template.height * renderScale;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, W, H);
        drawMenuContent(ctx, W, H, renderScale);
      };
      img.onerror = () => {
        ctx.fillStyle = config.colors.background || "#fff8f0";
        ctx.fillRect(0, 0, W, H);
        drawMenuContent(ctx, W, H, renderScale);
      };
      img.src = template.imageUrl;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template, sections, config]
  );

  function drawMenuContent(ctx: CanvasRenderingContext2D, W: number, H: number, rs: number) {
    const padding = 60 * rs;
    const colWidth = (W - padding * 2) / 2;
    const lineH = 20 * rs;
    const useTwoCols = sections.length > 2 || sections.some((s) => s.items.length > 6);
    let col1Sections: MenuSection[] = [];
    let col2Sections: MenuSection[] = [];
    if (useTwoCols) {
      const half = Math.ceil(sections.length / 2);
      col1Sections = sections.slice(0, half);
      col2Sections = sections.slice(half);
    } else {
      col1Sections = sections;
    }
    const drawColumn = (secs: MenuSection[], startX: number, maxWidth: number) => {
      let y = padding;
      for (const section of secs) {
        ctx.save();
        ctx.font = `bold ${18 * rs}px ${config.fonts.category}`;
        ctx.fillStyle = config.colors.category;
        ctx.textAlign = "left";
        const titleText = section.title.toUpperCase();
        ctx.fillText(titleText, startX, y);
        y += 6 * rs;
        const textW = ctx.measureText(titleText).width;
        ctx.fillStyle = config.colors.category;
        ctx.fillRect(startX, y, Math.min(textW, maxWidth), 2 * rs);
        y += 14 * rs;
        ctx.restore();
        for (const item of section.items) {
          if (y > H - padding) break;
          const iconSize = config.showIcons ? config.iconSize * rs : 0;
          const iconGap = config.showIcons ? (config.iconSize + 4) * rs : 0;
          let itemX = startX;
          if (config.showIcons && item.type) {
            drawTypeIcon(ctx, item.type, itemX, y - iconSize * 0.75, iconSize);
            itemX += iconGap;
          }
          ctx.save();
          ctx.font = `bold ${12 * rs}px ${config.fonts.itemName}`;
          ctx.fillStyle = config.colors.itemName;
          ctx.textAlign = "left";
          const priceStr = formatPrice(item.price, config.currency);
          const nameMaxW = maxWidth - iconGap - 70 * rs;
          const nameText = truncateText(ctx, item.name, nameMaxW);
          ctx.fillText(nameText, itemX, y);
          ctx.font = `bold ${12 * rs}px ${config.fonts.price}`;
          ctx.fillStyle = config.colors.price;
          ctx.textAlign = "right";
          if (priceStr) ctx.fillText(priceStr, startX + maxWidth, y);
          ctx.restore();
          y += lineH;
          if (config.showDescription && item.description) {
            ctx.save();
            ctx.font = `${10 * rs}px ${config.fonts.description}`;
            ctx.fillStyle = config.colors.description;
            ctx.textAlign = "left";
            const descLines = wrapText(ctx, item.description, maxWidth - iconGap, 10 * rs);
            for (const line of descLines.slice(0, 2)) {
              ctx.fillText(line, itemX, y);
              y += lineH * 0.85;
            }
            ctx.restore();
          }
          if (config.showSpiceLevel && item.spiceLevel) {
            drawSpiceIcon(ctx, item.spiceLevel, itemX, y - 10 * rs, 10 * rs);
            y += lineH * 0.5;
          }
          y += 6 * rs;
        }
        y += 16 * rs;
      }
    };
    drawColumn(col1Sections, padding, useTwoCols ? colWidth - 20 * rs : W - padding * 2);
    if (useTwoCols) {
      drawColumn(col2Sections, padding + colWidth + 20 * rs, colWidth - 20 * rs);
    }
    if (sections.length > 0) {
      ctx.save();
      ctx.font = `${9 * rs}px ${config.fonts.itemName}`;
      ctx.fillStyle = config.colors.description;
      ctx.textAlign = "center";
      ctx.fillText(`${pageIndex + 1}`, W / 2, H - 20 * rs);
      ctx.restore();
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    render(canvas, scale * RENDER_SCALE);
    canvas.style.width = `${template.width * scale}px`;
    canvas.style.height = `${template.height * scale}px`;
  }, [render, scale, template.width, template.height]);

  useImperativeHandle(ref, () => ({
    exportHighRes: () =>
      new Promise<Blob>((resolve, reject) => {
        const offscreen = document.createElement("canvas");
        render(offscreen, 4);
        setTimeout(() => {
          offscreen.toBlob(
            (blob) => { if (blob) resolve(blob); else reject(new Error("Failed to export")); },
            "image/png",
            1.0
          );
        }, 500);
      }),
  }));

  return <canvas ref={canvasRef} className="shadow-lg rounded" style={{ display: "block" }} />;
});

export default MenuCanvas;

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, _fontSize: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxW && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
