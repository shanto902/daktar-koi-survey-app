/**
 * High-performance Bangla-to-English Name & Medical Facility Translator / Transliteration Engine
 * 
 * Works 100% offline using a curated medical & Bangladeshi naming dictionary + phonetic transliterator,
 * with optional fast online translation fallback when an internet connection is available.
 */

// 1. Standard Medical & Professional Titles
const TITLES_MAP: Record<string, string> = {
  'অধ্যাপক ডাঃ': 'Prof. Dr.',
  'অধ্যাপক ডা.': 'Prof. Dr.',
  'অধ্যাপক ডা:': 'Prof. Dr.',
  'প্রফেসর ডাঃ': 'Prof. Dr.',
  'প্রফেসর ডা.': 'Prof. Dr.',
  'সহযোগী অধ্যাপক ডাঃ': 'Assoc. Prof. Dr.',
  'সহযোগী অধ্যাপক ডা.': 'Assoc. Prof. Dr.',
  'সহকারী অধ্যাপক ডাঃ': 'Asst. Prof. Dr.',
  'সহকারী অধ্যাপক ডা.': 'Assoc. Prof. Dr.',
  'সহকারী অধ্যাপক': 'Asst. Prof.',
  'সহযোগী অধ্যাপক': 'Assoc. Prof.',
  'অধ্যাপক': 'Prof.',
  'প্রফেসর': 'Prof.',
  'ডাঃ': 'Dr.',
  'ডা.': 'Dr.',
  'ডা:': 'Dr.',
  'ডাক্তার': 'Dr.',
  'ডঃ': 'Dr.',
  'ড.': 'Dr.',
  'মোঃ': 'Md.',
  'মো.': 'Md.',
  'মো:': 'Md.',
  'মুঃ': 'Md.',
  'জনাব': 'Mr.',
  'জনাবা': 'Mrs.',
  'বেগম': 'Begum',
  'সার্জন': 'Surgeon',
  'কনসালট্যান্ট': 'Consultant',
  'কনসালটেন্ট': 'Consultant',
};

// 2. Common Medical & Facility Terms
const FACILITY_MAP: Record<string, string> = {
  'হাসপাতাল': 'Hospital',
  'ডায়াগনস্টিক': 'Diagnostic',
  'ডায়াগনষ্টিক': 'Diagnostic',
  'ডায়াগনস্টিক': 'Diagnostic',
  'ডায়াগনষ্টিক': 'Diagnostic',
  'সেন্টার': 'Centre',
  'সেনটার': 'Centre',
  'ক্লিনিক': 'Clinic',
  'কনসালটেশন': 'Consultation',
  'কনসালটেশান': 'Consultation',
  'মেডিকেল কলেজ': 'Medical College',
  'মেডিক্যাল কলেজ': 'Medical College',
  'মেডিকেল': 'Medical',
  'মেডিক্যাল': 'Medical',
  'ফার্মেসি': 'Pharmacy',
  'ফার্মেসী': 'Pharmacy',
  'জেনারেল': 'General',
  'স্পেশালাইজড': 'Specialized',
  'স্পেসালাইজড': 'Specialized',
  'আই': 'Eye',
  'ডেন্টাল': 'Dental',
  'শিশু': 'Child',
  'মা ও শিশু': 'Maa O Shishu',
  'মা ও সন্তান': 'Maa O Shontan',
  'ল্যাব': 'Lab',
  'ল্যাবরেটরি': 'Laboratory',
  'ল্যাবরেটরী': 'Laboratory',
  'লিমিটেড': 'Ltd.',
  'লিঃ': 'Ltd.',
  'লি.': 'Ltd.',
  'কমপ্লেক্স': 'Complex',
  'কেয়ার': 'Care',
  'সেবা': 'Seba',
  'ট্রাস্ট': 'Trust',
  'ফাউন্ডেশন': 'Foundation',
  'নার্সিং হোম': 'Nursing Home',
  'ইনস্টিটিউট': 'Institute',
  'ইন্সটিটিউট': 'Institute',
  'রিসার্চ': 'Research',
  'ইউনানি': 'Unani',
  'আয়ুর্বেদিক': 'Ayurvedic',
  'হোমিও': 'Homeo',
  'হোমিওপ্যাথিক': 'Homeopathic',
  'ফিজিওথেরাপি': 'Physiotherapy',
  'কমিউনিটি': 'Community',
  'সেন্ট্রাল': 'Central',
  'সিটি': 'City',
  'মেট্রোপলিটন': 'Metropolitan',
  'ন্যাশনাল': 'National',
  'মডার্ন': 'Modern',
  'গ্রীন': 'Green',
  'লাইফ': 'Life',
  'ইউনাইটেড': 'United',
  'স্কয়ার': 'Square',
  'এভারকেয়ার': 'Evercare',
  'অ্যাপোলো': 'Apollo',
  'এ্যাপোলো': 'Apollo',
  'পপুলার': 'Popular',
  'ইবনে সিনা': 'Ibn Sina',
  'ল্যাবএইড': 'Labaid',
  'ডেল্টা': 'Delta',
  'বারডেম': 'BIRDEM',
  'ইনসাফ': 'Insaf',
  'আল-হেলাল': 'Al-Helal',
  'আল-বারাকা': 'Al-Baraka',
  'আনোয়ার খান': 'Anwer Khan',
};

