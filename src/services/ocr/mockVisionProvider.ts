import { IOCRProvider, OCROptions, OCRResponse } from './types';
import { extractStructuredDataFromText } from './structuredExtractor';

export class MockVisionOCRProvider implements IOCRProvider {
  name = 'Simulation (Offline Demo)';

  private mockCards = [
    `অধ্যাপক ডাঃ মুহাম্মদ রফিকুল ইসলাম
MBBS, FCPS (Medicine), MD (Cardiology)
বিএমডিসি রেজিঃ নং- A-28491
কার্ডিওলজিস্ট ও হৃদরোগ বিশেষজ্ঞ
ইবনে সিনা ডায়াগনস্টিক অ্যান্ড কনসালটেশন সেন্টার
ধানমন্ডি, ঢাকা
মোবাইলঃ 01711234567, 01819876543
রোগী দেখার সময়ঃ বিকাল ৫:০০ - রাত ৯:০০ (শুক্র বাদে)
ভিজিট ফিঃ ১০০০ টাকা`,

    `Dr. Farhana Ahmed
MBBS, DGO, MCPS (Obs & Gynae)
BMDC Reg. No. A-41209
Gynecologist & Obstetrician
Popular Diagnostic Centre Ltd.
Mirpur Branch, Dhaka
Serial Hotline: 01912345678
Visiting Hours: Sat, Mon, Wed 6:00 PM - 9:00 PM
Consultation Fee: 800/-`,

    `ডাঃ এ. কে. এম. মোস্তাফিজুর রহমান
এমবিবিএস (ঢাকা), বিসিএস (স্বাস্থ্য), এমডি (শিশু)
বিএমডিসি নংঃ ৫৬৩২১
নবজাতক ও শিশু বিশেষজ্ঞ
ল্যাবএইড স্পেশালাইজড হসপিটাল
সিরিয়ালঃ 01678901234
সময়ঃ প্রতিদিন সন্ধ্যা ৭টা - ১০টা`,
  ];

  async processImage(base64Image: string, options?: OCROptions): Promise<OCRResponse> {
    const startTime = Date.now();
    // Simulate slight processing delay (e.g. 600ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Deterministically pick one based on base64 length or hash
    const index = Math.abs(base64Image.length % this.mockCards.length);
    const rawText = this.mockCards[index];
    const structuredData = extractStructuredDataFromText(rawText);

    return {
      rawText,
      structuredData,
      provider: this.name,
      success: true,
      durationMs: Date.now() - startTime,
    };
  }
}

