import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, C, Card, Icon, Section, pct, s } from '@/components/ui';
import { getScan } from '@/services/historyService';
import { CHEMICAL_NOTE, getDiseaseInfo } from '@/services/diseaseService';
import { CONFIDENCE_THRESHOLD } from '@/services/modelService';
import type { Scan } from '@/types';

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null | undefined>(undefined);
  useEffect(() => { getScan(id).then(setScan, () => setScan(null)); }, [id]);

  if (scan === undefined) return <ActivityIndicator style={{ marginTop: 48 }} size="large" color={C.primary} />;
  if (scan === null)
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Card><Text style={s.body}>This scan could not be found.</Text></Card>
        <Button title="Back to home" icon="home" onPress={() => router.dismissTo('/')} />
      </View>
    );

  const info = getDiseaseInfo(scan.className);
  const unsure = scan.confidence < CONFIDENCE_THRESHOLD;
  const tone = unsure
    ? { color: C.amber, bg: C.amberBg, icon: 'help-circle' as const, label: 'Not sure' }
    : scan.healthy
      ? { color: C.primary, bg: C.mint, icon: 'check-circle' as const, label: 'Healthy' }
      : { color: C.red, bg: C.redBg, icon: 'alert-circle' as const, label: 'Disease detected' };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Image source={{ uri: scan.imageUri }} style={st.image} contentFit="cover" transition={200} />

      <Card style={{ gap: 12 }}>
        <View style={[st.status, { backgroundColor: tone.bg }]}>
          <Icon name={tone.icon} size={20} color={tone.color} />
          <Text style={[st.statusText, { color: tone.color }]}>{tone.label}</Text>
        </View>
        {unsure ? (
          <Text style={[s.body, { fontWeight: '700' }]}>Unable to confidently identify this disease. Please upload a clearer image.</Text>
        ) : (
          <>
            <Text style={st.crop}>{info.crop}</Text>
            <Text style={st.disease}>{info.disease}</Text>
            {info.pathogen ? <Text style={s.muted}>Cause: {info.pathogen}</Text> : null}
          </>
        )}
        <View style={{ gap: 6 }}>
          <View style={st.confRow}>
            <Text style={s.muted}>{unsure ? `Best guess: ${info.crop} – ${info.disease}` : 'Confidence'}</Text>
            <Text style={[st.confValue, { color: tone.color }]}>{pct(scan.confidence)}</Text>
          </View>
          <View style={st.barTrack}>
            <View style={[st.barFill, { width: `${Math.max(2, scan.confidence * 100)}%`, backgroundColor: tone.color }]} />
            <View style={[st.threshold, { left: `${CONFIDENCE_THRESHOLD * 100}%` }]} />
          </View>
          <Text style={st.small}>Marker shows the {CONFIDENCE_THRESHOLD * 100}% minimum needed for a result.</Text>
        </View>
        <Text style={st.small}>{new Date(scan.createdAt).toLocaleString()}</Text>
      </Card>

      {unsure ? (
        <Section
          title="Tips for a clearer photo"
          icon="camera-iris"
          items={[
            'Photograph one leaf, filling most of the frame',
            'Use daylight and avoid strong shadows or glare',
            'Hold the phone steady so the photo is sharp',
            'Make sure the crop is one this app knows (see home screen)',
          ]}
        />
      ) : (
        <>
          <Section title="About" icon="information-outline"><Text style={s.body}>{info.description}</Text></Section>
          {info.symptoms.length > 0 && <Section title="Symptoms" icon="magnify" items={info.symptoms} />}
          <Section title={info.healthy ? 'Keep it healthy' : 'Prevention'} icon="shield-check-outline" items={info.prevention} />
          {!info.healthy && (
            <Section title="Treatment" icon="medical-bag" items={info.treatment ?? undefined}>
              {!info.treatment && <Text style={s.body}>Verified treatment information is not available for this condition.</Text>}
              <View style={st.notice}><Icon name="alert-outline" size={18} color={C.amber} /><Text style={[s.muted, { flex: 1, color: C.amber }]}>{CHEMICAL_NOTE}</Text></View>
            </Section>
          )}
        </>
      )}

      <Section title="Other possibilities" icon="format-list-numbered">
        {scan.top.map((t, i) => {
          const o = getDiseaseInfo(t.className);
          return (
            <View key={t.className} style={st.confRow}>
              <Text style={[s.body, i === 0 && { fontWeight: '700' }]}>{i + 1}. {o.crop} – {o.disease}</Text>
              <Text style={[s.body, { flex: 0, fontWeight: '700' }]}>{pct(t.p)}</Text>
            </View>
          );
        })}
        <Text style={st.mono}>Model label #{scan.classIndex}: {scan.className} ({(scan.confidence * 100).toFixed(4)}%)</Text>
      </Section>

      <Card style={{ backgroundColor: C.mint, borderColor: C.mint }}>
        <Text style={[s.muted, { color: C.forest }]}>
          This is an AI estimate, not a guaranteed diagnosis — even a high confidence can be wrong. The model only knows 38 PlantVillage
          leaf classes and may not recognize other crops or diseases. Confirm with a local expert before treating.
        </Text>
        <Text style={st.small}>Source: {info.source}</Text>
      </Card>

      <Button title="Scan another leaf" icon="camera-plus" onPress={() => router.dismissTo('/')} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  image: { width: '100%', aspectRatio: 1, borderRadius: 24, backgroundColor: C.mint },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 15, fontWeight: '800' },
  crop: { fontSize: 15, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  disease: { fontSize: 26, fontWeight: '800', color: C.text, marginTop: -6 },
  confRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  confValue: { fontSize: 22, fontWeight: '800' },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: '#EEF2EE', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  threshold: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: C.text },
  small: { fontSize: 12, color: C.muted },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: C.amberBg, borderRadius: 12, padding: 10 },
  mono: { fontSize: 12, color: C.muted, fontFamily: 'monospace' },
});
