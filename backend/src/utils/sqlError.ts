/** Nhận diện lỗi trùng khóa duy nhất của SQL Server (2601: unique index, 2627: unique constraint). */
export function isDuplicateKey(err: unknown, indexName?: string): boolean {
  const e = err as { number?: number; message?: string };
  if (e?.number !== 2601 && e?.number !== 2627) return false;
  return indexName ? (e.message ?? '').includes(indexName) : true;
}
