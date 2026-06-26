"use client";

import React, { useState, useCallback, useMemo } from "react";
import { BookOpen, Layers, Settings, Eye, ChevronRight, Plus, Trash2 } from "lucide-react";
import { MenuConfig, MenuSection, PageTemplate } from "@/types/menu";
import TemplateUpload from "@/components/menu/TemplateUpload";
import ExcelUpload from "@/components/menu/ExcelUpload";
import StylePanel from "@/components/menu/StylePanel";
import MenuPreview from "@/components/menu/MenuPreview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 12;

const DEFAULT_CONFIG: MenuConfig = {
  restaurantName: "",
  menuType: "single",
  useCustomInnerTemplates: false,
  fonts: {
    category: "Playfair Display",
    itemName: "Inter",
    description: "Inter",
    price: "Inter",
  },
  colors: {
    category: "#1a1a2e",
    itemName: "#2d2d2d",
    description: "#6b6b6b",
    price: "#c0392b",
    background: "#fff8f0",
  },
  iconPosition: { x: 0, y: 0 },
  showIcons: true,
  iconSize: 14,
  vegIconStyle: "fssai",
  nonVegIconStyle: "fssai",
  iconPlacement: "before",
  fontSizes: {
    category: 18,
    itemName: 13,
    description: 10,
    price: 13,
  },
  layoutColumns: "auto",
  contentPadding: 6,
  contentTopOffset: 0,
  contentBottomOffset: 5,
  contentLeftOffset: 0,
  currency: "£",
  showDescription: true,
  showSpiceLevel: true,
  showAllergens: false,
  allergenDisplayStyle: "emoji",
  allergenSize: 9,
  allergenColor: "#e65100",
  spacingAfterHeading: 8,
  itemSpacing: 6,
};

type Step = "setup" | "style" | "preview";

// Analyse a template image on canvas to find the safe text zone.
// Divides into horizontal strips and measures brightness variance (high variance
// = photographic/complex area = avoid placing text there).
async function detectSafeTextArea(
  imageUrl: string
): Promise<{ topOffset: number; bottomOffset: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const STRIPS = 24;
      const W = Math.min(img.width, 300);
      const H = Math.min(img.height, 300);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ topOffset: 0, bottomOffset: 5 });
      ctx.drawImage(img, 0, 0, W, H);

      const stripH = Math.max(1, Math.floor(H / STRIPS));
      const vars: number[] = [];

      for (let s = 0; s < STRIPS; s++) {
        const y = s * stripH;
        const data = ctx.getImageData(0, y, W, Math.min(stripH, H - y)).data;
        let sum = 0, sq = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const b = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          sum += b; sq += b * b; n++;
        }
        const mean = n ? sum / n : 0;
        vars.push(n ? sq / n - mean * mean : 0);
      }

      // Adaptive threshold: strips with variance in the top 35% of the range are "complex"
      const hi = Math.max(...vars);
      const lo = Math.min(...vars);
      const threshold = lo + (hi - lo) * 0.35;

      // Bottom: walk up from bottom to find where the complex photo zone starts
      let lastSafeStrip = STRIPS - 1;
      let complexCount = 0;
      for (let i = STRIPS - 1; i >= 0; i--) {
        if (vars[i] > threshold) {
          complexCount++;
          if (complexCount >= 2) { lastSafeStrip = i; }
        } else {
          complexCount = 0;
        }
      }
      const bottomOffset = Math.round(((STRIPS - 1 - lastSafeStrip) / STRIPS) * 100);

      // Top: walk down to skip any complex header region
      let firstSafeStrip = 0;
      complexCount = 0;
      for (let i = 0; i < Math.floor(STRIPS / 2); i++) {
        if (vars[i] > threshold) {
          complexCount++;
          if (complexCount >= 2) firstSafeStrip = i + 1;
        } else {
          complexCount = 0;
        }
      }
      const topOffset = Math.round((firstSafeStrip / STRIPS) * 100);

      resolve({
        topOffset: Math.min(topOffset, 35),
        bottomOffset: Math.min(Math.max(bottomOffset, 0), 60),
      });
    };
    img.onerror = () => resolve({ topOffset: 0, bottomOffset: 5 });
    img.src = imageUrl;
  });
}

