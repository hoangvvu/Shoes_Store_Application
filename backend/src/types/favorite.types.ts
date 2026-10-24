export interface FavoriteRow {
  productId: number;
  productName: string;
  imageUrl: string | null;
  currentPrice: number;
  favoritedAt: Date;
}
