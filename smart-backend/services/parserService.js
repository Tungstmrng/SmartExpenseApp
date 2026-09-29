function correctOcrPrice(rawPriceStr) {
  if (!rawPriceStr) return '';

  const ocrCorrections = {
    'O': '0', 'o': '0',
    'I': '1', 'l': '1', '|': '1',
    'S': '5', 's': '5',
    'B': '8', 'Z': '2'
  };

  let corrected = rawPriceStr.split('').map(char => {
    return ocrCorrections[char] !== undefined ? ocrCorrections[char] : char;
  }).join('');

  // Pertahankan hanya angka, titik, dan koma
  corrected = corrected.replace(/[^0-9.,]/g, '');

  return corrected;
}


function parseReceiptText(rawText) {
  if (!rawText) return [];

  const lines = rawText.split('\n');
  const items = [];

  // Pola Regex untuk mendeteksi baris item (Nama produk di kiri, harga di kanan)
  const regexItem = /^(.+?)\s+([0-9OSIl|SBZ.,\-]+)$/i;

  // Daftar kata kunci non-item (noise) yang harus diabaikan
  const blacklistKeywords = [
    'kota', 'kabupaten', 'provinsi', 'indonesia', 'jl.', 'jalan', 'perum', 'kel.', 'kec.',
    'ref.', 'maks kirim', 'status order', 'e-receipt', 'share', 'download', 'tersedia',
    'subtotal', 'total diskon', 'voucher', 'biaya pengiriman', 'ongkir', 'total',
    'disc', 'diskon', 'ppn', 'pajak', 'lunas', 'tunai', 'change', 'kembali', 'cash', 'debit'
  ];

  for (let line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Cek apakah baris mengandung kata kunci terlarang (noise)
    const lowerLine = cleanLine.toLowerCase();
    const isNoise = blacklistKeywords.some(keyword => lowerLine.includes(keyword));
    if (isNoise) continue;

    // Cocokkan dengan pola item belanja
    const match = cleanLine.match(regexItem);
    if (match) {
      const productName = match[1].trim();
      const rawPrice = match[2];

      // Terapkan fungsi koreksi karakter OCR pada string harga
      const fixedPriceStr = correctOcrPrice(rawPrice);
      
      // Ubah ke tipe data integer (hapus pemisah titik/koma ribuan)
      const finalPrice = parseInt(fixedPriceStr.replace(/[.,]/g, ''), 10);

      // Masukkan ke array jika harga valid (bukan NaN dan > 0)
      if (!isNaN(finalPrice) && finalPrice > 0) {
        items.push({
          name: productName,
          price: finalPrice
        });
      }
    }
  }

  return items;
}

module.exports = {
  correctOcrPrice,
  parseReceiptText
};