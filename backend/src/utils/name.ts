/** Ghép Họ (kèm tên đệm) + Tên thành họ tên đầy đủ để hiển thị. */
export const fullNameOf = (lastName?: string | null, firstName?: string | null): string =>
  `${lastName ?? ''} ${firstName ?? ''}`.replace(/\s+/g, ' ').trim();
