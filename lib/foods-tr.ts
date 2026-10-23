import type { Food, FoodCategory } from './foods';

// Türk yemekleri ve ek temel gıdalar. 100 g başına değerler; porsiyon gramları ev ve
// esnaf porsiyonlarının ortalaması. Kaynak: TürKomp ve USDA değerlerine yakın yuvarlanmış.
type Row = [
  key: string,
  name: string,
  aliases: string[],
  macros: [kcal: number, protein: number, fat: number, carb: number],
  unitGrams?: number,
  unitName?: string,
];

function make(category: FoodCategory, rows: Row[]): Food[] {
  return rows.map(([key, name, aliases, [kcal, protein, fat, carb], unitGrams, unitName]) => ({
    key,
    name,
    aliases,
    per100g: { kcal, protein, fat, carb },
    unitGrams,
    unitName,
    category,
  }));
}

const DISHES = make('yemek', [
  ['mercimek_soup', 'Mercimek çorbası', ['mercimek çorbası', 'mercimek corbasi'], [60, 3.5, 1.8, 8], 250, 'kase'],
  ['ezogelin', 'Ezogelin çorbası', ['ezogelin'], [65, 3, 2, 9], 250, 'kase'],
  ['chicken_soup', 'Tavuk suyu çorbası', ['tavuk çorbası', 'tavuk suyu çorbası'], [45, 3.5, 1.5, 5], 250, 'kase'],
  ['kuru_fasulye', 'Kuru fasulye (etli)', ['kuru fasulye', 'kurufasulye'], [120, 7, 4.5, 13], 250, 'porsiyon'],
  ['nohut_yemegi', 'Nohut yemeği', ['nohut yemeği', 'etli nohut'], [130, 6.5, 5, 15], 250, 'porsiyon'],
  ['lahmacun', 'Lahmacun', ['lahmacun'], [230, 10, 7, 32], 120, 'adet'],
  ['pide', 'Kıymalı pide', ['pide', 'kıymalı pide', 'kasarli pide', 'kaşarlı pide'], [260, 12, 9, 33], 300, 'adet'],
  ['tavuk_doner', 'Tavuk döner', ['tavuk döner', 'tavuk doner'], [200, 20, 11, 4], 150, 'porsiyon'],
  ['et_doner', 'Et döner', ['et döner', 'döner', 'doner'], [250, 19, 18, 3], 150, 'porsiyon'],
  ['durum', 'Tavuk dürüm', ['dürüm', 'durum', 'tavuk dürüm'], [230, 12, 9, 26], 300, 'adet'],
  ['iskender', 'İskender', ['iskender'], [190, 11, 11, 12], 400, 'porsiyon'],
  ['menemen', 'Menemen', ['menemen'], [95, 5.5, 7, 3.5], 250, 'porsiyon'],
  ['karniyarik', 'Karnıyarık', ['karnıyarık', 'karniyarik'], [120, 5, 8, 8], 300, 'porsiyon'],
  ['imam_bayildi', 'İmam bayıldı', ['imam bayıldı', 'imambayildi'], [110, 1.5, 9, 7], 250, 'porsiyon'],
  ['kofte', 'Izgara köfte', ['köfte', 'kofte', 'ızgara köfte', 'inegöl köfte'], [250, 18, 18, 5], 30, 'adet'],
  ['adana', 'Adana kebap', ['adana', 'adana kebap', 'urfa kebap', 'kebap'], [280, 17, 23, 2], 200, 'porsiyon'],
  ['tavuk_sis', 'Tavuk şiş', ['tavuk şiş', 'tavuk sis', 'şiş tavuk'], [160, 25, 6, 2], 200, 'porsiyon'],
  ['manti', 'Mantı (yoğurtlu)', ['mantı', 'manti'], [165, 7, 6, 21], 300, 'porsiyon'],
  ['sarma', 'Yaprak sarma', ['sarma', 'yaprak sarma', 'dolma'], [150, 2.5, 7, 19], 25, 'adet'],
  ['biber_dolma', 'Biber dolması', ['biber dolması', 'biber dolma'], [130, 5, 6, 14], 120, 'adet'],
  ['taze_fasulye', 'Zeytinyağlı taze fasulye', ['taze fasulye'], [70, 1.8, 4.5, 6.5], 250, 'porsiyon'],
  ['kisir', 'Kısır', ['kısır', 'kisir'], [150, 3.5, 5, 23], 200, 'porsiyon'],
  ['coban_salata', 'Çoban salata', ['çoban salata', 'coban salata', 'salata'], [40, 1, 2.5, 4], 200, 'porsiyon'],
  ['cacik', 'Cacık', ['cacık', 'cacik'], [45, 2.5, 2.5, 3.5], 200, 'kase'],
  ['borek', 'Su böreği', ['börek', 'borek', 'su böreği'], [260, 9, 14, 24], 120, 'dilim'],
  ['simit', 'Simit', ['simit'], [290, 9.5, 6, 50], 120, 'adet'],
  ['pogaca', 'Poğaça', ['poğaça', 'pogaca'], [330, 7.5, 16, 38], 70, 'adet'],
  ['gozleme', 'Peynirli gözleme', ['gözleme', 'gozleme'], [230, 9, 9, 28], 250, 'adet'],
  ['tost', 'Kaşarlı tost', ['tost'], [280, 12, 12, 30], 150, 'adet'],
  ['hamburger', 'Hamburger', ['hamburger', 'burger'], [250, 13, 11, 25], 220, 'adet'],
  ['pizza', 'Pizza', ['pizza'], [265, 11, 10, 33], 110, 'dilim'],
  ['kumpir', 'Kumpir', ['kumpir'], [140, 4, 6, 18], 450, 'adet'],
  ['balik_ekmek', 'Balık ekmek', ['balık ekmek', 'balik ekmek'], [210, 12, 7, 24], 250, 'adet'],
  ['cig_kofte', 'Çiğ köfte', ['çiğ köfte', 'cig kofte'], [170, 5, 3.5, 30], 150, 'porsiyon'],
  ['hunkar', 'Hünkar beğendi', ['hünkar beğendi', 'hunkar begendi'], [160, 9, 10, 8], 350, 'porsiyon'],
  ['sucuklu_yumurta', 'Sucuklu yumurta', ['sucuklu yumurta'], [270, 15, 22, 2], 150, 'porsiyon'],
  ['omlet', 'Omlet', ['omlet'], [155, 11, 12, 1], 120, 'porsiyon'],
  ['tavuk_sote', 'Tavuk sote', ['tavuk sote'], [140, 18, 6, 4], 250, 'porsiyon'],
  ['izgara_tavuk', 'Izgara tavuk but', ['tavuk but', 'pirzola tavuk'], [210, 26, 11, 0]],
  ['baklava', 'Baklava', ['baklava'], [430, 6, 23, 50], 40, 'dilim'],
  ['sutlac', 'Sütlaç', ['sütlaç', 'sutlac'], [130, 3.5, 3, 22], 200, 'kase'],
  ['kunefe', 'Künefe', ['künefe', 'kunefe'], [380, 8, 20, 42], 150, 'porsiyon'],
]);

