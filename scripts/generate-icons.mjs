import sharp from 'sharp'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const src = resolve(__dir, '../public/icon-source.png')

if (!existsSync(src)) {
  console.log('⚠  public/icon-source.png not found.')
  console.log('   Drop a 1024×1024 PNG there, then run: npm run icons')
  process.exit(0)
}

const targets = [
  { file: 'icon-192.png',       size: 192 },
  { file: 'icon-512.png',       size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  const out = resolve(__dir, '../public', file)
  await sharp(src).resize(size, size).png().toFile(out)
  console.log(`✓  ${file} (${size}×${size})`)
}

console.log('Icons generated.')
