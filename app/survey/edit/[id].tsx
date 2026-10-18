import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { BANGLADESH_DIVISIONS, ALL_DISTRICTS } from '../../../src/constants/bangladeshGeo';
import { SURVEY_TYPES, SurveyStatus, SurveyType, WEEKDAYS } from '../../../src/constants/surveyTypes';
import { Header } from '../../../src/components/common/Header';
import { Button } from '../../../src/components/common/Button';
import { Input } from '../../../src/components/common/Input';
import { SelectModal, SelectOption } from '../../../src/components/common/SelectModal';
import { PhotoManager } from '../../../src/components/survey/PhotoManager';
import { LocationSection } from '../../../src/components/survey/LocationSection';
import { OcrReviewSection } from '../../../src/components/survey/OcrReviewSection';
import { useCameraCapture, StagedPhoto } from '../../../src/hooks/useCameraCapture';
import { useLocationCapture } from '../../../src/hooks/useLocationCapture';
import { useOCR } from '../../../src/hooks/useOCR';
import { surveyRepository } from '../../../src/database/repositories/surveyRepository';
import { generateUUID } from '../../../src/utils/uuid';
import { fileStorage } from '../../../src/services/storage/fileStorage';
import { extractStructuredDataFromText } from '../../../src/services/ocr/structuredExtractor';
import {
  Doctor,
  DoctorFacility,
  Facility,
  Survey,
  StructuredExtractedData,
  SurveyOCRResult,
} from '../../../src/types';

