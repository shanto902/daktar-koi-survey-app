export interface District {
  nameEn: string;
  nameBn: string;
}

export interface Division {
  nameEn: string;
  nameBn: string;
  districts: District[];
}

export const BANGLADESH_DIVISIONS: Division[] = [
  {
    nameEn: 'Dhaka',
    nameBn: 'ঢাকা',
    districts: [
      { nameEn: 'Dhaka', nameBn: 'ঢাকা' },
      { nameEn: 'Gazipur', nameBn: 'গাজীপুর' },
      { nameEn: 'Kishoreganj', nameBn: 'কিশোরগঞ্জ' },
      { nameEn: 'Manikganj', nameBn: 'মানিকগঞ্জ' },
      { nameEn: 'Munshiganj', nameBn: 'মুন্সীগঞ্জ' },
      { nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ' },
      { nameEn: 'Narsingdi', nameBn: 'নরসিংদী' },
      { nameEn: 'Tangail', nameBn: 'টাঙ্গাইল' },
      { nameEn: 'Faridpur', nameBn: 'ফরিদপুর' },
      { nameEn: 'Gopalganj', nameBn: 'গোপালগঞ্জ' },
      { nameEn: 'Madaripur', nameBn: 'মাদারীপুর' },
      { nameEn: 'Rajbari', nameBn: 'রাজবাড়ী' },
      { nameEn: 'Shariatpur', nameBn: 'শরীয়তপুর' },
    ],
  },
  {
    nameEn: 'Chattogram',
    nameBn: 'চট্টগ্রাম',
    districts: [
      { nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম' },
      { nameEn: "Cox's Bazar", nameBn: 'কক্সবাজার' },
      { nameEn: 'Cumilla', nameBn: 'কুমিল্লা' },
      { nameEn: 'Feni', nameBn: 'ফেনী' },
      { nameEn: 'Brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া' },
      { nameEn: 'Rangamati', nameBn: 'রাঙ্গামাটি' },
      { nameEn: 'Noakhali', nameBn: 'নোয়াখালী' },
      { nameEn: 'Chandpur', nameBn: 'চাঁদপুর' },
      { nameEn: 'Lakshmipur', nameBn: 'লক্ষ্মীপুর' },
      { nameEn: 'Khagrachhari', nameBn: 'খাগড়াছড়ি' },
      { nameEn: 'Bandarban', nameBn: 'বান্দরবান' },
    ],
  },
  {
    nameEn: 'Rajshahi',
    nameBn: 'রাজশাহী',
    districts: [
      { nameEn: 'Rajshahi', nameBn: 'রাজশাহী' },
      { nameEn: 'Bogura', nameBn: 'বগুড়া' },
      { nameEn: 'Joypurhat', nameBn: 'জয়পুরহাট' },
      { nameEn: 'Naogaon', nameBn: 'নওগাঁ' },
      { nameEn: 'Natore', nameBn: 'নাটোর' },
      { nameEn: 'Nawabganj', nameBn: 'নবাবগঞ্জ' },
      { nameEn: 'Pabna', nameBn: 'পাবনা' },
      { nameEn: 'Sirajganj', nameBn: 'সিরাজগঞ্জ' },
    ],
  },
  {
    nameEn: 'Khulna',
    nameBn: 'খুলনা',
    districts: [
      { nameEn: 'Khulna', nameBn: 'খুলনা' },
      { nameEn: 'Bagerhat', nameBn: 'বাগেরহাট' },
      { nameEn: 'Chuadanga', nameBn: 'চুয়াডাঙ্গা' },
      { nameEn: 'Jashore', nameBn: 'যশোর' },
      { nameEn: 'Jhenaidah', nameBn: 'ঝিনাইদহ' },
      { nameEn: 'Kushtia', nameBn: 'কুষ্টিয়া' },
      { nameEn: 'Magura', nameBn: 'মাগুরা' },
      { nameEn: 'Meherpur', nameBn: 'মেহেরপুর' },
      { nameEn: 'Narail', nameBn: 'নড়াইল' },
      { nameEn: 'Satkhira', nameBn: 'সাতক্ষীরা' },
    ],
  },
  {
    nameEn: 'Barishal',
    nameBn: 'বরিশাল',
    districts: [
      { nameEn: 'Barishal', nameBn: 'বরিশাল' },
      { nameEn: 'Barguna', nameBn: 'বরগুনা' },
      { nameEn: 'Bhola', nameBn: 'ভোলা' },
      { nameEn: 'Jhalokati', nameBn: 'ঝালকাঠি' },
      { nameEn: 'Patuakhali', nameBn: 'পটুয়াখালী' },
      { nameEn: 'Pirojpur', nameBn: 'পিরোজপুর' },
    ],
  },
  {
    nameEn: 'Sylhet',
    nameBn: 'সিলেট',
    districts: [
      { nameEn: 'Sylhet', nameBn: 'সিলেট' },
      { nameEn: 'Habiganj', nameBn: 'হবিগঞ্জ' },
      { nameEn: 'Moulvibazar', nameBn: 'মৌলভীবাজার' },
      { nameEn: 'Sunamganj', nameBn: 'সুনামগঞ্জ' },
    ],
  },
  {
    nameEn: 'Rangpur',
    nameBn: 'রংপুর',
    districts: [
      { nameEn: 'Rangpur', nameBn: 'রংপুর' },
      { nameEn: 'Dinajpur', nameBn: 'দিনাজপুর' },
      { nameEn: 'Gaibandha', nameBn: 'গাইবান্ধা' },
      { nameEn: 'Kurigram', nameBn: 'কুড়িগ্রাম' },
      { nameEn: 'Lalmonirhat', nameBn: 'লালমনিরহাট' },
      { nameEn: 'Nilphamari', nameBn: 'নীলফামারী' },
      { nameEn: 'Panchagarh', nameBn: 'পঞ্চগড়' },
      { nameEn: 'Thakurgaon', nameBn: 'ঠাকুরগাঁও' },
    ],
  },
  {
    nameEn: 'Mymensingh',
    nameBn: 'ময়মনসিংহ',
    districts: [
      { nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
      { nameEn: 'Jamalpur', nameBn: 'জামালপুর' },
      { nameEn: 'Netrokona', nameBn: 'নেত্রকোণা' },
      { nameEn: 'Sherpur', nameBn: 'শেরপুর' },
    ],
  },
];

export const ALL_DISTRICTS: District[] = BANGLADESH_DIVISIONS.flatMap((d) => d.districts);

