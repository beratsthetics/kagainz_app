// 100 g başına makrolar (USDA FoodData Central değerlerine yakın yuvarlanmış).
// unitGrams: "2 yumurta" gibi adetle yazılınca bir adedin gramı.
export type Food = {
  key: string;
  name: string;
  aliases: string[];
  per100g: { kcal: number; protein: number; fat: number; carb: number };
  unitGrams?: number;
  unitName?: string;
};

export const FOODS: Food[] = [
  { key: 'egg', name: 'Yumurta', aliases: ['yumurta', 'haşlanmış yumurta', 'egg'], per100g: { kcal: 143, protein: 12.6, fat: 9.5, carb: 0.7 }, unitGrams: 50, unitName: 'adet' },
  { key: 'egg_white', name: 'Yumurta akı', aliases: ['yumurta akı', 'yumurta beyazı'], per100g: { kcal: 52, protein: 10.9, fat: 0.2, carb: 0.7 }, unitGrams: 33, unitName: 'adet' },
  { key: 'chicken_breast', name: 'Tavuk göğsü', aliases: ['tavuk göğsü', 'tavuk gogsu', 'tavuk', 'chicken breast'], per100g: { kcal: 165, protein: 31, fat: 3.6, carb: 0 } },
  { key: 'beef_mince', name: 'Kıyma (yağlı)', aliases: ['kıyma', 'kiyma', 'dana kıyma'], per100g: { kcal: 250, protein: 26, fat: 15, carb: 0 } },
  { key: 'tuna', name: 'Ton balığı (konserve, suda)', aliases: ['ton balığı', 'ton baligi', 'ton'], per100g: { kcal: 116, protein: 25.5, fat: 0.8, carb: 0 } },
  { key: 'salmon', name: 'Somon', aliases: ['somon', 'salmon'], per100g: { kcal: 208, protein: 20, fat: 13, carb: 0 } },
  { key: 'rice', name: 'Pirinç pilavı (pişmiş)', aliases: ['pilav', 'pirinç', 'pirinc', 'rice'], per100g: { kcal: 130, protein: 2.7, fat: 0.3, carb: 28 } },
  { key: 'bulgur', name: 'Bulgur pilavı (pişmiş)', aliases: ['bulgur'], per100g: { kcal: 83, protein: 3.1, fat: 0.2, carb: 18.6 } },
  { key: 'oats', name: 'Yulaf ezmesi', aliases: ['yulaf', 'yulaf ezmesi', 'oats'], per100g: { kcal: 389, protein: 16.9, fat: 6.9, carb: 66 } },
  { key: 'pasta', name: 'Makarna (pişmiş)', aliases: ['makarna', 'pasta'], per100g: { kcal: 158, protein: 5.8, fat: 0.9, carb: 31 } },
  { key: 'bread', name: 'Ekmek (beyaz)', aliases: ['ekmek', 'beyaz ekmek'], per100g: { kcal: 265, protein: 9, fat: 3.2, carb: 49 }, unitGrams: 25, unitName: 'dilim' },
  { key: 'wholewheat_bread', name: 'Tam buğday ekmeği', aliases: ['tam buğday ekmeği', 'tam bugday ekmek', 'tam buğday'], per100g: { kcal: 247, protein: 13, fat: 3.4, carb: 41 }, unitGrams: 30, unitName: 'dilim' },
  { key: 'potato', name: 'Patates (haşlanmış)', aliases: ['patates'], per100g: { kcal: 87, protein: 1.9, fat: 0.1, carb: 20 }, unitGrams: 150, unitName: 'adet' },
  { key: 'banana', name: 'Muz', aliases: ['muz', 'banana'], per100g: { kcal: 89, protein: 1.1, fat: 0.3, carb: 23 }, unitGrams: 120, unitName: 'adet' },
  { key: 'apple', name: 'Elma', aliases: ['elma', 'apple'], per100g: { kcal: 52, protein: 0.3, fat: 0.2, carb: 14 }, unitGrams: 180, unitName: 'adet' },
  { key: 'milk', name: 'Süt (tam yağlı)', aliases: ['süt', 'sut', 'milk'], per100g: { kcal: 61, protein: 3.2, fat: 3.3, carb: 4.8 }, unitGrams: 200, unitName: 'bardak' },
  { key: 'yogurt', name: 'Yoğurt (tam yağlı)', aliases: ['yoğurt', 'yogurt'], per100g: { kcal: 61, protein: 3.5, fat: 3.3, carb: 4.7 } },
  { key: 'greek_yogurt', name: 'Süzme yoğurt', aliases: ['süzme yoğurt', 'suzme yogurt', 'greek yogurt'], per100g: { kcal: 97, protein: 9, fat: 5, carb: 3.9 } },
  { key: 'white_cheese', name: 'Beyaz peynir', aliases: ['beyaz peynir', 'peynir'], per100g: { kcal: 264, protein: 14, fat: 21, carb: 4 } },
  { key: 'cottage', name: 'Lor peyniri', aliases: ['lor', 'lor peyniri'], per100g: { kcal: 98, protein: 11, fat: 4.3, carb: 3.4 } },
  { key: 'whey', name: 'Whey protein tozu', aliases: ['whey', 'protein tozu', 'whey protein'], per100g: { kcal: 400, protein: 80, fat: 6, carb: 8 }, unitGrams: 30, unitName: 'ölçek' },
  { key: 'olive_oil', name: 'Zeytinyağı', aliases: ['zeytinyağı', 'zeytinyagi', 'olive oil'], per100g: { kcal: 884, protein: 0, fat: 100, carb: 0 }, unitGrams: 10, unitName: 'yemek kaşığı' },
  { key: 'peanut_butter', name: 'Fıstık ezmesi', aliases: ['fıstık ezmesi', 'fistik ezmesi', 'peanut butter'], per100g: { kcal: 588, protein: 25, fat: 50, carb: 20 }, unitGrams: 16, unitName: 'yemek kaşığı' },
  { key: 'almond', name: 'Badem', aliases: ['badem', 'almond'], per100g: { kcal: 579, protein: 21, fat: 50, carb: 22 } },
  { key: 'walnut', name: 'Ceviz', aliases: ['ceviz', 'walnut'], per100g: { kcal: 654, protein: 15, fat: 65, carb: 14 } },
  { key: 'lentil', name: 'Mercimek (pişmiş)', aliases: ['mercimek', 'lentil'], per100g: { kcal: 116, protein: 9, fat: 0.4, carb: 20 } },
  { key: 'chickpea', name: 'Nohut (pişmiş)', aliases: ['nohut', 'chickpea'], per100g: { kcal: 164, protein: 8.9, fat: 2.6, carb: 27 } },
  { key: 'avocado', name: 'Avokado', aliases: ['avokado', 'avocado'], per100g: { kcal: 160, protein: 2, fat: 15, carb: 9 }, unitGrams: 150, unitName: 'adet' },
  { key: 'honey', name: 'Bal', aliases: ['bal', 'honey'], per100g: { kcal: 304, protein: 0.3, fat: 0, carb: 82 }, unitGrams: 21, unitName: 'yemek kaşığı' },
  { key: 'tomato', name: 'Domates', aliases: ['domates', 'tomato'], per100g: { kcal: 18, protein: 0.9, fat: 0.2, carb: 3.9 }, unitGrams: 120, unitName: 'adet' },
  { key: 'cucumber', name: 'Salatalık', aliases: ['salatalık', 'salatalik', 'cucumber'], per100g: { kcal: 15, protein: 0.7, fat: 0.1, carb: 3.6 }, unitGrams: 200, unitName: 'adet' },
];
