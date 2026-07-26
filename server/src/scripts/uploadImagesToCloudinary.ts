import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinary';

const IMAGES_ROOT = path.resolve(__dirname, '../../uploads/images');
const MAP_FILE = path.resolve(__dirname, '../seeders/cloudinary-image-map.json');
const IMAGE_EXTS = /\.(jpg|jpeg|png|webp)$/i;

interface ImageMapping {
  originalFileName: string;
  localPath: string;
  type: string;
  cloudinaryUrl: string;
  secureUrl: string;
  publicId: string;
}

// Sanitize filename for Cloudinary public_id (no special chars/diacritics)
function sanitizePublicId(filename: string): string {
  return filename
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 80);
}

// Helper to convert filename to slug (for matching local server static files)
function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function main() {
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`❌ Root images folder not found at: ${IMAGES_ROOT}`);
    process.exit(1);
  }

  // Load existing mapping if it exists to avoid double uploading
  let mappings: ImageMapping[] = [];
  if (fs.existsSync(MAP_FILE)) {
    try {
      mappings = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8'));
      console.log(`Loaded ${mappings.length} existing mappings.`);
    } catch {
      mappings = [];
    }
  }

  // Folders to scan and upload configs
  const subfolders = [
    { name: 'product', type: 'product', folder: 'craftlocal/products' },
    { name: 'workshop', type: 'workshop', folder: 'craftlocal/workshops' },
    { name: 'category', type: 'category', folder: 'craftlocal/categories' },
    { name: 'categories+workshops', type: 'category', folder: 'craftlocal/categories' },
    { name: 'avatar', type: 'avatar', folder: 'craftlocal/avatars' },
  ];

  let totalUploaded = 0;
  let totalFallback = 0;
  let totalSkipped = 0;

  for (const sub of subfolders) {
    const subPath = path.join(IMAGES_ROOT, sub.name);
    if (!fs.existsSync(subPath)) {
      continue;
    }

    console.log(`\n📁 Scanning subfolder: ${sub.name} -> Cloudinary: ${sub.folder}`);
    const files = fs.readdirSync(subPath).filter(f => IMAGE_EXTS.test(f));

    for (const file of files) {
      const filePath = path.join(subPath, file);
      const relativeLocalPath = `server/uploads/images/${sub.name}/${file}`;

      // Check file size (10MB limit)
      const stats = fs.statSync(filePath);
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(`⚠️ SKIP: file quá 10MB: ${file}`);
        totalSkipped++;
        continue;
      }

      // Check if already uploaded
      const exists = mappings.some(m => m.originalFileName === file && m.type === sub.type);
      if (exists) {
        console.log(`  ⏭️ Already uploaded/mapped: ${file}`);
        continue;
      }

      try {
        console.log(`  📤 Uploading: ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        
        const publicId = sanitizePublicId(file);
        const result = await cloudinary.uploader.upload(filePath, {
          folder: sub.folder,
          public_id: publicId,
        });

        mappings.push({
          originalFileName: file,
          localPath: relativeLocalPath,
          type: sub.type,
          cloudinaryUrl: result.secure_url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });

        console.log(`    ✅ Success Cloudinary: ${result.secure_url}`);
        totalUploaded++;
      } catch (err: any) {
        console.error(`    ❌ Cloudinary Fail: ${file} - ${err.message || err}`);
        
        // Save local server static url path as fallback in mapping
        const slugName = toSlug(file);
        const localUrl = `/images/${sub.name === 'product' ? 'product' : 'workshop'}/${slugName}`;
        
        // Remove old occurrences of this file if exists to prevent duplication
        mappings = mappings.filter(m => !(m.originalFileName === file && m.type === sub.type));

        mappings.push({
          originalFileName: file,
          localPath: relativeLocalPath,
          type: sub.type,
          cloudinaryUrl: localUrl,
          secureUrl: localUrl,
          publicId: `local-${slugName}`,
        });

        console.log(`    ⚠️ Fallback Local Path mapped: ${localUrl}`);
        totalFallback++;
      }
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(MAP_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save mapping
  fs.writeFileSync(MAP_FILE, JSON.stringify(mappings, null, 2), 'utf-8');
  console.log(`\n==================================================`);
  console.log(`📋 Mapping saved to: ${MAP_FILE}`);
  console.log(`   Uploaded to Cloudinary: ${totalUploaded} | Fallback Local: ${totalFallback} | Skipped: ${totalSkipped} | Total: ${mappings.length}`);
}

main().catch(err => {
  console.error('Fatal error during upload:', err);
  process.exit(1);
});
