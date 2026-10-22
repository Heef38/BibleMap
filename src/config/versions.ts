import changelog from '../../CHANGELOG.md?raw'
import { parseChangelog } from '@/lib/changelog'

/** Every version of Bible-Map, newest first, read from CHANGELOG.md when the site is built. */
export const VERSIONS = parseChangelog(changelog)

/** The version the site is on: the top entry of CHANGELOG.md. */
export const CURRENT_VERSION = VERSIONS[0]
