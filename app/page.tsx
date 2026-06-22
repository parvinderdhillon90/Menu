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
  currency: "£",
  showDescription: true,
  showSpiceLevel: true,
  showAllergens: false,
  allergenDisplayStyle: "emoji",
};

type Step = "setup" | "style" | "preview";

export default function Home() {
  const [step, setStep] = useState<Step>("setup");
  const [config, setConfig] = useState<MenuConfig>(DEFAULT_CONFIG);
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [singleTemplate, setSingleTemplate] = useState<PageTemplate | null>(null);
  const [frontTemplate, setFrontTemplate] = useState<PageTemplate | null>(null);
  const [innerTemplate, setInnerTemplate] = useState<PageTemplate | null>(null);
  const [lastTemplate, setLastTemplate] = useState<PageTemplate | null>(null);
  const [customInnerTemplates, setCustomInnerTemplates] = useState<(PageTemplate | null)[]>([]);

  const patchConfig = useCallback((patch: Partial<MenuConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
  }, []);

  const pages = useMemo(() => {
    if (sections.length === 0) return [];

    if (config.menuType === "single") {
      const tpl = singleTemplate;
      if (!tpl) return [];
      return [{ template: tpl, sections }];
    }

    const result: Array<{ template: PageTemplate; sections: MenuSection[] }> = [];
    let remaining = [...sections];
    let pageIdx = 0;

    while (remaining.length > 0) {
      const isFront = pageIdx === 0 && frontTemplate;
      const tpl = isFront
        ? frontTemplate!
        : config.useCustomInnerTemplates && customInnerTemplates[pageIdx - 1]
        ? customInnerTemplates[pageIdx - 1]!
        : innerTemplate || frontTemplate;

      if (!tpl) break;

      let itemCount = 0;
      const pageSections: MenuSection[] = [];
      for (const sec of remaining) {
        if (itemCount + sec.items.length > ITEMS_PER_PAGE && pageSections.length > 0) break;
        pageSections.push(sec);
        itemCount += sec.items.length;
      }

      result.push({ template: tpl, sections: pageSections });
      remaining = remaining.slice(pageSections.length);
      pageIdx++;

      if (pageIdx > 20) break;
    }

    // Apply last page template to the final page if set
    if (lastTemplate && result.length > 1) {
      result[result.length - 1] = { ...result[result.length - 1], template: lastTemplate };
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
                      onClick={() => patchConfig({ menuType: opt.value as "single" | "multi" })}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
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
                    {sections.map((sec) => (
                      <div key={sec.title} className="px-4 py-3">
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">{sec.title}</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Styling</h2>
                <p className="text-sm text-gray-500">Customize colors, fonts and layout</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <StylePanel config={config} onChange={patchConfig} />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("setup")}>Back</Button>
                <Button onClick={() => setStep("preview")}>
                  Preview Menu
                  <ChevronRight size={16} className="ml-1.5" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
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