// 3. Comprehensive Dictionary of Common Bangladeshi Names (Doctors, Staff & Facilities)
const NAMES_MAP: Record<string, string> = {
  // Religious & Traditional Names
  'মুহাম্মদ': 'Muhammad',
  'মোহাম্মদ': 'Mohammad',
  'আহমেদ': 'Ahmed',
  'আহমদ': 'Ahmad',
  'রফিকুল': 'Rafiqul',
  'ইসলাম': 'Islam',
  'আনিসুর': 'Anisur',
  'রহমান': 'Rahman',
  'হাসান': 'Hasan',
  'হোসেন': 'Hossain',
  'হুসাইন': 'Hussain',
  'আক্তার': 'Akter',
  'আখতার': 'Akhtar',
  'সুলতানা': 'Sultana',
  'চৌধুরী': 'Chowdhury',
  'খান': 'Khan',
  'করিম': 'Karim',
  'মাহমুদ': 'Mahmud',
  'খন্দকার': 'Khandakar',
  'সরকার': 'Sarker',
  'শেখ': 'Sheikh',
  'কাজী': 'Kazi',
  'আলম': 'Alam',
  'তানজিলা': 'Tanjila',
  'কামরুল': 'Kamrul',
  'নাজমুল': 'Nazmul',
  'তারেক': 'Tariq',
  'তারিক': 'Tariq',
  'শহিদুল': 'Shahidul',
  'শহীদুল': 'Shahidul',
  'সাইফুল': 'Saiful',
  'ফরিদুল': 'Faridul',
  'মোজাম্মেল': 'Mozammel',
  'জালাল': 'Jalal',
  'মাসুদ': 'Masud',
  'মনসুর': 'Mansur',
  'আলী': 'Ali',
  'হক': 'Haque',
  'উদ্দিন': 'Uddin',
  'শিকদার': 'Sikder',
  'তালুকদার': 'Talukder',
  'মিয়া': 'Mia',
  'মিঞা': 'Mia',
  'ফারুক': 'Faruk',
  'হারুন': 'Harun',
  'রশীদ': 'Rashid',
  'কাদের': 'Kader',
  'লতিফ': 'Latif',
  'আব্দুল': 'Abdul',
  'আব্দুল্লাহ': 'Abdullah',
  'আব্দুস': 'Abdus',
  'সামাদ': 'Samad',
  'সালাম': 'Salam',
  'ওয়াদুদ': 'Wadud',
  'মতিন': 'Matin',
  'মোস্তফা': 'Mostafa',
  'মুস্তফা': 'Mustafa',
  'খায়ের': 'Khair',
  'বশির': 'Bashir',
  'জামান': 'Zaman',
  'খাতুন': 'Khatun',
  'জাহান': 'Jahan',
  'নাহার': 'Nahar',
  'শামীম': 'Shamim',
  'নাজমা': 'Nazma',
  'রোকেয়া': 'Rokeya',
  'ফারহানা': 'Farhana',
  'নাসরিন': 'Nasrin',
  'ফারজানা': 'Farjana',
  'শাবানা': 'Shabana',
  'তাসনিম': 'Tasnim',
  'আরিফা': 'Arifa',
  'ফাতেমা': 'Fatema',
  'ফাতিমা': 'Fatima',
  'মারিয়া': 'Maria',
  'সাবরিনা': 'Sabrina',
  'সুমাইয়া': 'Sumaiya',
  'নুসরাত': 'Nusrat',
  'সাদিয়া': 'Sadia',
  'তানিয়া': 'Tania',
  'জান্নাত': 'Jannat',
  'ইমরান': 'Imran',
  'শাকিল': 'Shakil',
  'সোহেল': 'Sohel',
  'সুমন': 'Sumon',
  'রুবেল': 'Rubel',
  'রিপন': 'Ripon',
  'মিজানুর': 'Mizanur',
  'মিজান': 'Mizan',
  'শফিকুল': 'Shafiqul',
  'আশরাফুল': 'Ashraful',
  'এহসান': 'Ehsan',
  'মাহবুব': 'Mahbub',
  'মাহবুবা': 'Mahbuba',
  'শরীফ': 'Sharif',
  'জুবায়ের': 'Zubair',
  'ফয়সাল': 'Faisal',
  'রাশেদ': 'Rashed',
  'মুরাদ': 'Murad',
  'সেলিম': 'Selim',
  'আনোয়ার': 'Anwar',
  'রেজা': 'Reza',
  'ইকবাল': 'Iqbal',
  'আমজাদ': 'Amjad',
  'সিদ্দিক': 'Siddique',
  'সিদ্দিকী': 'Siddiqui',
  'ফারুকী': 'Faruki',
  'কাউসার': 'Kawsar',
  'শাহীন': 'Shahin',
  'তুহিন': 'Tuhin',
  'মারুফ': 'Maruf',
  'ফারদিন': 'Fardin',
  'সাদাত': 'Saadat',
  'রাফাত': 'Rafat',
  'আদিব': 'Adib',
  'আসিফ': 'Asif',
  'আতিফ': 'Atif',
  'আরিফ': 'Arif',
  'আরিফুল': 'Ariful',
  'সাকিব': 'Sakib',
  'রাকিব': 'Rakib',
  'নাকিব': 'Nakib',
  'হাবিব': 'Habib',
  'মুস্তাকিম': 'Mustakim',
  'তাহমিদ': 'Tahmid',
  'তানভীর': 'Tanvir',
  'শামসুল': 'Shamsul',
  'নুরুল': 'Nurul',
  'বদরুল': 'Badrul',
  'কামরুন': 'Kamrun',
  'পারভীন': 'Parvin',
  'ইয়াসমিন': 'Yasmin',
  'শিরিন': 'Shirin',
  'ফেরদৌস': 'Ferdous',
  'ফেরদৌসী': 'Ferdousi',
  'লায়লা': 'Laila',
  'মাজেদা': 'Majeda',
  'খাদিজা': 'Khadija',
  'আয়েশা': 'Ayesha',
  'মারিয়াম': 'Mariam',
  'আসিয়া': 'Asia',
  'হাফেজা': 'Hafeza',
  'শাহেদা': 'Shaheda',
  'মর্জিনা': 'Morjina',
  'কহিনুর': 'Kohinoor',
  'মোমেনা': 'Momena',
  'জাহানারা': 'Jahanara',
  'রওশন': 'Rowshan',
  'হাসিনা': 'Hasina',
  'খালেদা': 'Khaleda',
  'মনিরা': 'Monira',
  'সাবেরা': 'Sabera',
  'সালমা': 'Salma',
  'রেহানা': 'Rehana',
  'রুমানা': 'Rumana',
  'শবনম': 'Shabnam',
  'আদিবা': 'Adiba',
  'আনিসা': 'Anisa',
  'তাহেরা': 'Tahera',
  'তসলিমা': 'Taslima',
  'শাহজাহান': 'Shahjahan',
  'বোরহান': 'Borhan',
  'খোকন': 'Khokon',
  'বাবু': 'Babu',
  'বাবুল': 'Babul',
  'লিটন': 'Liton',
  'শিপন': 'Shipon',
  'হেলাল': 'Helal',
  'বেলাল': 'Belal',
  'কামাল': 'Kamal',
  'জামাল': 'Jamal',
  'আমির': 'Amir',
  'আহসান': 'Ahsan',
  'ইলিয়াস': 'Elias',
  'মোজাহিদ': 'Mujahid',
  'তৌহিদ': 'Towhid',
  'তাহসিন': 'Tahsin',
  'শাহরিয়ার': 'Shahriar',
  'মেহেদী': 'Mehedi',
  'মিরাজ': 'Miraj',
  'মুশতাক': 'Mushtaq',
  'শওকত': 'Shawkat',
  'নাসির': 'Nasir',
  'আসাদ': 'Asad',
  'আসাদুজ্জামান': 'Asaduzzaman',
  'নুরুজ্জামান': 'Nuruzzaman',
  'মনিরুজ্জামান': 'Moniruzzaman',
  'কামরুজ্জামান': 'Kamruzzaman',
  'আক্তারুজ্জামান': 'Akteruzzaman',
  'শহীদুজ্জামান': 'Shahiduzzaman',
  'ওয়াহিদুজ্জামান': 'Wahiduzzaman',
  'সাইদুজ্জামান': 'Saiduzzaman',
  'শামসুজ্জামান': 'Shamsuzzaman',
  'বদরুজ্জামান': 'Badruzzaman',
  'ফখরুল': 'Fakhrul',
  'জিয়া': 'Zia',
  'জিয়াউর': 'Ziaur',
  'হাবিবুর': 'Habibur',
  'লতিফুর': 'Latifur',
  'আমিনুর': 'Aminur',
  'খলিলুর': 'Khalilur',
  'মতিউর': 'Motiur',
  'মজিবুর': 'Mojibur',
  'মুজিবুর': 'Mujibur',
  'আজিজুর': 'Azizur',
  'শফিকুর': 'Shafiqur',
  'মুস্তাফিজুর': 'Mustafizur',
  'খোরশেদ': 'Khorshed',
  'জাহাঙ্গীর': 'Jahangir',
  'আলমগীর': 'Alamgir',
  'হুমায়ূন': 'Humayun',
  'কবীর': 'Kabir',
  'জাফর': 'Zafar',
  'সৈয়দ': 'Syed',
  'সৈয়দা': 'Syeda',
  'আবু': 'Abu',
  'ইবনে': 'Ibn',
  'সিনা': 'Sina',

  // Bengali Hindu / Traditional Names
  'রায়': 'Roy',
  'দে': 'Dey',
  'দত্ত': 'Dutta',
  'দাস': 'Das',
  'ঘোষ': 'Ghosh',
  'সাহা': 'Saha',
  'সেন': 'Sen',
  'বনিক': 'Banik',
  'বিশ্বাস': 'Biswas',
  'মন্ডল': 'Mondal',
  'মজুমদার': 'Majumder',
  'হালদার': 'Haldar',
  'ভট্টাচার্য': 'Bhattacharya',
  'চট্টোপাধ্যায়': 'Chatterjee',
  'মুখোপাধ্যায়': 'Mukherjee',
  'বন্দ্যোপাধ্যায়': 'Banerjee',
  'গাঙ্গুলী': 'Ganguly',
  'পাল': 'Paul',
  'মিত্র': 'Mitra',
  'গুপ্ত': 'Gupta',
  'বসু': 'Bose',
  'দেওয়ান': 'Dewan',
  'মোল্লা': 'Molla',
  'মুন্সী': 'Munshi',
  'সরদার': 'Sarder',
  'বেপারী': 'Bepari',
  'পাটোয়ারী': 'Patwary',
  'ভূঁইয়া': 'Bhuiyan',
  'পলাশ': 'Polash',
  'সৌরভ': 'Sourav',
  'সৌম্য': 'Soumya',
  'অনিক': 'Anik',
  'সজীব': 'Sajib',
  'রাজিব': 'Rajib',
  'অমিত': 'Amit',
  'বিজয়': 'Bijoy',
  'উত্তম': 'Uttam',
  'সুব্রত': 'Subrata',
  'প্রদীপ': 'Pradip',
  'সুজন': 'Sujan',
  'সজল': 'Sajal',
  'শুভ': 'Shuvo',
  'শান্ত': 'Shanto',
  'অসীম': 'Ashim',
  'স্বপন': 'Swapan',
  'রতন': 'Ratan',
  'চন্দন': 'Chandan',
  'কমল': 'Kamal',
  'বিপুল': 'Bipul',
  'দীপক': 'Dipak',
  'অশোক': 'Ashok',
  'সঞ্জয়': 'Sanjoy',
  'শ্যামল': 'Shyamal',
  'নির্মল': 'Nirmal',
  'মিলন': 'Milon',
  'আকাশ': 'Akash',
  'সাগর': 'Sagar',
  'রিন্টু': 'Rintu',
  'মিন্টু': 'Mintu',
  'পিন্টু': 'Pintu',
  'টিটু': 'Titu',
  'বিদ্যুৎ': 'Bidyut',
  'তাপস': 'Tapas',
  'দেবাশীষ': 'Debashis',
  'প্রণব': 'Pranab',
  'অপূর্ব': 'Apurba',
  'অনুপম': 'Anupam',
  'প্রশান্ত': 'Prashanta',
  'অরুণ': 'Arun',
  'অলোক': 'Alok',
  'সুজিত': 'Sujit',
  'রণজিৎ': 'Ranjit',
  'অজিত': 'Ajit',
  'বিশ্বজিৎ': 'Biswajit',
  'সুবীর': 'Subir',
  'সমীর': 'Samir',
  'অমরেশ': 'Amaresh',
  'সুরেশ': 'Suresh',
  'নরেশ': 'Naresh',
  'রমেশ': 'Ramesh',
  'দিনেশ': 'Dinesh',
  'মহেশ': 'Mahesh',
  'পীযূষ': 'Pijush',
};

