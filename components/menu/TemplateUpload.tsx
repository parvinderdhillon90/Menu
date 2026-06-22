"use client";

import React, { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { PageTemplate } from "@/types/menu";
import { fileToDataUrl, cn } from "@/lib/utils";

interface TemplateUploadProps {
  label: string;
  template: PageTemplate | null;
  onUpload: (template: PageTemplate) => void;
  onRemove: () => void;
  hint?: string;
}

export default function TemplateUpload({ label, template, onUpload, onRemove, hint }: TemplateUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) { alert("Please upload an image file (PNG, JPG, JPEG, WebP)"); return; }
      setLoading(true);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = new window.Image();
        img.onload = () => {
          onUpload({ id: `tpl_${Date.now()}`, label, imageUrl: dataUrl, width: img.naturalWidth, height: img.naturalHeight });
          setLoading(false);
        };
        img.src = dataUrl;
      } catch { alert("Failed to load image"); setLoading(false); }
    },
    [label, onUpload]
  );

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  if (template) {
    return (
      <div className="relative group rounded-xl overflow-hidden border-2 border-indigo-200 bg-gray-50">
        <img src={template.imageUrl} alt={label} className="w-full object-contain max-h-48" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <label className="cursor-pointer bg-white text-gray-800 text-xs px-3 py-1.5 rounded-full font-medium hover:bg-gray-100">
            Replace
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </label>
          <button onClick={onRemove} className="bg-white text-red-600 text-xs px-3 py-1.5 rounded-full font-medium hover:bg-gray-100 flex items-center gap-1">
            <X size={12} /> Remove
          </button>
        </div>
        <div className="p-2 bg-white border-t border-gray-100">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xs text-gray-400">{template.width} × {template.height}px</p>
        </div>
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
        dragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      {loading ? (
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
          {dragging ? <Upload size={20} className="text-indigo-600" /> : <ImageIcon size={20} className="text-indigo-400" />}
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{hint || "Drop image here or click to browse"}</p>
        <p className="text-xs text-gray-400">PNG, JPG, WebP supported</p>
      </div>
    </label>
  );
}
