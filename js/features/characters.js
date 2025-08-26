import { CATEGORIES, CSV_TO_APP_CATEGORY } from '../core/config.js';

export async function loadCharactersFromCSV() {
  const path = "assets/Cyberpunk App.csv";
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error("CSV not found");
    const text = await res.text();
    return parseCSVIntoPool(text);
  } catch {
    return generateFallbackCharacters();
  }
}

export function makeSessionCharacters(pool) {
  const chosen = {};
  for (const cat of CATEGORIES) {
    const list = pool[cat] || [];
    chosen[cat] = list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  return chosen;
}

function parseCSVIntoPool(text) {
  const rows = text.split("\n").map(r => r.split(","));
  const header = rows.shift().map(h => h.trim().toLowerCase());
  const byCat = {};

  const idx = {
    cat: header.findIndex(h => h.includes("category")),
    img: header.findIndex(h => h.includes("image")),
    name: header.findIndex(h => h.includes("name")),
    rarity: header.findIndex(h => h.includes("rarity"))
  };

  for (const row of rows) {
    const cat = CSV_TO_APP_CATEGORY[row[idx.cat]?.trim()] || row[idx.cat]?.trim();
    if (!cat) continue;
    const name = row[idx.name]?.trim() || `${cat} Operative`;
    const rarity = row[idx.rarity]?.trim() || "R";
    const img = row[idx.img]?.trim() || `${cat.toLowerCase()}-1.png`;

    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({
      category: cat,
      name,
      rarity,
      image: `assets/characters/${cat.toLowerCase()}/${img}`
    });
  }

  return byCat;
}

function generateFallbackCharacters() {
  const byCat = {};
  for (const cat of CATEGORIES) {
    const slug = cat.toLowerCase().replace(/\s+/g, '-');
    byCat[cat] = [1, 2, 3].map(n => ({
      category: cat,
      image: `assets/characters/${slug}/${slug}-${n}.png`,
      name: `${cat} Operative ${n}`,
      rarity: ["R", "SR", "SSR"][n - 1] || "R"
    }));
  }
  return byCat;
}
