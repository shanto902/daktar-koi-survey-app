import { fileStorage } from '../storage/fileStorage';
import { Doctor, DoctorFacility, Facility, Survey, SurveyPhoto } from '../../types';

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

function arrayToCSV(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const rowLines = rows.map((r) => r.map(escapeCSV).join(','));
  // UTF-8 BOM (\uFEFF) ensures Excel displays Bangla script properly
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

export const csvExporter = {
  async exportDoctors(doctors: Doctor[]): Promise<string> {
    const headers = [
      'ID',
      'Name (Bangla)',
      'Name (English)',
      'Qualifications',
      'Specialization',
      'BMDC Reg No',
      'Primary Phone',
      'Additional Phones',
      'Notes',
      'Created At',
      'Updated At',
    ];
    const rows = doctors.map((d) => [
      d.id,
      d.name_bn,
      d.name_en,
      d.qualifications,
      d.specialization,
      d.bmdc_registration_number,
      d.primary_phone,
      d.additional_phones_json,
      d.notes,
      d.created_at,
      d.updated_at,
    ]);
    const csv = arrayToCSV(headers, rows);
    return await fileStorage.saveExportFile(`doctors_${Date.now()}.csv`, csv);
  },

  async exportFacilities(facilities: Facility[]): Promise<string> {
    const headers = [
      'ID',
      'Name (Bangla)',
      'Name (English)',
      'Facility Type',
      'Address',
      'Division',
      'District',
      'Upazila',
      'Contact Numbers',
      'Opening Hours',
      'Latitude',
      'Longitude',
      'GPS Accuracy (m)',
      'Location Captured At',
      'Created At',
      'Updated At',
    ];
    const rows = facilities.map((f) => [
      f.id,
      f.name_bn,
      f.name_en,
      f.facility_type,
      f.address,
      f.division,
      f.district,
      f.upazila,
      f.contact_numbers_json,
      f.opening_hours_json,
      f.latitude,
      f.longitude,
      f.gps_accuracy_meters,
      f.location_captured_at,
      f.created_at,
      f.updated_at,
    ]);
    const csv = arrayToCSV(headers, rows);
    return await fileStorage.saveExportFile(`facilities_${Date.now()}.csv`, csv);
  },

  async exportDoctorFacilities(relations: DoctorFacility[]): Promise<string> {
    const headers = [
      'ID',
      'Doctor ID',
      'Facility ID',
      'Visiting Days',
      'Visiting Start Time',
      'Visiting End Time',
      'Appointment Phone',
      'Consultation Fee (BDT)',
      'Verification Status',
      'Created At',
      'Updated At',
    ];
    const rows = relations.map((r) => [
      r.id,
      r.doctor_id,
      r.facility_id,
      r.visiting_days_json,
      r.visiting_start_time,
      r.visiting_end_time,
      r.appointment_phone,
      r.consultation_fee,
      r.verification_status,
      r.created_at,
      r.updated_at,
    ]);
    const csv = arrayToCSV(headers, rows);
    return await fileStorage.saveExportFile(`doctor_facilities_${Date.now()}.csv`, csv);
  },

  async exportSurveys(surveys: Survey[]): Promise<string> {
    const headers = [
      'ID',
      'Survey Type',
      'Doctor ID',
      'Facility ID',
      'Survey Date',
      'Status',
      'Latitude',
      'Longitude',
      'GPS Accuracy (m)',
      'Location Captured At',
      'Address Notes',
      'Notes',
      'Created At',
      'Updated At',
    ];
    const rows = surveys.map((s) => [
      s.id,
      s.survey_type,
      s.doctor_id,
      s.facility_id,
      s.survey_date,
      s.status,
      s.latitude,
      s.longitude,
      s.gps_accuracy_meters,
      s.location_captured_at,
      s.address_notes,
      s.notes,
      s.created_at,
      s.updated_at,
    ]);
    const csv = arrayToCSV(headers, rows);
    return await fileStorage.saveExportFile(`surveys_${Date.now()}.csv`, csv);
  },

  async exportPhotos(photos: SurveyPhoto[]): Promise<string> {
    const headers = [
      'ID',
      'Survey ID',
      'Photo Type',
      'Original Filename',
      'MIME Type',
      'Local Path',
      'Captured At',
      'Width',
      'Height',
      'OCR Status',
      'Created At',
    ];
    const rows = photos.map((p) => [
      p.id,
      p.survey_id,
      p.photo_type,
      p.original_filename,
      p.mime_type,
      p.local_path,
      p.captured_at,
      p.width,
      p.height,
      p.ocr_status,
      p.created_at,
    ]);
    const csv = arrayToCSV(headers, rows);
    return await fileStorage.saveExportFile(`survey_photos_${Date.now()}.csv`, csv);
  },
};

