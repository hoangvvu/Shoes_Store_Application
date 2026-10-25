import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  notificationService,
  type NotificationItem,
} from '@/services/notification.service';
import { colors } from '@/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const loadData = useCallback(async () => {
    try {
      const res = await notificationService.list(1, 50);
      setItems(res.items);
    } catch {
      // Bỏ qua lỗi mạng im lặng
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePressItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      setItems((prev) =>
        prev.map((x) =>
          x.notificationId === item.notificationId ? { ...x, isRead: true } : x,
        ),
      );
      notificationService.markAsRead(item.notificationId).catch(() => {});
    }

    if (item.linkUrl) {
      try {
        router.push(item.linkUrl as any);
      } catch {
        // Đường dẫn không hợp lệ
      }
    }
  };

  const handleMarkAllRead = async () => {
    const hasUnread = items.some((i) => !i.isRead);
    if (!hasUnread) return;

    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    try {
      await notificationService.markAllAsRead();
    } catch {
      Alert.alert('Lỗi', 'Không thể đánh dấu đã đọc tất cả, vui lòng thử lại.');
      loadData();
    }
  };

  const handleDeleteItem = (notificationId: number) => {
    Alert.alert('Xác nhận', 'Bạn có muốn xóa thông báo này khỏi hộp thư?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setItems((prev) => prev.filter((x) => x.notificationId !== notificationId));
          notificationService.deleteNotification(notificationId).catch(() => {});
        },
      },
    ]);
  };

  const filteredItems =
    filter === 'UNREAD' ? items.filter((x) => !x.isRead) : items;
  const unreadCount = items.filter((x) => !x.isRead).length;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isCancelledOrder =
      item.notificationType === 'ORDER' && item.title.toLowerCase().includes('hủy');
    const isPromo = item.notificationType === 'PROMOTION';
    const isOrder = item.notificationType === 'ORDER' && !isCancelledOrder;

    let iconName: keyof typeof Ionicons.glyphMap = 'notifications';
    let iconBg = '#E0F2FE';
    let iconColor: string = colors.primary;

    if (isCancelledOrder) {
      iconName = 'alert-circle';
      iconBg = '#FEE2E2';
      iconColor = '#EF4444';
    } else if (isPromo) {
      iconName = 'gift';
      iconBg = '#F3E8FF';
      iconColor = '#9333EA';
    } else if (isOrder) {
      iconName = 'bag-check';
      iconBg = '#DCFCE7';
      iconColor = '#16A34A';
    }

    return (
      <TouchableOpacity
        style={[styles.itemCard, !item.isRead && styles.unreadCard]}
        activeOpacity={0.7}
        onPress={() => handlePressItem(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>

        <View style={styles.contentBox}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, !item.isRead && styles.unreadTitle]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.dot} />}
          </View>

          <Text style={styles.content} numberOfLines={4}>
            {item.content}
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleString('vi-VN')}
            </Text>

            <TouchableOpacity
              onPress={() => handleDeleteItem(item.notificationId)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0}
          style={styles.readAllBtn}
        >
          <Text
            style={[
              styles.readAllText,
              unreadCount === 0 && { color: colors.textMuted },
            ]}
          >
            Đọc tất cả
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, filter === 'ALL' && styles.tabItemActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text
            style={[styles.tabText, filter === 'ALL' && styles.tabTextActive]}
          >
            Tất cả ({items.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, filter === 'UNREAD' && styles.tabItemActive]}
          onPress={() => setFilter('UNREAD')}
        >
          <Text
            style={[styles.tabText, filter === 'UNREAD' && styles.tabTextActive]}
          >
            Chưa đọc ({unreadCount})
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.notificationId)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="notifications-off-outline"
                  size={42}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>Không có thông báo nào</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'UNREAD'
                  ? 'Bạn đã đọc hết tất cả thông báo.'
                  : 'Các thông báo mới về đơn hàng và ưu đãi sẽ xuất hiện tại đây.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  readAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  readAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 6,
  },
  unreadTitle: {
    color: '#0F172A',
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  content: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
  time: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
