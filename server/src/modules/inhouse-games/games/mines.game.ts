import { ProvablyFairUtils } from '../core/pf.utils.js';

export class MinesEngine {
  public static generateMineGrid(mineCount: number, serverSeed: string, clientSeed: string, nonce: number): boolean[] {
    const totalTiles = 25;
    const grid = new Array(totalTiles).fill(false);
    const hash = ProvablyFairUtils.generateCombinedHash(serverSeed, clientSeed, nonce);

    let placed = 0;
    let offset = 0;
    while (placed < mineCount && offset < hash.length - 2) {
      const idx = parseInt(hash.substring(offset, offset + 2), 16) % totalTiles;
      if (!grid[idx]) {
        grid[idx] = true;
        placed++;
      }
      offset += 2;
    }
    return grid;
  }
}
