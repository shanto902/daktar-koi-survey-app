import { doctorRepository } from '../../database/repositories/doctorRepository';
import { facilityRepository } from '../../database/repositories/facilityRepository';
import { surveyRepository } from '../../database/repositories/surveyRepository';
import { locationService } from '../location/locationService';
import { normalizeBdPhoneNumber } from '../ocr/structuredExtractor';
import { DuplicateMatch } from '../../types';

export interface DuplicateCheckInput {
  doctorName?: string;
  facilityName?: string;
  phone?: string;
  bmdcNumber?: string;
  latitude?: number | null;
  longitude?: number | null;
  excludeSurveyId?: string;
}

export const duplicateDetector = {
  async checkForDuplicates(input: DuplicateCheckInput): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    // 1. Phone Match
    if (input.phone && input.phone.trim().length >= 8) {
      const normalized = normalizeBdPhoneNumber(input.phone);
      if (normalized.length >= 10) {
        const matchedDoc = await doctorRepository.findByPhone(normalized);
        if (matchedDoc) {
          matches.push({
            recordType: 'doctor',
            id: matchedDoc.id,
            title: matchedDoc.name_bn || matchedDoc.name_en || 'Doctor',
            subtitle: `Phone match: ${matchedDoc.primary_phone}`,
            matchType: 'phone',
            reason: `Doctor with phone ${matchedDoc.primary_phone} already exists in database.`,
          });
        }
      }
    }

    // 2. BMDC Registration Number Match
    if (input.bmdcNumber && input.bmdcNumber.trim().length >= 3) {
      const cleanBmdc = input.bmdcNumber.trim();
      const matchedDoc = await doctorRepository.findByBMDC(cleanBmdc);
      if (matchedDoc && !matches.some((m) => m.id === matchedDoc.id)) {
        matches.push({
          recordType: 'doctor',
          id: matchedDoc.id,
          title: matchedDoc.name_bn || matchedDoc.name_en || 'Doctor',
          subtitle: `BMDC: ${matchedDoc.bmdc_registration_number}`,
          matchType: 'bmdc',
          reason: `Doctor with BMDC number ${matchedDoc.bmdc_registration_number} already exists.`,
        });
      }
    }

    // 3. Doctor Name Match
    if (input.doctorName && input.doctorName.trim().length >= 4) {
      const cleanName = input.doctorName.replace(/^(?:ডাঃ|ডাক্তার|Dr\.|Prof\.)\s*/i, '').trim();
      if (cleanName.length >= 3) {
        const candidateDocs = await doctorRepository.search(cleanName);
        for (const doc of candidateDocs) {
          if (!matches.some((m) => m.id === doc.id)) {
            matches.push({
              recordType: 'doctor',
              id: doc.id,
              title: doc.name_bn || doc.name_en || 'Doctor',
              subtitle: doc.specialization || undefined,
              matchType: 'name',
              reason: `Existing doctor has a similar name: "${doc.name_bn || doc.name_en}".`,
            });
            break; // limit to 1 doctor name match to avoid flooding
          }
        }
      }
    }

    // 4. Facility Name Match
    if (input.facilityName && input.facilityName.trim().length >= 4) {
      const cleanName = input.facilityName.trim();
      const matchedFacility = await facilityRepository.findByName(cleanName);
      if (matchedFacility) {
        matches.push({
          recordType: 'facility',
          id: matchedFacility.id,
          title: matchedFacility.name_bn || matchedFacility.name_en || 'Facility',
          subtitle: matchedFacility.address || matchedFacility.facility_type,
          matchType: 'name',
          reason: `Facility "${matchedFacility.name_bn || matchedFacility.name_en}" already exists.`,
        });
      }
    }

    // 5. GPS Proximity Match (within 100 meters)
    if (input.latitude != null && input.longitude != null) {
      const allSurveys = await surveyRepository.getForMap();
      for (const s of allSurveys) {
        if (s.id === input.excludeSurveyId) continue;
        const distance = locationService.calculateDistanceMeters(
          input.latitude,
          input.longitude,
          s.latitude,
          s.longitude
        );

        if (distance <= 100) {
          matches.push({
            recordType: 'survey',
            id: s.id,
            title: s.facility_name || s.doctor_name || `${s.survey_type} Survey`,
            subtitle: `${distance} meters away (${s.address || 'nearby'})`,
            matchType: 'gps_proximity',
            reason: `Existing survey record is only ${distance}m away.`,
            distanceMeters: distance,
          });
          if (matches.filter((m) => m.matchType === 'gps_proximity').length >= 2) {
            break;
          }
        }
      }
    }

    return matches;
  },
};

