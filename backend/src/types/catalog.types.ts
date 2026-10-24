export interface CategoryRow {
  categoryId: number;
  categoryName: string;
}

export interface BrandRow {
  brandId: number;
  brandName: string;
}

export interface SizeRow {
  sizeId: number;
  sizeLabel: string;
  sortOrder: number;
}

export interface ColorRow {
  colorId: number;
  colorName: string;
  hexCode: string | null;
}
