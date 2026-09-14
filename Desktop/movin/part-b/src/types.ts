export interface BoundingBox {
  0: number; // x
  1: number; // y
  2: number; // w
  3: number; // h
}

export interface Detection {
  class: string;
  confidence: number;
  bbox?: BoundingBox;
  movable?: boolean; // defaults to true if missing in real models, but explicit in our mock
}

export interface Photo {
  photoId: string;
  detections: Detection[];
}

export interface Room {
  roomId: string;
  name: string;
  photos: Photo[];
}

export interface PropertyDetections {
  propertyId: string;
  rooms: Room[];
}

export interface InventoryItem {
  id: string;
  label: string;
  quantity: number;
  volumeM3: number | null;
  confidence: number; // max confidence or average confidence
  movable: boolean;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface RoomInventory {
  roomId: string;
  name: string;
  photoCount: number;
  items: InventoryItem[];
}

export interface QuoteInventory {
  propertyId: string;
  generatedAt: string;
  rooms: RoomInventory[];
  totalVolumeM3: number;
  hasUnknownVolumes: boolean;
}
