"use client";

import React, { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { PageTemplate } from "@/types/menu";
import { cn } from "@/lib/utils";

interface TemplateUploadProps {
  label: string;
  template: PageTemplate | null;
  onUpload: (template: PageTemplate) => void;
  onRemove: () => void;
  hint?: string;
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export default function TemplateUpload({ label, template, onUpload, onRemove, hint }: TemplateUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("File not supported. Please upload a PNG, JPG, or WebP image.");
        return;
      }
      setError(null);
      setLoading(true);
      setProgress(0);

      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          // File reading = 0–80%, image decode = 80–100%
          setProgress(Math.round((e.loaded / e.total) * 80));
        }
      };

      reader.onload = () => {
        setProgress(80);
        const dataUrl = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
          setProgress(100);
          onUpload({
            id: `tpl_${Date.now()}`,
            label,
            imageUrl: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
          setLoading(false);
          setProgress(0);
        };
        img.onerror = () => {
          setError("Failed to load image. Please try another file.");
          setLoading(false);
          setProgress(0);
        };
        img.src = dataUrl;
      };

      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
        setLoading(false);
        setProgress(0);
      };

      reader.readAsDataURL(file);
    },
    [label, onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  if (template) {
    return (
      <div className="rounded-xl overflow-hidden border-2 border-indigo-200 bg-gray-50">
        <img src={template.imageUrl} alt={label} className="w-full object-contain max-h-48" />
        {/* Always-visible footer — hover overlays are invisible on iPad touch */}
        <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
            <p className="text-xs text-gray-400">{template.width} × {template.height}px</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label
              className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline"
              style={{ touchAction: "manipulation" }}
            >
              Replace
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={onFileChange}
              />
            </label>
            <button
              type="button"
              onClick={onRemove}
              style={{ touchAction: "manipulation" }}
              className="text-xs text-red-500 font-medium hover:text-red-700 flex items-center gap-0.5"
            >
              <X size={12} /> Remove
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
          dragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
        {loading ? (
          <div className="w-full space-y-2 px-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Uploading image...</span>
              <span className="font-medium text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              {dragging ? (
                <Upload size={20} className="text-indigo-600" />
              ) : (
                <ImageIcon size={20} className="text-indigo-400" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{hint || "Drop image here or click to browse"}</p>
              <p className="text-xs text-gray-400">PNG, JPG, WebP supported</p>
            </div>
          </>
        )}
      </label>
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
