import type { BookMeta } from '@/lib/canon'

/**
 * The 114 surahs in the order of the written Quran, each under the name it is usually given in
 * English letters, with what the name means and where tradition says it was revealed (the
 * classification of the standard Egyptian edition: 86 at Mecca, 28 at Medina). Verse counts are
 * not hard-coded here; they come from the data build (books.json), which also checks this table
 * against its sources.
 */
export type Place = 'Meccan' | 'Medinan'

type Row = [name: string, meaning: string, place: Place, aliases: string]

const MEC: Place = 'Meccan'
const MED: Place = 'Medinan'

// Aliases are other spellings and other names a surah goes by, separated by commas. The name
// without its article ("Baqarah") and the English meaning ("The Cow") are added to them below.
export const SURAHS: Row[] = [
  ['Al-Fatihah', 'The Opening', MEC, 'Al-Faatiha, Fatiha, The Opener'],
  ['Al-Baqarah', 'The Cow', MED, 'Al-Baqara'],
  ["Ali 'Imran", 'The Family of Imran', MED, 'Al Imran, Aal-i-Imraan, Al-Imran, Imran, Family of Imran'],
  ['An-Nisa', 'Women', MED, "An-Nisaa, An-Nisa', The Women"],
  ["Al-Ma'idah", 'The Table Spread', MED, 'Al-Maaida, Al-Maidah, Maida, The Table'],
  ["Al-An'am", 'Livestock', MEC, "Al-An'aam, Al-Anam, The Cattle"],
  ["Al-A'raf", 'The Heights', MEC, "Al-A'raaf, Al-Araf"],
  ['Al-Anfal', 'The Spoils of War', MED, 'Al-Anfaal'],
  ['At-Tawbah', 'Repentance', MED, "At-Tawba, Tauba, Bara'ah, Baraah, The Repentance"],
  ['Yunus', 'Jonah', MEC, 'Yoonus, Jonas'],
  ['Hud', 'Hud', MEC, 'Hood'],
  ['Yusuf', 'Joseph', MEC, 'Yoosuf'],
  ["Ar-Ra'd", 'Thunder', MED, 'Ar-Rad, The Thunder'],
  ['Ibrahim', 'Abraham', MEC, 'Ibraheem'],
  ['Al-Hijr', 'The Rocky Tract', MEC, 'Hijr, The Rock, The Stoneland'],
  ['An-Nahl', 'The Bee', MEC, 'The Bees'],
  ['Al-Isra', 'The Night Journey', MEC, "Al-Israa, Al-Isra', Bani Isra'il, Bani Israil, The Children of Israel"],
  ['Al-Kahf', 'The Cave', MEC, ''],
  ['Maryam', 'Mary', MEC, 'Mariam'],
  ['Ta-Ha', 'Ta-Ha', MEC, 'Taha, Taa-Haa'],
  ['Al-Anbiya', 'The Prophets', MEC, "Al-Anbiyaa, Al-Anbya, Al-Anbiya'"],
  ['Al-Hajj', 'The Pilgrimage', MED, 'Haj'],
  ["Al-Mu'minun", 'The Believers', MEC, 'Al-Muminoon, Al-Muminun, Al-Mominun'],
  ['An-Nur', 'Light', MED, 'An-Noor, The Light'],
  ['Al-Furqan', 'The Criterion', MEC, 'Al-Furqaan, The Standard'],
  ["Ash-Shu'ara", 'The Poets', MEC, "Ash-Shu'araa, Ash-Shuara"],
  ['An-Naml', 'The Ant', MEC, 'The Ants'],
  ['Al-Qasas', 'The Story', MEC, 'The Stories, The Narration'],
  ["Al-'Ankabut", 'The Spider', MEC, 'Al-Ankaboot, Al-Ankabut'],
  ['Ar-Rum', 'The Romans', MEC, 'Ar-Room, The Byzantines'],
  ['Luqman', 'Luqman', MEC, 'Luqmaan, Lukman'],
  ['As-Sajdah', 'The Prostration', MEC, 'As-Sajda, Sajdah'],
  ['Al-Ahzab', 'The Confederates', MED, 'Al-Ahzaab, The Clans, The Combined Forces, The Parties'],
  ['Saba', 'Sheba', MEC, "Saba'"],
  ['Fatir', 'The Originator', MEC, "Faatir, Al-Mala'ikah, The Angels, Originator"],
  ['Ya-Sin', 'Ya-Sin', MEC, 'Yasin, Yaseen, Ya Sin'],
  ['As-Saffat', 'Those Ranged in Ranks', MEC, 'As-Saaffaat, Those Who Set the Ranks, The Rangers'],
  ['Sad', 'Sad', MEC, 'Saad'],
  ['Az-Zumar', 'The Throngs', MEC, 'The Troops, The Groups, The Crowds'],
  ['Ghafir', 'The Forgiver', MEC, "Ghaafir, Al-Mu'min, The Believer, Forgiver"],
  ['Fussilat', 'Explained in Detail', MEC, 'Ha-Mim As-Sajdah, Ha Mim Sajdah, Detailed'],
  ['Ash-Shura', 'Consultation', MEC, 'Ash-Shuraa, Ash-Shoora, The Consultation, Counsel'],
  ['Az-Zukhruf', 'Ornaments of Gold', MEC, 'Zukhruf, The Ornaments of Gold, Decorations'],
  ['Ad-Dukhan', 'Smoke', MEC, 'Ad-Dukhaan, The Smoke'],
  ['Al-Jathiyah', 'Kneeling', MEC, 'Al-Jaathiya, Al-Jathiya, The Crouching, Crouching, The Kneeling'],
  ['Al-Ahqaf', 'The Sand Dunes', MEC, 'Al-Ahqaaf, The Dunes, The Wind-Curved Sandhills'],
  ['Muhammad', 'Muhammad', MED, 'Mohammad, Al-Qital'],
  ['Al-Fath', 'Victory', MED, 'Fath, The Victory, The Conquest'],
  ['Al-Hujurat', 'The Private Rooms', MED, 'Al-Hujuraat, The Rooms, The Chambers, The Inner Apartments'],
  ['Qaf', 'Qaf', MEC, 'Qaaf'],
  ['Adh-Dhariyat', 'The Scattering Winds', MEC, 'Adh-Dhaariyat, Az-Zariyat, The Winnowing Winds, The Spreaders'],
  ['At-Tur', 'The Mount', MEC, 'At-Toor, Tur'],
  ['An-Najm', 'The Star', MEC, ''],
  ['Al-Qamar', 'The Moon', MEC, ''],
  ['Ar-Rahman', 'The Most Merciful', MED, 'Ar-Rahmaan, The Beneficent, The Compassionate'],
  ["Al-Waqi'ah", 'The Inevitable', MEC, 'Al-Waaqia, Al-Waqia, Al-Waqiah, The Event'],
  ['Al-Hadid', 'Iron', MED, 'Al-Hadeed, The Iron'],
  ['Al-Mujadilah', 'The Woman Who Pleads', MED, 'Al-Mujadila, Al-Mujaadila, Al-Mujadalah, The Pleading Woman, The Argument'],
  ['Al-Hashr', 'The Gathering', MED, 'Hashr, The Exile, The Mobilization'],
  ['Al-Mumtahanah', 'The Woman Examined', MED, 'Al-Mumtahana, She That Is to Be Examined'],
  ['As-Saff', 'The Ranks', MED, 'As-Saf, Saff, The Row'],
  ["Al-Jumu'ah", 'Friday', MED, "Al-Jumu'a, Al-Jumuah, Juma, The Congregation"],
  ['Al-Munafiqun', 'The Hypocrites', MED, 'Al-Munaafiqoon, Al-Munafiqoon'],
  ['At-Taghabun', 'Mutual Loss and Gain', MED, 'At-Taghaabun, The Mutual Disillusion'],
  ['At-Talaq', 'Divorce', MED, 'At-Talaaq, The Divorce'],
  ['At-Tahrim', 'The Prohibition', MED, 'At-Tahreem, Prohibition'],
  ['Al-Mulk', 'Sovereignty', MEC, 'The Sovereignty, The Kingdom, Dominion'],
  ['Al-Qalam', 'The Pen', MEC, 'Nun'],
  ['Al-Haqqah', 'The Inevitable Reality', MEC, 'Al-Haaqqa, Al-Haqqa, The Reality'],
  ["Al-Ma'arij", 'The Ways of Ascent', MEC, "Al-Ma'aarij, Al-Maarij, The Ascending Stairways, Ways of Ascent"],
  ['Nuh', 'Noah', MEC, 'Nooh'],
  ['Al-Jinn', 'The Jinn', MEC, 'Jinn'],
  ['Al-Muzzammil', 'The Enwrapped One', MEC, 'Al-Muzammil, The Enshrouded One, The Enwrapped'],
  ['Al-Muddaththir', 'The Cloaked One', MEC, 'Al-Muddathir, Al-Mudathir, The Enrobed'],
  ['Al-Qiyamah', 'The Resurrection', MEC, 'Al-Qiyaama, Al-Qiyama, Resurrection'],
  ['Al-Insan', 'Man', MED, 'Al-Insaan, Ad-Dahr, The Man, The Human'],
  ['Al-Mursalat', 'Those Sent Forth', MEC, 'Al-Mursalaat, The Emissaries, The Unleashed'],
  ['An-Naba', 'The Great News', MEC, "An-Naba', The Tidings, The Announcement"],
  ["An-Nazi'at", 'Those Who Pull Out', MEC, "An-Naazi'aat, An-Naziat, Those Who Drag Forth, The Snatchers"],
  ["'Abasa", 'He Frowned', MEC, 'Abasa'],
  ['At-Takwir', 'The Rolling Up', MEC, 'At-Takweer, The Overthrowing, The Rolling'],
  ['Al-Infitar', 'The Cleaving', MEC, 'Al-Infitaar, The Shattering, The Splitting Apart'],
  ['Al-Mutaffifin', 'Those Who Give Short Measure', MEC, 'Al-Mutaffifeen, At-Tatfif, The Defrauders, The Defrauding, Defrauding'],
  ['Al-Inshiqaq', 'The Splitting Open', MEC, 'Al-Inshiqaaq, The Sundering, The Rupture'],
  ['Al-Buruj', 'The Constellations', MEC, 'Al-Burooj, The Mansions of the Stars'],
  ['At-Tariq', 'The Night-Comer', MEC, 'At-Taariq, The Morning Star, The Nightly Visitor'],
  ["Al-A'la", 'The Most High', MEC, "Al-A'laa, Al-Ala"],
  ['Al-Ghashiyah', 'The Overwhelming', MEC, 'Al-Ghaashiya, Al-Ghashiya'],
  ['Al-Fajr', 'The Dawn', MEC, 'Fajr'],
  ['Al-Balad', 'The City', MEC, 'The Land'],
  ['Ash-Shams', 'The Sun', MEC, ''],
  ['Al-Layl', 'The Night', MEC, 'Al-Lail'],
  ['Ad-Duha', 'The Morning Brightness', MEC, 'Ad-Duhaa, Ad-Dhuhaa, The Morning Hours, Morning Light'],
  ['Ash-Sharh', 'Relief', MEC, 'Al-Inshirah, Al-Sharh, The Relief, The Consolation, The Soothing'],
  ['At-Tin', 'The Fig', MEC, 'At-Teen'],
  ["Al-'Alaq", 'The Clinging Clot', MEC, 'Al-Alaq, Iqra, The Clot'],
  ['Al-Qadr', 'The Night of Decree', MEC, 'Qadr, The Power, Decree'],
  ['Al-Bayyinah', 'The Clear Proof', MED, 'Al-Bayyina, The Evidence, Clear Evidence'],
  ['Az-Zalzalah', 'The Earthquake', MED, 'Az-Zalzala, Az-Zilzal, The Quake'],
  ["Al-'Adiyat", 'The Chargers', MEC, 'Al-Aadiyaat, Al-Adiyat, The Courser, The Racers'],
  ["Al-Qari'ah", 'The Striking Calamity', MEC, "Al-Qaari'a, Al-Qaria, Al-Qariah, The Calamity, The Shocker"],
  ['At-Takathur', 'Rivalry in Worldly Increase', MEC, 'At-Takaathur, Competition, Abundance of Wealth'],
  ["Al-'Asr", 'The Declining Day', MEC, 'Al-Asr, Time, The Epoch'],
  ['Al-Humazah', 'The Slanderer', MEC, 'Al-Humaza, The Traducer, The Backbiter'],
  ['Al-Fil', 'The Elephant', MEC, 'Al-Feel'],
  ['Quraysh', 'Quraysh', MEC, 'Quraish'],
  ["Al-Ma'un", 'Small Kindnesses', MEC, "Al-Maa'un, Al-Maun, Almsgiving, Assistance"],
  ['Al-Kawthar', 'Abundance', MEC, 'Al-Kauthar, The Abundance, Plenty'],
  ['Al-Kafirun', 'The Disbelievers', MEC, 'Al-Kaafiroon, Al-Kafiroon'],
  ['An-Nasr', 'Divine Help', MED, 'Nasr, The Divine Support, Help'],
  ['Al-Masad', 'The Palm Fiber', MEC, 'Al-Lahab, Lahab, Tabbat, The Palm Fibre, The Flame'],
  ['Al-Ikhlas', 'Sincerity', MEC, 'Al-Ikhlaas, At-Tawhid, The Sincerity, Monotheism, Purity of Faith'],
  ['Al-Falaq', 'The Daybreak', MEC, 'Falaq'],
  ['An-Nas', 'Mankind', MEC, 'An-Naas, Nas, People'],
]

