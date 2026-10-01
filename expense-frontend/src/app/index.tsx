import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Expense Tracker</Text>
      <Text style={styles.subtitle}>Local-First OCR Receipt Scanner</Text>

      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={() => router.push('/scan')}
      >
        <Text style={styles.buttonText}>+ Scan Struk Belanja</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 6, color: '#212529' },
  subtitle: { fontSize: 14, color: '#6c757d', marginBottom: 40 },
  primaryButton: { backgroundColor: '#0d6efd', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, elevation: 3 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});