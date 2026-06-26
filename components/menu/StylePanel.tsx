"use client";

import React, { useRef } from "react";
import { Upload } from "lucide-react";
import { MenuConfig, VegIconStyle, NonVegIconStyle, IconPlacement, AllergenDisplayStyle } from "@/types/menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fileToDataUrl } from "@/lib/utils";

const FONTS = [
  "Inter", "Playfair Display", "Lato", "Montserrat", "Raleway",
  "Georgia", "Times New Roman", "Arial", "Trebuchet MS", "Verdana",
  "Cormorant Garamond", "EB Garamond", "Libre Baskerville",
];

const VEG_ICON_OPTIONS: { value: VegIconStyle; label: string; preview: React.ReactNode }[] = [
  {
    value: "fssai",
    label: "FSSAI",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="1.5" width="15" height="15" stroke="#2e7d32" strokeWidth="2" />
        <circle cx="9" cy="9" r="4" fill="#2e7d32" />
      </svg>
    ),
  },
  {
    value: "circle-outline",
    label: "Circle",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="#2e7d32" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: "filled-circle",
    label: "Filled",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="7.5" fill="#2e7d32" />
      </svg>
    ),
  },
  {
    value: "leaf",
    label: "Leaf",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M9 1.5 C16 2.5 16.5 13 9 16.5 C1.5 13 2 2.5 9 1.5Z" fill="#2e7d32" />
      </svg>
    ),
  },
  {
    value: "custom",
    label: "Custom",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="1.5" width="15" height="15" rx="2" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="3 2" />
        <path d="M6 11 L9 7.5 L12 11 M9 7.5 V14" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const NON_VEG_ICON_OPTIONS: { value: NonVegIconStyle; label: string; preview: React.ReactNode }[] = [
  {
    value: "fssai",
    label: "FSSAI",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="1.5" width="15" height="15" stroke="#b71c1c" strokeWidth="2" />
        <polygon points="9,4 3.5,14 14.5,14" fill="#b71c1c" />
      </svg>
    ),
  },
  {
    value: "circle-outline",
    label: "Circle",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="#b71c1c" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: "filled-circle",
    label: "Filled",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="7.5" fill="#b71c1c" />
      </svg>
    ),
  },
  {
    value: "triangle",
    label: "Triangle",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <polygon points="9,1.5 1.5,16.5 16.5,16.5" fill="#b71c1c" />
      </svg>
    ),
  },
  {
    value: "custom",
    label: "Custom",
    preview: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="1.5" width="15" height="15" rx="2" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="3 2" />
        <path d="M6 11 L9 7.5 L12 11 M9 7.5 V14" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface StylePanelProps {
  config: MenuConfig;
  onChange: (patch: Partial<MenuConfig>) => void;
}

export default function StylePanel({ config, onChange }: StylePanelProps) {
  const patchColors = (patch: Partial<MenuConfig["colors"]>) =>
    onChange({ colors: { ...config.colors, ...patch } });

  const patchFonts = (patch: Partial<MenuConfig["fonts"]>) =>
    onChange({ fonts: { ...config.fonts, ...patch } });

  const patchFontSizes = (patch: Partial<MenuConfig["fontSizes"]>) =>
    onChange({ fontSizes: { ...(config.fontSizes ?? { category: 18, itemName: 13, description: 10, price: 13 }), ...patch } });

  const vegIconFileRef = useRef<HTMLInputElement>(null);
  const nonVegIconFileRef = useRef<HTMLInputElement>(null);

  const handleVegIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange({ vegIconCustom: dataUrl });
    } catch { /* ignore */ }
    e.target.value = "";
  };

  const handleNonVegIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange({ nonVegIconCustom: dataUrl });
    } catch { /* ignore */ }
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Restaurant Name & Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block">Restaurant Name</Label>
          <Input
            value={config.restaurantName}
            onChange={(e) => onChange({ restaurantName: e.target.value })}
            placeholder="e.g. The Spice Garden"
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Currency Symbol</Label>
          <Input
            value={config.currency}
            onChange={(e) => onChange({ currency: e.target.value })}
            placeholder="£ $ € ₹"
          />
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Colors</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Category Title", key: "category" as const },
            { label: "Dish Name", key: "itemName" as const },
            { label: "Description", key: "description" as const },
            { label: "Price", key: "price" as const },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="color"
                value={config.colors[key]}
                onChange={(e) => patchColors({ [key]: e.target.value })}
                className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5"
              />
              <Label className="text-xs">{label}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Fonts</h3>
        <div className="space-y-2">
          {[
            { label: "Category", key: "category" as const },
            { label: "Dish Name", key: "itemName" as const },
            { label: "Description", key: "description" as const },
            { label: "Price", key: "price" as const },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-2">
              <Label className="text-xs w-24 shrink-0">{label}</Label>
              <select
                value={config.fonts[key]}
                onChange={(e) => patchFonts({ [key]: e.target.value })}
                className="flex-1 h-8 text-xs border border-gray-300 rounded-md px-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ fontFamily: config.fonts[key] }}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Font Sizes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Font Sizes</h3>
        <div className="space-y-3">
          {([
            { label: "Category Title", key: "category" as const, min: 10, max: 36 },
            { label: "Dish Name",      key: "itemName"  as const, min: 8,  max: 28 },
            { label: "Description",    key: "description" as const, min: 6, max: 20 },
            { label: "Price",          key: "price"     as const, min: 8,  max: 28 },
          ] as const).map(({ label, key, min, max }) => {
            const sizes = config.fontSizes ?? { category: 18, itemName: 13, description: 10, price: 13 };
            return (
              <div key={key} className="flex items-center gap-2">
                <Label className="text-xs w-24 shrink-0">{label}</Label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={sizes[key]}
                  onChange={(e) => patchFontSizes({ [key]: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 w-8 text-right">{sizes[key]}px</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Layout */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Layout</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-2 block text-gray-600">Columns</Label>
            <div className="flex gap-2">
              {([
                { value: "auto", label: "Auto", desc: "Based on item count" },
                { value: "1",    label: "1 Column", desc: "All items in one column" },
                { value: "2",    label: "2 Columns", desc: "Split items into two columns" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ layoutColumns: opt.value })}
                  className={cn(
                    "flex-1 py-2 px-1.5 rounded-lg border-2 transition-all text-center",
                    (config.layoutColumns ?? "auto") === opt.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-indigo-300 text-gray-600"
                  )}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24 shrink-0">Content Margin</Label>
            <input
              type="range"
              min={2}
              max={20}
              value={config.contentPadding ?? 6}
              onChange={(e) => onChange({ contentPadding: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-8 text-right">{config.contentPadding ?? 6}%</span>
          </div>
          <p className="text-xs text-gray-400">Increase margin if text overlaps template decorations</p>
        </div>
      </div>

      {/* Veg / Non-Veg Icons */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Veg / Non-Veg Icons</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showIcons}
              onChange={(e) => onChange({ showIcons: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">Show food type icons</span>
          </label>

          {config.showIcons && (
            <>
              {/* Icon size */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-20 shrink-0">Icon Size</Label>
                <input
                  type="range"
                  min={8}
                  max={24}
                  value={config.iconSize}
                  onChange={(e) => onChange({ iconSize: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 w-10">{config.iconSize}px</span>
              </div>

              {/* Veg icon style */}
              <div>
                <Label className="text-xs mb-2 block text-gray-600">Veg Icon Style</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {VEG_ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onChange({ vegIconStyle: opt.value })}
                      title={opt.label}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all",
                        config.vegIconStyle === opt.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300 bg-white"
                      )}
                    >
                      {opt.preview}
                      <span className="text-[9px] text-gray-500 leading-none">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {config.vegIconStyle === "custom" && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => vegIconFileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-600 transition-colors"
                    >
                      <Upload size={12} />
                      {config.vegIconCustom ? "Replace veg icon" : "Upload veg icon"}
                    </button>
                    {config.vegIconCustom && (
                      <img src={config.vegIconCustom} alt="custom veg icon" className="w-8 h-8 object-contain rounded border border-gray-200" />
                    )}
                    <input
                      ref={vegIconFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleVegIconUpload}
                    />
                  </div>
                )}
              </div>

              {/* Non-veg icon style */}
              <div>
                <Label className="text-xs mb-2 block text-gray-600">Non-Veg Icon Style</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {NON_VEG_ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onChange({ nonVegIconStyle: opt.value })}
                      title={opt.label}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all",
                        config.nonVegIconStyle === opt.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300 bg-white"
                      )}
                    >
                      {opt.preview}
                      <span className="text-[9px] text-gray-500 leading-none">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {config.nonVegIconStyle === "custom" && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => nonVegIconFileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-600 transition-colors"
                    >
                      <Upload size={12} />
                      {config.nonVegIconCustom ? "Replace non-veg icon" : "Upload non-veg icon"}
                    </button>
                    {config.nonVegIconCustom && (
                      <img src={config.nonVegIconCustom} alt="custom non-veg icon" className="w-8 h-8 object-contain rounded border border-gray-200" />
                    )}
                    <input
                      ref={nonVegIconFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleNonVegIconUpload}
                    />
                  </div>
                )}
              </div>

              {/* Icon placement */}
              <div>
                <Label className="text-xs mb-2 block text-gray-600">Icon Position</Label>
                <div className="flex gap-2">
                  {[
                    { value: "before" as IconPlacement, label: "Before name", sub: "🔲 Dish name" },
                    { value: "after" as IconPlacement, label: "After name", sub: "Dish name 🔲" },
                    { value: "newline" as IconPlacement, label: "Below name", sub: "Dish name ↵ 🔲" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onChange({ iconPlacement: opt.value })}
                      className={cn(
                        "flex-1 py-2 px-1.5 rounded-lg border-2 transition-all text-center",
                        config.iconPlacement === opt.value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 hover:border-indigo-300 text-gray-600"
                      )}
                    >
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Allergen Information */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Allergen Information</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showAllergens}
              onChange={(e) => onChange({ showAllergens: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">Show allergen information</span>
          </label>
          {config.showAllergens && (
            <div>
              <Label className="text-xs mb-2 block text-gray-600">Display Style</Label>
              <div className="flex gap-2">
                {[
                  { value: "emoji" as AllergenDisplayStyle, label: "Emoji", example: "🌾 🥛 🥚" },
                  { value: "text" as AllergenDisplayStyle, label: "Text", example: "Contains: gluten" },
                  { value: "symbol" as AllergenDisplayStyle, label: "Badges", example: "G  D  E" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ allergenDisplayStyle: opt.value })}
                    className={cn(
                      "flex-1 py-2 px-2 rounded-lg border-2 transition-all text-center",
                      config.allergenDisplayStyle === opt.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-indigo-300 text-gray-600"
                    )}
                  >
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{opt.example}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Add allergens to the &ldquo;Allergens&rdquo; column in Excel (e.g. &ldquo;gluten, dairy, nuts&rdquo;)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Display Options */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Display Options</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showDescription}
              onChange={(e) => onChange({ showDescription: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">Show dish descriptions</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showSpiceLevel}
              onChange={(e) => onChange({ showSpiceLevel: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">Show spice level indicators</span>
          </label>
        </div>
      </div>
    </div>
  );
}