/**
 * The seven portions the Quran is read in over a week (each a manzil), which always end with a
 * surah: the parts a connection map branches into, and the sections of the layout page.
 */
export const SEVENTHS: [from: number, to: number][] = [
  [1, 4],
  [5, 9],
  [10, 16],
  [17, 25],
  [26, 36],
  [37, 49],
  [50, 114],
]
export const seventhOf = (n: number) => SEVENTHS.findIndex(([a, z]) => n >= a && n <= z)
export const seventhTitle = (i: number) => `Surahs ${SEVENTHS[i][0]}–${SEVENTHS[i][1]}`

const list = (s: string) =>
  s
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

export const BOOKS: readonly BookMeta[] = SURAHS.map(([name, meaning, place, aliases], i) => ({
  n: i + 1,
  osis: String(i + 1),
  usfm: `Q${String(i + 1).padStart(3, '0')}`,
  name,
  short: String(i + 1),
  group: place,
  division: seventhTitle(seventhOf(i + 1)),
  // The name without its article, and the name in English, find the surah too.
  aliases: [...list(aliases), name.replace(/^A[a-z]{1,2}-/, ''), meaning, meaning.replace(/^The /, '')],
}))

/** What each surah's name means in English, by its number. */
export const MEANINGS: readonly string[] = SURAHS.map((r) => r[1])