const BASICS = make('temel', [
  ['kasar', 'Kaşar peyniri', ['kaşar', 'kasar'], [350, 25, 27, 2], 20, 'dilim'],
  ['sucuk', 'Sucuk', ['sucuk'], [450, 18, 40, 2], 10, 'dilim'],
  ['hindi_fume', 'Hindi füme', ['hindi füme', 'hindi fume'], [105, 18, 2, 3], 15, 'dilim'],
  ['zeytin', 'Siyah zeytin', ['zeytin'], [115, 0.8, 11, 6], 4, 'adet'],
  ['tereyagi', 'Tereyağı', ['tereyağı', 'tereyagi'], [717, 0.9, 81, 0.1], 14, 'yemek kaşığı'],
  ['recel', 'Reçel', ['reçel', 'recel'], [250, 0.4, 0.1, 62], 20, 'yemek kaşığı'],
  ['kinoa', 'Kinoa (pişmiş)', ['kinoa', 'quinoa'], [120, 4.4, 1.9, 21]],
  ['tatli_patates', 'Tatlı patates', ['tatlı patates', 'tatli patates'], [86, 1.6, 0.1, 20], 130, 'adet'],
  ['brokoli', 'Brokoli', ['brokoli'], [35, 2.8, 0.4, 7]],
  ['ispanak', 'Ispanak', ['ıspanak', 'ispanak'], [23, 2.9, 0.4, 3.6]],
  ['portakal', 'Portakal', ['portakal'], [47, 0.9, 0.1, 12], 150, 'adet'],
  ['cilek', 'Çilek', ['çilek', 'cilek'], [32, 0.7, 0.3, 7.7]],
  ['hurma', 'Hurma', ['hurma'], [280, 2.5, 0.4, 75], 8, 'adet'],
  ['biftek', 'Dana biftek', ['biftek', 'bonfile', 'antrikot', 'dana eti'], [217, 26, 12, 0]],
  ['hindi_gogsu', 'Hindi göğsü', ['hindi göğsü', 'hindi'], [135, 30, 1, 0]],
  ['levrek', 'Levrek', ['levrek', 'çupra', 'cupra'], [124, 24, 2.6, 0]],
  ['karides', 'Karides', ['karides'], [99, 24, 0.3, 0.2]],
  ['granola', 'Granola', ['granola'], [470, 10, 20, 64]],
  ['misir_gevregi', 'Mısır gevreği', ['mısır gevreği', 'corn flakes'], [380, 7, 1, 84]],
  ['lavas', 'Lavaş', ['lavaş', 'lavas', 'tortilla'], [275, 9, 1.2, 56], 80, 'adet'],
  ['eriste', 'Erişte (pişmiş)', ['erişte', 'eriste'], [140, 5, 1.5, 27]],
  ['kefir', 'Kefir', ['kefir'], [55, 3.3, 3, 4], 200, 'bardak'],
]);

