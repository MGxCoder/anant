import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, C, Card, Icon, Logo, ScanRow, s, type IconName } from '@/components/ui';
import { getPendingImage, pickImage, type Source } from '@/services/imageService';
import { getScans } from '@/services/historyService';
import { PC_SERVER_MODE, loadModel } from '@/services/modelService';
import { SUPPORTED_CROPS } from '@/services/diseaseService';
import type { Scan } from '@/types';

const STEPS: [IconName, string, string][] = [
  ['camera', 'Take a photo', 'One leaf, filling the frame, in daylight.'],
  ['cellphone-cog', 'AI checks it on your phone', 'No internet needed. Photos never leave your phone.'],
  ['clipboard-text-outline', 'Get the result', 'Disease name, confidence, symptoms and prevention tips.'],
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const [scans, setScans] = useState<Scan[]>([]);
  const [model, setModel] = useState<'loading' | 'ready' | { error: string }>('loading');

  const checkModel = useCallback(() => {
    setModel('loading');
    loadModel().then(() => setModel('ready'), (e) => setModel({ error: e instanceof Error ? e.message : String(e) }));
  }, []);
  useEffect(checkModel, [checkModel]);

  useFocusEffect(useCallback(() => { getScans().then(setScans).catch(() => {}); }, []));

  // Recover a photo if Android closed the app while the camera was open.
  useEffect(() => {
    getPendingImage().then((uri) => uri && router.push({ pathname: '/scan', params: { uri, source: 'camera' } })).catch(() => {});
  }, []);

  const start = async (source: Source) => {
    try {
      const uri = await pickImage(source);
      if (uri) router.push({ pathname: '/scan', params: { uri, source } });
    } catch (e) {
      Alert.alert('Could not open the ' + (source === 'camera' ? 'camera' : 'gallery'), e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <View style={[st.hero, { paddingTop: insets.top + 20 }]}>
        <View style={st.brand}>
          <Logo size={52} />
          <View>
            <Text style={st.appName}>CropDoctor</Text>
            <Text style={st.tagline}>Leaf disease checker</Text>
          </View>
        </View>
        <Text style={st.welcome}>Hello! 👋</Text>
        <Text style={st.welcomeSub}>Take a clear photo of a single leaf and CropDoctor will check it for common diseases.</Text>
        <ModelStatus state={model} onRetry={checkModel} />
      </View>

      <View style={st.content}>
        <View style={{ gap: 12, marginTop: -36 }}>
          <Button title="Detect Disease" subtitle="Take a photo with your camera" icon="camera" onPress={() => start('camera')} />
          <Button title="Upload Image" subtitle="Choose a photo from your gallery" icon="image-multiple" variant="secondary" onPress={() => start('gallery')} />
        </View>

        <View style={st.sectionRow}>
          <Text style={s.h2}>Recent scans</Text>
          {scans.length > 0 && (
            <Pressable accessibilityRole="link" onPress={() => router.push('/history')} hitSlop={12}>
              <Text style={st.link}>See all</Text>
            </Pressable>
          )}
        </View>
        {scans.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Icon name="sprout-outline" size={36} color={C.leaf} />
            <Text style={s.muted}>No scans yet. Your results will appear here.</Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {scans.slice(0, 3).map((scan) => (
              <ScanRow key={scan.id} scan={scan} onPress={() => router.push(`/result/${scan.id}`)} />
            ))}
          </View>
        )}

        <Text style={[s.h2, { marginTop: 28, marginBottom: 12 }]}>How it works</Text>
        <Card style={{ gap: 16 }}>
          {STEPS.map(([icon, title, body], i) => (
            <View key={title} style={st.step}>
              <View style={st.stepNum}><Icon name={icon} size={22} color={C.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.stepTitle}>{i + 1}. {title}</Text>
                <Text style={s.muted}>{body}</Text>
              </View>
            </View>
          ))}
          <View style={st.note}>
            <Icon name="information-outline" size={18} color={C.muted} />
            <Text style={[s.muted, { flex: 1 }]}>
              The AI knows 38 leaf conditions (PlantVillage dataset) on {SUPPORTED_CROPS.length} crops: {SUPPORTED_CROPS.join(', ')}.
              It may not recognize other crops or diseases, and results are guidance — not a guaranteed diagnosis.
            </Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

function ModelStatus({ state, onRetry }: { state: 'loading' | 'ready' | { error: string }; onRetry: () => void }) {
  if (state === 'ready')
    return <View style={st.chip}><Icon name="check-circle" size={16} color="#9BE3B0" /><Text style={st.chipText}>{PC_SERVER_MODE ? 'AI ready · PC model server (Expo Go dev mode)' : 'AI ready · works offline'}</Text></View>;
  if (state === 'loading')
    return <View style={st.chip}><Icon name="progress-clock" size={16} color="#fff" /><Text style={st.chipText}>Loading AI model…</Text></View>;
  return (
    <Pressable onPress={onRetry} style={[st.chip, { backgroundColor: C.redBg }]} accessibilityRole="button">
      <Icon name="alert-circle" size={16} color={C.red} />
      <Text style={[st.chipText, { color: C.red, flexShrink: 1 }]}>AI model failed to load: {state.error} Tap to retry.</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.forest, paddingHorizontal: 20, paddingBottom: 56, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  appName: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  tagline: { color: '#A8D5B5', fontSize: 14, fontWeight: '600' },
  welcome: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 24 },
  welcomeSub: { color: '#D3E9D9', fontSize: 16, lineHeight: 23, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  link: { color: C.primary, fontWeight: '700', fontSize: 15 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  stepNum: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  note: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
});
