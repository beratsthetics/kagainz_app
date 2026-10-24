// Hareket kütüphanesi: çalışan kaslar (vücut haritasında parlar), hareket animasyonu tipi ve
// adım adım anlatım. free: true olanlar ücretsiz pakette açık (LIMITS.freeLibrarySize).

export type Muscle =
  | 'chest'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'traps'
  | 'lats'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'calves';

export const MUSCLES: Record<Muscle, { name: string; group: MuscleGroup }> = {
  chest: { name: 'Göğüs', group: 'Göğüs' },
  front_delts: { name: 'Ön omuz', group: 'Omuz' },
  side_delts: { name: 'Yan omuz', group: 'Omuz' },
  rear_delts: { name: 'Arka omuz', group: 'Omuz' },
  biceps: { name: 'Ön kol (biceps)', group: 'Kol' },
  triceps: { name: 'Arka kol (triceps)', group: 'Kol' },
  forearms: { name: 'Önkol', group: 'Kol' },
  abs: { name: 'Karın', group: 'Karın' },
  obliques: { name: 'Yan karın', group: 'Karın' },
  traps: { name: 'Trapez', group: 'Sırt' },
  lats: { name: 'Kanat (lat)', group: 'Sırt' },
  lower_back: { name: 'Bel', group: 'Sırt' },
  glutes: { name: 'Kalça', group: 'Bacak' },
  quads: { name: 'Ön bacak', group: 'Bacak' },
  hamstrings: { name: 'Arka bacak', group: 'Bacak' },
  adductors: { name: 'İç bacak', group: 'Bacak' },
  calves: { name: 'Kalf', group: 'Bacak' },
};

export type MuscleGroup = 'Göğüs' | 'Sırt' | 'Omuz' | 'Kol' | 'Bacak' | 'Karın';
export const GROUPS: MuscleGroup[] = ['Göğüs', 'Sırt', 'Omuz', 'Kol', 'Bacak', 'Karın'];

export type Pattern =
  | 'bench_press'
  | 'incline_press'
  | 'fly'
  | 'pushup'
  | 'dip'
  | 'overhead_press'
  | 'lateral_raise'
  | 'rear_fly'
  | 'pulldown'
  | 'pullup'
  | 'row'
  | 'curl'
  | 'pushdown'
  | 'overhead_extension'
  | 'squat'
  | 'leg_press'
  | 'lunge'
  | 'hinge'
  | 'hip_thrust'
  | 'leg_extension'
  | 'leg_curl'
  | 'calf_raise'
  | 'crunch'
  | 'plank'
  | 'shrug';

export type Equipment = 'Barbell' | 'Dumbbell' | 'Makine' | 'Kablo' | 'Vücut ağırlığı' | 'Smith';

export type Exercise = {
  id: string;
  // name: Türkçe adı (aramada ve hareket sayfasında alt başlık). trName: uygulamada gösterilen İngilizce adı.
  name: string;
  trName: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment;
  pattern: Pattern;
  steps: string[];
  tip: string;
  free?: boolean;
};

