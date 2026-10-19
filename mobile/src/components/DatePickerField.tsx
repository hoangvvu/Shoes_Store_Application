import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

/**
 * Ô chọn ngày bằng lịch (không nhập tay, không cần thêm thư viện).
 * - value / onChange dùng định dạng dd/mm/yyyy (khớp dmyToYmd, ymdToDmy, optionalValidators.birthDate).
 * - Không cho chọn ngày sau hôm nay (ngày tương lai bị làm mờ và không bấm được).
 * - Không bắt buộc: có nút xóa để bỏ giá trị.
 */
interface Props {
  value: string;
  onChange: (dmy: string) => void;
  placeholder?: string;
  error?: string;
  /** Số năm tối đa lùi về quá khứ (mặc định 120, khớp validator). */
  maxYearsBack?: number;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const YEAR_COLS = 4;
const YEAR_ROW_H = 46;

const pad = (n: number) => String(n).padStart(2, '0');
const toDmy = (y: number, m: number, d: number) => `${pad(d)}/${pad(m + 1)}/${y}`;

function parseDmy(dmy: string): { y: number; m: number; d: number } | null {
  const r = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy.trim());
  if (!r) return null;
  const d = Number(r[1]);
  const m = Number(r[2]) - 1;
  const y = Number(r[3]);
  const dt = new Date(y, m, d);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? { y, m, d } : null;
}

export function DatePickerField({ value, onChange, placeholder = 'Chọn ngày', error, maxYearsBack = 120 }: Props) {
  const [open, setOpen] = useState(false);
  const [yearMode, setYearMode] = useState(false);

  // "Hôm nay" tính lại mỗi lần mở lịch để không bị lệch khi app chạy qua đêm
  const today = useMemo(() => new Date(), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const tY = today.getFullYear();
  const tM = today.getMonth();
  const tD = today.getDate();
  const minYear = tY - maxYearsBack;

  const selected = parseDmy(value);
  const [view, setView] = useState({ y: selected?.y ?? 2000, m: selected?.m ?? 0 });

  const openCalendar = () => {
    const p = parseDmy(value);
    // Chưa có giá trị: mở ở năm 2000 cho đỡ phải lùi nhiều; nếu năm đó vượt giới hạn thì dùng tháng hiện tại
    setView(p ? { y: p.y, m: p.m } : { y: Math.max(minYear, Math.min(2000, tY)), m: 0 });
    setYearMode(false);
    setOpen(true);
  };

  const isFuture = (y: number, m: number, d: number) => y > tY || (y === tY && (m > tM || (m === tM && d > tD)));

  const canNext = view.y < tY || (view.y === tY && view.m < tM);
  const canPrev = view.y > minYear || (view.y === minYear && view.m > 0);

  const goPrev = () => canPrev && setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const goNext = () => canNext && setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  const pickYear = (y: number) => {
    // Nếu năm hiện tại: không để tháng vượt quá tháng hôm nay
    setView((v) => ({ y, m: y === tY ? Math.min(v.m, tM) : v.m }));
    setYearMode(false);
  };

  const pickDay = (d: number) => {
    if (isFuture(view.y, view.m, d)) return;
    onChange(toDmy(view.y, view.m, d));
    setOpen(false);
  };

  // Lưới ngày: tuần bắt đầu từ Thứ Hai
  const cells = useMemo(() => {
    const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const arr: (number | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [view]);

  const years = useMemo(() => Array.from({ length: maxYearsBack + 1 }, (_, i) => tY - i), [tY, maxYearsBack]);
  const selectedYearRow = Math.max(0, Math.floor(years.indexOf(view.y) / YEAR_COLS));

  return (
    <View style={styles.wrap}>
      <Pressable onPress={openCalendar} style={[styles.box, !!error && styles.boxError]} accessibilityRole="button" accessibilityLabel="Chọn ngày sinh">
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
        <Text style={[styles.valueText, !value && { color: colors.textMuted }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        {!!value && (
          <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityLabel="Xóa ngày đã chọn">
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Pressable rỗng để chạm vào thẻ không đóng lịch */}
          <Pressable style={styles.card} onPress={() => undefined}>
            <View style={styles.header}>
              <Pressable onPress={goPrev} disabled={!canPrev || yearMode} hitSlop={10} style={[styles.navBtn, (!canPrev || yearMode) && styles.navDisabled]}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => setYearMode((m) => !m)} style={styles.titleBtn} accessibilityLabel="Chọn năm">
                <Text style={styles.title}>
                  {yearMode ? 'Chọn năm' : `${MONTHS[view.m]}, ${view.y}`}
                </Text>
                <Ionicons name={yearMode ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </Pressable>
              <Pressable onPress={goNext} disabled={!canNext || yearMode} hitSlop={10} style={[styles.navBtn, (!canNext || yearMode) && styles.navDisabled]}>
                <Ionicons name="chevron-forward" size={22} color={colors.text} />
              </Pressable>
            </View>

            {yearMode ? (
              <FlatList
                key="years"
                data={years}
                numColumns={YEAR_COLS}
                keyExtractor={(y) => String(y)}
                style={{ height: YEAR_ROW_H * 6 }}
                initialScrollIndex={selectedYearRow}
                getItemLayout={(_, index) => ({ length: YEAR_ROW_H, offset: YEAR_ROW_H * index, index })}
                renderItem={({ item: y }) => (
                  <Pressable onPress={() => pickYear(y)} style={styles.yearCell}>
                    <View style={[styles.yearPill, y === view.y && styles.pillActive]}>
                      <Text style={[styles.yearText, y === view.y && styles.pillActiveText]}>{y}</Text>
                    </View>
                  </Pressable>
                )}
              />
            ) : (
              <>
                <View style={styles.row}>
                  {WEEKDAYS.map((w) => (
                    <Text key={w} style={styles.weekday}>{w}</Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {cells.map((d, i) => {
                    if (d === null) return <View key={`e${i}`} style={styles.dayCell} />;
                    const future = isFuture(view.y, view.m, d);
                    const isSel = !!selected && selected.y === view.y && selected.m === view.m && selected.d === d;
                    const isToday = view.y === tY && view.m === tM && d === tD;
                    return (
                      <Pressable key={d} onPress={() => pickDay(d)} disabled={future} style={styles.dayCell}>
                        <View style={[styles.dayPill, isSel && styles.pillActive, !isSel && isToday && styles.todayPill]}>
                          <Text style={[styles.dayText, future && styles.dayDisabled, isSel && styles.pillActiveText]}>{d}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.footer}>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.footerText}>Đóng</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  boxError: { borderColor: colors.danger },
  valueText: { flex: 1, color: colors.text, fontSize: 16 },
  error: { color: colors.danger, fontSize: 13, marginLeft: 4 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navDisabled: { opacity: 0.25 },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },

  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  dayPill: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  todayPill: { borderWidth: 1, borderColor: colors.primary },
  dayText: { color: colors.text, fontSize: 15 },
  dayDisabled: { color: colors.textMuted, opacity: 0.35 },

  yearCell: { width: `${100 / YEAR_COLS}%`, height: YEAR_ROW_H, alignItems: 'center', justifyContent: 'center' },
  yearPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  yearText: { color: colors.text, fontSize: 15 },

  pillActive: { backgroundColor: colors.primary },
  pillActiveText: { color: colors.white, fontWeight: '700' },

  footer: { alignItems: 'flex-end', paddingTop: 4 },
  footerText: { color: colors.primary, fontWeight: '700', fontSize: 15, padding: 6 },
});
