/**
 * Upload banner image from uploads/images/banner to Cloudinary
 * Run: npx ts-node src/scripts/uploadBannerFromUploads.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import { uploadLocalFileToCloudinary, buildImageFolder } from '../services/cloudinary.service';

const BANNER_DIR = path.resolve(__dirname, '../../uploads/images/banner');

async function main() {
  console.log('🖼️  Scanning banner folder:', BANNER_DIR);

  const files = fs.readdirSync(BANNER_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  console.log(`Found ${files.length} image(s):\n`);

  const folder = buildImageFolder('hero');

  for (const file of files) {
    const filePath = path.join(BANNER_DIR, file);
    const publicId = 'banner-' + file.replace(/\.[^.]+$/, '').replace(/\s+/g, '-').toLowerCase();
    console.log(`📤 Uploading "${file}" as ${publicId}...`);
    try {
      const result = await uploadLocalFileToCloudinary(filePath, folder, publicId);
      console.log(`   ✅ ${result.secure_url}\n`);
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }
  }
}

main().catch(console.error);
