/**
 * Downloads the raw sources of the Quran edition into data/raw/quran. Existing files are kept,
 * so re-running only fills in what is missing.
 *
 *   pnpm data:fetch:quran
 */
import fs from 'node:fs'
import path from 'node:path'

const RAW = path.resolve(import.meta.dirname, '..', 'data', 'raw', 'quran')

// The Arabic text and the two older translations are Tanzil's, served here by alquran.cloud,
// which also has the divisions of the text (sections, reading portions, prostrations).
const ALQURAN = 'https://api.alquran.cloud/v1'

const files: [string, string][] = [
  ['alquran-meta.json', `${ALQURAN}/meta`],
  ['alquran-uthmani.json', `${ALQURAN}/quran/quran-uthmani`],
  ['alquran-en.pickthall.json', `${ALQURAN}/quran/en.pickthall`],
  ['alquran-en.wahiduddin.json', `${ALQURAN}/quran/en.wahiduddin`],
  // Talal Itani's translation, verse by verse, from its publisher (the edition that says "God").
  ['clearquran-god.zip', 'https://www.clearquran.com/downloads/quran-verse-by-verse-text.zip'],
  // Names of the surahs in English letters, and the traditional order of revelation.
  ['qurancom-chapters.json', 'https://api.quran.com/api/v4/chapters?language=en'],
  // Every word of the Arabic with its dictionary form, root and part of speech: a revision of
  // the Quranic Arabic Corpus morphology (version 0.4).
  ['quran-morphology.txt', 'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt'],
]

for (const [rel, url] of files) {
  const target = path.join(RAW, rel)
  if (fs.existsSync(target)) {
    console.log(`  kept    ${rel}`)
    continue
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(target, buf)
  console.log(`  fetched ${rel} (${(buf.length / 1e6).toFixed(1)} MB)`)
}
console.log('raw data ready')
