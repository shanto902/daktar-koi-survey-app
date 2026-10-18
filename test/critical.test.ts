import test from 'node:test';
import assert from 'node:assert';
import {
  convertBengaliDigitsToEnglish,
  normalizeBdPhoneNumber,
  extractStructuredDataFromText,
} from '../src/services/ocr/structuredExtractor';
import { calculateHaversineDistance } from '../src/utils/geo';
import { validateBackupPayload } from '../src/utils/backupValidation';
import { generateUUID } from '../src/utils/uuid';

test('Bengali digits conversion to English digits', () => {
  assert.strictEqual(convertBengaliDigitsToEnglish('০১৭৯৮৭৬৫৪৩২'), '01798765432');
  assert.strictEqual(convertBengaliDigitsToEnglish('ফিঃ ১০০০ টাকা'), 'ফিঃ 1000 টাকা');
  assert.strictEqual(convertBengaliDigitsToEnglish('রেজি নং- ১২৩৪৫'), 'রেজি নং- 12345');
});

test('Bangladeshi phone normalization', () => {
  assert.strictEqual(normalizeBdPhoneNumber('+8801711234567'), '01711234567');
  assert.strictEqual(normalizeBdPhoneNumber('01819-876543'), '01819876543');
  assert.strictEqual(normalizeBdPhoneNumber('+88 019 1234 5678'), '01912345678');
  assert.strictEqual(normalizeBdPhoneNumber('০১৭৯৮৭৬৫৪৩২'), '01798765432');
});

test('Structured extraction from Bangla doctor visiting card text', () => {
  const sampleCard = `
    অধ্যাপক ডাঃ মুহাম্মদ রফিকুল ইসলাম
    MBBS, FCPS (Medicine), MD (Cardiology)
    বিএমডিসি রেজিঃ নং- A-28491
    কার্ডিওলজিস্ট ও হৃদরোগ বিশেষজ্ঞ
    ইবনে সিনা ডায়াগনস্টিক অ্যান্ড কনসালটেশন সেন্টার
    সিরিয়ালঃ 01711234567, 01819876543
    সময়ঃ বিকাল ৫টা - রাত ৯টা (শুক্র বাদে)
    ফি: ১০০০ টাকা
  `;

  const extracted = extractStructuredDataFromText(sampleCard);

  assert.ok(extracted.doctorNameBn?.includes('মুহাম্মদ রফিকুল ইসলাম'));
  assert.ok(extracted.qualifications?.includes('MBBS'));
  assert.strictEqual(extracted.bmdcNumber, 'A-28491');
  assert.strictEqual(extracted.phones?.length, 2);
  assert.strictEqual(extracted.phones?.[0], '01711234567');
  assert.strictEqual(extracted.phones?.[1], '01819876543');
  assert.strictEqual(extracted.appointmentPhone, '01711234567');
  assert.ok(extracted.facilityNameBn?.includes('ইবনে সিনা'));
  assert.ok(extracted.specialization?.includes('Cardiology'));
  assert.strictEqual(extracted.consultationFee, 1000);
});

test('Structured extraction from English clinic signboard', () => {
  const sampleSignboard = `
    Popular Diagnostic Centre Ltd.
    Dr. Farhana Ahmed
    MBBS, DGO, MCPS
    BMDC Reg. A-41209
    Serial: 01912345678
    Fee: 800
  `;

  const extracted = extractStructuredDataFromText(sampleSignboard);

  assert.ok(extracted.doctorNameEn?.includes('Dr. Farhana Ahmed'));
  assert.strictEqual(extracted.bmdcNumber, 'A-41209');
  assert.strictEqual(extracted.appointmentPhone, '01912345678');
  assert.strictEqual(extracted.consultationFee, 800);
});

test('Haversine distance calculation in meters', () => {
  // Dhanmondi (23.7465, 90.3760) to Mirpur (23.8041, 90.3667) is ~6.5 km
  const dist = calculateHaversineDistance(23.7465, 90.376, 23.8041, 90.3667);
  assert.ok(dist > 6000 && dist < 7000, `Expected ~6.5km but got ${dist}m`);

  // Two nearby points 40 meters apart
  const nearby = calculateHaversineDistance(23.7465, 90.376, 23.7468, 90.3762);
  assert.ok(nearby < 60, `Expected <60m but got ${nearby}m`);
});

test('Backup payload validation', () => {
  const validPayload = {
    format: 'doctor-survey-backup',
    formatVersion: 1,
    surveys: [],
    doctors: [],
    facilities: [],
  };
  assert.strictEqual(validateBackupPayload(validPayload).valid, true);

  const invalidFormat = {
    format: 'unsupported-format',
    surveys: [],
  };
  assert.strictEqual(validateBackupPayload(invalidFormat).valid, false);

  const missingSurveys = {
    format: 'doctor-survey-backup',
  };
  assert.strictEqual(validateBackupPayload(missingSurveys).valid, false);
});

test('UUID generation generates unique RFC4122 strings', () => {
  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const id = generateUUID();
    assert.strictEqual(typeof id, 'string');
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    ids.add(id);
  }
  assert.strictEqual(ids.size, 100);
});

test('Base64 image encoding and decoding preserves binary data exactly', () => {
  // Simulate synthetic binary buffer representing an image (JPEG header: FF D8 FF E0 ...)
  const sampleBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01]);
  const base64String = sampleBytes.toString('base64');
  const decodedBytes = Buffer.from(base64String, 'base64');

  assert.strictEqual(decodedBytes.length, sampleBytes.length);
  assert.ok(decodedBytes.equals(sampleBytes), 'Decoded buffer must match original binary bytes');
});

test('Bangla Unicode text is preserved without character corruption through JSON stringify and parse', () => {
  const banglaDoctor = {
    nameBn: 'অধ্যাপক ডাঃ মুহাম্মদ রফিকুল ইসলাম',
    qualifications: 'এফসিপিএস (মেডিসিন), এমডি (কার্ডিওলজি)',
    chamber: 'ইবনে সিনা কনসালটেশন সেন্টার, ধানমন্ডি, ঢাকা',
    address: 'বাড়ি নং- ৪৮, রোড নং- ৯/এ, ধানমন্ডি',
  };

  const serialized = JSON.stringify(banglaDoctor);
  const deserialized = JSON.parse(serialized);

  assert.strictEqual(deserialized.nameBn, banglaDoctor.nameBn);
  assert.strictEqual(deserialized.qualifications, banglaDoctor.qualifications);
  assert.strictEqual(deserialized.chamber, banglaDoctor.chamber);
  assert.strictEqual(deserialized.address, banglaDoctor.address);
});
