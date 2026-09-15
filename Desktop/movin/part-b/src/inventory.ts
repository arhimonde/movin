import { BoundingBox, Detection, InventoryItem, PropertyDetections, QuoteInventory, Room, RoomInventory } from './types';
import { getVolume } from './volumes';

const CONFIDENCE_THRESHOLD = 0.5; // We drop detections below 50% confidence.

export function computeIoU(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1[0], box2[0]);
  const y1 = Math.max(box1[1], box2[1]);
  const x2 = Math.min(box1[0] + box1[2], box2[0] + box2[2]);
  const y2 = Math.min(box1[1] + box1[3], box2[1] + box2[3]);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (intersection === 0) return 0;

  const area1 = box1[2] * box1[3];
  const area2 = box2[2] * box2[3];
  const union = area1 + area2 - intersection;

  return intersection / union;
}

export function deduplicateDetections(room: Room): InventoryItem[] {
  // 1. Filter out low confidence and immovable items
  const validDetections: { photoId: string, detection: Detection }[] = [];
  
  for (const photo of room.photos) {
    for (const det of photo.detections) {
      if (det.confidence >= CONFIDENCE_THRESHOLD && det.movable !== false) {
        // We do not move people. Skip specific irrelevant classes
        if (det.class === 'person' || det.class === 'window' || det.class === 'door') {
          continue;
        }
        validDetections.push({ photoId: photo.photoId, detection: det });
      }
    }
  }

  // 2. Group by class
  const classGroups = new Map<string, typeof validDetections>();
  for (const item of validDetections) {
    if (!classGroups.has(item.detection.class)) {
      classGroups.set(item.detection.class, []);
    }
    classGroups.get(item.detection.class)!.push(item);
  }

  let nextId = 1;
  const inventoryItems: InventoryItem[] = [];

  for (const [cls, items] of classGroups.entries()) {
    const allHaveBboxes = items.every(i => i.detection.bbox !== undefined);
    
    if (allHaveBboxes && items.length > 0) {
      // 3a. Deduplication by IoU (Clustering)
      const clusters: (typeof validDetections)[] = [];

      for (const item of items) {
        let addedToCluster = false;
        for (const cluster of clusters) {
          // A physical object can only appear ONCE per photo.
          // So if the cluster already has a detection from THIS photo, it's a different object.
          const hasSamePhoto = cluster.some(c => c.photoId === item.photoId);
          if (!hasSamePhoto) {
             const overlaps = cluster.some(c => computeIoU(c.detection.bbox!, item.detection.bbox!) > 0.5);
             if (overlaps) {
               cluster.push(item);
               addedToCluster = true;
               break;
             }
          }
        }
        if (!addedToCluster) {
          clusters.push([item]);
        }
      }

      // We have our clusters. Each cluster is exactly 1 physical object.
      // E.g. if we have 3 clusters, there are 3 sofas in the room.
      if (clusters.length > 0) {
        inventoryItems.push({
          id: `${room.roomId}_${cls}_${nextId++}`,
          label: formatLabel(cls),
          quantity: clusters.length,
          volumeM3: getVolume(cls),
          // We take the max confidence across all detections for these objects
          confidence: Math.max(...items.map(i => i.detection.confidence)),
          movable: true,
          needsReview: getVolume(cls) === null || clusters.length >= 6 || items.some(i => i.detection.needsReview),
          reviewReason: getVolume(cls) === null ? 'Unknown volume' : clusters.length >= 6 ? 'Unusually high quantity' : items.some(i => i.detection.needsReview) ? 'Detection confidence or mapping needs review' : undefined
        });
      }
    } else {
      // 3b. Fallback: Max count per class in any single photo
      const countsByPhoto = new Map<string, number>();
      for (const item of items) {
        countsByPhoto.set(item.photoId, (countsByPhoto.get(item.photoId) || 0) + 1);
      }
      let maxCount = 0;
      for (const count of countsByPhoto.values()) {
        if (count > maxCount) maxCount = count;
      }
      
      if (maxCount > 0) {
        inventoryItems.push({
          id: `${room.roomId}_${cls}_${nextId++}`,
          label: formatLabel(cls),
          quantity: maxCount,
          volumeM3: getVolume(cls),
          confidence: Math.max(...items.map(i => i.detection.confidence)),
          movable: true,
          needsReview: getVolume(cls) === null || maxCount >= 6,
          reviewReason: getVolume(cls) === null ? 'Unknown volume' : maxCount >= 6 ? 'Unusually high quantity' : undefined
        });
      }
    }
  }

  return inventoryItems;
}

function formatLabel(cls: string): string {
  const spaced = cls.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function processDetections(input: PropertyDetections): QuoteInventory {
  const roomsInventory: RoomInventory[] = [];

  for (const room of input.rooms) {
    const items = deduplicateDetections(room);
    roomsInventory.push({
      roomId: room.roomId,
      name: room.name,
      photoCount: room.photos.length,
      items
    });
  }

  let totalVolumeM3 = 0;
  let hasUnknownVolumes = false;
  for (const room of roomsInventory) {
    for (const item of room.items) {
      if (item.volumeM3 === null) hasUnknownVolumes = true;
      else totalVolumeM3 += item.volumeM3 * item.quantity;
    }
  }

  return {
    propertyId: input.propertyId,
    generatedAt: new Date().toISOString(),
    rooms: roomsInventory,
    totalVolumeM3,
    hasUnknownVolumes
  };
}