// 4. Phonetic Transliteration Rules for any unmatched words
const CONSONANTS: Record<string, string> = {
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh',
  'স': 's', 'হ': 'h', 'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y',
  'ৎ': 't', 'ং': 'ng', 'ঃ': '', 'ঁ': 'n',
};

const VOWEL_SIGNS: Record<string, string> = {
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u',
  'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u',
  'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
};

const CONJUNCTS: Record<string, string> = {
  'ক্ষ': 'ksh', 'জ্ঞ': 'gya', 'ষ্ণ': 'shn', 'ঙ্ক': 'nk',
  'ঙ্গ': 'ng', 'ঞ্চ': 'nch', 'ঞ্জ': 'nj', 'ন্ট': 'nt',
  'ন্ত': 'nt', 'ন্দ': 'nd', 'ন্ধ': 'ndh', 'ম্প': 'mp',
  'ম্ব': 'mb', 'ম্ভ': 'mbh', 'ষ্ট': 'sht', 'ষ্ঠ': 'shth',
  'স্থ': 'sth', 'স্ত': 'st', 'স্প': 'sp', 'স্ফ': 'sf',
  'স্ক': 'sk', 'স্খ': 'skh', 'ট্র': 'tr', 'ড্র': 'dr',
  'ব্র': 'br', 'গ্র': 'gr', 'প্র': 'pr', 'ত্র': 'tr',
};

