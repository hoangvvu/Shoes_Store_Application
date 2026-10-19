/**
 * Tìm kiếm không phân biệt hoa/thường và không phân biệt dấu tiếng Việt
 * ("nguyen van an" khớp "Nguyễn Văn An", "dep" khớp "Đẹp").
 *
 * Cách dùng trong repository:
 *   params.pattern = [sql.NVarChar(210), q ? searchPattern(q) : null];
 *   WHERE ... AND (@pattern IS NULL OR ${unaccent('c.full_name')} LIKE @pattern ESCAPE '\\')
 */

/** Bỏ dấu, đổi đ→d, chữ thường, gom khoảng trắng. */
export function normalizeSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mẫu LIKE '%…%' đã chuẩn hóa; escape \ % _ [ (dùng kèm ESCAPE '\\'). Tối đa 100 ký tự → ≤ 202 ký tự. */
export function searchPattern(input: string): string {
  const escaped = normalizeSearch(input).slice(0, 100).replace(/[\\%_[]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

/**
 * Biểu thức SQL tương ứng phía cột: đổi đ/Đ→d rồi so sánh với collation không phân biệt hoa-thường và dấu.
 * (Collation chỉ bỏ dấu thanh/mũ; "đ" là chữ cái riêng nên phải REPLACE.)
 */
export const unaccent = (expr: string): string =>
  `REPLACE(REPLACE(${expr}, N'đ', N'd'), N'Đ', N'D') COLLATE Latin1_General_100_CI_AI`;
