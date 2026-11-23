import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, C, Card, Icon, s } from '@/components/ui';
import { pickImage, safeFileUri, type Source } from '@/services/imageService';
import { analyzeLeaf } from '@/services/scanService';

export default function ScanScreen() {
  const params = useLocalSearchParams<{ uri: string; source: Source }>();
  const [uri, setUri] = useState(safeFileUri(params.uri));
  const source: Source = params.source === 'gallery' ? 'gallery' : 'camera';
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const change = async (src: Source) => {
    const next = await pickImage(src).catch(() => null);
    if (next) { setUri(next); setError(null); }
  };

  const analyze = async () => {
    setError(null);
    try {
      const scan = await analyzeLeaf(uri, setStep);
      router.replace(`/result/${scan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStep(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View>
        <Image source={{ uri }} style={st.preview} contentFit="cover" transition={200} onError={() => setError('This image could not be opened. Please choose another photo.')} />
        {step && (
          <View style={st.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={st.overlayText}>{step}</Text>
          </View>
        )}
      </View>

      {error && (
        <Card style={{ backgroundColor: C.redBg, borderColor: C.redBg }}>
          <Text style={[s.body, { color: C.red, fontWeight: '700' }]}>Something went wrong</Text>
          <Text style={[s.muted, { color: C.red }]}>{error}</Text>
        </Card>
      )}

      <Card>
        <Text style={s.sectionTitle}>Is this photo good?</Text>
        {['One leaf fills most of the picture', 'Sharp, not blurry', 'Good daylight, no strong shadows'].map((t) => (
          <View key={t} style={s.bullet}><Icon name="check" size={18} color={C.leaf} /><Text style={s.body}>{t}</Text></View>
        ))}
      </Card>

      <Button title="Analyze leaf" subtitle="Runs on your phone, offline" icon="magnify-scan" onPress={analyze} busy={!!step} />
      <Button title={source === 'camera' ? 'Retake photo' : 'Choose another'} icon={source === 'camera' ? 'camera-retake' : 'image-multiple'} variant="secondary" onPress={() => change(source)} disabled={!!step} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 1, borderRadius: 24, backgroundColor: C.mint },
  overlay: { ...StyleSheet.absoluteFill, borderRadius: 24, backgroundColor: 'rgba(18,61,36,0.7)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  overlayText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
