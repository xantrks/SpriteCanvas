import { Component, ChangeDetectionStrategy, signal, inject, ElementRef, viewChild, effect, computed } from '@angular/core';
import { GeminiService } from '../../services/gemini.service';
import { AssetService } from '../../services/asset.service';
import { Asset } from '../../models/asset.model';

@Component({
  selector: 'app-tile-canvas',
  templateUrl: './tile-canvas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TileCanvasComponent {
  geminiService = inject(GeminiService);
  assetService = inject(AssetService);
  
  hiddenCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('hiddenCanvas');

  canvasMode = signal<'upload' | 'blank'>('upload');
  rows = signal(5);
  cols = signal(5);
  tiles = signal<(string | null)[][]>(this.createGrid(5, 5));
  selectedTileCoords = signal<{ row: number; col: number } | null>(null);
  editPrompt = signal('A small treasure chest, pixel art.');

  // Zoom state
  zoomLevel = signal(1);
  readonly minZoom = 0.2;
  readonly maxZoom = 3;
  readonly zoomStep = 0.1;
  zoomPercentage = computed(() => Math.round(this.zoomLevel() * 100));

  isLoading = this.geminiService.isLoading;
  error = this.geminiService.error;

  constructor() {
    effect(() => {
        const selected = this.assetService.selectedAsset();
        if (selected && selected.type === 'tilemap') {
            this.loadTilemapFromAsset(selected);
        }
    });
  }

  private createGrid(rows: number, cols: number): (string | null)[][] {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }

  selectTile(row: number, col: number): void {
    this.selectedTileCoords.set({ row, col });
  }
  
  addRow() {
      this.rows.update(r => r + 1);
      this.tiles.update(currentGrid => [...currentGrid, Array(this.cols()).fill(null)]);
  }

  removeRow() {
      if (this.rows() <= 1) return;
      this.rows.update(r => r - 1);
      this.tiles.update(currentGrid => currentGrid.slice(0, -1));
      if (this.selectedTileCoords()?.row === this.rows()) {
          this.selectedTileCoords.set(null);
      }
  }

  addCol() {
      this.cols.update(c => c + 1);
      this.tiles.update(currentGrid => currentGrid.map(row => [...row, null]));
  }

  removeCol() {
      if (this.cols() <= 1) return;
      this.cols.update(c => c - 1);
      this.tiles.update(currentGrid => currentGrid.map(row => row.slice(0, -1)));
      if (this.selectedTileCoords()?.col === this.cols()) {
          this.selectedTileCoords.set(null);
      }
  }

  zoomIn(): void {
    this.zoomLevel.update(z => Math.min(this.maxZoom, z + this.zoomStep));
  }

  zoomOut(): void {
    this.zoomLevel.update(z => Math.max(this.minZoom, z - this.zoomStep));
  }
  
  resetZoom(): void {
      this.zoomLevel.set(1);
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.splitImageIntoTiles(img);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  private splitImageIntoTiles(img: HTMLImageElement): void {
    const canvas = this.hiddenCanvas().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numCols = 3;
    const numRows = 3;
    this.cols.set(numCols);
    this.rows.set(numRows);

    const tileWidth = img.width / numCols;
    const tileHeight = img.height / numRows;
    canvas.width = tileWidth;
    canvas.height = tileHeight;
    const newTiles: (string | null)[][] = this.createGrid(numRows, numCols);

    for (let y = 0; y < numRows; y++) {
      for (let x = 0; x < numCols; x++) {
        ctx.clearRect(0, 0, tileWidth, tileHeight);
        ctx.drawImage(img, x * tileWidth, y * tileHeight, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
        newTiles[y][x] = canvas.toDataURL();
      }
    }
    this.tiles.set(newTiles);
    this.canvasMode.set('blank');
  }

  private loadTilemapFromAsset(asset: Asset): void {
    // This is a simplified loader; it assumes the asset is a tilemap image
    // and splits it back into a 3x3 grid for further editing.
    // A more complex implementation could store grid metadata.
    const img = new Image();
    img.onload = () => this.splitImageIntoTiles(img);
    img.src = asset.dataUrl;
  }

  async applyAiEdit(): Promise<void> {
    const coords = this.selectedTileCoords();
    if (coords === null || !this.editPrompt()) return;

    const contextPrompt = `A single game tile, pixel art style, that looks like: "${this.editPrompt()}". It should seamlessly fit into a tilemap.`
    const dataUrl = await this.geminiService.generateImage(contextPrompt, '1:1');

    if (dataUrl) {
      this.tiles.update(currentTiles => {
        const newTiles = currentTiles.map(r => [...r]);
        newTiles[coords.row][coords.col] = dataUrl;
        return newTiles;
      });
      this.assetService.addAsset({ 
        type: 'tile', 
        dataUrl, 
        prompt: this.editPrompt() 
      });
    }
  }

  clearCanvas(): void {
    this.tiles.set(this.createGrid(this.rows(), this.cols()));
    this.selectedTileCoords.set(null);
  }

  downloadMap(): void {
    const canvas = this.hiddenCanvas().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tiles = this.tiles();
    const flatTiles = tiles.flat();
    if(flatTiles.every(t => t === null)) return;
    
    const firstTileUrl = flatTiles.find(t => t !== null);
    if (!firstTileUrl) return;

    const firstTile = new Image();
    firstTile.onload = () => {
        const tileWidth = firstTile.width;
        const tileHeight = firstTile.height;
        const totalCols = this.cols();
        const totalRows = this.rows();

        canvas.width = tileWidth * totalCols;
        canvas.height = tileHeight * totalRows;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const promises = tiles.flatMap((row, r) => 
            row.map((tileDataUrl, c) => {
                return new Promise<void>(resolve => {
                    if (tileDataUrl) {
                        const img = new Image();
                        img.onload = () => {
                            const x = c * tileWidth;
                            const y = r * tileHeight;
                            ctx.drawImage(img, x, y);
                            resolve();
                        };
                        img.onerror = () => resolve(); // continue if an image fails
                        img.src = tileDataUrl;
                    } else {
                        resolve();
                    }
                });
            })
        );

        Promise.all(promises).then(() => {
            const dataUrl = canvas.toDataURL('image/png');
            this.assetService.addAsset({ type: 'tilemap', dataUrl, prompt: 'Custom Tilemap' });
            const a = document.createElement('a');
a.href = dataUrl;
            a.download = 'tilemap.png';
            a.click();
        });
    }
    firstTile.src = firstTileUrl;
  }
}