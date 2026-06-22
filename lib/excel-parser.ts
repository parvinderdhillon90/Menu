import * as XLSX from "xlsx";
import { MenuItem, MenuSection } from "@/types/menu";

export function parseMenuExcel(file: File): Promise<MenuSection[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const sections: MenuSection[] = [];
        let currentSection: MenuSection | null = null;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const [category, name, description, price, type, spiceLevel, isNew, isBestseller, allergens] = row;
          if (category && !name) {
            currentSection = { title: String(category).trim(), items: [] };
            sections.push(currentSection);
            continue;
          }
          if (!name) continue;
          if (category && (!currentSection || currentSection.title !== String(category).trim())) {
            currentSection = { title: String(category).trim(), items: [] };
            sections.push(currentSection);
          }
          if (!currentSection) {
            currentSection = { title: "Menu", items: [] };
            sections.push(currentSection);
          }
          const item: MenuItem = {
            category: category ? String(category).trim() : currentSection.title,
            name: String(name).trim(),
            description: description ? String(description).trim() : undefined,
            price: price !== undefined && price !== "" ? price : "",
            type: normalizeType(type),
            spiceLevel: normalizeSpice(spiceLevel),
            isNew: isNew === true || String(isNew).toLowerCase() === "yes" || String(isNew).toLowerCase() === "true",
            isBestseller: isBestseller === true || String(isBestseller).toLowerCase() === "yes" || String(isBestseller).toLowerCase() === "true",
            allergens: allergens ? String(allergens).trim() : undefined,
          };
          currentSection.items.push(item);
        }
        resolve(sections);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function normalizeType(val: any): "veg" | "non-veg" | "vegan" | "" {
  if (!val) return "";
  const v = String(val).toLowerCase().trim();
  if (v === "veg" || v === "vegetarian") return "veg";
  if (v === "non-veg" || v === "nonveg" || v === "non veg" || v === "meat") return "non-veg";
  if (v === "vegan") return "vegan";
  return "";
}

function normalizeSpice(val: any): "mild" | "medium" | "hot" | "" {
  if (!val) return "";
  const v = String(val).toLowerCase().trim();
  if (v === "mild") return "mild";
  if (v === "medium") return "medium";
  if (v === "hot" || v === "spicy") return "hot";
  return "";
}

export function generateExcelTemplate(): void {
  const headers = [
    "Category", "Dish Name", "Description", "Price",
    "Type (veg/non-veg/vegan)", "Spice Level (mild/medium/hot)",
    "Is New? (yes/no)", "Is Bestseller? (yes/no)", "Allergens",
  ];
  const sampleData = [
    ["Starters", "", "", "", "", "", "", "", ""],
    ["Starters", "Paneer Tikka", "Grilled cottage cheese with spices", "8.99", "veg", "medium", "no", "yes", "dairy"],
    ["Starters", "Chicken Wings", "Crispy wings with house sauce", "9.99", "non-veg", "hot", "yes", "no", ""],
    ["Main Course", "", "", "", "", "", "", "", ""],
    ["Main Course", "Dal Makhani", "Creamy black lentils slow cooked overnight", "12.99", "veg", "mild", "no", "yes", "dairy"],
    ["Main Course", "Butter Chicken", "Tender chicken in rich tomato gravy", "14.99", "non-veg", "medium", "no", "yes", "dairy"],
    ["Desserts", "", "", "", "", "", "", "", ""],
    ["Desserts", "Gulab Jamun", "Soft milk dumplings in rose syrup", "5.99", "veg", "", "no", "no", "dairy"],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  ws["!cols"] = [
    { wch: 18 }, { wch: 25 }, { wch: 40 }, { wch: 10 },
    { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Menu");
  XLSX.writeFile(wb, "menu-template.xlsx");
}
