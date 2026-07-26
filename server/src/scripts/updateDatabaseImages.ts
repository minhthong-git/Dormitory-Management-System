import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { env } from '../config/env';

const MAP_FILE = path.resolve(__dirname, '../seeders/cloudinary-image-map.json');

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchScore(filename: string, recordName: string): number {
  const fnNorm = normalize(filename);
  const recNorm = normalize(recordName);
  if (fnNorm === recNorm) return 100;
  if (fnNorm.includes(recNorm)) return 80;
  if (recNorm.includes(fnNorm)) return 70;
  
  const fnWords = fnNorm.split(' ').filter((w) => w.length > 2);
  const recWords = recNorm.split(' ').filter((w) => w.length > 2);
  if (recWords.length === 0) return 0;
  
  let matches = 0;
  for (const rw of recWords) {
    if (fnWords.some((fw) => fw.includes(rw) || rw.includes(fw))) matches++;
  }
  return Math.round((matches / recWords.length) * 60);
}

interface ImageMapping {
  originalFileName: string;
  localPath: string;
  type: string;
  cloudinaryUrl: string;
  secureUrl: string;
  publicId: string;
}

async function main() {
  if (!fs.existsSync(MAP_FILE)) {
    console.error(`❌ Image map file not found at: ${MAP_FILE}. Please run upload:cloudinary first.`);
    process.exit(1);
  }

  let mappings: ImageMapping[] = [];
  try {
    mappings = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8'));
  } catch (err: any) {
    console.error('❌ Failed to parse image map file:', err.message);
    process.exit(1);
  }

  const productMappings = mappings.filter((m) => m.type === 'product');
  const workshopMappings = mappings.filter((m) => m.type === 'workshop');

  console.log(`Loaded ${productMappings.length} product images and ${workshopMappings.length} workshop images from map.\n`);

  if (!env.MONGO_URI) {
    console.error('❌ Missing MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(env.MONGO_URI);
  console.log('✅ MongoDB connected successfully.\n');

  const db = mongoose.connection.db!;
  let updatedWorkshops = 0;
  let updatedProducts = 0;

  // ═══ WORKSHOPS ═══
  console.log('🏺 Updating Workshops...');
  const workshops = await db.collection('workshops').find({}).toArray();

  for (const ws of workshops) {
    const scored = workshopMappings
      .map((m) => ({ m, score: matchScore(m.originalFileName, ws.title) }))
      .filter((s) => s.score > 20)
      .sort((a, b) => b.score - a.score);

    let thumbnail = '';
    let images: string[] = [];

    if (scored.length > 0) {
      thumbnail = scored[0].m.secureUrl;
      images = scored.slice(0, 3).map((s) => s.m.secureUrl);
      console.log(`  🎯 Match: "${ws.title}" -> ${thumbnail} (score: ${scored[0].score})`);
    } else {
      // Fallback to first available workshop image, or generic default if none exists
      if (workshopMappings.length > 0) {
        const idx = workshops.indexOf(ws) % workshopMappings.length;
        thumbnail = workshopMappings[idx].secureUrl;
        images = [workshopMappings[idx].secureUrl];
        console.log(`  📷 Fallback match: "${ws.title}" -> ${thumbnail}`);
      } else {
        thumbnail = '/images/fallback-workshop.jpg';
        images = ['/images/fallback-workshop.jpg'];
        console.log(`  ⚠️ No images available: "${ws.title}" -> fallback generic`);
      }
    }

    await db.collection('workshops').updateOne(
      { _id: ws._id },
      { $set: { thumbnail, images } }
    );
    updatedWorkshops++;
  }

  // ═══ PRODUCTS ═══
  console.log('\n🎁 Updating Products...');
  const products = await db.collection('products').find({}).toArray();

  for (const p of products) {
    const scored = productMappings
      .map((m) => ({ m, score: matchScore(m.originalFileName, p.name) }))
      .filter((s) => s.score > 20)
      .sort((a, b) => b.score - a.score);

    let thumbnail = '';
    let images: string[] = [];

    if (scored.length > 0) {
      thumbnail = scored[0].m.secureUrl;
      images = scored.slice(0, 3).map((s) => s.m.secureUrl);
      console.log(`  🎯 Match: "${p.name}" -> ${thumbnail} (score: ${scored[0].score})`);
    } else {
      // Fallback to first available product image, or generic default if none exists
      if (productMappings.length > 0) {
        const idx = products.indexOf(p) % productMappings.length;
        thumbnail = productMappings[idx].secureUrl;
        images = [productMappings[idx].secureUrl];
        console.log(`  📷 Fallback match: "${p.name}" -> ${thumbnail}`);
      } else {
        thumbnail = '/images/fallback-product.jpg';
        images = ['/images/fallback-product.jpg'];
        console.log(`  ⚠️ No images available: "${p.name}" -> fallback generic`);
      }
    }

    await db.collection('products').updateOne(
      { _id: p._id },
      { $set: { thumbnail, images } }
    );
    updatedProducts++;
  }

  console.log(`\n🎉 Image sync completed! Updated ${updatedWorkshops} workshops and ${updatedProducts} products.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal error during DB sync:', err);
  process.exit(1);
});
