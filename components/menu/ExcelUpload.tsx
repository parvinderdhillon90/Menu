"use client";

import React, { useCallback, useState } from "react";
import { FileSpreadsheet, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { MenuSection } from "@/types/menu";
import { parseMenuExcel, generateExcelTemplate } from "@/lib/excel-parser";
import { cn } from "@/lib/utils";

interface ExcelUploadProps {
  sections: MenuSection[];
  onParsed: (sections: MenuSection[]) => void;
}

export default function ExcelUpload({ sections, onParsed }: ExcelUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { setError("Please upload an Excel file (.xlsx, .xls) or CSV"); return; }
      setLoading(true);
      setError(null);
      try {
        const parsed = await parseMenuExcel(file);
        if (parsed.length === 0) { setError("No menu data found. Please check the file format."); return; }
        setFileName(file.name);
        onParsed(parsed);
      } catch { setError("Failed to parse file. Please use the template format."); }
      finally { setLoading(false); }
    },
    [onParsed]
  );

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ""; };
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Menu Data (Excel)</span>
        <button onClick={generateExcelTemplate} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
          <Download size={12} /> Download Template
        </button>
      </div>
      {sections.length > 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800">{fileName}</p>
              <p className="text-xs text-green-600 mt-0.5">{sections.length} categories · {totalItems} items loaded</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sections.map((s) => (
                  <span key={s.title} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s.title} ({s.items.length})</span>
                ))}
              </div>
            </div>
            <label className="text-xs text-indigo-600 cursor-pointer hover:underline shrink-0">
              Replace
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
            </label>
          </div>
        </div>
      ) : (
        <label
          className={cn(
            "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
            dragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
          {loading ? (
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <FileSpreadsheet size={22} className="text-indigo-400" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">Upload Excel / CSV</p>
            <p className="text-xs text-gray-400 mt-0.5">Drop file here or click to browse</p>
            <p className="text-xs text-gray-400">.xlsx, .xls, .csv supported</p>
          </div>
        </label>
      )}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle size={14} />{error}
        </div>
      )}
    </div>
  );
}
