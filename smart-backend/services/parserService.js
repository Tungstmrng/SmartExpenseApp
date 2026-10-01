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

  // Pertahankan hanya angka, titik, koma, dan tanda minus (untuk diskon)
  corrected = corrected.replace(/[^0-9.,\-]/g, '');

  return corrected;
}

function parseReceiptText(rawText) {
  if (!rawText) return [];

  const lines = rawText.split('\n');
  const items = [];

  // Daftar kata kunci non-item (noise/ringkasan) yang harus diabaikan
  const blacklistKeywords = [
    'kota', 'kabupaten', 'provinsi', 'indonesia', 'jl.', 'jalan', 'perum', 'kel.', 'kec.',
    'ref.', 'maks kirim', 'status order', 'e-receipt', 'share', 'download', 'tersedia',
    'subtotal', 'total diskon', 'voucher', 'biaya pengiriman', 'ongkir', 'total',
    'ppn', 'pajak', 'lunas', 'tunai', 'change', 'kembali', 'cash', 'debit'
  ];

  // Pola Regex untuk mendeteksi baris item (Nama produk di kiri, harga di kanan)
  const regexItemWithPrice = /^(.+?)\s+([0-9OSIl|SBZ.,\-]+)$/i;

  let lastValidItem = null;

  for (let line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const lowerLine = cleanLine.toLowerCase();

    // 1. Tangkap baris diskon khusus item (Contoh: Disc. -6,300)
    if (lowerLine.startsWith('disc') || lowerLine.includes('disc.')) {
      const priceMatch = cleanLine.match(/([0-9OSIl|SBZ.,\-]+)$/);
      if (priceMatch && lastValidItem) {
        const fixedDiscStr = correctOcrPrice(priceMatch[1]);
        const discAmount = parseInt(fixedDiscStr.replace(/[.,]/g, ''), 10);
        if (!isNaN(discAmount) && discAmount > 0) {
          lastValidItem.discount = discAmount;
          // Hitung harga akhir setelah diskon
          lastValidItem.final_price = lastValidItem.price - discAmount;
        }
      }
      continue;
    }

    // 2. Cek apakah baris termasuk blacklist (noise/summary)
    const isNoise = blacklistKeywords.some(keyword => lowerLine.includes(keyword));
    if (isNoise) {
      lastValidItem = null; // Putus rantai multi-baris jika bertemu ringkasan
      continue;
    }

    // 3. Cek apakah baris memiliki format item + harga
    const match = cleanLine.match(regexItemWithPrice);

    if (match) {
      let productName = match[1].trim();
      const rawPrice = match[2];

      const fixedPriceStr = correctOcrPrice(rawPrice);
      const finalPrice = parseInt(fixedPriceStr.replace(/[.,]/g, ''), 10);

      if (!isNaN(finalPrice) && finalPrice > 0) {
        const newItem = {
          name: productName,
          price: finalPrice,
          discount: 0,
          final_price: finalPrice
        };
        items.push(newItem);
        lastValidItem = newItem; // Simpan referensi untuk baris kelanjutan di bawahnya
      }
    } else {
      // 4. Baris TANPA harga -> Dianggap sebagai kelanjutan nama/varian produk (Multi-line)
      if (lastValidItem && cleanLine.length > 2) {
        lastValidItem.name += ' ' + cleanLine;
      } else {
        lastValidItem = null;
      }
    }
  }

  return items;
}

vowels = {}; // placeholder jika perlu

module.exports = {
  correctOcrPrice,
  parseReceiptText
};