import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { C, Card, Icon, ScanRow, s } from '@/components/ui';
import { getScans } from '@/services/historyService';
import type { Scan } from '@/types';

export default function History() {
  const [scans, setScans] = useState<Scan[] | null>(null);
  useFocusEffect(useCallback(() => { getScans().then(setScans, () => setScans([])); }, []));

  return (
    <FlatList
      data={scans ?? []}
      keyExtractor={(x) => x.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => <ScanRow scan={item} onPress={() => router.push(`/result/${item.id}`)} />}
      ListEmptyComponent={
        scans ? (
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Icon name="history" size={40} color={C.leaf} />
            <Text style={s.muted}>No scans yet.</Text>
          </Card>
        ) : undefined
      }
      ListFooterComponent={scans?.length ? <View><Text style={[s.muted, { textAlign: 'center', marginTop: 8 }]}>The latest 100 scans are kept on this phone.</Text></View> : undefined}
    />
  );
}
