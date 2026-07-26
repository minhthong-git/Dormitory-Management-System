import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary';

const MAP_FILE_ROOT = path.resolve(__dirname, '../../../cloudinary-mapping.json');
const MAP_FILE_SEED = path.resolve(__dirname, '../seeders/cloudinary-image-map.json');
const IMAGES_ROOT = path.resolve(__dirname, '../../uploads/images');
const WORKSHOP_IMAGES_DIR = path.join(IMAGES_ROOT, 'workshop');
const PRODUCT_IMAGES_DIR = path.join(IMAGES_ROOT, 'product');
const CATEGORIES_WORKSHOPS_DIR = path.join(IMAGES_ROOT, 'categories+workshops');

interface ImageMapping {
  originalFileName: string;
  localPath: string;
  type: string;
  cloudinaryUrl: string;
  secureUrl: string;
  publicId: string;
}

// Normalize Vietnamese tones and special chars for matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sanitize filename for Cloudinary public_id
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

// Check if a URL is a Cloudinary URL
function isCloudinaryUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http') && url.includes('cloudinary');
}

async function main() {
  console.log('🚀 Starting Cloudinary Image Sync & DB Update Script...\n');

  // Load existing mapping
  let mappings: ImageMapping[] = [];
  let mapFileUsed = MAP_FILE_ROOT;

  if (fs.existsSync(MAP_FILE_ROOT)) {
    try {
      mappings = JSON.parse(fs.readFileSync(MAP_FILE_ROOT, 'utf-8'));
      console.log(`Loaded ${mappings.length} mappings from root mapping file.`);
    } catch {
      console.log('Failed to parse root mapping, trying seed mapping...');
    }
  }

  if (mappings.length === 0 && fs.existsSync(MAP_FILE_SEED)) {
    try {
      mappings = JSON.parse(fs.readFileSync(MAP_FILE_SEED, 'utf-8'));
      mapFileUsed = MAP_FILE_SEED;
      console.log(`Loaded ${mappings.length} mappings from seed mapping file.`);
    } catch {
      console.log('Failed to parse seed mapping.');
    }
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in env!');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB.\n');

  const db = mongoose.connection.db!;
  
  let newUploadsCount = 0;
  let updatedWorkshopsCount = 0;
  let updatedProductsCount = 0;
  
  const workshopsWithoutImages: string[] = [];
  const productsWithoutImages: string[] = [];

  // Helper to upload file if not already mapped
  async function uploadImageIfNeeded(filePath: string, filename: string, type: 'workshop' | 'product' | 'user' | 'category', subfolder: string): Promise<string | null> {
    const relativePath = path.relative(path.resolve(__dirname, '../../..'), filePath).replace(/\\/g, '/');
    
    // Check in mapping
    const existing = mappings.find(m => m.localPath === relativePath || (m.originalFileName === filename && m.type === type));
    if (existing) {
      return existing.secureUrl;
    }

    // Check size limit (10MB)
    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) {
      console.log(`  ⚠️ File too large (>10MB): ${filename}`);
      return null;
    }

    try {
      console.log(`  📤 Uploading ${filename} to Cloudinary folder ${subfolder}...`);
      const publicId = sanitizePublicId(filename);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: subfolder,
        public_id: `${publicId}_${Date.now()}`,
      });

      const newMapping: ImageMapping = {
        originalFileName: filename,
        localPath: relativePath,
        type,
        cloudinaryUrl: result.secure_url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
      };

      mappings.push(newMapping);
      newUploadsCount++;
      console.log(`    ✅ Uploaded: ${result.secure_url}`);
      return result.secure_url;
    } catch (err: any) {
      console.error(`    ❌ Failed to upload ${filename}: ${err.message || err}`);
      return null;
    }
  }

  // 1. PROCESS WORKSHOPS
  console.log('🏺 Processing Workshops...');
  const workshops = await db.collection('workshops').find({ status: { $ne: 'DELETED' } }).toArray();
  
  // Get all subdirectories in uploads/images/workshop
  let localWorkshopDirs: string[] = [];
  if (fs.existsSync(WORKSHOP_IMAGES_DIR)) {
    localWorkshopDirs = fs.readdirSync(WORKSHOP_IMAGES_DIR).filter(f => {
      const p = path.join(WORKSHOP_IMAGES_DIR, f);
      return fs.statSync(p).isDirectory();
    });
  }

  for (const ws of workshops) {
    console.log(`\nAnalyzing Workshop: "${ws.title}"`);
    
    // Find matching local folder
    const wsTitleNorm = normalizeText(ws.title);
    const matchedDir = localWorkshopDirs.find(d => normalizeText(d) === wsTitleNorm);
    
    let uploadedUrls: string[] = [];

    if (matchedDir) {
      const dirPath = path.join(WORKSHOP_IMAGES_DIR, matchedDir);
      const files = fs.readdirSync(dirPath).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      
      console.log(`  Found matching local folder: "${matchedDir}" with ${files.length} images.`);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const url = await uploadImageIfNeeded(filePath, file, 'workshop', 'craftlocal/workshops');
        if (url) {
          uploadedUrls.push(url);
        }
      }
    } else {
      console.log(`  No exact matching folder under uploads/images/workshop/ for "${ws.title}".`);
      // Try search in categories+workshops folder for files matching name
      if (fs.existsSync(CATEGORIES_WORKSHOPS_DIR)) {
        const files = fs.readdirSync(CATEGORIES_WORKSHOPS_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        const matchedFiles = files.filter(f => {
          const fnNorm = normalizeText(f);
          return fnNorm.includes(wsTitleNorm) || wsTitleNorm.includes(fnNorm.replace(/\.(jpg|jpeg|png|webp)$/i, ''));
        });
        
        if (matchedFiles.length > 0) {
          console.log(`  Found ${matchedFiles.length} matched files in categories+workshops directory.`);
          for (const file of matchedFiles) {
            const filePath = path.join(CATEGORIES_WORKSHOPS_DIR, file);
            const url = await uploadImageIfNeeded(filePath, file, 'workshop', 'craftlocal/workshops');
            if (url) {
              uploadedUrls.push(url);
            }
          }
        }
      }
    }

    // Let's check DB current state
    const hasCloudinaryThumbnail = isCloudinaryUrl(ws.thumbnail);
    const currentCloudinaryImages = Array.isArray(ws.images) ? ws.images.filter(img => isCloudinaryUrl(img)) : [];

    let finalThumbnail = ws.thumbnail;
    let finalImages = Array.isArray(ws.images) ? [...ws.images] : [];

    let isModified = false;

    // Check thumbnail
    if (!hasCloudinaryThumbnail) {
      if (uploadedUrls.length > 0) {
        finalThumbnail = uploadedUrls[0];
        isModified = true;
        console.log(`  🆕 Updating thumbnail to Cloudinary: ${finalThumbnail}`);
      } else {
        // Find generic fallback from category + workshops if available
        const categoryImg = mappings.find(m => m.type === 'category' || normalizeText(m.originalFileName).includes(wsTitleNorm));
        if (categoryImg) {
          finalThumbnail = categoryImg.secureUrl;
          isModified = true;
          console.log(`  🆕 Updating thumbnail using category fallback: ${finalThumbnail}`);
        }
      }
    }

    // Check gallery (need 3-6 images)
    // Filter existing non-cloudinary images so we can replace them if we have cloudinary ones,
    // but keep existing Cloudinary URLs.
    const keepImages = finalImages.filter(img => isCloudinaryUrl(img));
    const newImages = [...keepImages];

    // Push uploaded URLs
    for (const url of uploadedUrls) {
      if (!newImages.includes(url)) {
        newImages.push(url);
      }
    }

    // Limit to max 6 images
    const slicedImages = newImages.slice(0, 6);

    if (JSON.stringify(slicedImages) !== JSON.stringify(finalImages)) {
      finalImages = slicedImages;
      isModified = true;
      console.log(`  🆕 Updating gallery to Cloudinary images: [${finalImages.length} images]`);
    }

    if (isModified) {
      await db.collection('workshops').updateOne(
        { _id: ws._id },
        { $set: { thumbnail: finalThumbnail, images: finalImages } }
      );
      updatedWorkshopsCount++;
      console.log(`  💾 Saved workshop changes in MongoDB.`);
    }

    // Check if still missing
    const checkThumbnail = isCloudinaryUrl(finalThumbnail);
    const checkImages = finalImages.some(img => isCloudinaryUrl(img));
    if (!checkThumbnail || !checkImages) {
      workshopsWithoutImages.push(ws.title);
    }
  }

  // 2. PROCESS PRODUCTS
  console.log('\n🎁 Processing Products...');
  const products = await db.collection('products').find({ status: { $ne: 'DELETED' } }).toArray();

  let localProductFiles: string[] = [];
  if (fs.existsSync(PRODUCT_IMAGES_DIR)) {
    localProductFiles = fs.readdirSync(PRODUCT_IMAGES_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  }

  for (const p of products) {
    console.log(`\nAnalyzing Product: "${p.name}"`);

    const pNameNorm = normalizeText(p.name);
    // Find matching file
    const matchedFile = localProductFiles.find(f => {
      const nameWithoutExt = f.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      return normalizeText(nameWithoutExt) === pNameNorm || pNameNorm.includes(normalizeText(nameWithoutExt)) || normalizeText(nameWithoutExt).includes(pNameNorm);
    });

    let uploadedUrl: string | null = null;

    if (matchedFile) {
      console.log(`  Found matching local file: "${matchedFile}"`);
      const filePath = path.join(PRODUCT_IMAGES_DIR, matchedFile);
      uploadedUrl = await uploadImageIfNeeded(filePath, matchedFile, 'product', 'craftlocal/products');
    } else {
      console.log(`  No matching local file under uploads/images/product/ for "${p.name}".`);
    }

    const hasCloudinaryThumbnail = isCloudinaryUrl(p.thumbnail);
    const currentCloudinaryImages = Array.isArray(p.images) ? p.images.filter(img => isCloudinaryUrl(img)) : [];

    let finalThumbnail = p.thumbnail;
    let finalImages = Array.isArray(p.images) ? [...p.images] : [];
    let isModified = false;

    if (!hasCloudinaryThumbnail && uploadedUrl) {
      finalThumbnail = uploadedUrl;
      isModified = true;
      console.log(`  🆕 Updating product thumbnail to Cloudinary: ${finalThumbnail}`);
    }

    const keepImages = finalImages.filter(img => isCloudinaryUrl(img));
    const newImages = [...keepImages];
    if (uploadedUrl && !newImages.includes(uploadedUrl)) {
      newImages.push(uploadedUrl);
    }

    const slicedImages = newImages.slice(0, 4);
    if (JSON.stringify(slicedImages) !== JSON.stringify(finalImages)) {
      finalImages = slicedImages;
      isModified = true;
      console.log(`  🆕 Updating product gallery to Cloudinary: [${finalImages.length} images]`);
    }

    if (isModified) {
      await db.collection('products').updateOne(
        { _id: p._id },
        { $set: { thumbnail: finalThumbnail, images: finalImages } }
      );
      updatedProductsCount++;
      console.log(`  💾 Saved product changes in MongoDB.`);
    }

    if (!isCloudinaryUrl(finalThumbnail) || finalImages.length === 0 || !finalImages.some(img => isCloudinaryUrl(img))) {
      productsWithoutImages.push(p.name);
    }
  }

  // 3. PROCESS USERS (AVATARS)
  console.log('\n👤 Checking Users (Avatars)...');
  const users = await db.collection('users').find({}).toArray();
  let updatedUsersCount = 0;

  for (const u of users) {
    // Check if user has avatar but it's not Cloudinary
    if (u.avatar && !isCloudinaryUrl(u.avatar) && u.avatar.startsWith('/')) {
      // Find if we have it in mapping or local files
      const filename = path.basename(u.avatar);
      // Look for it in uploads/images/avatar or elsewhere if it exists
      const possibleDirs = [
        path.join(IMAGES_ROOT, 'avatar'),
        path.join(IMAGES_ROOT, 'user'),
        IMAGES_ROOT
      ];

      let foundPath: string | null = null;
      for (const dir of possibleDirs) {
        if (fs.existsSync(dir)) {
          const p = path.join(dir, filename);
          if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            foundPath = p;
            break;
          }
        }
      }

      if (foundPath) {
        console.log(`  Found local avatar file for user "${u.fullName}": ${filename}`);
        const url = await uploadImageIfNeeded(foundPath, filename, 'user', 'craftlocal/users');
        if (url) {
          await db.collection('users').updateOne(
            { _id: u._id },
            { $set: { avatar: url } }
          );
          updatedUsersCount++;
          console.log(`  💾 Updated avatar for user "${u.fullName}" in MongoDB.`);
        }
      }
    }
  }

  // Save mapping file back to root and seed
  console.log('\nSaving mapping file...');
  const mappingJson = JSON.stringify(mappings, null, 2);
  fs.writeFileSync(MAP_FILE_ROOT, mappingJson, 'utf-8');
  fs.writeFileSync(MAP_FILE_SEED, mappingJson, 'utf-8');
  console.log(`✅ Saved ${mappings.length} mappings in both root and seed.`);

  // DISCONNECT DB
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB.');

  // PRINT FINAL REPORT
  console.log('\n======================================================');
  console.log('📊 CLOUDINARY IMAGE SYNC REPORT');
  console.log('======================================================');
  console.log(`1. New images uploaded: ${newUploadsCount}`);
  console.log(`2. Workshops supplemented with Cloudinary images: ${updatedWorkshopsCount}`);
  console.log(`3. Products supplemented with Cloudinary images: ${updatedProductsCount}`);
  console.log(`4. Users (Avatars) updated to Cloudinary: ${updatedUsersCount}`);
  console.log('------------------------------------------------------');
  
  if (workshopsWithoutImages.length > 0) {
    console.log(`⚠️ Workshops still missing Cloudinary images (${workshopsWithoutImages.length}):`);
    workshopsWithoutImages.forEach(title => console.log(`   - ${title}`));
  } else {
    console.log('✅ All active workshops have Cloudinary images!');
  }

  if (productsWithoutImages.length > 0) {
    console.log(`⚠️ Products still missing Cloudinary images (${productsWithoutImages.length}):`);
    productsWithoutImages.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log('✅ All active products have Cloudinary images!');
  }
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('❌ Critical script error:', err);
  process.exit(1);
});
