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
  imageUrl: string;
  width: number;
  height: number;
}

export interface MenuConfig {
  restaurantName: string;
  menuType: "single" | "multi";
  singleTemplate?: PageTemplate;
  frontTemplate?: PageTemplate;
  innerTemplate?: PageTemplate | "same";
  innerTemplates?: PageTemplate[];
  useCustomInnerTemplates: boolean;
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
  iconPosition: { x: number; y: number };
  showIcons: boolean;
  iconSize: number;
  currency: string;
  showDescription: boolean;
  showSpiceLevel: boolean;
}

export interface GeneratedPage {
  pageIndex: number;
  sections: MenuSection[];
  templateId: string;
}
