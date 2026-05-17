import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// SVG source — 1024×1024 black tile with bold white "MC"
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#0a0a0a"/>
  <text
    x="512"
    y="620"
    font-family="Arial Black, Arial, Helvetica, sans-serif"
    font-size="520"
    font-weight="900"
    fill="#ffffff"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="-20"
  >MC</text>
</svg>`

const targets = [
  { file: 'icon-192.png',        size: 192 },
  { file: 'icon-512.png',        size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  const out = resolve(__dir, '../public', file)
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`✓  ${file} (${size}×${size})`)
}

console.log('Icons generated.')
