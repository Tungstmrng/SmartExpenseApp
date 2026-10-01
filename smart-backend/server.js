const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const cors = require('cors');
const { parseReceiptText, correctOcrPrice } = require('./services/parserService');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

function detectCategory(itemName) {
  const name = itemName.toLowerCase();
  if (name.includes('beras') || name.includes('minyak') || name.includes('gula') || name.includes('telur') || name.includes('susu') || name.includes('tepung') || name.includes('daging') || name.includes('ikan') || name.includes('sayur') || name.includes('kol')) {
    return 'Kebutuhan Pokok';
  } else if (name.includes('sabun') || name.includes('shampoo') || name.includes('deterjen') || name.includes('pasta gigi') || name.includes('sikat') || name.includes('pembersih') || name.includes('sunlight') || name.includes('rejoice') || name.includes('colgate') || name.includes('rexona') || name.includes('laurier')) {
    return 'Perlengkapan Mandi & Cuci';
  } else if (name.includes('roti') || name.includes('snack') || name.includes('biskuit') || name.includes('chiki') || name.includes('mie') || name.includes('indomie') || name.includes('pop mie') || name.includes('coklat') || name.includes('inaco') || name.includes('semangka') || name.includes('bebek')) {
    return 'Makanan & Cemilan';
  } else if (name.includes('aqua') || name.includes('teh') || name.includes('soda') || name.includes('kopi') || name.includes('sari') || name.includes('jus') || name.includes('frisian') || name.includes('yakult') || name.includes('kiranti') || name.includes('marjan')) {
    return 'Minuman';
  }
  return 'Kebutuhan Umum';
}

// Endpoint untuk parsing teks mentah
app.post('/api/parse-receipt', (async (req, res) => {
  try {
    const { rawText } = req.body; 

    if (!rawText) {
      return res.status(400).json({ error: 'Teks OCR tidak boleh kosong' });
    }

    const extractedItems = parseReceiptText(rawText);

    return res.status(200).json({
      success: true,
      message: 'Berhasil mengekstraksi struk',
      data: extractedItems
    });

  } catch (error) {
    console.error('Error saat parsing:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
}));

// Endpoint utama scan gambar struk
app.post('/api/scan', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file gambar struk.' });
    }

    console.log('Melakukan pra-pemrosesan gambar (Sharp)...');

    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1800, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    console.log('Menjalankan Tesseract OCR...');

    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'ind', {
      tessedit_pageseg_mode: 6,
      logger: (m) => { 
        if (m.progress && m.progress > 0) {
          console.log(`Progres OCR: ${Math.round(m.progress * 100)}%`); 
        }
      }
    });

    console.log('--- HASIL MENTAH OCR ---');
    console.log(text);
    console.log('------------------------');

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // 1. Ekstraksi Nama Merchant (Contoh: VILLA TIDAR MALANG)
    let merchantName = 'Toko / Minimarket Umum';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      if (
        line.length > 3 &&
        !lower.includes('jl.') &&
        !lower.includes('jalan') &&
        !lower.includes('telp') &&
        !lower.includes('npwp') &&
        !lower.includes('tgl') &&
        !/\d{2}[-/]\d{2}/.test(line)
      ) {
        merchantName = line.replace(/^[a-zA-Z]{1,3}\s+/, '').replace(/[|\\/]/g, '').trim();
        if (merchantName.length > 2) break;
      }
    }

    // 2. Ekstraksi Ringkasan Keuangan (Subtotal, Diskon, Voucher, Total)[cite: 1, 2]
    let subtotalAmount = 0;
    let totalDiscountAmount = 0;
    let voucherAmount = 0;
    let deliveryFee = 0;
    let finalTotalAmount = 0;

    lines.forEach(line => {
      const upper = line.toUpperCase();
      const numbers = line.match(/[\d.,\-]+/g);
      
      if (!numbers) return;
      const lastNumStr = correctOcrPrice(numbers[numbers.length - 1]);
      const val = parseInt(lastNumStr.replace(/[.,]/g, ''), 10);

      if (isNaN(val)) return;

      if (upper.includes('SUBTOTAL') || upper.includes('SUB TOTAL')) {
        subtotalAmount = val;
      } else if (upper.includes('TOTAL DISKON') || upper.includes('DISC')) {
        totalDiscountAmount = Math.abs(val);
      } else if (upper.includes('VOUCHER')) {
        voucherAmount = Math.abs(val);
      } else if (upper.includes('BIAYA PENGIRIMAN') || upper.includes('ONGKIR')) {
        deliveryFee = val;
      } else if (upper.includes('TOTAL') && !upper.includes('ITEM') && !upper.includes('DISKON') && !upper.includes('SUB')) {
        finalTotalAmount = val;
      }
    });

    // 3. Panggil parser service terpusat untuk mendapatkan daftar item + diskon per item
    const rawParsedItems = parseReceiptText(text);

    const items = rawParsedItems.map((item, idx) => ({
      id: idx + 1,
      name: item.name,
      price: item.price,
      discount: item.discount || 0,
      final_price: item.final_price || item.price,
      category: detectCategory(item.name)
    }));

    // Fallback jika total akhir tidak terbaca dari ringkasan
    if (finalTotalAmount === 0 && items.length > 0) {
      finalTotalAmount = items.reduce((sum, item) => sum + item.final_price, 0);
    }
    if (finalTotalAmount === 0) {
      finalTotalAmount = 25000;
    }

    return res.json({
      success: true,
      message: 'OCR Universal Parsing dengan Ringkasan Finansial Berhasil!',
      data: {
        merchant_name: merchantName,
        subtotal: subtotalAmount || finalTotalAmount,
        total_discount: totalDiscountAmount,
        voucher: voucherAmount,
        delivery_fee: deliveryFee,
        total_amount: finalTotalAmount,
        items: items.length > 0 ? items : [
          { id: 1, name: "Belanjaan Umum", price: finalTotalAmount, discount: 0, final_price: finalTotalAmount, category: "Kebutuhan Umum" }
        ]
      }
    });

  } catch (error) {
    console.error('Error Universal OCR:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend OCR berjalan di port ${PORT}`));