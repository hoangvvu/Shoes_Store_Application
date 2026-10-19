import { create } from 'zustand';
import { favoriteService } from '@/services/favorite.service';

interface FavoriteState {
  ids: number[];
  loaded: boolean;
  /** Tải danh sách id đã thích (một lần); FavoriteButton và màn Yêu thích tự gọi. */
  ensureLoaded: () => Promise<void>;
  /** Đảo trạng thái thích (cập nhật ngay, lỗi thì hoàn lại). Trả về trạng thái mới. */
  toggle: (productId: number) => Promise<boolean>;
  reset: () => void;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  ids: [],
  loaded: false,

  ensureLoaded: async () => {
    if (get().loaded) return;
    const ids: number[] = [];
    for (let page = 1; page <= 10; page++) {
      const res = await favoriteService.list(page, 100);
      ids.push(...res.items.map((i) => i.productId));
      if (page >= res.totalPages) break;
    }
    set({ ids, loaded: true });
  },

  toggle: async (productId) => {
    const was = get().ids.includes(productId);
    set({ ids: was ? get().ids.filter((i) => i !== productId) : [...get().ids, productId] });
    try {
      if (was) await favoriteService.unlike(productId);
      else await favoriteService.like(productId);
      return !was;
    } catch (e) {
      set({ ids: was ? [...get().ids, productId] : get().ids.filter((i) => i !== productId) }); // hoàn lại
      throw e;
    }
  },

  reset: () => set({ ids: [], loaded: false }),
}));
