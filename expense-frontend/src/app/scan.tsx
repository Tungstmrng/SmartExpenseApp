import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ScanScreen() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedItems, setParsedItems] = useState([]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setParsedItems([]);
    }
  };

  const uploadAndProcessReceipt = async () => {
    if (!image) {
      Alert.alert('Peringatan', 'Silakan pilih gambar struk terlebih dahulu!');
      return;
    }

    setLoading(true);
    try {
      // Hubungkan ke endpoint backend Node.js Anda menggunakan IP lokal
      setTimeout(() => {
        setParsedItems([
          { name: 'Zinc Sampo Anti Ketombe', price: 25500 },
          { name: 'Jetz Makanan Ringan Choco', price: 7400 },
          { name: 'Delfi Take-It Ovaltine Cokelat', price: 15000 }
        ]);
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memproses struk di server.');
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
        <Text style={styles.secondaryButtonText}>Pilih Struk dari Galeri</Text>
      </TouchableOpacity>

      {image && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.previewImage} />
          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.disabledButton]} 
            onPress={uploadAndProcessReceipt}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Proses Struk (OCR)</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {parsedItems.length > 0 && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Hasil Ekstraksi Transaksi:</Text>
          {parsedItems.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>Rp {item.price.toLocaleString('id-ID')}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center', backgroundColor: '#fff', flexGrow: 1 },
  secondaryButton: { backgroundColor: '#198754', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginBottom: 20, width: '100%', alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  previewContainer: { alignItems: 'center', width: '100%', marginBottom: 20 },
  previewImage: { width: '100%', height: 280, resizeMode: 'contain', borderRadius: 8, borderWidth: 1, borderColor: '#dee2e6', marginBottom: 15, backgroundColor: '#f1f3f5' },
  primaryButton: { backgroundColor: '#0d6efd', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '100%', alignItems: 'center' },
  disabledButton: { backgroundColor: '#6c757d' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultContainer: { width: '100%', marginTop: 10, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef' },
  resultTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#343a40' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  itemName: { fontSize: 14, color: '#495057', flex: 1, marginRight: 10 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#212529' }
});