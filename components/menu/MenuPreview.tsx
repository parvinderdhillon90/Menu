"use client";

import React, { useRef, useState } from "react";
import { Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { MenuSection, PageTemplate, MenuConfig } from "@/types/menu";
import MenuCanvas, { MenuCanvasHandle } from "./MenuCanvas";
import { Button } from "@/components/ui/button";

interface MenuPreviewProps {
  pages: Array<{ template: PageTemplate; sections: MenuSection[] }>;
  config: MenuConfig;
}

export default function MenuPreview({ pages, config }: MenuPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(0.55);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<MenuCanvasHandle>(null);
  const allRefs = useRef<(MenuCanvasHandle | null)[]>([]);

  const page = pages[currentPage];
  if (!page) return null;

  const handleExportCurrent = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const blob = await canvasRef.current.exportHighRes();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menu-page-${currentPage + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      if (pages.length === 1) { await handleExportCurrent(); return; }
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (let i = 0; i < allRefs.current.length; i++) {
        const ref = allRefs.current[i];
        if (!ref) continue;
        const blob = await ref.exportHighRes();
        zip.file(`menu-page-${i + 1}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.restaurantName || "menu"}-pages.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))} className="p-1.5 rounded hover:bg-white transition-colors">
            <ZoomOut size={15} className="text-gray-600" />
          </button>
          <span className="text-xs text-gray-600 w-12 text-center font-medium">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} className="p-1.5 rounded hover:bg-white transition-colors">
            <ZoomIn size={15} className="text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {pages.length > 1 && (
            <Button variant="outline" size="sm" onClick={handleExportAll} disabled={exporting}>
              <Download size={14} className="mr-1.5" />
              {exporting ? "Exporting..." : `Export All (${pages.length} pages)`}
            </Button>
          )}
          <Button size="sm" onClick={handleExportCurrent} disabled={exporting}>
            <Download size={14} className="mr-1.5" />
            {exporting ? "Exporting..." : "Export HD PNG"}
          </Button>
        </div>
      </div>
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1.5">
            {pages.map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)}
                className={`w-7 h-7 text-xs rounded-full font-medium transition-colors ${i === currentPage ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))} disabled={currentPage === pages.length - 1} className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <div className="flex items-center justify-center bg-gray-200 rounded-xl p-6 overflow-auto min-h-[400px]">
        <MenuCanvas ref={canvasRef} template={page.template} sections={page.sections} config={config} pageIndex={currentPage} scale={zoom} />
      </div>
      <div className="hidden">
        {pages.map((p, i) => (
          <MenuCanvas key={i} ref={(el) => { allRefs.current[i] = el; }} template={p.template} sections={p.sections} config={config} pageIndex={i} scale={1} />
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center">Preview is approximate · Export produces high-resolution PNG (300dpi equivalent)</p>
    </div>
  );
}
