import { StructuredExtractedData } from '../../types';

/**
 * Converts Bengali digits to standard Western Arabic numerals
 */
export function convertBengaliDigitsToEnglish(str: string): string {
  const bnToEnMap: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  };
  return str.replace(/[০-৯]/g, (w) => bnToEnMap[w] || w);
}

/**
 * Normalizes Bangladeshi phone numbers for comparisons
 * Returns standard 11-digit format e.g. "01711234567"
 */
export function normalizeBdPhoneNumber(rawPhone: string): string {
  const converted = convertBengaliDigitsToEnglish(rawPhone);
  const digitsOnly = converted.replace(/[^0-9]/g, '');

  if (digitsOnly.startsWith('8801') && digitsOnly.length === 13) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.startsWith('01') && digitsOnly.length === 11) {
    return digitsOnly;
  }
  if (digitsOnly.length > 10) {
    const match = digitsOnly.match(/01[3-9]\d{8}/);
    if (match) return match[0];
  }
  return digitsOnly;
}

export function extractStructuredDataFromText(rawText: string): StructuredExtractedData {
  if (!rawText || rawText.trim().length === 0) {
    return {};
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const englishDigitsText = convertBengaliDigitsToEnglish(rawText);

  const result: StructuredExtractedData = {};

  // 1. Phone Numbers
  // Match Bangladeshi mobile numbers in both English and converted Bengali text
  const phoneRegex = /(?:\+?880\s?|0)1[3-9]\d{2}[-\s]?\d{3}[-\s]?\d{3}/g;
  const foundPhones = englishDigitsText.match(phoneRegex) || [];
  const normalizedPhones: string[] = [];

  for (const p of foundPhones) {
    const normalized = normalizeBdPhoneNumber(p);
    if (normalized.length === 11 && !normalizedPhones.includes(normalized)) {
      normalizedPhones.push(normalized);
    }
  }

  if (normalizedPhones.length > 0) {
    result.phones = normalizedPhones;
    result.appointmentPhone = normalizedPhones[0];
  }

  // 2. BMDC Registration Number
  // Examples: BMDC Reg: A-12345, BMDC No. 45678, বিএমডিসি রেজিঃ নং- ১২৩৪৫, Reg No: A-5678
  const bmdcRegex =
    /(?:BMDC|বিএমডিসি|রেজি(?:স্ট্রেশন)?|Reg(?:istration)?\.?\s*(?:No\.?)?)[^\w\d]*(?:[:\-\s#]*)([A-Za-z]?\s*[-]?\s*\d{3,6})/i;
  const bmdcMatch = englishDigitsText.match(bmdcRegex);
  if (bmdcMatch && bmdcMatch[1]) {
    result.bmdcNumber = bmdcMatch[1].replace(/\s+/g, '').toUpperCase();
    if (!result.bmdcNumber.startsWith('A-') && /^\d+$/.test(result.bmdcNumber)) {
      result.bmdcNumber = `A-${result.bmdcNumber}`;
    }
  }

  // 3. Doctor Name Detection
  // Common prefixes in Bangla and English
  const doctorPrefixRegexBn = /(?:অধ্যাপক\s+)?(?:সহযোগী\s+অধ্যাপক\s+)?(?:সহকারী\s+অধ্যাপক\s+)?(?:প্রফেসর\s+)?(?:ডাঃ|ডা\.|ডাক্তার|ডঃ|ডা:)\s*(.+)/i;
  const doctorPrefixRegexEn = /(?:Prof(?:\.|essor)?\s+)?(?:Assoc(?:\.|iate)?\s+Prof(?:\.|essor)?\s+)?(?:Asst(?:\.|istant)?\s+Prof(?:\.|essor)?\s+)?(?:Dr\b\.?|Doctor\b)\s*(.+)/i;

  for (const line of lines) {
    const cleanLine = line.replace(/^[^\w\u0980-\u09FF]+/, '').trim();

    if (!result.doctorNameBn && /[\u0980-\u09FF]/.test(cleanLine)) {
      const bnMatch = cleanLine.match(doctorPrefixRegexBn);
      if (bnMatch) {
        result.doctorNameBn = cleanLine;
        continue;
      }
    }

    if (!result.doctorNameEn && /[A-Za-z]/.test(cleanLine)) {
      const enMatch = cleanLine.match(doctorPrefixRegexEn);
      if (enMatch) {
        result.doctorNameEn = cleanLine;
        continue;
      }
    }
  }

  // Fallback 1: Check for any lines containing 'ডাঃ', 'ডা.', 'ডাক্তার', 'ডঃ' or 'Dr.'
  if (!result.doctorNameBn) {
    const bnLine = lines.find((l) => /(?:ডাঃ|ডা\.|ডাক্তার|ডঃ|ডা:)/.test(l));
    if (bnLine) {
      result.doctorNameBn = bnLine.replace(/^[^\w\u0980-\u09FF]+/, '').trim();
    }
  }
  if (!result.doctorNameEn) {
    const enLine = lines.find((l) => /\b(?:Dr\b\.?|Doctor\b)/i.test(l));
    if (enLine) {
      result.doctorNameEn = enLine.replace(/^[^\w\u0980-\u09FF]+/, '').trim();
    }
  }

  // Fallback 2: Check for name line directly preceding a qualifications line (MBBS/FCPS)
  const isFacilityOrAddress = (str: string) =>
    /(?:hospital|clinic|center|centre|diagnostic|pharmacy|chamber|road|dhaka|হাসপাতাল|ক্লিনিক|সেন্টার|ডায়াগনস্টিক|ফার্মেসী|চেম্বার|রোড|ঢাকা|চট্টগ্রাম)/i.test(str);

  if (!result.doctorNameBn || !result.doctorNameEn) {
    const qualIndex = lines.findIndex((l) =>
      /(?:MBBS|FCPS|এমবিবিএস|এফসিপিএস|MD|MS|এমডি|BDS|বিডিএস)/i.test(l)
    );
    if (qualIndex > 0) {
      const prevLine = lines[qualIndex - 1].replace(/^[^\w\u0980-\u09FF]+/, '').trim();
      if (!isFacilityOrAddress(prevLine) && prevLine.length >= 3 && prevLine.length <= 60) {
        if (/[\u0980-\u09FF]/.test(prevLine) && !result.doctorNameBn) {
          result.doctorNameBn = prevLine;
        } else if (/[A-Za-z]/.test(prevLine) && !result.doctorNameEn) {
          result.doctorNameEn = prevLine;
        }
      }
    }
  }

  // 4. Qualifications Detection
  const qualificationKeywords = [
    'MBBS',
    'FCPS',
    'MD',
    'MS',
    'MRCP',
    'FRCS',
    'DGO',
    'MCPS',
    'BDS',
    'MPH',
    'D-Card',
    'BCS (Health)',
    'বিসিএস (স্বাস্থ্য)',
    'এমবিবিএস',
    'এফসিপিএস',
    'এমডি',
    'এমএস',
    'ডিজিও',
  ];

  const matchedQualifications: string[] = [];
  for (const line of lines) {
    for (const kw of qualificationKeywords) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(line) && !matchedQualifications.includes(line)) {
        matchedQualifications.push(line);
        break;
      }
    }
  }
  if (matchedQualifications.length > 0) {
    result.qualifications = matchedQualifications.join(', ');
  }

  // 5. Specialization
  const specializationKeywords: { keyword: string; label: string }[] = [
    { keyword: 'Cardiolog', label: 'Cardiology (হৃদরোগ)' },
    { keyword: 'হৃদরোগ', label: 'Cardiology (হৃদরোগ)' },
    { keyword: 'Medicine', label: 'Internal Medicine (মেডিসিন)' },
    { keyword: 'মেডিসিন', label: 'Internal Medicine (মেডিসিন)' },
    { keyword: 'Gynecolog', label: 'Gynecology & Obstetrics (স্ত্রী ও প্রসূতি)' },
    { keyword: 'প্রসূতি', label: 'Gynecology & Obstetrics (স্ত্রী ও প্রসূতি)' },
    { keyword: 'Pediatric', label: 'Pediatrics (শিশু রোগ)' },
    { keyword: 'শিশু রোগ', label: 'Pediatrics (শিশু রোগ)' },
    { keyword: 'Orthopedic', label: 'Orthopedics (হাড় ও জোড়া)' },
    { keyword: 'হাড় ও জোড়া', label: 'Orthopedics (হাড় ও জোড়া)' },
    { keyword: 'Dermatolog', label: 'Dermatology (চর্ম ও যৌন)' },
    { keyword: 'চর্ম ও যৌন', label: 'Dermatology (চর্ম ও যৌন)' },
    { keyword: 'Surgery', label: 'General Surgery (সার্জারি)' },
    { keyword: 'সার্জারি', label: 'General Surgery (সার্জারি)' },
    { keyword: 'Eye', label: 'Ophthalmology (চক্ষু)' },
    { keyword: 'চক্ষু', label: 'Ophthalmology (চক্ষু)' },
    { keyword: 'Dental', label: 'Dentistry (দাঁতের ডাক্তার)' },
    { keyword: 'দাঁত', label: 'Dentistry (দাঁতের ডাক্তার)' },
    { keyword: 'ENT', label: 'ENT (নাক, কান, গলা)' },
    { keyword: 'নাক, কান, গলা', label: 'ENT (নাক, কান, গলা)' },
  ];

  for (const spec of specializationKeywords) {
    if (new RegExp(spec.keyword, 'i').test(rawText)) {
      result.specialization = spec.label;
      break;
    }
  }

  // 6. Facility Name Detection
  const facilityKeywords = [
    'হাসপাতাল',
    'ক্লিনিক',
    'ডায়াগনস্টিক',
    'সেন্টার',
    'ফার্মেসী',
    'হসপিটাল',
    'Hospital',
    'Clinic',
    'Diagnostic',
    'Center',
    'Centre',
    'Pharma',
    'Pharmacy',
  ];

  for (const line of lines) {
    for (const kw of facilityKeywords) {
      if (line.includes(kw) && line !== result.doctorNameBn && line !== result.doctorNameEn) {
        if (/[\u0980-\u09FF]/.test(line)) {
          if (!result.facilityNameBn) result.facilityNameBn = line;
        } else {
          if (!result.facilityNameEn) result.facilityNameEn = line;
        }
        break;
      }
    }
  }

  // 7. Visiting Days & Timing
  const visitingDays: string[] = [];
  if (/প্রতিদিন|daily|everyday/i.test(rawText)) {
    visitingDays.push('Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday');
  } else {
    if (/শনি|sat/i.test(rawText)) visitingDays.push('Saturday');
    if (/রবি|sun/i.test(rawText)) visitingDays.push('Sunday');
    if (/সোম|mon/i.test(rawText)) visitingDays.push('Monday');
    if (/মঙ্গল|tue/i.test(rawText)) visitingDays.push('Tuesday');
    if (/বুধ|wed/i.test(rawText)) visitingDays.push('Wednesday');
    if (/বৃহস্পতি|thu/i.test(rawText)) visitingDays.push('Thursday');
    if (/শুক্র|fri/i.test(rawText) && !/শুক্র\s*(?:বার)?\s*বন্ধ/i.test(rawText)) {
      visitingDays.push('Friday');
    }
  }
  if (visitingDays.length > 0) {
    result.visitingDays = visitingDays;
  }

  // Visiting Time e.g. 5:00 PM - 9:00 PM or বিকাল ৫টা - রাত ৯টা
  const timeMatch = englishDigitsText.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*[-–toথেকে]+\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i);
  if (timeMatch && timeMatch[1]) {
    result.visitingStartTime = timeMatch[1];
  }

  // 8. Consultation Fee e.g. ফি: ১০০০ টাকা, ভিজিট ফি: ১০০০, Fee: 1000
  const feeRegex = /(?:(?:^|[^\u0980-\u09FFA-Za-z])(?:ভিজিট\s*ফি|ফি|Fee|Charge|Consultation\s*Fee))[^\d\r\n]{0,20}(\d{3,5})/i;
  const feeMatch = englishDigitsText.match(feeRegex);
  if (feeMatch && feeMatch[1]) {
    const feeNum = parseInt(feeMatch[1], 10);
    if (!isNaN(feeNum) && feeNum >= 100 && feeNum <= 5000) {
      result.consultationFee = feeNum;
    }
  }

  return result;
}
