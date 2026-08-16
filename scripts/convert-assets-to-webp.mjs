import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();
const assetRoots = ['public', 'src', 'assets'];

async function collectFiles(dir, targetFiles = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, targetFiles);
      continue;
    }

    if (/\.(png|jpe?g|jpg)$/i.test(entry.name)) {
      targetFiles.push(absolutePath);
    }
  }

  return targetFiles;
}

async function convertAssets() {
  const files = [];

  for (const assetRoot of assetRoots) {
    const absoluteRoot = path.join(rootDir, assetRoot);

    try {
      const stat = await fs.stat(absoluteRoot);
      if (stat.isDirectory()) {
        const collected = await collectFiles(absoluteRoot);
        files.push(...collected);
      }
    } catch {
      // Ignore missing asset roots.
    }
  }

  if (files.length === 0) {
    console.log('No PNG/JPG assets found to convert.');
    return;
  }

  for (const file of files) {
    const outputPath = file.replace(/\.(png|jpe?g)$/i, '.webp');
    if (outputPath === file) continue;

    try {
      await sharp(file)
        .webp({ quality: 80 })
        .toFile(outputPath);

      console.log(`Converted ${path.relative(rootDir, file)} -> ${path.relative(rootDir, outputPath)}`);
    } catch (error) {
      console.warn(`Could not convert ${path.relative(rootDir, file)}: ${error.message}`);
    }
  }
}

await convertAssets();
