import { describe, it, expect } from 'vitest';
import { computeIoU, deduplicateDetections, processDetections } from '../src/inventory';
import { PropertyDetections, Room } from '../src/types';

describe('computeIoU', () => {
  it('should calculate IoU correctly for overlapping boxes', () => {
    // 100x100 box at origin
    const box1: [number, number, number, number] = [0, 0, 100, 100];
    // 100x100 box shifted by 50,50. Intersection is 50x50 = 2500
    // Union is 10000 + 10000 - 2500 = 17500
    // IoU = 2500 / 17500 = 1/7 ~= 0.1428
    const box2: [number, number, number, number] = [50, 50, 100, 100];
    const iou = computeIoU(box1, box2);
    expect(iou).toBeCloseTo(1 / 7, 3);
  });

  it('should return 0 for non-overlapping boxes', () => {
    const box1: [number, number, number, number] = [0, 0, 10, 10];
    const box2: [number, number, number, number] = [20, 20, 10, 10];
    expect(computeIoU(box1, box2)).toBe(0);
  });

  it('should return 1 for identical boxes', () => {
    const box1: [number, number, number, number] = [10, 10, 50, 50];
    expect(computeIoU(box1, box1)).toBe(1);
  });
});

describe('deduplicateDetections', () => {
  it('should filter out low confidence and immovable items', () => {
    const room: Room = {
      roomId: 'r1',
      name: 'Test Room',
      photos: [
        {
          photoId: 'p1',
          detections: [
            { class: 'sofa', confidence: 0.9, bbox: [0, 0, 100, 100], movable: true },
            { class: 'chair', confidence: 0.3, bbox: [0, 0, 100, 100], movable: true }, // low conf
            { class: 'oven', confidence: 0.9, bbox: [0, 0, 100, 100], movable: false }, // not movable
            { class: 'person', confidence: 0.9, bbox: [0, 0, 100, 100], movable: true }, // ignored class
          ]
        }
      ]
    };

    const items = deduplicateDetections(room);
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Sofa');
    expect(items[0].quantity).toBe(1);
  });

  it('should deduplicate items across photos using IoU > 0.5', () => {
    const room: Room = {
      roomId: 'r1',
      name: 'Test Room',
      photos: [
        {
          photoId: 'p1',
          detections: [
            { class: 'sofa', confidence: 0.9, bbox: [0, 0, 100, 100] }
          ]
        },
        {
          photoId: 'p2',
          detections: [
            // Almost the same position, high IoU
            { class: 'sofa', confidence: 0.8, bbox: [5, 5, 95, 95] }
          ]
        }
      ]
    };

    const items = deduplicateDetections(room);
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Sofa');
    expect(items[0].quantity).toBe(1); // clustered together
  });

  it('should NOT deduplicate items in the same photo even if they overlap', () => {
    const room: Room = {
      roomId: 'r1',
      name: 'Test Room',
      photos: [
        {
          photoId: 'p1',
          detections: [
            { class: 'sofa', confidence: 0.9, bbox: [0, 0, 100, 100] },
            { class: 'sofa', confidence: 0.8, bbox: [5, 5, 95, 95] } // Same photo
          ]
        }
      ]
    };

    const items = deduplicateDetections(room);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2); // must be 2 separate objects since they are in the same photo
  });

  it('should fallback to max count per class when bboxes are missing', () => {
    const room: Room = {
      roomId: 'r1',
      name: 'Test Room',
      photos: [
        {
          photoId: 'p1',
          detections: [
            { class: 'chair', confidence: 0.9 },
            { class: 'chair', confidence: 0.8 }
          ]
        },
        {
          photoId: 'p2',
          detections: [
            { class: 'chair', confidence: 0.9 },
            { class: 'chair', confidence: 0.8 },
            { class: 'chair', confidence: 0.7 }
          ]
        }
      ]
    };

    const items = deduplicateDetections(room);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3); // Max count is 3 from photo 2
  });
});

describe('processDetections', () => {
  it('should process full property correctly', () => {
    const property: PropertyDetections = {
      propertyId: 'prop_001',
      rooms: [
        {
          roomId: 'r1',
          name: 'Living',
          photos: [
            {
              photoId: 'p1',
              detections: [{ class: 'sofa', confidence: 0.9, bbox: [0,0,10,10] }]
            }
          ]
        }
      ]
    };

    const result = processDetections(property);
    expect(result.propertyId).toBe('prop_001');
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].items[0].volumeM3).toBe(1.8); // from volumes.ts
  });
});