const SNACKS = make('atıştırmalık', [
  ['findik', 'Fındık', ['fındık', 'findik'], [628, 15, 61, 17]],
  ['yer_fistigi', 'Yer fıstığı', ['yer fıstığı', 'fıstık'], [567, 26, 49, 16]],
  ['protein_bar', 'Protein bar', ['protein bar', 'protein barı'], [350, 30, 10, 35], 60, 'adet'],
  ['bitter', 'Bitter çikolata', ['bitter çikolata', 'çikolata', 'cikolata'], [550, 7, 35, 46], 10, 'kare'],
  ['pirinc_patlagi', 'Pirinç patlağı', ['pirinç patlağı', 'pirinc patlagi'], [385, 8, 3, 81], 9, 'adet'],
]);

const DRINKS = make('içecek', [
  ['ayran', 'Ayran', ['ayran'], [35, 1.7, 1.8, 2.7], 200, 'bardak'],
  ['kola', 'Kola', ['kola', 'coca cola'], [42, 0, 0, 10.6], 330, 'kutu'],
  ['portakal_suyu', 'Portakal suyu', ['portakal suyu'], [45, 0.7, 0.2, 10.4], 200, 'bardak'],
  ['latte', 'Latte', ['latte'], [56, 3, 3, 4.6], 350, 'bardak'],
  ['cay_sekerli', 'Şekerli çay', ['şekerli çay'], [16, 0, 0, 4], 100, 'bardak'],
]);

export const MORE_FOODS: Food[] = [...DISHES, ...BASICS, ...SNACKS, ...DRINKS];
