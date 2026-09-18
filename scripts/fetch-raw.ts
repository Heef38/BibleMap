/**
 * Downloads the raw sources into data/raw. Existing files are kept, so re-running
 * only fills in what is missing.
 *
 *   pnpm data:fetch
 */
import fs from 'node:fs'
import path from 'node:path'
import { unzipSync } from 'fflate'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'data', 'raw')

const THEOGRAPHIC = 'https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master'
const TOPICAL = 'https://raw.githubusercontent.com/j86schroeder/topical-bible-search/main/dist'
const SCROLLMAPPER = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json'
const BIBLEDATA = 'https://raw.githubusercontent.com/BradyStephenson/bible-data/main'

const files: [string, string][] = [
  ...['books', 'chapters', 'events', 'people', 'places', 'verses', 'peopleGroups'].map(
    (n): [string, string] => [`theographic/${n}.json`, `${THEOGRAPHIC}/json/${n}.json`],
  ),
  ['theographic/LICENSE', `${THEOGRAPHIC}/LICENSE`],
  ['bsb/bsb.txt', 'https://bereanbible.com/bsb.txt'],
  ['bsb/bsb_usfm.zip', 'https://bereanbible.com/bsb_usfm.zip'],
  ['openbible/cross-references.zip', 'https://a.openbible.info/data/cross-references.zip'],
  ...['nave', 'torrey'].flatMap((s) =>
    ['topics', 'entries', 'assertions', 'anomalies'].map((n): [string, string] => [`topical/${s}/${n}.jsonl`, `${TOPICAL}/${s}/${n}.jsonl`]),
  ),
  ['topical/LICENSE', 'https://raw.githubusercontent.com/j86schroeder/topical-bible-search/main/LICENSE'],
  ...['KJV', 'ASV', 'YLT'].map((t): [string, string] => [`scrollmapper/${t}.json`, `${SCROLLMAPPER}/${t}.json`]),
  ['web/eng-web_usfm.zip', 'https://ebible.org/Scriptures/eng-web_usfm.zip'],
  ...['BibleData-Event', 'BibleData-Epoch', 'BibleData-Person', 'BibleData-PersonRelationship', 'BibleData-PersonVerse', 'BibleData-Reference'].map(
    (n): [string, string] => [`bibledata/${n}.csv`, `${BIBLEDATA}/${n}.csv`],
  ),
  ['bibledata/LICENSE', `${BIBLEDATA}/LICENSE`],
]

async function download(rel: string, url: string) {
  const target = path.join(RAW, rel)
  if (fs.existsSync(target)) {
    console.log(`  kept    ${rel}`)
    return
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(target, buf)
  console.log(`  fetched ${rel} (${(buf.length / 1e6).toFixed(1)} MB)`)
}

function extract(zipRel: string, dirRel: string) {
  const dir = path.join(RAW, dirRel)
  if (fs.existsSync(dir)) return
  const entries = unzipSync(new Uint8Array(fs.readFileSync(path.join(RAW, zipRel))))
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith('/')) continue
    const p = path.join(dir, name)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, data)
  }
  console.log(`  extracted ${zipRel} -> ${dirRel}`)
}

for (const [rel, url] of files) await download(rel, url)
extract('bsb/bsb_usfm.zip', 'bsb/usfm')
extract('web/eng-web_usfm.zip', 'web/usfm')
extract('openbible/cross-references.zip', 'openbible')
console.log('raw data ready')
