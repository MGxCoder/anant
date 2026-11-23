import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { loadModel } from '@/services/modelService';
import { C } from '@/components/ui';

export default function RootLayout() {
  // Warm up the model at launch so the first scan is fast. Errors are shown on the home screen.
  useEffect(() => { loadModel().catch(() => {}); }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.forest },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ title: 'Check leaf' }} />
        <Stack.Screen name="result/[id]" options={{ title: 'Result' }} />
        <Stack.Screen name="history" options={{ title: 'Scan history' }} />
      </Stack>
    </>
  );
}
