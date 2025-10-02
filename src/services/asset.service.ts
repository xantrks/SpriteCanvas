import { Injectable, signal } from '@angular/core';
import { Asset } from '../models/asset.model';

@Injectable({ providedIn: 'root' })
export class AssetService {
  assets = signal<Asset[]>([]);
  selectedAsset = signal<Asset | null>(null);

  addAsset(asset: Omit<Asset, 'id'>) {
    const newAsset: Asset = {
      ...asset,
      id: Date.now().toString() + Math.random().toString(36).substring(2),
    };
    this.assets.update(currentAssets => [newAsset, ...currentAssets]);
  }

  selectAsset(asset: Asset | null) {
    this.selectedAsset.set(asset);
  }
}