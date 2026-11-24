import { createHash } from 'crypto';

/**
 * CacheService dùng chung CHO CHỨC NĂNG TÌM KIẾM (danh sách có từ khóa / bộ lọc / phân trang).
 * - In-memory, LRU, TTL, single-flight (nhiều request cùng key chỉ chạy 1 truy vấn DB).
 * - Mỗi namespace có "version": invalidate chỉ tăng version nên kết quả của truy vấn đang chạy dở
 *   (bắt đầu trước khi CRUD commit) sẽ không bao giờ được đọc lại.
 * - Chỉ đúng với MỘT instance Node. Chạy nhiều instance thì thay phần lưu trữ bằng Redis (giữ nguyên interface).
 * - Tắt cache bằng biến môi trường SEARCH_CACHE_ENABLED=false.
 */
export type CacheNamespace = 'products' | 'inventory' | 'customers' | 'employees' | 'suppliers' | 'reviews' | 'orders';

/** TTL chỉ là lưới an toàn; tính đúng đắn do invalidate sau CRUD đảm bảo. */
export const SEARCH_TTL: Record<CacheNamespace, number> = {
  suppliers: 120_000,
  products: 60_000,
  employees: 60_000,
  customers: 30_000,
  reviews: 30_000,
  inventory: 20_000,
  orders: 15_000,
};

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** Chuẩn hóa tham số: bỏ undefined, sắp xếp khóa, Date -> ISO, chuỗi trim. */
function normalize(v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (v instanceof Date) return { $date: v.toISOString() };
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map((x) => normalize(x) ?? null);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      const n = normalize((v as Record<string, unknown>)[k]);
      if (n !== undefined) out[k] = n;
    }
    return out;
  }
  return v;
}

export function buildKey(params: unknown): string {
  return createHash('sha1').update(JSON.stringify(normalize(params))).digest('hex');
}

export class SearchCache {
  private store = new Map<string, Entry>();
  private versions = new Map<CacheNamespace, number>();
  private inflight = new Map<string, Promise<unknown>>();
  readonly stats = { hits: 0, misses: 0, loads: 0, invalidations: 0 };

  constructor(
    private readonly maxEntries = 2000,
    private readonly now: () => number = Date.now,
    private enabled = process.env.SEARCH_CACHE_ENABLED !== 'false',
  ) {}

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.clear();
  }

  private version(ns: CacheNamespace) {
    return this.versions.get(ns) ?? 0;
  }

  /**
   * Lấy từ cache nếu còn hiệu lực, ngược lại gọi loader (truy vấn DB) rồi lưu.
   * params phải chứa MỌI yếu tố ảnh hưởng kết quả (từ khóa, bộ lọc, trang, sắp xếp, phạm vi người dùng nếu có).
   */
  async getOrLoad<T>(ns: CacheNamespace, params: unknown, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    if (!this.enabled) return loader();
    const ver = this.version(ns);
    const key = `${ns}:${ver}:${buildKey(params)}`;

    const hit = this.store.get(key);
    if (hit && hit.expiresAt > this.now()) {
      this.store.delete(key); // làm mới vị trí LRU
      this.store.set(key, hit);
      this.stats.hits++;
      return structuredClone(hit.value) as T;
    }
    if (hit) this.store.delete(key); // hết hạn

    this.stats.misses++;
    let p = this.inflight.get(key) as Promise<T> | undefined;
    if (!p) {
      this.stats.loads++;
      p = (async () => {
        try {
          const value = await loader();
          // chỉ lưu nếu giữa chừng không có invalidate
          if (this.version(ns) === ver) this.put(key, value, ttlMs);
          return value;
        } finally {
          this.inflight.delete(key);
        }
      })();
      this.inflight.set(key, p);
    }
    return structuredClone(await p) as T;
  }

  private put(key: string, value: unknown, ttlMs: number) {
    this.store.set(key, { value: structuredClone(value), expiresAt: this.now() + ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value as string;
      this.store.delete(oldest);
    }
  }

  /** Gọi SAU khi CRUD đã commit thành công. */
  invalidate(...namespaces: CacheNamespace[]) {
    for (const ns of new Set(namespaces)) {
      this.versions.set(ns, this.version(ns) + 1);
      const prefix = `${ns}:`;
      for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
      this.stats.invalidations++;
    }
  }

  clear() {
    this.store.clear();
    this.inflight.clear();
  }

  size() {
    return this.store.size;
  }
}

export const searchCache = new SearchCache();

/**
 * Bọc các hàm ghi (create/update/delete...) của một service: sau khi hàm chạy THÀNH CÔNG (transaction đã commit)
 * mới invalidate các namespace liên quan. Hàm ném lỗi thì không invalidate.
 */
export function invalidateAfter<T extends object>(
  service: T,
  map: { [K in keyof T & string]?: CacheNamespace[] },
): T {
  const svc = service as Record<string, unknown>;
  for (const [name, namespaces] of Object.entries(map) as [string, CacheNamespace[]][]) {
    const original = svc[name];
    if (typeof original !== 'function') throw new Error(`invalidateAfter: không có hàm ${name}`);
    svc[name] = async function (this: unknown, ...args: unknown[]) {
      const result = await (original as (...a: unknown[]) => unknown).apply(this, args);
      searchCache.invalidate(...namespaces);
      return result;
    };
  }
  return service;
}
