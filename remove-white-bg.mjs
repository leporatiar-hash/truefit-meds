import sharp from 'sharp'
import { rename, unlink } from 'fs/promises'

const files = ['AdvocateHome.png', 'Advocate_Daily_log.png', 'AdvocateSummary.png']

for (const file of files) {
  const src = `public/${file}`
  const trimmed = `public/trimmed_${file}`

  // Step 1: trim near-white padding from the edges
  await sharp(src)
    .trim({ background: '#ffffff', threshold: 10 })
    .toFile(trimmed)

  // Step 2: zero-alpha any surviving near-white pixels
  const { data, info } = await sharp(trimmed)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
      data[i + 3] = 0
    }
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(src)

  await unlink(trimmed)
  console.log(`Done: ${file}`)
}