export default function Home() {
  const [step, setStep] = useState<Step>("setup");
  const [config, setConfig] = useState<MenuConfig>(DEFAULT_CONFIG);
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [singleTemplate, setSingleTemplate] = useState<PageTemplate | null>(null);
  const [frontTemplate, setFrontTemplate] = useState<PageTemplate | null>(null);
  const [innerTemplate, setInnerTemplate] = useState<PageTemplate | null>(null);
  const [lastTemplate, setLastTemplate] = useState<PageTemplate | null>(null);
  const [customInnerTemplates, setCustomInnerTemplates] = useState<(PageTemplate | null)[]>([]);

  const [detecting, setDetecting] = useState(false);

  const patchConfig = useCallback((patch: Partial<MenuConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
  }, []);

  const handleAutoDetect = useCallback(async () => {
    // Use the content template (inner for multi, single for single)
    const url =
      config.menuType === "single"
        ? singleTemplate?.imageUrl
        : (innerTemplate ?? frontTemplate)?.imageUrl;
    if (!url) return;
    setDetecting(true);
    try {
      const { topOffset, bottomOffset } = await detectSafeTextArea(url);
      patchConfig({ contentTopOffset: topOffset, contentBottomOffset: bottomOffset });
    } finally {
      setDetecting(false);
    }
  }, [config.menuType, singleTemplate, innerTemplate, frontTemplate, patchConfig]);

  const pages = useMemo(() => {
    if (sections.length === 0) return [];

    if (config.menuType === "single") {
      const tpl = singleTemplate;
      if (!tpl) return [];
      return [{ template: tpl, sections }];
    }

    const result: Array<{ template: PageTemplate; sections: MenuSection[] }> = [];

    // Front page is a cover — it gets NO menu items
    if (frontTemplate) {
      result.push({ template: frontTemplate, sections: [] });
    }

    // Distribute all menu items across inner pages
    let remaining = [...sections];
    let innerIdx = 0;

    while (remaining.length > 0) {
      const tpl =
        config.useCustomInnerTemplates && customInnerTemplates[innerIdx]
          ? customInnerTemplates[innerIdx]!
          : innerTemplate || frontTemplate;

      if (!tpl) break;

      let itemCount = 0;
      const pageSections: MenuSection[] = [];
      for (const sec of remaining) {
        if (pageSections.length > 0 && sec.forceNewPage) break; // user-requested page break
        if (itemCount + sec.items.length > ITEMS_PER_PAGE && pageSections.length > 0) break;
        pageSections.push(sec);
        itemCount += sec.items.length;
      }

      result.push({ template: tpl, sections: pageSections });
      remaining = remaining.slice(pageSections.length);
      innerIdx++;

      if (innerIdx > 20) break;
    }

    // Last/back page is appended at the end with NO menu items (it's a back cover)
    if (lastTemplate) {
      result.push({ template: lastTemplate, sections: [] });
    }

    return result;
  }, [config.menuType, config.useCustomInnerTemplates, sections, singleTemplate, frontTemplate, innerTemplate, customInnerTemplates, lastTemplate]);

  const canProceedToStyle =
    sections.length > 0 &&
    (config.menuType === "single" ? !!singleTemplate : !!frontTemplate);

  const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: "setup", label: "Setup", icon: <Layers size={16} /> },
    { id: "style", label: "Style", icon: <Settings size={16} /> },
    { id: "preview", label: "Preview & Export", icon: <Eye size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">MenuCraft</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Menu Generator</span>
          </div>
          <nav className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => {
                    if (s.id === "style" && !canProceedToStyle) return;
                    if (s.id === "preview" && !canProceedToStyle) return;
                    setStep(s.id);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    step === s.id
                      ? "bg-indigo-600 text-white"
                      : (s.id === "style" || s.id === "preview") && !canProceedToStyle
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  {s.icon}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {step === "setup" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Menu Setup</h2>
                <p className="text-sm text-gray-500">Choose your menu type and upload design templates</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">Menu Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "single", label: "Single Page", desc: "All items on one page" },
                    { value: "multi", label: "Multi Page", desc: "Sections spread across pages" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patchConfig({ menuType: opt.value as "single" | "multi" })}
                      style={{ touchAction: "manipulation" }}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                        config.menuType === opt.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300"
                      )}
                    >
                      <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {config.menuType === "single" ? (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-3">Page Template</label>
                  <TemplateUpload
                    label="Menu Page Template"
                    template={singleTemplate}
                    onUpload={setSingleTemplate}
                    onRemove={() => setSingleTemplate(null)}
                    hint="Upload your menu design. Menu content will be overlaid."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-3">Front / Cover Page</label>
                    <TemplateUpload
                      label="Front Page Template"
                      template={frontTemplate}
                      onUpload={setFrontTemplate}
                      onRemove={() => setFrontTemplate(null)}
                      hint="Cover page design"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700">Inner Pages</label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.useCustomInnerTemplates}
                          onChange={(e) => {
                            patchConfig({ useCustomInnerTemplates: e.target.checked });
                            if (!e.target.checked) setCustomInnerTemplates([]);
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span className="text-xs text-gray-600">Different design per page</span>
                      </label>
                    </div>

                    {!config.useCustomInnerTemplates ? (
                      <TemplateUpload
                        label="Inner Page Template"
                        template={innerTemplate}
                        onUpload={setInnerTemplate}
                        onRemove={() => setInnerTemplate(null)}
                        hint="Same template used for all inner pages"
                      />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">Upload a different template for each inner page</p>
                        {customInnerTemplates.map((tpl, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <div className="flex-1">
                              <TemplateUpload
                                label={`Inner Page ${i + 1}`}
                                template={tpl}
                                onUpload={(t) => {
                                  const arr = [...customInnerTemplates];
                                  arr[i] = t;
                                  setCustomInnerTemplates(arr);
                                }}
                                onRemove={() => {
                                  const arr = [...customInnerTemplates];
                                  arr[i] = null;
                                  setCustomInnerTemplates(arr);
                                }}
                              />
                            </div>
                            <button
                              onClick={() => setCustomInnerTemplates((a) => a.filter((_, idx) => idx !== i))}
                              className="mt-2 p-1.5 text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setCustomInnerTemplates((a) => [...a, null])}
                          className="w-full py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-500 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus size={14} />
                          Add Inner Page Template
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-3">
                      Last / Back Page
                      <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <TemplateUpload
                      label="Last Page Template"
                      template={lastTemplate}
                      onUpload={setLastTemplate}
                      onRemove={() => setLastTemplate(null)}
                      hint="Back cover or final page (will replace the last generated page)"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Menu Data</h2>
                <p className="text-sm text-gray-500">Upload your menu items from Excel</p>
              </div>

              <ExcelUpload sections={sections} onParsed={setSections} />

              {sections.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Loaded Menu Items</h3>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {sections.map((sec, i) => (
                      <div key={`${i}-${sec.title}`} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{sec.title}</p>
                          {config.menuType === "multi" && i > 0 && (
                            <label className="flex items-center gap-1 cursor-pointer" title="Force this section to start on a new page">
                              <input
                                type="checkbox"
                                checked={!!sec.forceNewPage}
                                onChange={(e) => {
                                  const updated = sections.map((s, idx) =>
                                    idx === i ? { ...s, forceNewPage: e.target.checked } : s
                                  );
                                  setSections(updated);
                                }}
                                className="w-3 h-3 text-indigo-600 rounded"
                              />
                              <span className="text-[10px] text-gray-500">New page</span>
                            </label>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {sec.items.map((item, i) => (
                            <div key={i} className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {item.type === "veg" && (
                                  <span className="shrink-0 w-3 h-3 rounded-sm border border-green-600 flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 block" />
                                  </span>
                                )}
                                {item.type === "non-veg" && (
                                  <span className="shrink-0 w-3 h-3 rounded-sm border border-red-700 flex items-center justify-center">
                                    <span className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5px] border-l-transparent border-r-transparent border-b-red-700 block" />
                                  </span>
                                )}
                                <span className="text-sm text-gray-800 truncate">{item.name}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-600 shrink-0">
                                {item.price !== "" ? `${config.currency}${item.price}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setStep("style")} disabled={!canProceedToStyle}>
                  Continue to Styling
                  <ChevronRight size={16} className="ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "style" && (
          /* Fixed-height grid — each column scrolls independently */
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            style={{ height: "calc(100vh - 7rem)" }}
          >
            {/* Left — style controls with internal scroll */}
            <div className="lg:col-span-1 flex flex-col gap-4 min-h-0 overflow-hidden">
              <div className="shrink-0 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Styling</h2>
                  <p className="text-sm text-gray-500">Customize colors, fonts and layout</p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  disabled={detecting || !(singleTemplate ?? innerTemplate ?? frontTemplate)}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-indigo-300 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Analyses the template image and automatically sets top/bottom content limits to avoid photo areas"
                >
                  {detecting ? "Detecting…" : "✦ Auto-detect text area"}
                </button>
              </div>
              <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 p-5 overflow-y-auto">
                <StylePanel config={config} onChange={patchConfig} />
              </div>
              <div className="shrink-0 flex justify-between">
                <Button variant="outline" onClick={() => setStep("setup")}>Back</Button>
                <Button onClick={() => setStep("preview")}>
                  Preview Menu
                  <ChevronRight size={16} className="ml-1.5" />
                </Button>
              </div>
            </div>

            {/* Right — preview with its own internal scroll, never moves */}
            <div className="lg:col-span-2 min-h-0 bg-white rounded-xl border border-gray-200 p-5 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Live Preview</h3>
              {pages.length > 0 ? (
                <MenuPreview pages={pages} config={config} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                  Upload a template and Excel data to see preview
                </div>
              )}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Preview & Export</h2>
                <p className="text-sm text-gray-500">
                  {pages.length} page{pages.length !== 1 ? "s" : ""} · Review and export in high resolution
                </p>
              </div>
              <Button variant="outline" onClick={() => setStep("style")}>
                Back to Styling
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {pages.length > 0 ? (
                <MenuPreview pages={pages} config={config} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  No pages to preview
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
