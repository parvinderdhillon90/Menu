"use client";

import React, { useRef, useState } from "react";
import { Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Edit3 } from "lucide-react";
import { MenuSection, PageTemplate, MenuConfig } from "@/types/menu";
import MenuCanvas, { MenuCanvasHandle } from "./MenuCanvas";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

interface MenuPreviewProps {
  pages: Array<{ template: PageTemplate; sections: MenuSection[] }>;
  config: MenuConfig;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export default function MenuPreview({ pages, config }: MenuPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(0.55);
  const [exporting, setExporting] = useState<null | "png" | "zip" | "pdf" | "editablepdf">(null);
  const canvasRef = useRef<MenuCanvasHandle>(null);
  const allRefs = useRef<(MenuCanvasHandle | null)[]>([]);

  const page = pages[currentPage];
  if (!page) return null;

  const name = config.restaurantName || "menu";

  // ── Export current page as PNG ──────────────────────────────────────────────
  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExporting("png");
    try {
      const blob = await canvasRef.current.exportHighRes();
      triggerDownload(blob, `${name}-page-${currentPage + 1}.png`);
    } finally { setExporting(null); }
  };

  // ── Export all pages as ZIP of PNGs ─────────────────────────────────────────
  const handleExportZip = async () => {
    setExporting("zip");
    try {
      if (pages.length === 1) { await handleExportPng(); return; }
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (let i = 0; i < allRefs.current.length; i++) {
        const ref = allRefs.current[i];
        if (!ref) continue;
        const blob = await ref.exportHighRes();
        zip.file(`${name}-page-${i + 1}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      triggerDownload(zipBlob, `${name}-pages.zip`);
    } finally { setExporting(null); }
  };

  // ── Export all pages as a single high-resolution PDF ────────────────────────
  const handleExportPdf = async () => {
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");

      // Render all pages at high resolution
      const blobs: Blob[] = [];
      for (let i = 0; i < allRefs.current.length; i++) {
        const ref = allRefs.current[i];
        if (!ref) continue;
        blobs.push(await ref.exportHighRes());
      }
      if (blobs.length === 0) return;

      // Determine PDF page orientation from first template
      const { width: tplW, height: tplH } = pages[0].template;
      const isLandscape = tplW > tplH;

      // Use A4 dimensions in mm
      const pdfW = isLandscape ? 297 : 210;
      const pdfH = isLandscape ? 210 : 297;

      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: false, // keep full quality
      });

      for (let i = 0; i < blobs.length; i++) {
        if (i > 0) doc.addPage("a4", isLandscape ? "landscape" : "portrait");

        const dataUrl = await blobToDataUrl(blobs[i]);

        // Scale image to fill A4 while maintaining aspect ratio
        const { width: tW, height: tH } = pages[i].template;
        const imgAspect = tW / tH;
        const pageAspect = pdfW / pdfH;

        let imgW: number, imgH: number, x: number, y: number;
        if (imgAspect > pageAspect) {
          imgW = pdfW;
          imgH = pdfW / imgAspect;
          x = 0;
          y = (pdfH - imgH) / 2;
        } else {
          imgH = pdfH;
          imgW = pdfH * imgAspect;
          x = (pdfW - imgW) / 2;
          y = 0;
        }

        doc.addImage(dataUrl, "PNG", x, y, imgW, imgH, undefined, "FAST");
      }

      // Use blob + anchor for iOS Safari compatibility
      const pdfBlob = doc.output("blob");
      triggerDownload(pdfBlob, `${name}.pdf`);
    } finally { setExporting(null); }
  };

  // ── Export all pages as editable (text-based) PDF ──────────────────────────
  const handleExportEditablePdf = async () => {
    setExporting("editablepdf");
    try {
      const { jsPDF } = await import("jspdf");

      // Build page dimensions from template aspect ratio, anchored to A4 height
      const firstTpl = pages[0].template;
      const tAspect = firstTpl.width / firstTpl.height;
      const pdfH = 297; // mm
      const pdfW = Math.round(pdfH * tAspect * 100) / 100;
      const isLandscape = tAspect > 1;

      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: [isLandscape ? pdfH : pdfW, isLandscape ? pdfW : pdfH],
      });

      // Register custom uploaded fonts so they embed in the PDF
      const customFontNames = new Set<string>();
      if (config.customFonts?.length) {
        for (const cf of config.customFonts) {
          try {
            const b64 = cf.data.includes(",") ? cf.data.split(",")[1] : cf.data;
            const filename = `${cf.name}.ttf`;
            doc.addFileToVFS(filename, b64);
            doc.addFont(filename, cf.name, "normal");
            doc.addFont(filename, cf.name, "bold");
            customFontNames.add(cf.name);
          } catch { /* skip malformed font */ }
        }
      }

      // Map a CSS font-family to the best jsPDF built-in fallback
      const mapFont = (family: string): string => {
        if (customFontNames.has(family)) return family;
        const l = family.toLowerCase();
        if (/courier|mono|inconsolata|fira mono|source code/.test(l)) return "courier";
        if (/times|georgia|garamond|playfair|lora|merriweather|crimson|libre baskerville|eb garamond|cormorant|bodoni/.test(l)) return "times";
        return "helvetica";
      };

      // Hex → [r, g, b]
      const hexRgb = (hex: string): [number, number, number] => {
        const h = hex.replace("#", "");
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      };

      // Truncate text to fit maxW (using current doc font)
      const truncatePdf = (text: string, maxW: number): string => {
        if (doc.getTextWidth(text) <= maxW) return text;
        let t = text;
        while (t.length > 0 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
        return t + "…";
      };

      // Word-wrap text to fit maxW
      const wrapPdf = (text: string, maxW: number): string[] => {
        const lines: string[] = [];
        let cur = "";
        for (const word of text.split(" ")) {
          const test = cur ? `${cur} ${word}` : word;
          if (doc.getTextWidth(test) > maxW && cur) { lines.push(cur); cur = word; }
          else cur = test;
        }
        if (cur) lines.push(cur);
        return lines;
      };

      // Draw veg / non-veg icon as PDF vector shapes
      const drawIcon = (type: string, x: number, y: number, size: number, style: string) => {
        const half = size / 2;
        const cx = x + half;
        const cy = y + half;
        const isVeg = type === "veg" || type === "vegan";
        const [ir, ig, ib] = isVeg ? [46, 125, 50] : [183, 28, 28];
        doc.setDrawColor(ir, ig, ib);
        doc.setFillColor(ir, ig, ib);
        doc.setLineWidth(size * 0.06);

        if (isVeg) {
          switch (style) {
            case "circle-outline":
              doc.circle(cx, cy, half * 0.88, "S"); break;
            case "filled-circle":
              doc.circle(cx, cy, half * 0.88, "F"); break;
            case "leaf":
              // Approximate leaf as filled circle
              doc.circle(cx, cy, half * 0.88, "F"); break;
            default: // fssai: square + inner circle
              doc.rect(x, y, size, size, "S");
              doc.circle(cx, cy, half * 0.55, "F");
          }
        } else {
          switch (style) {
            case "circle-outline":
              doc.circle(cx, cy, half * 0.88, "S"); break;
            case "filled-circle":
              doc.circle(cx, cy, half * 0.88, "F"); break;
            case "triangle":
              doc.triangle(cx, y + size * 0.05, x + size * 0.05, y + size * 0.95, x + size * 0.95, y + size * 0.95, "F"); break;
            default: // fssai: square + inner triangle
              doc.rect(x, y, size, size, "S");
              doc.triangle(cx, y + size * 0.2, x + size * 0.2, y + size * 0.8, x + size * 0.8, y + size * 0.8, "F");
          }
        }
        doc.setDrawColor(0, 0, 0); doc.setFillColor(0, 0, 0);
      };

      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        if (pageIdx > 0) doc.addPage([isLandscape ? pdfH : pdfW, isLandscape ? pdfW : pdfH]);

        const pg = pages[pageIdx];
        const tpl = pg.template;
        const secs = pg.sections;

        // Actual PDF page size (jsPDF swaps w/h internally for landscape)
        const pgW = isLandscape ? pdfH : pdfW;
        const pgH = isLandscape ? pdfW : pdfH;

        // Template image as raster background
        try {
          doc.addImage(tpl.imageUrl, "PNG", 0, 0, pgW, pgH, undefined, "FAST");
        } catch { /* no background */ }

        // Scale: template pixels → mm
        const sx = pgW / tpl.width;
        const sy = pgH / tpl.height;
        const rs = sy; // row-height scale (vertical)

        // Layout mirrors MenuCanvas.drawMenuContent
        const padPct = (config.contentPadding ?? 6) / 100;
        const padX_mm = pgW * padPct + pgW * (config.contentLeftOffset ?? 0) / 100;
        const padY_mm = pgH * padPct + pgH * (config.contentTopOffset ?? 0) / 100;
        const maxY_mm = pgH - pgH * (padPct + (config.contentBottomOffset ?? 5) / 100);

        // Font sizes: template-px × rs (→ mm), then × 2.835 (→ pt)
        const catPt   = (config.fontSizes?.category    ?? 18) * rs * 2.835;
        const namePt  = (config.fontSizes?.itemName    ?? 13) * rs * 2.835;
        const descPt  = (config.fontSizes?.description ?? 10) * rs * 2.835;
        const pricePt = (config.fontSizes?.price       ?? 13) * rs * 2.835;
        const lineH   = (namePt / 2.835) * 1.6;

        const catFont   = mapFont(config.fonts.category);
        const nameFont  = mapFont(config.fonts.itemName);
        const descFont  = mapFont(config.fonts.description);
        const priceFont = mapFont(config.fonts.price);

        // Column layout (mirrors canvas)
        const totalItems = secs.reduce((s, sec) => s + sec.items.length, 0);
        const colPref = config.layoutColumns ?? "auto";
        const twoCols = colPref === "2" || (colPref === "auto" && totalItems > 8 && secs.length > 1);
        let col1 = secs, col2: MenuSection[] = [];
        if (twoCols) {
          const target = Math.ceil(totalItems / 2);
          let counted = 0, splitAt = secs.length;
          for (let i = 0; i < secs.length; i++) {
            counted += secs[i].items.length;
            if (counted >= target) { splitAt = i + 1; break; }
          }
          col1 = secs.slice(0, splitAt);
          col2 = secs.slice(splitAt);
        }
        const colGap = 30 * rs;
        const contentW = pgW - padX_mm * 2;
        const colW = twoCols ? (contentW - colGap) / 2 : contentW;

        const allergenStyle = config.allergenDisplayStyle || "text";
        const allergenPlacement = config.allergenPlacement ?? "below";
        const allergenSz = (config.allergenSize ?? 9) * rs; // mm
        const allergenColor = config.allergenColor ?? "#e65100";
        const allergenInline = config.showAllergens && allergenStyle !== "text" && allergenPlacement !== "below";
        const allergenBeforeW = allergenInline && allergenPlacement === "before" ? allergenSz * 1.8 : 0;

        const drawColumn = (colSecs: MenuSection[], startX: number, maxWidth: number) => {
          let y = padY_mm;
          const placement = config.iconPlacement || "before";
          const extraHeading = (config.spacingAfterHeading ?? 8) * rs;
          const extraItem = (config.itemSpacing ?? 6) * rs;

          for (const section of colSecs) {
            if (y > maxY_mm) break;

            // Category heading
            const [cr, cg, cb] = hexRgb(config.colors.category);
            doc.setFont(catFont, "bold");
            doc.setFontSize(catPt);
            doc.setTextColor(cr, cg, cb);
            const headingY = y + catPt / 2.835 * 0.75; // baseline offset
            doc.text(section.title.toUpperCase(), startX, headingY);
            const headingW = Math.min(maxWidth, doc.getTextWidth(section.title.toUpperCase()));
            const underlineY = headingY + catPt / 2.835 * 0.18;
            doc.setDrawColor(cr, cg, cb);
            doc.setLineWidth(0.4 * rs);
            doc.line(startX, underlineY, startX + headingW, underlineY);
            y = underlineY + (catPt / 2.835) * 0.85 + extraHeading;

            for (const item of section.items) {
              if (y > maxY_mm) break;

              const iconSize = config.showIcons ? config.iconSize * rs : 0;
              const iconGap = config.showIcons && item.type && placement === "before"
                ? (config.iconSize + 4) * rs : 0;
              const allergenShift = item.allergens ? allergenBeforeW : 0;
              const textX = startX + iconGap + allergenShift;
              const itemBaseline = y + namePt / 2.835 * 0.75;

              // Veg/non-veg icon (before)
              if (config.showIcons && item.type && placement === "before") {
                drawIcon(item.type, startX, y, iconSize, item.type === "veg" || item.type === "vegan"
                  ? config.vegIconStyle : config.nonVegIconStyle);
              }

              // Item name
              const [nr, ng, nb] = hexRgb(config.colors.itemName);
              doc.setFont(nameFont, "bold");
              doc.setFontSize(namePt);
              doc.setTextColor(nr, ng, nb);
              const nameMaxW = maxWidth - iconGap - allergenShift - (pricePt / 2.835) * 4.5;
              const nameText = truncatePdf(item.name, nameMaxW);
              doc.text(nameText, textX, itemBaseline);

              // Icon (after name)
              if (config.showIcons && item.type && placement === "after") {
                const nameW = doc.getTextWidth(nameText);
                drawIcon(item.type, textX + nameW + 2 * rs, y, iconSize,
                  item.type === "veg" || item.type === "vegan" ? config.vegIconStyle : config.nonVegIconStyle);
              }

              // Price (right-aligned)
              const priceStr = formatPrice(item.price, config.currency);
              if (priceStr) {
                const [pr, pg2, pb] = hexRgb(config.colors.price);
                doc.setFont(priceFont, "bold");
                doc.setFontSize(pricePt);
                doc.setTextColor(pr, pg2, pb);
                doc.text(priceStr, startX + maxWidth, itemBaseline, { align: "right" });
              }

              y += lineH;

              // Icon (newline)
              if (config.showIcons && item.type && placement === "newline") {
                drawIcon(item.type, textX, y - iconSize * 0.8, iconSize,
                  item.type === "veg" || item.type === "vegan" ? config.vegIconStyle : config.nonVegIconStyle);
                y += iconSize + 2 * rs;
              }

              // Description
              if (config.showDescription && item.description) {
                const [dr, dg, db] = hexRgb(config.colors.description);
                doc.setFont(descFont, "normal");
                doc.setFontSize(descPt);
                doc.setTextColor(dr, dg, db);
                const descLines = wrapPdf(item.description, maxWidth - iconGap);
                for (const line of descLines.slice(0, 2)) {
                  doc.text(line, textX, y + descPt / 2.835 * 0.75);
                  y += (descPt / 2.835) * 1.5;
                }
              }

              // Allergen info (text style always goes below as real PDF text)
              if (config.showAllergens && item.allergens) {
                const needsBelow = allergenStyle === "text" || allergenPlacement === "below" || allergenStyle === "both";
                if (needsBelow) {
                  const allergenList = item.allergens.split(/[,;]/).map(a => a.trim()).filter(Boolean);
                  const label = `Contains: ${allergenList.join(", ")}`;
                  const [ar, ag2, ab] = hexRgb(allergenColor);
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(allergenSz * 2.835);
                  doc.setTextColor(ar, ag2, ab);
                  doc.text(truncatePdf(label, maxWidth - iconGap), textX, y + allergenSz * 0.75);
                  y += allergenSz * 1.6;
                }
              }

              y += (namePt / 2.835) * 0.5 + extraItem;
            }

            y += catPt / 2.835;
          }
        };

        drawColumn(col1, padX_mm, colW);
        if (twoCols && col2.length > 0) {
          drawColumn(col2, padX_mm + colW + colGap, colW);
        }

        // Page number
        doc.setFont("helvetica", "normal");
        doc.setFontSize(descPt * 0.75);
        doc.setTextColor(150, 150, 150);
        doc.text(`${pageIdx + 1}`, pgW / 2, pgH - padY_mm * 0.4, { align: "center" });
      }

      const pdfBlob = doc.output("blob");
      triggerDownload(pdfBlob, `${name}-editable.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const busy = exporting !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Zoom */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
            className="p-1.5 rounded hover:bg-white transition-colors"
          >
            <ZoomOut size={15} className="text-gray-600" />
          </button>
          <span className="text-xs text-gray-600 w-12 text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
            className="p-1.5 rounded hover:bg-white transition-colors"
          >
            <ZoomIn size={15} className="text-gray-600" />
          </button>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ZIP — only shown for multi-page */}
          {pages.length > 1 && (
            <Button variant="outline" size="sm" onClick={handleExportZip} disabled={busy}>
              <Download size={14} className="mr-1.5" />
              {exporting === "zip" ? "Exporting…" : `PNG ZIP (${pages.length} pages)`}
            </Button>
          )}

          {/* Single-page PNG */}
          <Button variant="outline" size="sm" onClick={handleExportPng} disabled={busy}>
            <Download size={14} className="mr-1.5" />
            {exporting === "png" ? "Exporting…" : "Export PNG"}
          </Button>

          {/* Image-based PDF */}
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={busy}>
            <FileText size={14} className="mr-1.5" />
            {exporting === "pdf"
              ? "Building PDF…"
              : pages.length > 1
              ? `PDF Image (${pages.length}p)`
              : "PDF Image"}
          </Button>

          {/* Editable (text-layer) PDF */}
          <Button size="sm" onClick={handleExportEditablePdf} disabled={busy}
            className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Edit3 size={14} className="mr-1.5" />
            {exporting === "editablepdf"
              ? "Building…"
              : pages.length > 1
              ? `Editable PDF (${pages.length}p)`
              : "Editable PDF"}
          </Button>
        </div>
      </div>

      {/* Page navigation */}
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentPage(i)}
                className={`w-7 h-7 text-xs rounded-full font-medium transition-colors ${
                  i === currentPage
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={currentPage === pages.length - 1}
            className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Canvas preview */}
      <div className="flex items-center justify-center bg-gray-200 rounded-xl p-6 overflow-auto min-h-[400px]">
        <MenuCanvas
          ref={canvasRef}
          template={page.template}
          sections={page.sections}
          config={config}
          pageIndex={currentPage}
          scale={zoom}
        />
      </div>

      {/* Hidden canvases for all-page export */}
      <div className="hidden">
        {pages.map((p, i) => (
          <MenuCanvas
            key={i}
            ref={(el) => { allRefs.current[i] = el; }}
            template={p.template}
            sections={p.sections}
            config={config}
            pageIndex={i}
            scale={1}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        PNG is 300 dpi · PDF Image is A4 raster · Editable PDF has selectable text + embedded fonts
      </p>
    </div>
  );
}
