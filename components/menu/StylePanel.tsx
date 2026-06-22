"use client";

import React from "react";
import { MenuConfig } from "@/types/menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const FONTS = [
  "Inter", "Playfair Display", "Lato", "Montserrat", "Raleway",
  "Georgia", "Times New Roman", "Arial", "Trebuchet MS", "Verdana",
  "Cormorant Garamond", "EB Garamond", "Libre Baskerville",
];

interface StylePanelProps {
  config: MenuConfig;
  onChange: (patch: Partial<MenuConfig>) => void;
}

export default function StylePanel({ config, onChange }: StylePanelProps) {
  const patchColors = (patch: Partial<MenuConfig["colors"]>) => onChange({ colors: { ...config.colors, ...patch } });
  const patchFonts = (patch: Partial<MenuConfig["fonts"]>) => onChange({ fonts: { ...config.fonts, ...patch } });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block">Restaurant Name</Label>
          <Input value={config.restaurantName} onChange={(e) => onChange({ restaurantName: e.target.value })} placeholder="e.g. The Spice Garden" />
        </div>
        <div>
          <Label className="mb-1.5 block">Currency Symbol</Label>
          <Input value={config.currency} onChange={(e) => onChange({ currency: e.target.value })} placeholder="£ $ € ₹" />
        </div>
      </div>
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
              <input type="color" value={config.colors[key]} onChange={(e) => patchColors({ [key]: e.target.value })} className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
              <Label className="text-xs">{label}</Label>
            </div>
          ))}
        </div>
      </div>
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
                {FONTS.map((f) => (<option key={f} value={f} style={{ fontFamily: f }}>{f}</option>))}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Veg / Non-Veg Icons</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.showIcons} onChange={(e) => onChange({ showIcons: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
            <span className="text-sm text-gray-700">Show food type icons</span>
          </label>
          {config.showIcons && (
            <div className="flex items-center gap-2">
              <Label className="text-xs w-24 shrink-0">Icon Size</Label>
              <input type="range" min={8} max={24} value={config.iconSize} onChange={(e) => onChange({ iconSize: Number(e.target.value) })} className="flex-1" />
              <span className="text-xs text-gray-500 w-10">{config.iconSize}px</span>
            </div>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Display Options</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.showDescription} onChange={(e) => onChange({ showDescription: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
            <span className="text-sm text-gray-700">Show dish descriptions</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.showSpiceLevel} onChange={(e) => onChange({ showSpiceLevel: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
            <span className="text-sm text-gray-700">Show spice level indicators</span>
          </label>
        </div>
      </div>
    </div>
  );
}