export default function EditSurveyScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [surveyType, setSurveyType] = useState<SurveyType>('Doctor');
  const [status, setStatus] = useState<SurveyStatus>('Completed');
  const [surveyTypeModalVisible, setSurveyTypeModalVisible] = useState(false);

  // OCR state
  const ocr = useOCR();
  const [savedOcrResults, setSavedOcrResults] = useState<SurveyOCRResult[]>([]);

  // Doctor Fields
  const [doctorNameBn, setDoctorNameBn] = useState('');
  const [doctorNameEn, setDoctorNameEn] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bmdcNumber, setBmdcNumber] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  // Facility Fields
  const [facilityNameBn, setFacilityNameBn] = useState('');
  const [facilityNameEn, setFacilityNameEn] = useState('');
  const [address, setAddress] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('');
  const [divisionModalVisible, setDivisionModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);

  // Chamber Schedule Fields
  const [visitingDays, setVisitingDays] = useState<string[]>([
    'Saturday',
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
  ]);
  const [visitingStartTime, setVisitingStartTime] = useState('');
  const [visitingEndTime, setVisitingEndTime] = useState('');
  const [appointmentPhone, setAppointmentPhone] = useState('');
  const [consultationFee, setConsultationFee] = useState('');

  // Survey Notes
  const [surveyNotes, setSurveyNotes] = useState('');

  // Original record IDs for foreign keys
  const [originalDoctorId, setOriginalDoctorId] = useState<string | null>(null);
  const [originalFacilityId, setOriginalFacilityId] = useState<string | null>(null);
  const [originalDoctorFacilityId, setOriginalDoctorFacilityId] = useState<string | null>(null);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string>(new Date().toISOString());

  // Camera & Location hooks
  const camera = useCameraCapture(id || generateUUID());
  const location = useLocationCapture();
  const { setPhotos } = camera;
  const { setLocation } = location;
  const { setSavedResponse } = ocr;

  // Load existing survey record
  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const record = await surveyRepository.getFullRecord(id);
        if (record) {
          const { survey, doctor, facility, doctorFacility, photos, ocrResults } = record;

          setSurveyType(survey.survey_type);
          setStatus(survey.status);
          setSurveyNotes(survey.notes || '');
          setOriginalCreatedAt(survey.created_at);
          setOriginalDoctorId(survey.doctor_id);
          setOriginalFacilityId(survey.facility_id);

          // Restore OCR Results from draft
          if (ocrResults && ocrResults.length > 0) {
            setSavedOcrResults(ocrResults);
            const latestOcr = ocrResults[0];
            let structured: StructuredExtractedData = {};
            if (latestOcr.structured_result_json) {
              try {
                structured = JSON.parse(latestOcr.structured_result_json);
              } catch {
                structured = extractStructuredDataFromText(latestOcr.raw_text);
              }
            } else if (latestOcr.raw_text) {
              structured = extractStructuredDataFromText(latestOcr.raw_text);
            }
            setSavedResponse({
              rawText: latestOcr.raw_text,
              structuredData: structured,
              provider: latestOcr.provider || 'Saved OCR',
              success: latestOcr.processing_status === 'success',
              errorMessage: latestOcr.error_message || undefined,
              durationMs: 0,
            });
          } else {
            // Check if any photo had raw_ocr_text saved
            const photoWithOcr = photos.find((p) => p.raw_ocr_text);
            if (photoWithOcr && photoWithOcr.raw_ocr_text) {
              const structured = extractStructuredDataFromText(photoWithOcr.raw_ocr_text);
              setSavedResponse({
                rawText: photoWithOcr.raw_ocr_text,
                structuredData: structured,
                provider: 'Photo OCR',
                success: true,
                durationMs: 0,
              });
            }
          }

          // Doctor details
          if (doctor) {
            setDoctorNameBn(doctor.name_bn || '');
            setDoctorNameEn(doctor.name_en || '');
            setQualifications(doctor.qualifications || '');
            setSpecialization(doctor.specialization || '');
            setBmdcNumber(doctor.bmdc_registration_number || '');
            setPrimaryPhone(doctor.primary_phone || '');
            setDoctorNotes(doctor.notes || '');

            if (doctor.additional_phones_json) {
              try {
                const list = JSON.parse(doctor.additional_phones_json);
                setAdditionalPhones(Array.isArray(list) ? list.join(', ') : '');
              } catch {}
            }
          }

          // Facility details
          if (facility) {
            setFacilityNameBn(facility.name_bn || '');
            setFacilityNameEn(facility.name_en || '');
            setAddress(facility.address || '');
            if (facility.division) setDivision(facility.division);
            if (facility.district) setDistrict(facility.district);
            setUpazila(facility.upazila || '');
          }

          // DoctorFacility relation
          if (doctorFacility) {
            setOriginalDoctorFacilityId(doctorFacility.id);
            setVisitingStartTime(doctorFacility.visiting_start_time || '');
            setVisitingEndTime(doctorFacility.visiting_end_time || '');
            setAppointmentPhone(doctorFacility.appointment_phone || '');
            if (doctorFacility.consultation_fee !== null) {
              setConsultationFee(String(doctorFacility.consultation_fee));
            }
            if (doctorFacility.visiting_days_json) {
              try {
                const days = JSON.parse(doctorFacility.visiting_days_json);
                if (Array.isArray(days)) setVisitingDays(days);
              } catch {}
            }
          }

          // GPS
          if (survey.latitude !== null && survey.longitude !== null) {
            setLocation({
              latitude: survey.latitude,
              longitude: survey.longitude,
              accuracy: survey.gps_accuracy_meters,
              timestamp: survey.location_captured_at || survey.created_at,
              isAccurate: survey.gps_accuracy_meters !== null && survey.gps_accuracy_meters <= 30,
            });
          }

          // Existing photos
          const staged: StagedPhoto[] = photos.map((p) => ({
            ...p,
            previewUri: fileStorage.resolveUri(p.local_path),
          }));
          setPhotos(staged);
        }
      } catch (err: any) {
        Alert.alert('Load Error', err?.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, setPhotos, setLocation, setSavedResponse]);

  const toggleWeekday = (day: string) => {
    setVisitingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Run OCR on a photo in edit mode
  const handleRunOCR = async (photo: StagedPhoto) => {
    const result = await ocr.runOCR(photo.local_path);
    if (result && result.success) {
      camera.updatePhotoOCR(photo.id, 'completed', result.rawText);
    } else {
      camera.updatePhotoOCR(photo.id, 'failed', '');
      if (result?.errorMessage) {
        Alert.alert(
          'OCR Setup Required',
          result.errorMessage,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => router.push('/(tabs)/settings' as any),
            },
          ]
        );
      }
    }
  };

  // Populate structured fields from OCR in edit mode
  const handleApplyOcrFields = (data: StructuredExtractedData) => {
    if (data.doctorNameBn) setDoctorNameBn(data.doctorNameBn);
    if (data.doctorNameEn) setDoctorNameEn(data.doctorNameEn);
    if (data.qualifications) setQualifications(data.qualifications);
    if (data.specialization) setSpecialization(data.specialization);
    if (data.bmdcNumber) setBmdcNumber(data.bmdcNumber);
    if (data.phones && data.phones.length > 0) {
      setPrimaryPhone(data.phones[0]);
      if (data.phones.length > 1) {
        setAdditionalPhones(data.phones.slice(1).join(', '));
      }
    }
    if (data.facilityNameBn) setFacilityNameBn(data.facilityNameBn);
    if (data.facilityNameEn) setFacilityNameEn(data.facilityNameEn);
    if (data.address) setAddress(data.address);
    if (data.appointmentPhone) setAppointmentPhone(data.appointmentPhone);
    if (data.visitingStartTime) setVisitingStartTime(data.visitingStartTime);
    if (data.consultationFee) setConsultationFee(String(data.consultationFee));
    if (data.visitingDays && data.visitingDays.length > 0) setVisitingDays(data.visitingDays);

    Alert.alert('Fields Applied', 'Extracted OCR fields have been populated into the form. Please review and adjust as needed.');
  };

  // Assign single field from Line Mapper or quick chip
  const handleAssignSingleField = (fieldKey: string, value: string) => {
    const cleanVal = value.trim();
    switch (fieldKey) {
      case 'doctorNameBn':
        setDoctorNameBn(cleanVal);
        break;
      case 'doctorNameEn':
        setDoctorNameEn(cleanVal);
        break;
      case 'qualifications':
        setQualifications(cleanVal);
        break;
      case 'specialization':
        setSpecialization(cleanVal);
        break;
      case 'bmdcNumber':
        setBmdcNumber(cleanVal);
        break;
      case 'phone':
        setPrimaryPhone(cleanVal);
        break;
      case 'facilityNameBn':
        setFacilityNameBn(cleanVal);
        break;
      case 'facilityNameEn':
        setFacilityNameEn(cleanVal);
        break;
      case 'address':
        setAddress(cleanVal);
        break;
      case 'visitingStartTime':
        setVisitingStartTime(cleanVal);
        break;
      case 'consultationFee':
        const digits = cleanVal.replace(/[^0-9]/g, '');
        setConsultationFee(digits || cleanVal);
        break;
      case 'doctorNotes':
        setDoctorNotes((prev) => (prev ? `${prev}\n${cleanVal}` : cleanVal));
        break;
    }
  };

  const handleUpdate = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      const now = new Date().toISOString();

      const docId = originalDoctorId || generateUUID();
      const facId = originalFacilityId || generateUUID();
      const dfId = originalDoctorFacilityId || generateUUID();

      const extraPhones = additionalPhones
        ? additionalPhones
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
        : [];

      // 1. Doctor
      const doctorRecord: Doctor = {
        id: docId,
        name_bn: doctorNameBn.trim() || null,
        name_en: doctorNameEn.trim() || null,
        qualifications: qualifications.trim() || null,
        specialization: specialization.trim() || null,
        bmdc_registration_number: bmdcNumber.trim() || null,
        primary_phone: primaryPhone.trim() || null,
        additional_phones_json: extraPhones.length > 0 ? JSON.stringify(extraPhones) : null,
        notes: doctorNotes.trim() || null,
        created_at: originalCreatedAt,
        updated_at: now,
      };

      // 2. Facility
      const facilityRecord: Facility = {
        id: facId,
        name_bn: facilityNameBn.trim() || null,
        name_en: facilityNameEn.trim() || null,
        facility_type: surveyType,
        address: address.trim() || null,
        division: division || null,
        district: district || null,
        upazila: upazila.trim() || null,
        contact_numbers_json: primaryPhone ? JSON.stringify([primaryPhone]) : null,
        opening_hours_json: visitingStartTime ? JSON.stringify({ visitingStartTime, visitingEndTime }) : null,
        latitude: location.location?.latitude ?? null,
        longitude: location.location?.longitude ?? null,
        gps_accuracy_meters: location.location?.accuracy ?? null,
        location_captured_at: location.location?.timestamp ?? null,
        created_at: originalCreatedAt,
        updated_at: now,
      };

      // 3. DoctorFacility
      const feeNumber = consultationFee ? parseFloat(consultationFee) : null;
      const doctorFacilityRecord: DoctorFacility = {
        id: dfId,
        doctor_id: docId,
        facility_id: facId,
        visiting_days_json: JSON.stringify(visitingDays),
        visiting_start_time: visitingStartTime.trim() || null,
        visiting_end_time: visitingEndTime.trim() || null,
        appointment_phone: appointmentPhone.trim() || primaryPhone.trim() || null,
        consultation_fee: isNaN(feeNumber as number) ? null : feeNumber,
        verification_status: status === 'Completed' ? 'Verified' : 'Pending',
        created_at: originalCreatedAt,
        updated_at: now,
      };

      // 4. Survey
      const surveyRecord: Survey = {
        id,
        survey_type: surveyType,
        doctor_id: docId,
        facility_id: facId,
        survey_date: originalCreatedAt.slice(0, 10),
        status,
        latitude: location.location?.latitude ?? null,
        longitude: location.location?.longitude ?? null,
        gps_accuracy_meters: location.location?.accuracy ?? null,
        location_captured_at: location.location?.timestamp ?? null,
        address_notes: address.trim() || null,
        notes: surveyNotes.trim() || null,
        created_at: originalCreatedAt,
        updated_at: now,
      };

      // 5. OCR results preservation
      const ocrResultsToSave: SurveyOCRResult[] = [];
      if (ocr.lastResponse && ocr.lastResponse.rawText) {
        ocrResultsToSave.push({
          id: savedOcrResults.length > 0 ? savedOcrResults[0].id : generateUUID(),
          survey_id: id,
          photo_id: camera.photos.length > 0 ? camera.photos[0].id : null,
          provider: ocr.lastResponse.provider,
          raw_text: ocr.lastResponse.rawText,
          structured_result_json: JSON.stringify(ocr.lastResponse.structuredData),
          processing_status: ocr.lastResponse.success ? 'success' : 'failed',
          processed_at: now,
          error_message: ocr.lastResponse.errorMessage ?? null,
        });
      } else if (savedOcrResults.length > 0) {
        ocrResultsToSave.push(...savedOcrResults);
      }

      // Ensure photos with raw_ocr_text are indexed
      camera.photos.forEach((photo) => {
        if (photo.raw_ocr_text && !ocrResultsToSave.some((o) => o.photo_id === photo.id)) {
          ocrResultsToSave.push({
            id: generateUUID(),
            survey_id: id,
            photo_id: photo.id,
            provider: ocr.lastResponse?.provider || 'Photo OCR',
            raw_text: photo.raw_ocr_text,
            structured_result_json: JSON.stringify(extractStructuredDataFromText(photo.raw_ocr_text)),
            processing_status: 'success',
            processed_at: now,
            error_message: null,
          });
        }
      });

      await surveyRepository.saveCompleteSurvey({
        survey: surveyRecord,
        doctor: doctorRecord,
        facility: facilityRecord,
        doctorFacility: doctorFacilityRecord,
        photos: camera.photos,
        ocrResults: ocrResultsToSave,
      });

      Alert.alert('Survey Updated', 'All edits saved successfully to local storage.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const surveyTypeOptions: SelectOption[] = SURVEY_TYPES.map((t) => ({
    label: t.label,
    labelBn: t.labelBn,
    value: t.value,
    icon: t.icon as any,
  }));

  const divisionOptions: SelectOption[] = BANGLADESH_DIVISIONS.map((d) => ({
    label: d.nameEn,
    labelBn: d.nameBn,
    value: d.nameEn,
  }));

  const districtOptions: SelectOption[] = ALL_DISTRICTS.map((d) => ({
    label: d.nameEn,
    labelBn: d.nameBn,
    value: d.nameEn,
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <Header title="Edit Survey" onBack={() => router.back()} />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Loading survey for editing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Edit Survey Record" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
        >
          {/* Survey Type & Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Survey Type & Status</Text>

            <TouchableOpacity
              onPress={() => setSurveyTypeModalVisible(true)}
              style={styles.selectRow}
            >
              <Text style={styles.selectValue}>{surveyType}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.statusToggleRow}>
              {(['Completed', 'Draft', 'Needs Review'] as SurveyStatus[]).map((st) => {
                const active = status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setStatus(st)}
                    style={[styles.statusChip, active && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Photo Manager (Preserves existing photos!) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Survey Photographs</Text>
            <PhotoManager
              photos={camera.photos}
              onCapture={(type) => camera.capturePhoto(type)}
              onPick={(type) => camera.pickFromGallery(type)}
              onRemove={(id) => camera.removePhoto(id)}
              onUpdateType={(id, type) => camera.updatePhotoType(id, type)}
              onRunOCR={handleRunOCR}
              isCapturing={camera.isCapturing}
            />

            {/* OCR Review & Suggested Fields */}
            <OcrReviewSection
              ocrResponse={ocr.lastResponse}
              isProcessing={ocr.isProcessing}
              onApplyFields={handleApplyOcrFields}
              onAssignField={handleAssignSingleField}
              onRetry={() => {
                if (camera.photos.length > 0) {
                  handleRunOCR(camera.photos[0]);
                }
              }}
              hasUserEditedFields={true}
            />
          </View>

          {/* Location Coordinates */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>GPS Coordinates</Text>
            <LocationSection
              location={location.location}
              isCapturing={location.isCapturing}
              error={location.error}
              onCapture={location.captureLocation}
              onClear={location.clearLocation}
            />
          </View>

          {/* Doctor Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Doctor Information</Text>
            <Input
              label="Doctor Name (বাংলা)"
              value={doctorNameBn}
              onChangeText={setDoctorNameBn}
              ocrSuggestion={ocr.structuredData?.doctorNameBn}
            />
            <Input
              label="Doctor Name (English)"
              value={doctorNameEn}
              onChangeText={setDoctorNameEn}
              ocrSuggestion={ocr.structuredData?.doctorNameEn}
            />
            <Input
              label="Qualifications"
              value={qualifications}
              onChangeText={setQualifications}
              ocrSuggestion={ocr.structuredData?.qualifications}
              multiline
            />
            <Input
              label="Specialization"
              value={specialization}
              onChangeText={setSpecialization}
              ocrSuggestion={ocr.structuredData?.specialization}
            />
            <Input
              label="BMDC Registration Number"
              value={bmdcNumber}
              onChangeText={setBmdcNumber}
              ocrSuggestion={ocr.structuredData?.bmdcNumber}
              autoCapitalize="characters"
            />
            <Input
              label="Primary Phone"
              value={primaryPhone}
              onChangeText={setPrimaryPhone}
              ocrSuggestion={ocr.structuredData?.phones?.[0]}
              keyboardType="phone-pad"
            />
            <Input
              label="Additional Phones"
              value={additionalPhones}
              onChangeText={setAdditionalPhones}
              ocrSuggestion={ocr.structuredData?.phones && ocr.structuredData.phones.length > 1 ? ocr.structuredData.phones.slice(1).join(', ') : null}
              keyboardType="phone-pad"
            />
            <Input
              label="Doctor Notes"
              value={doctorNotes}
              onChangeText={setDoctorNotes}
              multiline
            />
          </View>

          {/* Facility Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Facility & Address</Text>
            <Input
              label="Facility Name (বাংলা)"
              value={facilityNameBn}
              onChangeText={setFacilityNameBn}
              ocrSuggestion={ocr.structuredData?.facilityNameBn}
            />
            <Input
              label="Facility Name (English)"
              value={facilityNameEn}
              onChangeText={setFacilityNameEn}
              ocrSuggestion={ocr.structuredData?.facilityNameEn}
            />
            <Input
              label="Street Address"
              value={address}
              onChangeText={setAddress}
              ocrSuggestion={ocr.structuredData?.address}
              multiline
            />

            <Text style={styles.fieldLabel}>Division</Text>
            <TouchableOpacity
              onPress={() => setDivisionModalVisible(true)}
              style={styles.selectRow}
            >
              <Text style={styles.selectValue}>{division}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>District</Text>
            <TouchableOpacity
              onPress={() => setDistrictModalVisible(true)}
              style={styles.selectRow}
            >
              <Text style={styles.selectValue}>{district}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <View style={{ height: 12 }} />
            <Input
              label="Upazila / Police Station"
              value={upazila}
              onChangeText={setUpazila}
            />
          </View>

          {/* Chamber Schedule */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chamber Schedule</Text>

            <Text style={styles.fieldLabel}>Visiting Days</Text>
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((w) => {
                const selected = visitingDays.includes(w.en);
                return (
                  <TouchableOpacity
                    key={w.en}
                    onPress={() => toggleWeekday(w.en)}
                    style={[styles.weekdayChip, selected && styles.weekdayChipSelected]}
                  >
                    <Text
                      style={[
                        styles.weekdayChipText,
                        selected && styles.weekdayChipTextSelected,
                      ]}
                    >
                      {w.shortEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Visiting Hours"
              value={visitingStartTime}
              onChangeText={setVisitingStartTime}
              ocrSuggestion={ocr.structuredData?.visitingStartTime}
            />
            <Input
              label="Serial Phone"
              value={appointmentPhone}
              onChangeText={setAppointmentPhone}
              ocrSuggestion={ocr.structuredData?.appointmentPhone || (ocr.structuredData?.phones && ocr.structuredData.phones.length > 1 ? ocr.structuredData.phones[1] : undefined)}
              keyboardType="phone-pad"
            />
            <Input
              label="Consultation Fee (BDT)"
              value={consultationFee}
              onChangeText={setConsultationFee}
              ocrSuggestion={ocr.structuredData?.consultationFee ? String(ocr.structuredData.consultationFee) : undefined}
              keyboardType="numeric"
            />
          </View>

          {/* Field Survey Notes */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Field Notes</Text>
            <Input
              value={surveyNotes}
              onChangeText={setSurveyNotes}
              multiline
            />
          </View>

          {/* Save Edits Button */}
          <Button
            title="Save Survey Changes"
            onPress={handleUpdate}
            variant="primary"
            size="lg"
            loading={isSaving}
            style={{ marginBottom: 30 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Select Modals */}
      <SelectModal
        visible={surveyTypeModalVisible}
        title="Select Survey Type"
        options={surveyTypeOptions}
        selectedValue={surveyType}
        onSelect={(opt) => setSurveyType(opt.value as SurveyType)}
        onClose={() => setSurveyTypeModalVisible(false)}
        searchable={false}
      />

      <SelectModal
        visible={divisionModalVisible}
        title="Select Division"
        options={divisionOptions}
        selectedValue={division}
        onSelect={(opt) => setDivision(opt.value)}
        onClose={() => setDivisionModalVisible(false)}
        searchable={false}
      />

      <SelectModal
        visible={districtModalVisible}
        title="Select District"
        options={districtOptions}
        selectedValue={district}
        onSelect={(opt) => setDistrict(opt.value)}
        onClose={() => setDistrictModalVisible(false)}
        searchable
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  selectValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  statusToggleRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statusChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  weekdaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  weekdayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginRight: 6,
    marginBottom: 6,
  },
  weekdayChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  weekdayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  weekdayChipTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});

