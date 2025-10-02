import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { SpriteGeneratorComponent } from './components/sprite-generator/sprite-generator.component';
import { TileCanvasComponent } from './components/tile-canvas/tile-canvas.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { AssetService } from './services/asset.service';
import { Asset } from './models/asset.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [
    SpriteGeneratorComponent,
    TileCanvasComponent,
    GalleryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  assetService = inject(AssetService);
  
  activeMode = signal<'sprite' | 'tile'>('sprite');
  assets = this.assetService.assets;
}