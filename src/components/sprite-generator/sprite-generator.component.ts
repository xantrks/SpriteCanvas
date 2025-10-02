import { Component, ChangeDetectionStrategy, signal, inject, effect } from '@angular/core';
import { GeminiService } from '../../services/gemini.service';
import { AssetService } from '../../services/asset.service';

interface AnimationOption {
  name: string;
  checked: boolean;
}

@Component({
  selector: 'app-sprite-generator',
  templateUrl: './sprite-generator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpriteGeneratorComponent {
  geminiService = inject(GeminiService);
  assetService = inject(AssetService);

  prompt = signal('A cute, heroic slime knight with a small sword and shield, pixel art style.');
  animations = signal<AnimationOption[]>([
    { name: 'Idle', checked: true },
    { name: 'Walk', checked: true },
    { name: 'Attack', checked: true },
    { name: 'Jump', checked: false },
    { name: 'Damage', checked: false },
    { name: 'Death', checked: false },
  ]);

  displayedImage = signal<string | null>(null);

  isLoading = this.geminiService.isLoading;
  error = this.geminiService.error;

  constructor() {
    effect(() => {
      const selected = this.assetService.selectedAsset();
      if (selected && (selected.type === 'spritesheet' || selected.type === 'tile')) {
        this.displayedImage.set(selected.dataUrl);
        this.prompt.set(selected.prompt);
      }
    });
  }

  async generateSpriteSheet() {
    const selectedAnimations = this.animations()
      .filter(anim => anim.checked)
      .map(anim => anim.name)
      .join(', ');

    if (!this.prompt() || !selectedAnimations) {
      this.error.set('Please provide a character description and select at least one animation.');
      return;
    }

    const fullPrompt = `A high-quality, professional 8-frame sprite sheet of a character: "${this.prompt()}". The sprite sheet should feature animations for: ${selectedAnimations}. The background must be transparent. The style should be consistent across all frames and suitable for a 2D platformer game.`;

    const dataUrl = await this.geminiService.generateImage(fullPrompt, '16:9');

    if (dataUrl) {
      this.displayedImage.set(dataUrl);
      this.assetService.addAsset({ 
        type: 'spritesheet', 
        dataUrl: dataUrl,
        prompt: this.prompt()
      });
    }
  }
  
  toggleAnimation(index: number) {
      this.animations.update(anims => {
          const newAnims = [...anims];
          newAnims[index] = { ...newAnims[index], checked: !newAnims[index].checked };
          return newAnims;
      });
  }
}