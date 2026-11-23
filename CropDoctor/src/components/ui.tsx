import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Scan } from '@/types';
import { CONFIDENCE_THRESHOLD } from '@/services/modelService';

export const C = {
  forest: '#123D24',
  primary: '#1E7A3C',
  leaf: '#3DA35D',
  mint: '#E4F2E7',
  bg: '#F4F8F3',
  card: '#FFFFFF',
  text: '#15251A',
  muted: '#5A6B5F',
  border: '#DDE8DF',
  amber: '#8A5300',
  amberBg: '#FFF3DC',
  red: '#A8261B',
  redBg: '#FDECEA',
};

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export const Icon = MaterialCommunityIcons;

export function Logo({ size = 48 }: { size?: number }) {
  return (
    <View style={[s.logo, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Icon name="leaf" size={size * 0.6} color="#fff" />
      <View style={[s.logoBadge, { width: size * 0.38, height: size * 0.38, borderRadius: size }]}>
        <Icon name="plus" size={size * 0.28} color={C.primary} />
      </View>
    </View>
  );
}

type ButtonProps = { title: string; subtitle?: string; icon: IconName; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; busy?: boolean };

export function Button({ title, subtitle, icon, onPress, variant = 'primary', disabled, busy }: ButtonProps) {
  const primary = variant === 'primary';
  const fg = primary ? '#fff' : C.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [s.btn, primary ? s.btnPrimary : s.btnSecondary, (pressed || disabled) && { opacity: 0.75 }]}
    >
      <View style={[s.btnIcon, { backgroundColor: primary ? 'rgba(255,255,255,0.18)' : C.mint }]}>
        {busy ? <ActivityIndicator color={fg} /> : <Icon name={icon} size={24} color={fg} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.btnTitle, { color: fg }]}>{title}</Text>
        {subtitle ? <Text style={[s.btnSub, { color: primary ? 'rgba(255,255,255,0.85)' : C.muted }]}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron-right" size={24} color={fg} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({ title, icon, items, children }: { title: string; icon: IconName; items?: string[]; children?: ReactNode }) {
  return (
    <Card>
      <View style={s.sectionHead}>
        <View style={s.sectionIcon}><Icon name={icon} size={20} color={C.primary} /></View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {items?.map((t) => (
        <View key={t} style={s.bullet}>
          <View style={s.dot} />
          <Text style={s.body}>{t}</Text>
        </View>
      ))}
      {children}
    </Card>
  );
}

export const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

export function ScanRow({ scan, onPress }: { scan: Scan; onPress: () => void }) {
  const unsure = scan.confidence < CONFIDENCE_THRESHOLD;
  const color = unsure ? C.amber : scan.healthy ? C.primary : C.red;
  const bg = unsure ? C.amberBg : scan.healthy ? C.mint : C.redBg;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}>
      <Image source={{ uri: scan.imageUri }} style={s.thumb} contentFit="cover" transition={150} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{unsure ? 'Not sure' : scan.disease}</Text>
        <Text style={s.rowSub} numberOfLines={1}>{scan.crop} · {new Date(scan.createdAt).toLocaleDateString()} {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      <View style={[s.pill, { backgroundColor: bg }]}>
        <Text style={[s.pillText, { color }]}>{pct(scan.confidence)}</Text>
      </View>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  logo: { backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' },
  logoBadge: { position: 'absolute', right: -3, bottom: -3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.leaf },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  btnPrimary: { backgroundColor: C.primary, elevation: 3, shadowColor: C.forest, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  btnSecondary: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border },
  btnIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnTitle: { fontSize: 18, fontWeight: '700' },
  btnSub: { fontSize: 14, marginTop: 1 },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border, gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.leaf, marginTop: 9 },
  body: { flex: 1, fontSize: 16, lineHeight: 24, color: C.text },
  muted: { fontSize: 14, lineHeight: 20, color: C.muted },
  h2: { fontSize: 20, fontWeight: '800', color: C.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: C.border },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: C.mint },
  rowTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  rowSub: { fontSize: 13, color: C.muted },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 13, fontWeight: '700' },
});
