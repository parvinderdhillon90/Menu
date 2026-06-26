export interface MenuItem {
  category: string;
  name: string;
  description?: string;
  price: number | string;
  type: "veg" | "non-veg" | "vegan" | "";
  spiceLevel?: "mild" | "medium" | "hot" | "";
  isNew?: boolean;
  isBestseller?: boolean;
  allergens?: string;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export interface TemplateLayer {
  id: string;
  type: "text" | "image" | "icon";
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  dataKey?: string;
  visible: boolean;
}

export interface PageTemplate {
  id: string;
  label: string;
  imageUrl: string; // base64 or object URL of uploaded design
  width: number;
  height: number;
}

export type VegIconStyle = "fssai" | "circle-outline" | "filled-circle" | "leaf" | "custom";
export type NonVegIconStyle = "fssai" | "circle-outline" | "filled-circle" | "triangle" | "custom";
export type IconPlacement = "before" | "after" | "newline";
export type AllergenDisplayStyle = "text" | "emoji" | "symbol" | "custom";

export interface MenuConfig {
  restaurantName: string;
  menuType: "single" | "multi";
  // single page
  singleTemplate?: PageTemplate;
  // multi page
  frontTemplate?: PageTemplate;
  innerTemplate?: PageTemplate | "same";
  innerTemplates?: PageTemplate[]; // if different per section
  useCustomInnerTemplates: boolean;
  // Styling
  fonts: {
    category: string;
    itemName: string;
    description: string;
    price: string;
  };
  colors: {
    category: string;
    itemName: string;
    description: string;
    price: string;
    background: string;
  };
  // Icon display
  showIcons: boolean;
  iconSize: number;
  vegIconStyle: VegIconStyle;
  nonVegIconStyle: NonVegIconStyle;
  vegIconCustom?: string;   // base64 image
  nonVegIconCustom?: string; // base64 image
  iconPlacement: IconPlacement;
  // Legacy (kept for compatibility)
  iconPosition: { x: number; y: number };
  // Allergens
  showAllergens: boolean;
  allergenDisplayStyle: AllergenDisplayStyle;
  allergenIconCustom?: string; // base64 custom allergen icon
  allergenSize: number;   // font/icon size in canvas points
  allergenColor: string;  // badge/text color
  // Spacing
  spacingAfterHeading: number; // extra px after category heading
  itemSpacing: number;         // extra px between items
  // Font sizes (in canvas points)
  fontSizes: {
    category: number;
    itemName: number;
    description: number;
    price: number;
  };
  // Layout
  layoutColumns: "auto" | "1" | "2";
  contentPadding: number; // % of page dimension applied as margin on all sides
  // Other
  currency: string;
  showDescription: boolean;
  showSpiceLevel: boolean;
}

export interface GeneratedPage {
  pageIndex: number;
  sections: MenuSection[];
  templateId: string;
}
