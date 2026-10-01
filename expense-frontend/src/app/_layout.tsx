import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f8f9fa' }, headerTintColor: '#212529' }}>
      <Stack.Screen name="index" options={{ title: 'Smart Expense' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan Struk Belanja' }} />
    </Stack>
  );
}