/**
 * Upload banner images to Cloudinary
 * Run: npx ts-node src/scripts/uploadBanners.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { uploadLocalFileToCloudinary, buildImageFolder } from '../services/cloudinary.service';

const IMAGES_DIR = path.resolve(__dirname, '../../../frontend/src/assets/images');

const bannerFiles = [
  { file: 'hero-workshop.jpg', publicId: 'hero-workshop' },
  { file: 'pottery-workshop.jpg', publicId: 'pottery-workshop' },
  { file: 'lantern-workshop.jpg', publicId: 'lantern-workshop' },
  { file: 'textile-workshop.jpg', publicId: 'textile-workshop' },
  { file: 'artisan-story.jpg', publicId: 'artisan-story' },
  { file: 'ceramic-product.jpg', publicId: 'ceramic-product' },
];

async function main() {
  console.log('🖼️  Uploading banner images to Cloudinary...\n');
  const folder = buildImageFolder('hero');
  const results: { name: string; url: string }[] = [];

  for (const { file, publicId } of bannerFiles) {
    const filePath = path.join(IMAGES_DIR, file);
    console.log(`📤 Uploading ${file}...`);
    try {
      const result = await uploadLocalFileToCloudinary(filePath, folder, publicId);
      console.log(`   ✅ ${result.secure_url}\n`);
      results.push({ name: publicId, url: result.secure_url });
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }
  }

  console.log('\n📋 Results (copy these URLs):');
  console.log('─'.repeat(60));
  for (const r of results) {
    console.log(`${r.name}: ${r.url}`);
  }
  console.log('─'.repeat(60));
}

main().catch(console.error);