/**
 * Transliterates a single Bengali word phonetically if not found in dictionary
 */
function transliterateBengaliWord(word: string): string {
  if (!word || !/[\u0980-\u09FF]/.test(word)) {
    return word;
  }

  // Check conjuncts first
  let temp = word;
  for (const [conj, rep] of Object.entries(CONJUNCTS)) {
    temp = temp.split(conj).join(rep);
  }

  let out = '';
  const len = temp.length;

  for (let i = 0; i < len; i++) {
    const ch = temp[i];
    const nextCh = i + 1 < len ? temp[i + 1] : null;

    if (INDEPENDENT_VOWELS[ch]) {
      out += INDEPENDENT_VOWELS[ch];
    } else if (VOWEL_SIGNS[ch]) {
      out += VOWEL_SIGNS[ch];
    } else if (ch === '্') {
      // Hasanta - suppresses default vowel
      continue;
    } else if (CONSONANTS[ch]) {
      const c = CONSONANTS[ch];
      out += c;
      // Add implicit vowel 'a' or 'o' if consonant is followed by another consonant without hasanta
      if (
        nextCh &&
        CONSONANTS[nextCh] &&
        nextCh !== '্' &&
        !VOWEL_SIGNS[nextCh]
      ) {
        out += 'a';
      }
    } else {
      out += ch;
    }
  }

  // Capitalize first letter
  if (out.length > 0) {
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

/**
 * Clean & title-case standard English words
 */
function formatEnglishOutput(str: string): string {
  return str
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, (_, l) => l.toUpperCase())
    .replace(/\bDr\.?\b/g, 'Dr.')
    .replace(/\bMd\.?\b/g, 'Md.')
    .replace(/\bProf\.?\b/g, 'Prof.')
    .replace(/\bLtd\.?\b/g, 'Ltd.')
    .replace(/\.{2,}/g, '.');
}

/**
 * Offline rule-based transliterator
 */
export function transliterateBanglaToEnglish(banglaText: string): string {
  if (!banglaText || !banglaText.trim()) return '';

  let clean = banglaText.trim();

  // 1. Check title prefixes (multi-word first)
  let prefix = '';
  for (const [bnTitle, enTitle] of Object.entries(TITLES_MAP)) {
    if (clean.startsWith(bnTitle)) {
      prefix = enTitle + ' ';
      clean = clean.slice(bnTitle.length).trim();
      break;
    }
  }

  // 2. Tokenize remaining words
  const words = clean.split(/[\s,]+/);
  const translatedWords: string[] = [];

  for (const w of words) {
    if (!w) continue;

    // Check facility map
    if (FACILITY_MAP[w]) {
      translatedWords.push(FACILITY_MAP[w]);
      continue;
    }

    // Check common names map
    if (NAMES_MAP[w]) {
      translatedWords.push(NAMES_MAP[w]);
      continue;
    }

    // Check titles map for standalone words
    if (TITLES_MAP[w]) {
      translatedWords.push(TITLES_MAP[w]);
      continue;
    }

    // If English or numbers already, keep as is
    if (!/[\u0980-\u09FF]/.test(w)) {
      translatedWords.push(w);
      continue;
    }

    // Phonetic transliteration
    translatedWords.push(transliterateBengaliWord(w));
  }

  const result = (prefix + translatedWords.join(' ')).trim();
  return formatEnglishOutput(result);
}

/**
 * Fast online translation with automatic offline fallback
 */
export async function translateBanglaToEnglish(
  banglaText: string,
  timeoutMs: number = 2500
): Promise<string> {
  if (!banglaText || !banglaText.trim()) return '';

  // If text doesn't contain Bengali characters, return as-is
  if (!/[\u0980-\u09FF]/.test(banglaText)) {
    return banglaText.trim();
  }

  // Attempt online translation first if available
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=bn&tl=en&dt=t&q=${encodeURIComponent(
      banglaText.trim()
    )}`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0]
          .map((chunk: any) => chunk[0])
          .join('')
          .trim();
        if (translated) {
          return formatEnglishOutput(translated);
        }
      }
    }
  } catch {
    // Offline / Network error / Timeout - seamlessly proceed to offline transliteration
  }

  // Offline fallback
  return transliterateBanglaToEnglish(banglaText);
}
