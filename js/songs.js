/*
  songs.js
  ---------
  This is the ENTIRE song database for देसी घी (Desi Ghee).
*/

const CATEGORIES = [
  { id: "banger",  label: "बेंगर",        emoji: "🔥", hinglish: "BANGER" },
  { id: "tractor", label: "ट्रैक्टर राइड", emoji: "🚜", hinglish: "TRACTOR RIDE" },
  { id: "hukka",   label: "हुक्का बैठक",  emoji: "🪑", hinglish: "HUKKA BAITHAK" },
  { id: "byah",    label: "ब्याह-शादी",   emoji: "💍", hinglish: "BYAH-SHADI" },
  { id: "akhada",  label: "अखाड़ा",       emoji: "💪", hinglish: "AKHADA" },
];

const songs = [
  // --- बेंगर (Banger) ---
  { id: 50, title: "Ghode 3", artist: "Masoom Sharma", youtubeId: "vFOl_qnYKw4", category: "banger" },
  { id: 51, title: "32 Ke fire", artist: "Masoom Sharma", youtubeId: "ByjxJyKUXC8", category: "banger" },
  { id: 52, title: "Udte Teer", artist: "Masoom Sharma", youtubeId: "wwMZQ-8Jtdw", category: "banger" },
  { id: 53, title: "Raat Ke Shikari", artist: "Masoom Sharma", youtubeId: "xMSuYh4ElPs", category: "banger" },
  { id: 54, title: "Pistol 4-5 Ka", artist: "Masoom Sharma", youtubeId: "afwruTBTILw", category: "banger" },
  { id: 55, title: "Ramayan Ka Saar", artist: "Masoom Sharma", youtubeId: "szUSkYTXq7A", category: "banger" },
  { id: 56, title: "Chambal K Dakku", artist: "Masoom Sharma", youtubeId: "aOHOAMAYGIU", category: "banger" },
  { id: 57, title: "Sharp Shooter", artist: "Masoom Sharma", youtubeId: "ZuG63zFxdQE", category: "banger" },
  { id: 58, title: "Lofar", artist: "Masoom Sharma", youtubeId: "xDMjh6wDL3g", category: "banger" },
  { id: 59, title: "Badmashi Delhi Me", artist: "Masoom Sharma", youtubeId: "wrPa0qOjk78", category: "banger" },
  { id: 60, title: "10 Numbari", artist: "Masoom Sharma", youtubeId: "LYjsh5DrjWY", category: "banger" },
  { id: 61, title: "Mard", artist: "Masoom Sharma", youtubeId: "eJTOIAVNijc", category: "banger" },
  { id: 62, title: "Ramjhol Bole Gi", artist: "Masoom Sharma", youtubeId: "ZZ86YrRjIOs", category: "banger" },
  { id: 63, title: "Warning", artist: "Masoom Sharma", youtubeId: "-luIhmAZpFU", category: "banger" },
  { id: 64, title: "Blender", artist: "Masoom Sharma", youtubeId: "gGnGSKKsATM", category: "banger" },

  // --- ब्याह-शादी (Byah-Shadi) ---
  { id: 100, title: "SOLID BODY", artist: "Ajay Hooda", youtubeId: "ou-litQ9hWQ", category: "byah" },
  { id: 101, title: "Left Right", artist: "Ajay Hooda", youtubeId: "at-T2PJQgOg", category: "byah" },
  { id: 102, title: "Bahu Kale Ki", artist: "Ajay Hooda", youtubeId: "Mlj0hdOG4QQ", category: "byah" },
  { id: 103, title: "Saint", artist: "Ajay Hooda", youtubeId: "0GTHOhksUw8", category: "byah" },
  { id: 104, title: "Husband Bawla", artist: "Ajay Hooda", youtubeId: "N6Kgs8xl_HY", category: "byah" },
  { id: 105, title: "PHOTO", artist: "Ajay Hooda", youtubeId: "PRhUvtgyFew", category: "byah" },
  { id: 106, title: "Moka Soka", artist: "Ajay Hooda", youtubeId: "dksmqBEH2i0", category: "byah" },
  { id: 107, title: "Rohtak Ke Mele Me", artist: "Ajay Hooda", youtubeId: "ENZUCQjinNI", category: "byah" },
  { id: 108, title: "SUIT BOOT", artist: "Ajay Hooda", youtubeId: "ts4iivElss0", category: "byah" },
  { id: 109, title: "Pyar Permanent", artist: "Ajay Hooda", youtubeId: "EO8mFEJsd4w", category: "byah" },
  { id: 110, title: "Tagdi", artist: "Ajay Hooda", youtubeId: "t9dWF8jQRog", category: "byah" },
  { id: 111, title: "HEAVY GHAGHRA", artist: "Ajay Hooda", youtubeId: "5q5MmwiS28s", category: "byah" },
  { id: 112, title: "Kallo", artist: "Ajay Hooda", youtubeId: "kqORlNfprKM", category: "byah" },
  { id: 113, title: "Uncle", artist: "Ajay Hooda", youtubeId: "aSbwQpHxZ6s", category: "byah" },
  { id: 114, title: "Lamba Lamba Ghunghat", artist: "Ajay Hooda", youtubeId: "4C6v11rbRkI", category: "byah" },
  { id: 115, title: "Moto", artist: "Ajay Hooda", youtubeId: "tJGBVigwPlU", category: "byah" },

  // --- अखाड़ा (Akhada) ---
  { id: 10, title: "GAADI 150", artist: "Vikram Sarkar", youtubeId: "YSb0Ho5RCQ0", category: "akhada" },
  { id: 11, title: "Legacy", artist: "Vikram Sarkar", youtubeId: "9f6U8gtJdV0", category: "akhada" },
  { id: 12, title: "Aaja Baby Baith Seat Pe", artist: "Vikram Sarkar", youtubeId: "NCVis44G6fY", category: "akhada" },
  { id: 13, title: "Naam Chale", artist: "Vikram Sarkar", youtubeId: "tYKrORILFOg", category: "akhada" },
  { id: 14, title: "Falani", artist: "Vikram Sarkar", youtubeId: "efbKUmeY-BY", category: "akhada" },
  { id: 15, title: "Green Flag", artist: "Vikram Sarkar", youtubeId: "76y6Ifwc70I", category: "akhada" },
  { id: 16, title: "No Time", artist: "Vikram Sarkar", youtubeId: "Zih3dfbjZ8g", category: "akhada" },
  { id: 17, title: "G Wagon", artist: "Vikram Sarkar", youtubeId: "iDGdYAhCv-I", category: "akhada" },
  { id: 18, title: "Rao Sahab Retro", artist: "Vikram Sarkar", youtubeId: "iaiojPxULFI", category: "akhada" },
  { id: 19, title: "CHORI", artist: "Vikram Sarkar", youtubeId: "kPrRmmq4xFE", category: "akhada" },

  // --- ट्रैक्टर राइड (Tractor Ride) ---
  { id: 150, title: "Teri Lat Lag Jagi", artist: "Sapna Choudhary", youtubeId: "UbmwKMGKiAc", category: "tractor" },
  { id: 151, title: "Tu Cheez Lajawab", artist: "Sapna Choudhary", youtubeId: "Houq_yjjWhQ", category: "tractor" },
  { id: 152, title: "Thada Bhartar", artist: "Sapna Choudhary", youtubeId: "Uq4dyDHgqAI", category: "tractor" },
  { id: 153, title: "Mera Dhol Kuye Me", artist: "Sapna Choudhary", youtubeId: "pdaBMEBMKAs", category: "tractor" },
  { id: 154, title: "Gajban Pani Ne Challi", artist: "Sapna Choudhary", youtubeId: "MD2Or5ZxBSs", category: "tractor" },
  { id: 155, title: "English Medium", artist: "Sapna Choudhary", youtubeId: "URxsOjGMg4w", category: "tractor" },
  { id: 156, title: "Chatak Matak", artist: "Sapna Choudhary", youtubeId: "s9AICwTKgOg", category: "tractor" },
  { id: 157, title: "Sweety", artist: "Sapna Choudhary", youtubeId: "F6znxz4BKaU", category: "tractor" },
  { id: 158, title: "Teri Aakhya Ka Yo Kajal", artist: "Sapna Choudhary", youtubeId: "uhq7GkZyknY", category: "tractor" },
  { id: 159, title: "Chamak Challo", artist: "Sapna Choudhary", youtubeId: "OK95LBYhp4M", category: "tractor" },
  { id: 160, title: "Chetak", artist: "Sapna Choudhary", youtubeId: "zlpTcgvTGEo", category: "tractor" },
  { id: 161, title: "Badli Badli Laage", artist: "Sapna Choudhary", youtubeId: "8eYdMMWghO0", category: "tractor" },
  { id: 162, title: "Bandook Chalgi", artist: "Sapna Choudhary", youtubeId: "85txbeyiXNI", category: "tractor" },
  { id: 163, title: "Kidnap ho Javegi", artist: "Sapna Choudhary", youtubeId: "xUqsxA3ny9Y", category: "tractor" },
  { id: 164, title: "Laad Piya Ke", artist: "Sapna Choudhary", youtubeId: "JdUXW69YYg0", category: "tractor" },
  { id: 165, title: "4G Ka Jamana", artist: "Sapna Choudhary", youtubeId: "XjGEJDig1uo", category: "tractor" },
  { id: 166, title: "Balam", artist: "Sapna Choudhary", youtubeId: "fXYJ68s7vfA", category: "tractor" },
];

function getCategoryMeta(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId) || null;
}