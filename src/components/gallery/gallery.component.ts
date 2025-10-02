import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { Asset } from '../../models/asset.model';
import { AssetService } from '../../services/asset.service';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryComponent {
  assets = input.required<Asset[]>();
  assetService = inject(AssetService);

  selectAsset(asset: Asset) {
    this.assetService.selectAsset(asset);
  }
}