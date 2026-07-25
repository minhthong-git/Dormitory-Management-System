import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinary';

async function main() {
  const productDir = path.resolve(__dirname, '../../uploads/images/product');
  
  if (!fs.existsSync(productDir)) {
    console.error(`❌ Directory not found: ${productDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(productDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  
  if (files.length === 0) {
    console.error(`❌ No image files found in: ${productDir}`);
    process.exit(1);
  }

  const fileName = files[0];
  const filePath = path.join(productDir, fileName);
  console.log(`🔍 Found test image: ${fileName}`);

  // Check file size (10MB = 10 * 1024 * 1024 bytes)
  const stats = fs.statSync(filePath);
  const sizeInMB = stats.size / (1024 * 1024);
  console.log(`📏 File size: ${sizeInMB.toFixed(2)} MB`);

  if (stats.size > 10 * 1024 * 1024) {
    console.error('❌ SKIP: file quá 10MB');
    process.exit(1);
  }

  console.log('📤 Uploading test image to Cloudinary (folder: craftlocal/test)...');
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'craftlocal/test',
    });
    console.log('✅ Upload SUCCESS!');
    console.log(`🔗 secure_url: ${result.secure_url}`);
  } catch (error: any) {
    console.error('❌ Upload FAILED');
    console.error(`Error message: ${error.message}`);
    console.error(`HTTP code: ${error.http_code}`);
    console.error(`Error name: ${error.name}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
