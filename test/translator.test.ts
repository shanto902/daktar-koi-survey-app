import test from 'node:test';
import assert from 'node:assert';
import {
  transliterateBanglaToEnglish,
  translateBanglaToEnglish,
} from '../src/services/translator/nameTranslator';

test('Doctor Name Bangla to English offline transliteration with medical titles', () => {
  assert.strictEqual(
    transliterateBanglaToEnglish('অধ্যাপক ডাঃ মুহাম্মদ রফিকুল ইসলাম'),
    'Prof. Dr. Muhammad Rafiqul Islam'
  );

  assert.strictEqual(
    transliterateBanglaToEnglish('ডাঃ মোঃ আনিসুর রহমান'),
    'Dr. Md. Anisur Rahman'
  );

  assert.strictEqual(
    transliterateBanglaToEnglish('ডাঃ তানজিলা আক্তার'),
    'Dr. Tanjila Akter'
  );

  assert.strictEqual(
    transliterateBanglaToEnglish('সহকারী অধ্যাপক ডাঃ ফয়সাল আহমেদ'),
    'Asst. Prof. Dr. Faisal Ahmed'
  );
});

test('Facility Name Bangla to English offline transliteration', () => {
  assert.strictEqual(
    transliterateBanglaToEnglish('ইবনে সিনা কনসালটেশন সেন্টার'),
    'Ibn Sina Consultation Centre'
  );

  assert.strictEqual(
    transliterateBanglaToEnglish('পপুলার ডায়াগনস্টিক সেন্টার'),
    'Popular Diagnostic Centre'
  );

  assert.strictEqual(
    transliterateBanglaToEnglish('ল্যাবএইড স্পেশালাইজড হাসপাতাল'),
    'Labaid Specialized Hospital'
  );
});

test('Async translation fallback returns non-empty result for Bangla text', async () => {
  const result = await translateBanglaToEnglish('ডাঃ কামরুল হাসান');
  assert.strictEqual(result, 'Dr. Kamrul Hasan');
});

