/** Chuẩn hóa +84xxxxxxxxx -> 0xxxxxxxxx để unique index không bị lọt trùng. */
export function normalizePhone(phone: string): string {
  const p = phone.trim().replace(/[\s.-]/g, '');
  return p.startsWith('+84') ? `0${p.slice(3)}` : p;
}
