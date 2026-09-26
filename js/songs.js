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
  { id: 154, title: "Gajban Pani Ne Challi", artist: "Sapna Choudhary", youtubeId: "MD2Or5ZxBSs", category: "tractor" },
  { id: 155, title: "English Medium", artist: "Sapna Choudhary", youtubeId: "URxsOjGMg4w", category: "tractor" },
  { id: 156, title: "Chatak Matak", artist: "Sapna Choudhary", youtubeId: "s9AICwTKgOg", category: "tractor" },
  { id: 157, title: "Sweety", artist: "Sapna Choudhary", youtubeId: "F6znxz4BKaU", category: "tractor" },
  { id: 158, title: "Teri Aakhya Ka Yo Kajal", artist: "Sapna Choudhary", youtubeId: "uhq7GkZyknY", category: "tractor" },
  { id: 159, title: "Chamak Challo", artist: "Sapna Choudhary", youtubeId: "OK95LBYhp4M", category: "tractor" },
  { id: 160, title: "Chetak", artist: "Sapna Choudhary", youtubeId: "zlpTcgvTGEo", category: "tractor" },
  { id: 161, title: "Badli Badli Laage", artist: "Sapna Choudhary", youtubeId: "8eYdMMWghO0", category: "tractor" },
  { id: 162, title: "Bandook Chalgi", artist: "Sapna Choudhary", youtubeId: "85txbeyiXNI", category: "tractor" },
  { id: 163, title: "Laad Piya Ke", artist: "Sapna Choudhary", youtubeId: "JdUXW69YYg0", category: "tractor" },
  { id: 164, title: "4G Ka Jamana", artist: "Sapna Choudhary", youtubeId: "XjGEJDig1uo", category: "tractor" },
  { id: 165, title: "Balam", artist: "Sapna Choudhary", youtubeId: "fXYJ68s7vfA", category: "tractor" },
  {
    id: 203,
    title: "Boom Shaka",
    artist: "Dhanda Nyoliwala x KR$NA",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/mutantsrecords-782367519/boom-shaka-kr-na-x-dhanda?si=6acd1597ff1042298fda9146a06cbbc7&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 204,
    title: "Not Guilty",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/dhanda-nyoliwala-on-top/not-guilty-dhanda-nyoliwala?si=d50cd0dab4834de8a6035aaca98d1b70&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 205,
    title: "Zigane",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/mavi99-845201615/zigane-dhanda-nyoliwala-big?si=0916cdd8548041278f36cd4a80445cab&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 206,
    title: "Maruti",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/marshall-jatt/maruti-dhanda-nyoliwala-1?si=52ebb3d6c02f421e936d20e5a51f3938&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 208,
    title: "No Fluke",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/dhanda-nyoliwala-on-top/no-fluke?si=2abac1f2496d4ada9344a70bc7fd54c7&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 211,
    title: "Surrey BC",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/songs-891847424/surrey-bc-dhanda-nyoliwala?si=8c0ec6ba5adf437390735e6fafb02261&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 212,
    title: "Jeelo Jeelo",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/songs-891847424/jeelo-jeelo-dhanda-nyoliwala?si=648d95acc7944364b206fd4cb3eea1dc&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 213,
    title: "Big Plans",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/mavi99-845201615/big-plans-dhanda-nyoliwala-big?si=ecd83482d988412aadce5da04b4c06cd&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 214,
    title: "Vomit On Paper",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/k-i-r-a-t/vomit-on-paper-dhanda?si=2f47810f3fae40908020838cc1088f91&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 215,
    title: "Charche",
    artist: "Xvir x Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/brand-new-songs-62789070/charche-dhanda-nyoliwala-xvir?si=10b286347b0147eb8ba26a5ff2f57495&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 216,
    title: "Paradox",
    artist: "Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/dhanda-nyoliwala-on-top/paradox?in=user-559084687/sets/dhanda-nyoliwala&si=55055a78a30c4363b5f4db60d6f7910b&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  },
  {
    id: 217,
    title: "Balkan Girl",
    artist: "Xvir x Dhanda Nyoliwala",
    source: "soundcloud",
    soundcloudUrl: "https://soundcloud.com/dhanda-nyoliwala-on-top/balkan-girl?in=user-559084687/sets/dhanda-nyoliwala&si=f5fed69730a84c84bf6b07281def09a3&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    category: "hukka"
  }
];

function getCategoryMeta(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId) || null;
}