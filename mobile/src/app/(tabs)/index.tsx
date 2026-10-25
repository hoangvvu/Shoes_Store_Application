import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { ProductDetailModal, resolveProductImage } from '@/components/ProductDetailModal';
import { useAuthUser } from '@/hooks/useAuth';
import { notificationService } from '@/services/notification.service';
import { productService } from '@/services/product.service';
import { colors } from '@/theme';
import type { ProductListItem } from '@/types/product';
import { formatVnd } from '@/utils/format';

interface CategoryItem {
  categoryId: number;
  categoryName: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnread = useCallback(() => {
    notificationService.getUnreadCount().then(setUnreadCount).catch(() => {});
  }, []);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  // Load categories once
  useEffect(() => {
    productService
      .listCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(async (q?: string, catId?: number | null) => {
    try {
      const res = await productService.list({
        q: q ? q.trim() : undefined,
        categoryId: catId ?? undefined,
        page: 1,
        size: 50,
      });
      setProducts(res.items);
    } catch {
      // Bỏ qua lỗi mạng khi load
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(search, selectedCatId);
  }, [loadProducts, search, selectedCatId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUnread();
    loadProducts(search, selectedCatId);
  }, [fetchUnread, loadProducts, search, selectedCatId]);

  const renderProduct = ({ item }: { item: ProductListItem }) => {
    const imgUri = resolveProductImage(item.imageUrl);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => setSelectedProductId(item.productId)}
      >
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>👟</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <View style={styles.tagRow}>
            <Text style={styles.categoryName} numberOfLines={1}>
              {item.categoryName || 'GIÀY'}
            </Text>
            {item.brandName ? (
              <Text style={styles.brandName} numberOfLines={1}>
                {item.brandName}
              </Text>
            ) : null}
          </View>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>
          <Text style={styles.price}>{formatVnd(item.currentPrice)}</Text>
          <View style={styles.metaRow}>
            <Text style={item.totalStock > 0 ? styles.stockOk : styles.stockOut}>
              {item.totalStock > 0 ? `Còn ${item.totalStock} đôi` : 'Hết hàng'}
            </Text>
            <Text style={styles.variantCount}>{item.variantCount} phiên bản</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo />
          <Text style={styles.hello}>Xin chào, {user?.fullName || 'bạn'} 👋</Text>
        </View>

        {/* Nút Chuông Thông Báo */}
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => router.push('/notifications')}
          accessibilityLabel="Thông báo"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm giày theo tên, thương hiệu..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      {categories.length > 0 && (
        <View style={styles.catWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            <TouchableOpacity
              style={[styles.catChip, selectedCatId === null && styles.catChipActive]}
              onPress={() => setSelectedCatId(null)}
            >
              <Text style={[styles.catText, selectedCatId === null && styles.catTextActive]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            {categories.map((c) => {
              const active = selectedCatId === c.categoryId;
              return (
                <TouchableOpacity
                  key={c.categoryId}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setSelectedCatId(active ? null : c.categoryId)}
                >
                  <Text style={[styles.catText, active && styles.catTextActive]}>
                    {c.categoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Product Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.productId)}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào</Text>
            </View>
          }
        />
      )}

      {/* Product Detail & Add-to-Cart Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        visible={!!selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hello: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, height: 42, color: colors.text, fontSize: 14 },
  clearBtn: { color: colors.textMuted, fontSize: 16, padding: 4 },
  catWrap: { marginBottom: 12 },
  catScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  catChipActive: {
    backgroundColor: colors.primary,
  },
  catText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  catTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listContent: { paddingHorizontal: 14, paddingBottom: 28 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 14 },
  card: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: { width: '100%', height: 145 },
  imagePlaceholder: {
    width: '100%',
    height: 145,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 44 },
  cardInfo: { padding: 10 },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  categoryName: {
    fontSize: 10,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    fontWeight: '700',
    flexShrink: 1,
  },
  brandName: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginVertical: 4,
    minHeight: 34,
    lineHeight: 18,
  },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockOk: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  stockOut: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  variantCount: { fontSize: 11, color: colors.textMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
