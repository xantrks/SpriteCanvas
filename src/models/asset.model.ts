export interface Asset {
  id: string;
  type: 'spritesheet' | 'tilemap' | 'tile';
  dataUrl: string;
  prompt: string;
}
