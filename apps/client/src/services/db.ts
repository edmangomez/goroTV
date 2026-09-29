import Dexie, { type EntityTable } from 'dexie';

export interface FavoriteItem {
  id: string; // `${type}_${streamId}`
  type: 'live' | 'movie' | 'series';
  streamId: number;
  name: string;
  icon?: string;
  category_id?: string;
  addedAt: number;
}

export interface FavoriteCategoryItem {
  id: string; // `${type}_${categoryId}` ej: live_123, movie_456
  type: 'live' | 'movie' | 'series';
  categoryId: string;
  name: string;
  addedAt: number;
}

export interface HistoryItem {
  id: string;
  type: 'live' | 'movie' | 'series';
  streamId: number;
  name: string;
  icon?: string;
  progressSeconds?: number;
  durationSeconds?: number;
  updatedAt: number;
}

const db = new Dexie('goroTV_ClientDB') as Dexie & {
  favorites: EntityTable<FavoriteItem, 'id'>;
  history: EntityTable<HistoryItem, 'id'>;
  favorite_categories: EntityTable<FavoriteCategoryItem, 'id'>;
};

db.version(1).stores({
  favorites: 'id, type, streamId, addedAt',
  history: 'id, type, streamId, updatedAt',
});

db.version(2).stores({
  favorite_categories: 'id, type, categoryId, addedAt',
});

export const localDB = {
  async addFavorite(item: Omit<FavoriteItem, 'addedAt'>) {
    await db.favorites.put({ ...item, addedAt: Date.now() });
  },

  async removeFavorite(id: string) {
    await db.favorites.delete(id);
  },

  async isFavorite(id: string): Promise<boolean> {
    const item = await db.favorites.get(id);
    return !!item;
  },

  async getFavorites(type?: 'live' | 'movie' | 'series'): Promise<FavoriteItem[]> {
    if (type) {
      return db.favorites.where('type').equals(type).toArray();
    }
    return db.favorites.toArray();
  },

  async addFavoriteCategory(type: 'live' | 'movie' | 'series', categoryId: string, name: string) {
    const id = `${type}_${categoryId}`;
    await db.favorite_categories.put({
      id,
      type,
      categoryId,
      name,
      addedAt: Date.now(),
    });
  },

  async removeFavoriteCategory(id: string) {
    await db.favorite_categories.delete(id);
  },

  async isCategoryFavorite(id: string): Promise<boolean> {
    const item = await db.favorite_categories.get(id);
    return !!item;
  },

  async getFavoriteCategories(type?: 'live' | 'movie' | 'series'): Promise<FavoriteCategoryItem[]> {
    if (type) {
      return db.favorite_categories.where('type').equals(type).toArray();
    }
    return db.favorite_categories.toArray();
  },

  async saveHistory(item: Omit<HistoryItem, 'updatedAt'>) {
    await db.history.put({ ...item, updatedAt: Date.now() });
  },

  async getHistory(): Promise<HistoryItem[]> {
    return db.history.orderBy('updatedAt').reverse().limit(50).toArray();
  },
};
