import { PhotoType, SurveyStatus, SurveyType } from '../constants/surveyTypes';
export type { PhotoType, SurveyStatus, SurveyType };

export interface Doctor {
  id: string;
  name_bn: string | null;
  name_en: string | null;
  qualifications: string | null;
  specialization: string | null;
  bmdc_registration_number: string | null;
  primary_phone: string | null;
  additional_phones_json: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  name_bn: string | null;
  name_en: string | null;
  facility_type: string;
  address: string | null;
  division: string | null;
  district: string | null;
  upazila: string | null;
  contact_numbers_json: string | null;
  opening_hours_json: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_meters: number | null;
  location_captured_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorFacility {
  id: string;
  doctor_id: string;
  facility_id: string;
  visiting_days_json: string | null;
  visiting_start_time: string | null;
  visiting_end_time: string | null;
  appointment_phone: string | null;
  consultation_fee: number | null;
  verification_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface Survey {
  id: string;
  survey_type: SurveyType;
  doctor_id: string | null;
  facility_id: string | null;
  survey_date: string;
  status: SurveyStatus;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_meters: number | null;
  location_captured_at: string | null;
  address_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyPhoto {
  id: string;
  survey_id: string;
  photo_type: PhotoType;
  original_filename: string | null;
  mime_type: string | null;
  local_path: string;
  captured_at: string | null;
  width: number | null;
  height: number | null;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  raw_ocr_text: string | null;
  created_at: string;
}

export interface SurveyOCRResult {
  id: string;
  survey_id: string | null;
  photo_id: string | null;
  provider: string;
  raw_text: string;
  structured_result_json: string | null;
  processing_status: 'success' | 'failed';
  processed_at: string;
  error_message: string | null;
}

export interface SurveyFullRecord {
  survey: Survey;
  doctor?: Doctor | null;
  facility?: Facility | null;
  doctorFacility?: DoctorFacility | null;
  photos: SurveyPhoto[];
  ocrResults: SurveyOCRResult[];
}

export interface SurveySummaryItem {
  id: string;
  survey_type: SurveyType;
  doctor_name_bn: string | null;
  doctor_name_en: string | null;
  facility_name_bn: string | null;
  facility_name_en: string | null;
  survey_date: string;
  status: SurveyStatus;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_meters: number | null;
  photo_count: number;
  primary_photo_path: string | null;
  primary_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalSurveys: number;
  totalDoctors: number;
  totalFacilities: number;
  surveysToday: number;
  surveysWithOcr: number;
  surveysMissingGps: number;
  draftSurveys: number;
  completedSurveys: number;
}

export interface BackupImageItem {
  photoId: string;
  fileName: string;
  mimeType: string;
  encoding: 'base64';
  data: string;
}

export interface BackupPayload {
  format: 'doctor-survey-backup';
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  metadata?: {
    totalSurveys: number;
    totalDoctors: number;
    totalFacilities: number;
    totalPhotos: number;
    includesImages: boolean;
  };
  doctors: Doctor[];
  facilities: Facility[];
  doctorFacilities: DoctorFacility[];
  surveys: Survey[];
  surveyPhotos: SurveyPhoto[];
  ocrResults: SurveyOCRResult[];
  images?: BackupImageItem[];
}

export interface StructuredExtractedData {
  doctorNameBn?: string;
  doctorNameEn?: string;
  qualifications?: string;
  specialization?: string;
  bmdcNumber?: string;
  phones?: string[];
  facilityNameBn?: string;
  facilityNameEn?: string;
  facilityType?: SurveyType;
  address?: string;
  division?: string;
  district?: string;
  visitingDays?: string[];
  visitingStartTime?: string;
  visitingEndTime?: string;
  appointmentPhone?: string;
  consultationFee?: number;
  notes?: string;
}

export interface DuplicateMatch {
  recordType: 'doctor' | 'facility' | 'survey';
  id: string;
  title: string;
  subtitle?: string;
  matchType: 'phone' | 'bmdc' | 'name' | 'gps_proximity';
  reason: string;
  distanceMeters?: number;
}
