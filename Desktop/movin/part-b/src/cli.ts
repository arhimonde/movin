import * as fs from 'fs';
import * as path from 'path';
import { processDetections } from './inventory';
import { PropertyDetections } from './types';

function run() {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error('Usage: npx ts-node src/cli.ts <path-to-fixture.json>');
    process.exit(1);
  }

  const rawData = fs.readFileSync(path.resolve(process.cwd(), fixturePath), 'utf-8');
  const input: PropertyDetections = JSON.parse(rawData);

  const inventory = processDetections(input);

  console.log(`\n=== MOVIN INVENTORY QUOTE ===`);
  console.log(`Property: ${inventory.propertyId}`);
  console.log(`Generated: ${inventory.generatedAt}\n`);

  const totalVolume = inventory.totalVolumeM3;
  const hasUnknownVolumes = inventory.hasUnknownVolumes;

  for (const room of inventory.rooms) {
    console.log(`[${room.name}] (from ${room.photoCount} photos)`);
    if (room.items.length === 0) {
      console.log(`  (No movable items detected)`);
    }

    for (const item of room.items) {
      const volString = item.volumeM3 !== null ? `${(item.volumeM3 * item.quantity).toFixed(2)} m³` : 'UNKNOWN';
      console.log(`  - ${item.quantity}x ${item.label} (${volString})`);
      
    }
    console.log('');
  }

  console.log(`=============================`);
  console.log(`TOTAL ESTIMATED VOLUME: ${totalVolume.toFixed(2)} m³`);
  if (hasUnknownVolumes) {
    console.log(`WARNING: Some items have unknown volumes and are not included in the total.`);
  }
  console.log(`=============================\n`);
}

run();
