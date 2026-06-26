"use client";

import React, { useRef, useState } from "react";
import { Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { MenuSection, PageTemplate, MenuConfig } from "@/types/menu";
import MenuCanvas, { MenuCanvasHandle } from "./MenuCanvas";
import { Button } from "@/components/ui/button";

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
  const [exporting, setExporting] = useState<null | "png" | "zip" | "pdf">(null);
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

          {/* PDF — always visible, exports all pages */}
          <Button size="sm" onClick={handleExportPdf} disabled={busy}>
            <FileText size={14} className="mr-1.5" />
            {exporting === "pdf"
              ? "Building PDF…"
              : pages.length > 1
              ? `Export PDF (${pages.length} pages)`
              : "Export PDF"}
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
        PNG exports are 300 dpi equivalent · PDF is A4, print-ready
      </p>
    </div>
  );
}