export const EXERCISES: Exercise[] = [
  // Göğüs
  {
    id: 'bench_press',
    name: 'Düz bench press',
    trName: 'Barbell bench press',
    primary: ['chest'],
    secondary: ['front_delts', 'triceps'],
    equipment: 'Barbell',
    pattern: 'bench_press',
    steps: [
      'Sehpaya uzan, gözlerin barın hizasında olsun. Kürek kemiklerini geriye ve aşağı sık.',
      'Barı omuz genişliğinden biraz geniş tut, kilitli kollarla raftan al.',
      'Kontrollü şekilde göğsünün alt kısmına indir, dirsekler gövdeye ~45° açıda.',
      'Ayaklarla yere basarak barı yukarı it, tepede kolları tam kilitleme.',
    ],
    tip: 'Kalçanı sehpadan kaldırma; sırtındaki doğal kavis kalsın.',
    free: true,
  },
  {
    id: 'incline_smith_press',
    name: 'Smith eğimli press',
    trName: 'Smith machine incline press',
    primary: ['chest'],
    secondary: ['front_delts', 'triceps'],
    equipment: 'Smith',
    pattern: 'incline_press',
    steps: [
      'Sehpayı 30° eğime ayarla, bar üst göğüs hizasına insin.',
      'Kürek kemiklerini sık, barı kancalardan çevirerek çöz.',
      'Üst göğse doğru 2-3 saniyede indir.',
      'Göğsünü sıkarak yukarı it.',
    ],
    tip: 'Eğim 30-45° arası olsun; daha dik açı yükü omza kaydırır.',
  },
  {
    id: 'incline_db_press',
    name: 'Eğimli dumbbell press',
    trName: 'Incline dumbbell press',
    primary: ['chest'],
    secondary: ['front_delts', 'triceps'],
    equipment: 'Dumbbell',
    pattern: 'incline_press',
    steps: [
      'Sehpayı 30° eğime ayarla, dambılları dizlerinden göğüs hizasına kaldır.',
      'Dambılları göğsün yanında, avuçlar ileri bakacak şekilde tut.',
      'Yukarı ve hafif içe doğru it, tepede dambıllar birbirine değmesin.',
      'Kontrollü şekilde başlangıca indir.',
    ],
    tip: 'Altta göğsünde hafif bir esneme hissetmelisin.',
  },
  {
    id: 'chest_press',
    name: 'Makine göğüs press',
    trName: 'Machine chest press',
    primary: ['chest'],
    secondary: ['front_delts', 'triceps'],
    equipment: 'Makine',
    pattern: 'bench_press',
    steps: [
      'Koltuğu tutamaçlar göğüs ortası hizasında olacak şekilde ayarla.',
      'Sırtını pede yasla, kürek kemiklerini sık.',
      'Tutamaçları ileri it, kolları tam kilitleme.',
      'Göğsünde esneme hissedene kadar geri gel.',
    ],
    tip: 'Başlangıç için en güvenli göğüs hareketi.',
    free: true,
  },
  {
    id: 'machine_fly',
    name: 'Makine fly (pec deck)',
    trName: 'Pec deck fly',
    primary: ['chest'],
    secondary: ['front_delts'],
    equipment: 'Makine',
    pattern: 'fly',
    steps: [
      'Koltuğu kollar omuz hizasında olacak şekilde ayarla.',
      'Dirsekler hafif bükük, kolları yay çizerek önde birleştir.',
      'Ortada 1 saniye göğsünü sık.',
      'Göğsün esneyene kadar yavaşça aç.',
    ],
    tip: 'Hareket boyunca dirsek açısını sabit tut.',
  },
  {
    id: 'cable_crossover',
    name: 'Kablo crossover',
    trName: 'Cable crossover',
    primary: ['chest'],
    secondary: ['front_delts'],
    equipment: 'Kablo',
    pattern: 'fly',
    steps: [
      'Makaraları omuz üstüne ayarla, bir adım öne çık.',
      'Gövdeni hafif öne eğ, dirsekler hafif bükük.',
      'Elleri aşağı ve öne doğru yay çizerek birleştir.',
      'Kontrollü şekilde aç.',
    ],
    tip: 'Ellerin birleştiği noktada göğsünü bilinçli sık.',
  },
  {
    id: 'pushup',
    name: 'Şınav',
    trName: 'Push-up',
    primary: ['chest'],
    secondary: ['triceps', 'front_delts', 'abs'],
    equipment: 'Vücut ağırlığı',
    pattern: 'pushup',
    steps: [
      'Eller omuz genişliğinden biraz geniş, vücut baştan topuğa düz.',
      'Göğsün yere yaklaşana kadar in.',
      'Karnını sıkarak yukarı it.',
    ],
    tip: 'Kalça düşmesin ya da yükselmesin; karın sıkı.',
  },
  {
    id: 'dip',
    name: 'Paralel bar dips',
    trName: 'Parallel bar dips',
    primary: ['triceps', 'chest'],
    secondary: ['front_delts'],
    equipment: 'Vücut ağırlığı',
    pattern: 'dip',
    steps: [
      'Paralel barda kollar düz, vücudu taşı.',
      'Dirsekleri bükerek omuzlar dirsek hizasına inene kadar alçal.',
      'Kolları iterek yukarı çık.',
    ],
    tip: 'Öne eğilirsen göğüs, dik durursan arka kol daha çok çalışır.',
  },
  // Sırt
  {
    id: 'lat_pulldown',
    name: 'Lat pulldown',
    trName: 'Lat pulldown',
    primary: ['lats'],
    secondary: ['biceps', 'rear_delts', 'traps'],
    equipment: 'Kablo',
    pattern: 'pulldown',
    steps: [
      'Dizlerini pedin altına sabitle, barı omuz genişliğinden geniş tut.',
      'Göğsünü yukarı kaldır, hafif geriye yaslan.',
      'Dirsekleri aşağı ve geriye çekerek barı üst göğse getir.',
      'Kanatlarında esneme hissederek kolları yukarı uzat.',
    ],
    tip: 'Elle değil dirsekle çektiğini düşün.',
    free: true,
  },
  {
    id: 'pullup',
    name: 'Barfiks',
    trName: 'Pull-up',
    primary: ['lats'],
    secondary: ['biceps', 'rear_delts', 'forearms'],
    equipment: 'Vücut ağırlığı',
    pattern: 'pullup',
    steps: [
      'Barı omuz genişliğinden geniş tut, kollar tam açık asıl.',
      'Kürek kemiklerini aşağı çekerek başla.',
      'Çenen barı geçene kadar yukarı çek.',
      'Kontrollü şekilde tam aşağı in.',
    ],
    tip: 'Sallanmadan, her tekrarda tam açılarak yap.',
  },
  {
    id: 'seated_row',
    name: 'Oturarak kablo row',
    trName: 'Seated cable row',
    primary: ['lats', 'traps'],
    secondary: ['biceps', 'rear_delts'],
    equipment: 'Kablo',
    pattern: 'row',
    steps: [
      'Ayaklarını platforma koy, dizler hafif bükük, sırt dik.',
      'Tutamacı karnına doğru çek, dirsekler gövdeye yakın.',
      'Kürek kemiklerini 1 saniye sık.',
      'Kolları uzatırken omuzların hafif öne gelmesine izin ver.',
    ],
    tip: 'Gövdeni sallayarak çekme; hareket sırttan gelsin.',
    free: true,
  },
  {
    id: 'barbell_row',
    name: 'Barbell row',
    trName: 'Barbell row',
    primary: ['lats', 'traps'],
    secondary: ['rear_delts', 'biceps', 'lower_back'],
    equipment: 'Barbell',
    pattern: 'row',
    steps: [
      'Barı omuz genişliğinde tut, kalçadan menteşelenip gövdeyi ~45° eğ.',
      'Sırt düz, barı göbek hizasına çek.',
      'Tepede kürek kemiklerini sık.',
      'Kollar düzleşene kadar indir.',
    ],
    tip: 'Belini yuvarlama; ağırlık artırmadan önce formu oturt.',
  },
  {
    id: 'db_row',
    name: 'Tek kol dumbbell row',
    trName: 'Single-arm dumbbell row',
    primary: ['lats'],
    secondary: ['rear_delts', 'biceps', 'traps'],
    equipment: 'Dumbbell',
    pattern: 'row',
    steps: [
      'Bir el ve dizini sehpaya koy, sırt yere paralel.',
      'Dambılı kalçana doğru çek.',
      'Tepede kanadını sık, sonra yavaşça indir.',
    ],
    tip: 'Dambılı yukarı değil kalçaya doğru çek.',
  },
  {
    id: 'straight_arm_pulldown',
    name: 'Düz kol pulldown',
    trName: 'Straight-arm pulldown',
    primary: ['lats'],
    secondary: ['triceps'],
    equipment: 'Kablo',
    pattern: 'pulldown',
    steps: [
      'Makarayı en üste al, barı omuz genişliğinde tut.',
      'Kollar neredeyse düz, gövde hafif önde.',
      'Barı yay çizerek uyluklarına indir.',
      'Kanatlarda esneme hissedene kadar geri bırak.',
    ],
    tip: 'Dirsek açısı değişmesin; arka kol değil kanat çalışsın.',
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    trName: 'Deadlift',
    primary: ['hamstrings', 'glutes', 'lower_back'],
    secondary: ['traps', 'forearms', 'quads'],
    equipment: 'Barbell',
    pattern: 'hinge',
    steps: [
      'Ayaklar kalça genişliğinde, bar ayak ortasının üstünde.',
      'Kalçadan menteşelen, barı omuz genişliğinde tut, sırt düz.',
      'Göğsü kaldır, bacaklarla yeri iterek barı vücuduna yakın kaldır.',
      'Tepede kalçayı sık, aynı yoldan indir.',
    ],
    tip: 'Bar hareket boyunca bacaklarına değecek kadar yakın olsun.',
  },
  {
    id: 'shrug',
    name: 'Dumbbell shrug',
    trName: 'Dumbbell shrug',
    primary: ['traps'],
    secondary: ['forearms'],
    equipment: 'Dumbbell',
    pattern: 'shrug',
    steps: ['Dambılları yanlarda tut, kollar düz.', 'Omuzlarını kulaklarına doğru kaldır.', '1 saniye tut ve indir.'],
    tip: 'Omuzları döndürme; düz yukarı-aşağı.',
  },
  // Omuz
  {
    id: 'overhead_press',
    name: 'Ayakta omuz press',
    trName: 'Standing overhead press',
    primary: ['front_delts'],
    secondary: ['side_delts', 'triceps', 'traps'],
    equipment: 'Barbell',
    pattern: 'overhead_press',
    steps: [
      'Barı köprücük kemiği hizasında tut, ayaklar kalça genişliğinde.',
      'Karnını ve kalçanı sık.',
      'Barı başının üstüne it, tepede baş hafif öne gelsin.',
      'Kontrollü şekilde omuz hizasına indir.',
    ],
    tip: 'Belinden geriye yaslanma; karın sıkı kalsın.',
  },
  {
    id: 'db_shoulder_press',
    name: 'Oturarak dumbbell omuz press',
    trName: 'Seated dumbbell shoulder press',
    primary: ['front_delts'],
    secondary: ['side_delts', 'triceps'],
    equipment: 'Dumbbell',
    pattern: 'overhead_press',
    steps: [
      'Sehpayı dik ayarla, dambıllar kulak hizasında.',
      'Yukarı it, tepede dambıllar birbirine yaklaşsın.',
      'Dirsekler omuz hizasının biraz altına inene kadar indir.',
    ],
    tip: 'Dirsekler biraz önde olsun, omuz eklemi rahatlar.',
    free: true,
  },
  {
    id: 'lateral_raise',
    name: 'Yana açış',
    trName: 'Dumbbell lateral raise',
    primary: ['side_delts'],
    secondary: ['traps'],
    equipment: 'Dumbbell',
    pattern: 'lateral_raise',
    steps: [
      'Dambılları yanlarda tut, dirsekler hafif bükük.',
      'Kolları yana, omuz hizasına kadar kaldır.',
      'Serçe parmak hafif yukarıda kalsın.',
      'Yavaşça indir.',
    ],
    tip: 'Ağır değil kontrollü; trapez devreye girmesin.',
    free: true,
  },
  {
    id: 'cable_lateral',
    name: 'Kablo yana açış',
    trName: 'Cable lateral raise',
    primary: ['side_delts'],
    secondary: [],
    equipment: 'Kablo',
    pattern: 'lateral_raise',
    steps: [
      'Makarayı en alta al, yan dur ve uzak elinle tut.',
      'Kolu yana omuz hizasına kaldır.',
      'Yavaşça indir; kablo gergin kalsın.',
    ],
    tip: 'Hareketin altında da gerilim olduğu için dambıldan daha etkili olabilir.',
  },
  {
    id: 'rear_delt_fly',
    name: 'Ters fly (arka omuz)',
    trName: 'Reverse pec deck',
    primary: ['rear_delts'],
    secondary: ['traps'],
    equipment: 'Makine',
    pattern: 'rear_fly',
    steps: [
      'Makineye yüzün pede dönük otur, tutamaçlar omuz hizasında.',
      'Kolları yana doğru geriye aç.',
      'Arkada 1 saniye sık, yavaşça geri gel.',
    ],
    tip: 'Kürek kemiklerini fazla sıkma; hareket omuzdan gelsin.',
  },
  {
    id: 'face_pull',
    name: 'Face pull',
    trName: 'Face pull',
    primary: ['rear_delts'],
    secondary: ['traps', 'side_delts'],
    equipment: 'Kablo',
    pattern: 'row',
    steps: [
      'Halatı göz hizasına ayarla.',
      'Halatı yüzüne doğru çek, elleri kulakların yanına aç.',
      'Dirsekler omuz hizasında kalsın.',
    ],
    tip: 'Omuz sağlığı için her hafta yapılabilecek bir hareket.',
  },
  // Kol
  {
    id: 'barbell_curl',
    name: 'Barbell curl',
    trName: 'Barbell curl',
    primary: ['biceps'],
    secondary: ['forearms'],
    equipment: 'Barbell',
    pattern: 'curl',
    steps: [
      'Barı omuz genişliğinde, avuçlar yukarı tut.',
      'Dirsekler gövdeye yapışık, barı omuzlarına kaldır.',
      'Yavaşça indir.',
    ],
    tip: 'Gövdeyi sallamadan; dirsekler öne kaymasın.',
    free: true,
  },
  {
    id: 'hammer_curl',
    name: 'Çekiç curl',
    trName: 'Hammer curl',
    primary: ['biceps', 'forearms'],
    secondary: [],
    equipment: 'Dumbbell',
    pattern: 'curl',
    steps: [
      'Dambılları avuçlar birbirine bakacak şekilde tut.',
      'Dirsekleri sabit tutarak omuza kaldır.',
      'Kontrollü indir.',
    ],
    tip: 'Önkol ve brachialis için çok iyi.',
  },
  {
    id: 'incline_curl',
    name: 'Eğimli dumbbell curl',
    trName: 'Incline dumbbell curl',
    primary: ['biceps'],
    secondary: [],
    equipment: 'Dumbbell',
    pattern: 'curl',
    steps: [
      'Sehpayı 45-60° eğime ayarla, kollar arkada sarksın.',
      'Dirsekler sabit, dambılları kaldır.',
      'Altta tam aç.',
    ],
    tip: 'Biceps uzun başını esnetilmiş pozisyonda çalıştırır.',
  },
  {
    id: 'triceps_pushdown',
    name: 'Triceps pushdown',
    trName: 'Cable triceps pushdown',
    primary: ['triceps'],
    secondary: [],
    equipment: 'Kablo',
    pattern: 'pushdown',
    steps: [
      'Makarayı en üste al, bar ya da halatı tut.',
      'Dirsekler gövdeye yapışık, kolları aşağı düzleştir.',
      'Altta arka kolu sık, yavaşça geri bırak.',
    ],
    tip: 'Dirsekler sabit; sadece önkol hareket etsin.',
    free: true,
  },
  {
    id: 'overhead_extension',
    name: 'Baş üstü triceps extension',
    trName: 'Overhead cable triceps extension',
    primary: ['triceps'],
    secondary: [],
    equipment: 'Kablo',
    pattern: 'overhead_extension',
    steps: [
      'Makaraya sırtını dön, halatı başının arkasında tut.',
      'Dirsekler yukarıda sabit, kolları ileri-yukarı düzleştir.',
      'Arka kol esneyene kadar geri bırak.',
    ],
    tip: 'Triceps uzun başı için en etkili hareketlerden.',
  },
  // Bacak
  {
    id: 'squat',
    name: 'Squat',
    trName: 'Barbell back squat',
    primary: ['quads', 'glutes'],
    secondary: ['adductors', 'hamstrings', 'lower_back'],
    equipment: 'Barbell',
    pattern: 'squat',
    steps: [
      'Barı trapezinin üstüne yerleştir, ayaklar omuz genişliğinde.',
      'Nefes al, karnını sık.',
      'Kalçayı geri ve aşağı göndererek uyluk yere paralel olana kadar in.',
      'Topuklardan iterek kalk, dizler ayak yönünde.',
    ],
    tip: 'Dizler içe kaçmasın; topuklar yerden kalkmasın.',
    free: true,
  },
  {
    id: 'hack_squat',
    name: 'Hack squat',
    trName: 'Hack squat',
    primary: ['quads'],
    secondary: ['glutes', 'adductors'],
    equipment: 'Makine',
    pattern: 'squat',
    steps: [
      'Sırtını pede yasla, ayaklar platformun ortasında.',
      'Kilidi aç, dizler 90° ve altına bükülene kadar in.',
      'Platformu iterek kalk, tepede dizleri kilitleme.',
    ],
    tip: 'Ayaklar aşağıda olursa ön bacak, yukarıda olursa kalça daha çok çalışır.',
  },
  {
    id: 'leg_press',
    name: 'Leg press',
    trName: 'Leg press',
    primary: ['quads', 'glutes'],
    secondary: ['adductors', 'hamstrings'],
    equipment: 'Makine',
    pattern: 'leg_press',
    steps: [
      'Sırtın ve kalçan pede tam yaslı, ayaklar omuz genişliğinde.',
      'Platformu dizler göğse yaklaşana kadar indir.',
      'Topuklardan it, dizleri kilitlemeden dur.',
    ],
    tip: 'Altta kalçan pedden kalkıyorsa fazla iniyorsun.',
  },
  {
    id: 'bulgarian_split_squat',
    name: 'Bulgar split squat',
    trName: 'Bulgarian split squat',
    primary: ['quads', 'glutes'],
    secondary: ['adductors'],
    equipment: 'Dumbbell',
    pattern: 'lunge',
    steps: [
      'Arka ayağını sehpaya koy, ön ayak bir adım ileride.',
      'Ön diz 90° olana kadar dikey in.',
      'Ön topuktan iterek kalk.',
    ],
    tip: 'Gövde öne eğilirse kalça, dik durursa ön bacak daha çok çalışır.',
  },
  {
    id: 'rdl',
    name: 'Romen deadlift',
    trName: 'Romanian deadlift',
    primary: ['hamstrings', 'glutes'],
    secondary: ['lower_back'],
    equipment: 'Barbell',
    pattern: 'hinge',
    steps: [
      'Barı kalça hizasında tut, dizler hafif bükük.',
      'Kalçayı geriye iterek gövdeni öne eğ, bar bacaklara yakın insin.',
      'Arka bacakta esneme hissedince kalçayı öne iterek kalk.',
    ],
    tip: 'Dizler hareket boyunca neredeyse sabit kalır.',
  },
  {
    id: 'hip_thrust',
    name: 'Hip thrust',
    trName: 'Barbell hip thrust',
    primary: ['glutes'],
    secondary: ['hamstrings'],
    equipment: 'Barbell',
    pattern: 'hip_thrust',
    steps: [
      'Sırtının üst kısmını sehpaya yasla, bar kalçanın üstünde.',
      'Ayaklar yerde, dizler 90° olacak mesafede.',
      'Kalçanı sıkarak yukarı it, gövde düz bir çizgi olsun.',
      'Kontrollü indir.',
    ],
    tip: 'Tepede çeneni hafif göğse yaklaştır, beli zorlamazsın.',
  },
  {
    id: 'leg_extension',
    name: 'Leg extension',
    trName: 'Leg extension',
    primary: ['quads'],
    secondary: [],
    equipment: 'Makine',
    pattern: 'leg_extension',
    steps: [
      'Dizini makinenin dönüş noktasıyla hizala.',
      'Bacakları tam düzleşene kadar kaldır.',
      'Tepede 1 saniye sık, yavaşça indir.',
    ],
    tip: 'Ön bacağı izole etmek için ideal.',
  },
  {
    id: 'lying_leg_curl',
    name: 'Yatarak leg curl',
    trName: 'Lying leg curl',
    primary: ['hamstrings'],
    secondary: ['calves'],
    equipment: 'Makine',
    pattern: 'leg_curl',
    steps: [
      'Yüzüstü uzan, ped aşil tendonunun üstünde.',
      'Topukları kalçana doğru çek.',
      'Yavaşça indir, altta tam açma.',
    ],
    tip: 'Kalçanı pedden kaldırma.',
  },
  {
    id: 'standing_calf_raise',
    name: 'Ayakta kalf raise',
    trName: 'Standing calf raise',
    primary: ['calves'],
    secondary: [],
    equipment: 'Makine',
    pattern: 'calf_raise',
    steps: [
      'Parmak uçların basamakta, topuklar boşta.',
      'Topukları olabildiğince aşağı indir.',
      'Parmak ucunda yüksel, tepede 1 saniye tut.',
    ],
    tip: 'Altta 1-2 saniye esnemede bekle; zıplatma.',
    free: true,
  },
  // Karın
  {
    id: 'cable_crunch',
    name: 'Kablo crunch',
    trName: 'Cable crunch',
    primary: ['abs'],
    secondary: ['obliques'],
    equipment: 'Kablo',
    pattern: 'crunch',
    steps: [
      'Makaranın önünde diz çök, halatı başının yanında tut.',
      'Kalçanı sabit tutarak omurganı kıvırıp dirsekleri dizlere getir.',
      'Yavaşça geri açıl.',
    ],
    tip: 'Kalçadan eğilme; hareket karından gelsin.',
  },
  {
    id: 'plank',
    name: 'Plank',
    trName: 'Plank',
    primary: ['abs'],
    secondary: ['obliques', 'front_delts'],
    equipment: 'Vücut ağırlığı',
    pattern: 'plank',
    steps: [
      'Önkollarının üstünde, dirsekler omuz altında.',
      'Vücudun baştan topuğa düz bir çizgi olsun.',
      'Karnını ve kalçanı sıkarak süre boyunca tut.',
    ],
    tip: 'Kalitesiz 2 dakika yerine sıkı 30 saniye daha değerli.',
  },
];

export function exerciseById(id: string) {
  return EXERCISES.find((e) => e.id === id);
}

export function exercisesForGroup(group: MuscleGroup) {
  return EXERCISES.filter((e) => e.primary.some((m) => MUSCLES[m].group === group));
}

export function isUnlocked(e: Exercise, fullLibrary: boolean) {
  return fullLibrary || Boolean(e.free);
}
