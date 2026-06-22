"use client";

import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from "react";
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

function drawTypeIcon(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  size: number,
  style: string = "fssai",
  customImg?: HTMLImageElement | null
) {
  if (style === "custom" && customImg && customImg.complete && customImg.naturalWidth > 0) {
    ctx.drawImage(customImg, x, y, size, size);
    return;
  }

  const half = size / 2;
  ctx.save();

  if (type === "veg" || type === "vegan") {
    const color = "#2e7d32";
    switch (style) {
      case "circle-outline":
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.12;
        ctx.beginPath();
        ctx.arc(x + half, y + half, half * 0.88, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "filled-circle":
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + half, y + half, half * 0.88, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "leaf":
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + half, y + size * 0.05);
        ctx.bezierCurveTo(x + size * 0.92, y + size * 0.1, x + size * 0.92, y + size * 0.72, x + half, y + size * 0.92);
        ctx.bezierCurveTo(x + size * 0.08, y + size * 0.72, x + size * 0.08, y + size * 0.1, x + half, y + size * 0.05);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = size * 0.08;
        ctx.beginPath();
        ctx.moveTo(x + half, y + size * 0.3);
        ctx.lineTo(x + half, y + size * 0.85);
        ctx.stroke();
        break;
      default: // fssai
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.12;
        ctx.strokeRect(x, y, size, size);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + half, y + half, half * 0.55, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    if (type === "vegan" && style !== "leaf") {
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${size * 0.45}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("V", x + half, y + half + size * 0.05);
    }
  } else if (type === "non-veg") {
    const color = "#b71c1c";
    switch (style) {
      case "circle-outline":
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.12;
        ctx.beginPath();
        ctx.arc(x + half, y + half, half * 0.88, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "filled-circle":
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + half, y + half, half * 0.88, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "triangle":
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + half, y + size * 0.05);
        ctx.lineTo(x + size * 0.05, y + size * 0.95);
        ctx.lineTo(x + size * 0.95, y + size * 0.95);
        ctx.closePath();
        ctx.fill();
        break;
      default: // fssai
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.12;
        ctx.strokeRect(x, y, size, size);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + half, y + size * 0.2);
        ctx.lineTo(x + size * 0.2, y + size * 0.8);
        ctx.lineTo(x + size * 0.8, y + size * 0.8);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  ctx.restore();
}

const ALLERGEN_EMOJI: Record<string, string> = {
  gluten: "🌾", wheat: "🌾", dairy: "🥛", milk: "🥛",
  eggs: "🥚", egg: "🥚", fish: "🐟", shellfish: "🦐",
  crustaceans: "🦐", nuts: "🥜", "tree nuts": "🥜",
  peanuts: "🥜", peanut: "🥜", soy: "🌱", soya: "🌱",
  sesame: "\ud83flab8", celery: "🥬", mustard: "🟡", lupin: "🌸",
  molluscs: "🦑", sulphites: "⚗️",
};

function drawAllergens(
  ctx: CanvasRenderingContext2D,
  allergensStr: string,
  x: number,
  y: number,
  maxWidth: number,
  rs: number,
  style: string
) {
  const allergens = allergensStr.split(/[,;]/).map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (!allergens.length) return;

  ctx.save();
  if (style === "emoji") {
    ctx.font = `${9 * rs}px serif`;
    ctx.textBaseline = "alphabetic";
    let cx = x;
    for (const a of allergens) {
      const emoji = ALLERGEN_EMOJI[a] ?? "⚠️";
      ctx.fillText(emoji, cx, y);
      cx += 13 * rs;
      if (cx > x + maxWidth) break;
    }
  } else if (style === "symbol") {
    const sz = 9 * rs;
    let cx = x;
    for (const a of allergens) {
      ctx.fillStyle = "#e65100";
      ctx.beginPath();
      ctx.arc(cx + sz / 2, y - sz / 2, sz / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${sz * 0.62}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(a[0].toUpperCase(), cx + sz / 2, y - sz / 2);
      cx += sz + 3 * rs;
      if (cx > x + maxWidth) break;
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  } else {
    // text
    ctx.font = `${8 * rs}px sans-serif`;
    ctx.fillStyle = "#e65100";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const label = `Contains: ${allergens.join(", ")}`;
    ctx.fillText(truncateText(ctx, label, maxWidth), x, y);
  }
  ctx.restore();
}

function drawSpiceIcon(
  ctx: CanvasRenderingContext2D,
  level: string,
  x: number,
  y: number,
  size: number
) {
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
  const vegCustomImgRef = useRef<HTMLImageElement | null>(null);
  const nonVegCustomImgRef = useRef<HTMLImageElement | null>(null);
  const [customImagesVersion, setCustomImagesVersion] = useState(0);

  useEffect(() => {
    if (config.vegIconStyle === "custom" && config.vegIconCustom) {
      const img = new Image();
      img.onload = () => {
        vegCustomImgRef.current = img;
        setCustomImagesVersion((v) => v + 1);
      };
      img.src = config.vegIconCustom;
    } else {
      vegCustomImgRef.current = null;
    }
  }, [config.vegIconStyle, config.vegIconCustom]);

  useEffect(() => {
    if (config.nonVegIconStyle === "custom" && config.nonVegIconCustom) {
      const img = new Image();
      img.onload = () => {
        nonVegCustomImgRef.current = img;
        setCustomImagesVersion((v) => v + 1);
      };
      img.src = config.nonVegIconCustom;
    } else {
      nonVegCustomImgRef.current = null;
    }
  }, [config.nonVegIconStyle, config.nonVegIconCustom]);

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
    [template, sections, config, customImagesVersion]
  );

  function drawMenuContent(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    rs: number
  ) {
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
      const placement = config.iconPlacement || "before";

      for (const section of secs) {
        ctx.save();
        ctx.font = `bold ${18 * rs}px ${config.fonts.category}`;
        ctx.fillStyle = config.colors.category;
        ctx.textAlign = "left";
        const titleText = section.title.toUpperCase();
        ctx.fillText(titleText, startX, y);
        y += 6 * rs;
        const titleW = ctx.measureText(titleText).width;
        ctx.fillRect(startX, y, Math.min(titleW, maxWidth), 2 * rs);
        y += 14 * rs;
        ctx.restore();

        for (const item of section.items) {
          if (y > H - padding) break;

          const iconSize = config.showIcons ? config.iconSize * rs : 0;
          const iconGap = config.showIcons && item.type && placement === "before"
            ? (config.iconSize + 4) * rs
            : 0;
          const textX = startX + iconGap;
          const nameMaxW = maxWidth - iconGap - 70 * rs;

          const isVeg = item.type === "veg" || item.type === "vegan";
          const iconStyle = isVeg ? config.vegIconStyle : config.nonVegIconStyle;
          const customImg = isVeg ? vegCustomImgRef.current : nonVegCustomImgRef.current;

          if (config.showIcons && item.type && placement === "before") {
            drawTypeIcon(ctx, item.type, startX, y - iconSize * 0.75, iconSize, iconStyle, customImg);
          }

          ctx.save();
          ctx.font = `bold ${12 * rs}px ${config.fonts.itemName}`;
          ctx.fillStyle = config.colors.itemName;
          ctx.textAlign = "left";
          const nameText = truncateText(ctx, item.name, nameMaxW);
          ctx.fillText(nameText, textX, y);

          const priceStr = formatPrice(item.price, config.currency);
          if (priceStr) {
            ctx.font = `bold ${12 * rs}px ${config.fonts.price}`;
            ctx.fillStyle = config.colors.price;
            ctx.textAlign = "right";
            ctx.fillText(priceStr, startX + maxWidth, y);
          }
          ctx.restore();

          if (config.showIcons && item.type && placement === "after") {
            ctx.save();
            ctx.font = `bold ${12 * rs}px ${config.fonts.itemName}`;
            const nameW = ctx.measureText(nameText).width;
            ctx.restore();
            drawTypeIcon(ctx, item.type, textX + nameW + 3 * rs, y - iconSize * 0.75, iconSize, iconStyle, customImg);
          }

          y += lineH;

          if (config.showIcons && item.type && placement === "newline") {
            drawTypeIcon(ctx, item.type, textX, y - iconSize * 0.75, iconSize, iconStyle, customImg);
            y += iconSize + 2 * rs;
          }

          if (config.showDescription && item.description) {
            ctx.save();
            ctx.font = `${10 * rs}px ${config.fonts.description}`;
            ctx.fillStyle = config.colors.description;
            ctx.textAlign = "left";
            const descLines = wrapText(ctx, item.description, maxWidth - iconGap, 10 * rs);
            for (const line of descLines.slice(0, 2)) {
              ctx.fillText(line, textX, y);
              y += lineH * 0.85;
            }
            ctx.restore();
          }

          if (config.showAllergens && item.allergens) {
            drawAllergens(ctx, item.allergens, textX, y, maxWidth - iconGap, rs, config.allergenDisplayStyle || "text");
            y += lineH * 0.9;
          }

          if (config.showSpiceLevel && item.spiceLevel) {
            drawSpiceIcon(ctx, item.spiceLevel, textX, y - 10 * rs, 10 * rs);
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
        const exportScale = 4;
        render(offscreen, exportScale);
        setTimeout(() => {
          offscreen.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to export"));
            },
            "image/png",
            1.0
          );
        }, 500);
      }),
  }));

  return (
    <canvas
      ref={canvasRef}
      className="shadow-lg rounded"
      style={{ display: "block" }}
    />
  );
});

export default MenuCanvas;

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxW) {
    t = t.slice(0, -1);
  }
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
