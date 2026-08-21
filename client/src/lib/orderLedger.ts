export interface GameOrderItem {
  id: string; // Unique Transaction ID / Order ID (e.g. TXN_MATKA_1740...)
  gameId: string; // e.g. 'matka', 'color-prediction', 'wingo', 'aviator', 'mines', 'plinko', 'slots', 'teen-patti', 'ocean-hunter', 'lottery'
  gameName: string;
  period: string; // Round or Period ID
  userId: string;
  userName: string;
  selection: string; // e.g. "JODI: 66", "GREEN (2.0x)", "2.45x Cashout", "128-16-349"
  betAmount: number;
  resultOutcome?: string; // e.g. "128 - 16 - 349", "GREEN / 7", "3.84x CRASHED", "3 Gems Safe"
  multiplier?: number;
  winAmount?: number; // 0 for loss, payout for win
  status: 'won' | 'lost' | 'pending' | 'cancelled';
  timestamp: number;
  serverSeedHash?: string;
}

const STORAGE_KEY = 'playarena_game_order_ledger';

class OrderLedgerService {
  private getStorage(): GameOrderItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveStorage(items: GameOrderItem[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 300))); // keep latest 300
    } catch {
      // ignore
    }
  }

  /**
   * Record a new game order / bet transaction
   */
  public recordOrder(item: Omit<GameOrderItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): GameOrderItem {
    const order: GameOrderItem = {
      id: item.id || `TXN_${item.gameId.toUpperCase().replace(/-/g, '_')}_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      timestamp: item.timestamp || Date.now(),
      winAmount: item.winAmount ?? 0,
      ...item,
    };

    const current = this.getStorage();
    const updated = [order, ...current.filter((o) => o.id !== order.id)];
    this.saveStorage(updated);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('order_ledger:updated', {
          detail: order,
        })
      );
    }

    return order;
  }

  /**
   * Update an existing order (e.g. resolve outcome and win amount)
   */
  public updateOrder(id: string, updates: Partial<GameOrderItem>): GameOrderItem | null {
    const current = this.getStorage();
    const index = current.findIndex((o) => o.id === id);
    if (index === -1) return null;

    current[index] = { ...current[index], ...updates };
    this.saveStorage(current);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('order_ledger:updated', {
          detail: current[index],
        })
      );
    }

    return current[index];
  }

  /**
   * Retrieve orders for a specific game or all games
   */
  public getOrders(gameId?: string): GameOrderItem[] {
    const all = this.getStorage();
    if (!gameId) return all;
    return all.filter((o) => o.gameId.toLowerCase() === gameId.toLowerCase() || o.gameId.startsWith(gameId.toLowerCase()));
  }

  /**
   * Clear user order ledger
   */
  public clearOrders(gameId?: string) {
    if (!gameId) {
      this.saveStorage([]);
    } else {
      const all = this.getStorage();
      this.saveStorage(all.filter((o) => o.gameId.toLowerCase() !== gameId.toLowerCase()));
    }
  }
}

export const orderLedger = new OrderLedgerService();
