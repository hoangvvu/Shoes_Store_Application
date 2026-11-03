import { Stack } from 'expo-router';

export default function DeliveryStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Khai báo thư mục home (chứa bộ tab danh sách và hồ sơ) */}
      <Stack.Screen name="home" />
      
      {/* Khai báo trang chi tiết đơn hàng dạng push */}
      <Stack.Screen name="[id]" />
    </Stack>
  );
}