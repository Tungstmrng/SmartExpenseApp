import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFinance } from '../../context/FinanceContext';

export default function ScanScreen() {
  const { addTransaction } = useFinance();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // State untuk data yang bisa diedit secara manual
  const [isScanned, setIsScanned] = useState<boolean>(false);
  const [merchantName, setMerchantName] = useState<string>('');
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [totalDiscount, setTotalDiscount] = useState<number>(0);
  const [voucher, setVoucher] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // 1. Ambil foto via Kamera
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Izin Ditolak', 'Aplikasi memerlukan izin akses kamera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.3,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      processReceipt(result.assets[0].uri);
    }
  };

  // 2. Pilih gambar dari Galeri
  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.3,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      processReceipt(result.assets[0].uri);
    }
  };

  // 3. Kirim ke Backend Node.js untuk OCR
  const processReceipt = async (uri: string) => {
    setIsLoading(true);
    setIsScanned(false);

    try {
      const fetchResponse = await fetch(uri);
      const blob = await fetchResponse.blob();
      const filename = uri.split('/').pop() || 'receipt.jpg';

      const formData = new FormData();
      formData.append('receipt', blob as any, filename);

      const BACKEND_URL = 'http://192.168.110.12:5000/api/scan';

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();

      if (json.success) {
        setMerchantName(json.data.merchant_name);
        setEditableItems(json.data.items || []);
        
        // AMBIL DATA RINGKASAN DARI BACKEND
        setSubtotal(json.data.subtotal || 0);
        setTotalDiscount(json.data.total_discount || 0);
        setVoucher(json.data.voucher || 0);
        setDeliveryFee(json.data.delivery_fee || 0);

        setIsScanned(true);
      } else {
        Alert.alert('Gagal', json.message || 'Gagal memproses struk.');
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      Alert.alert('Koneksi Gagal', 'Pastikan backend Node.js di port 5000 sudah menyala.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Update nilai item tertentu saat diedit user
  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...editableItems];
    if (field === 'price') {
      updated[index][field] = Number(value.replace(/[^0-9]/g, '')) || 0;
    } else {
      updated[index][field] = value;
    }
    setEditableItems(updated);
  };

  // 5. Hapus item dari daftar
  const handleDeleteItem = (index: number) => {
    const updated = editableItems.filter((_, i) => i !== index);
    setEditableItems(updated);
  };

  // 6. Simpan transaksi final setelah diverifikasi user
  const handleSaveTransaction = async () => {
    if (!merchantName.trim()) {
      Alert.alert('Peringatan', 'Nama toko/merchant tidak boleh kosong.');
      return;
    }

    if (editableItems.length === 0) {
      Alert.alert('Peringatan', 'Minimal harus ada 1 item belanja.');
      return;
    }

    const totalAmount = editableItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

    await addTransaction({
      id: Date.now().toString(),
      merchant_name: merchantName,
      total_amount: totalAmount,
      items: editableItems,
      date: new Date().toISOString(),
    });

    Alert.alert('Berhasil!', 'Transaksi berhasil divalidasi dan disimpan ke Dashboard.');
    
    // Reset form
    setImageUri(null);
    setIsScanned(false);
    setMerchantName('');
    setEditableItems([]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons name="scan-circle-outline" size={56} color="#2e7d32" />
        <Text style={styles.title}>Scan & Validasi Struk</Text>
        <Text style={styles.subtitle}>
          Foto struk, periksa hasil pembacaan OCR, lalu edit manual jika ada kesalahan sebelum disimpan.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
          <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.buttonText}>Kamera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.galleryButton]} onPress={pickFromGallery}>
          <Ionicons name="images" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.buttonText}>Galeri</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Memproses OCR & Analisis Struk...</Text>
        </View>
      )}

      {isScanned && (
        <View style={styles.resultCard}>
          <Text style={styles.sectionHeaderTitle}>Validasi & Edit Data Struk</Text>
          
          <Text style={styles.inputLabel}>Nama Toko / Merchant:</Text>
          <TextInput
            style={styles.merchantInput}
            value={merchantName}
            onChangeText={setMerchantName}
            placeholder="Masukkan nama toko"
          />

          <Text style={styles.inputLabel}>Daftar Item Belanja ({editableItems.length}):</Text>
          
          {editableItems.map((item, index) => (
            <View key={index} style={styles.itemEditRow}>
              <View style={{ flex: 2, marginRight: 6 }}>
                <TextInput
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={(val) => handleItemChange(index, 'name', val)}
                  placeholder="Nama barang"
                />
                <Text style={styles.categoryText}>Kategori: {item.category}</Text>
              </View>

              <View style={{ flex: 1.2, marginRight: 6 }}>
                <TextInput
                  style={styles.itemPriceInput}
                  value={item.price ? item.price.toString() : '0'}
                  keyboardType="numeric"
                  onChangeText={(val) => handleItemChange(index, 'price', val)}
                  placeholder="Harga"
                />
              </View>

              <TouchableOpacity onPress={() => handleDeleteItem(index)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Total Keseluruhan */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Kalkulasi:</Text>
            <Text style={styles.totalValue}>
              Rp {editableItems.reduce((sum, item) => sum + Number(item.price || 0), 0).toLocaleString('id-ID')}
            </Text>
          </View>
          {editableItems.map((item, index) => (
            <View key={index} style={styles.itemEditRow}>
              <View style={{ flex: 2, marginRight: 6 }}>
                <TextInput
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={(val) => handleItemChange(index, 'name', val)}
                  placeholder="Nama barang"
                />
                <Text style={styles.categoryText}>Kategori: {item.category}</Text>
                {/* Tampilkan info diskon jika item memiliki potongan harga */}
                {item.discount > 0 && (
                  <Text style={{ fontSize: 10, color: '#d32f2f', marginTop: 2 }}>
                    Diskon: -Rp {item.discount.toLocaleString('id-ID')}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1.2, marginRight: 6 }}>
                <TextInput
                  style={styles.itemPriceInput}
                  value={item.final_price ? item.final_price.toString() : item.price.toString()}
                  keyboardType="numeric"
                  onChangeText={(val) => handleItemChange(index, 'price', val)}
                  placeholder="Harga"
                />
              </View>

              <TouchableOpacity onPress={() => handleDeleteItem(index)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          ))}

          {/* RINCIAN KEUANGAN STRUK (SUBTOTAL, DISKON, VOUCHER, TOTAL) */}
          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 }}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>Rp {subtotal.toLocaleString('id-ID')}</Text>
            </View>
            {totalDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#d32f2f' }]}>Total Diskon:</Text>
                <Text style={[styles.summaryValue, { color: '#d32f2f' }]}>- Rp {totalDiscount.toLocaleString('id-ID')}</Text>
              </View>
            )}
            {voucher > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#1976d2' }]}>Voucher:</Text>
                <Text style={[styles.summaryValue, { color: '#1976d2' }]}>- Rp {voucher.toLocaleString('id-ID')}</Text>
              </View>
            )}
          </View>

          {/* Total Keseluruhan Final */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Akhir (Dibayar):</Text>
            <Text style={styles.totalValue}>
              Rp {(subtotal - totalDiscount - voucher + deliveryFee > 0 
                ? subtotal - totalDiscount - voucher + deliveryFee 
                : editableItems.reduce((sum, item) => sum + Number(item.final_price || item.price || 0), 0)
              ).toLocaleString('id-ID')}
            </Text>
          </View>

          {/* Tombol Simpan */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveTransaction}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.saveButtonText}>Simpan ke Pengeluaran</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f5f6fa', flexGrow: 1 },
  headerContainer: { alignItems: 'center', marginBottom: 16, marginTop: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 6 },
  subtitle: { fontSize: 12, color: '#666', textAlign: 'center', paddingHorizontal: 16, marginTop: 4 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  actionButton: { flex: 1, backgroundColor: '#2e7d32', flexDirection: 'row', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  galleryButton: { backgroundColor: '#1976d2' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  previewContainer: { alignItems: 'center', marginBottom: 14 },
  previewImage: { width: '100%', height: 160, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#ddd' },
  loadingContainer: { alignItems: 'center', marginVertical: 20 },
  loadingText: { marginTop: 8, color: '#555', fontSize: 13 },
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 20 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 6 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 8 },
  merchantInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: '#fafafa', color: '#333' },
  itemEditRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  itemNameInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 13, backgroundColor: '#fff', color: '#333' },
  categoryText: { fontSize: 10, color: '#777', marginTop: 2, marginLeft: 2 },
  itemPriceInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, backgroundColor: '#fff', color: '#333', textAlign: 'right' },
  deleteButton: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  saveButton: { backgroundColor: '#2e7d32', flexDirection: 'row', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: 13, color: '#666' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#333' },

});