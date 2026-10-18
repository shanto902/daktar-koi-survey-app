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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { BANGLADESH_DIVISIONS, ALL_DISTRICTS } from '../../src/constants/bangladeshGeo';
import {
  SURVEY_TYPES,
  SurveyType,
  WEEKDAYS,
} from '../../src/constants/surveyTypes';
import { Header } from '../../src/components/common/Header';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { SelectModal, SelectOption } from '../../src/components/common/SelectModal';
import { PhotoManager } from '../../src/components/survey/PhotoManager';
import { LocationSection } from '../../src/components/survey/LocationSection';
import { OcrReviewSection } from '../../src/components/survey/OcrReviewSection';
import { DuplicateAlert } from '../../src/components/survey/DuplicateAlert';
import { useCameraCapture, StagedPhoto } from '../../src/hooks/useCameraCapture';
import { useLocationCapture } from '../../src/hooks/useLocationCapture';
import { useOCR } from '../../src/hooks/useOCR';
import { duplicateDetector } from '../../src/services/duplicate/duplicateDetector';
import { surveyRepository } from '../../src/database/repositories/surveyRepository';
import { generateUUID } from '../../src/utils/uuid';
import { extractStructuredDataFromText } from '../../src/services/ocr/structuredExtractor';
import {
  Doctor,
  DoctorFacility,
  DuplicateMatch,
  Facility,
  StructuredExtractedData,
  Survey,
  SurveyOCRResult,
} from '../../src/types';

export default function NewSurveyScreen() {
  const insets = useSafeAreaInsets();
  const [surveyId] = useState(() => generateUUID());
  const [surveyType, setSurveyType] = useState<SurveyType>('Doctor');
  const [surveyTypeModalVisible, setSurveyTypeModalVisible] = useState(false);

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

  // Hooks
  const camera = useCameraCapture(surveyId);
  const location = useLocationCapture();
  const ocr = useOCR();

  // Duplicate state
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUserEditedFields, setHasUserEditedFields] = useState(false);

  // Check for duplicates when phone, BMDC, name, or location changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      const matches = await duplicateDetector.checkForDuplicates({
        doctorName: doctorNameBn || doctorNameEn,
        facilityName: facilityNameBn || facilityNameEn,
        phone: primaryPhone || appointmentPhone,
        bmdcNumber,
        latitude: location.location?.latitude,
        longitude: location.location?.longitude,
      });
      setDuplicateMatches(matches);
    }, 600);

    return () => clearTimeout(timer);
  }, [
    doctorNameBn,
    doctorNameEn,
    facilityNameBn,
    facilityNameEn,
    primaryPhone,
    appointmentPhone,
    bmdcNumber,
    location.location,
  ]);

  // Handle OCR Run on a specific photo
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

  // Populate structured fields from OCR
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
    if (data.appointmentPhone) setAppointmentPhone(data.appointmentPhone);
    if (data.visitingStartTime) setVisitingStartTime(data.visitingStartTime);
    if (data.consultationFee) setConsultationFee(String(data.consultationFee));
    if (data.visitingDays && data.visitingDays.length > 0) setVisitingDays(data.visitingDays);

    setHasUserEditedFields(true);
    Alert.alert('Fields Applied', 'Extracted OCR fields have been populated into the form. Please review and adjust as needed.');
  };

  // Assign single field from Line Mapper
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
    setHasUserEditedFields(true);
  };

  const toggleWeekday = (day: string) => {
    setVisitingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Save Survey (as Completed or Draft)
  const handleSave = async (isDraft: boolean = false) => {
    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      const hasDoctorData = Boolean(doctorNameBn || doctorNameEn || primaryPhone || qualifications);
      const hasFacilityData = Boolean(facilityNameBn || facilityNameEn || address);

      const docId = hasDoctorData ? generateUUID() : null;
      const facId = hasFacilityData ? generateUUID() : null;

      // 1. Doctor record
      let doctorRecord: Doctor | null = null;
      if (hasDoctorData && docId) {
        const extraPhones = additionalPhones
          ? additionalPhones
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : [];

        doctorRecord = {
          id: docId,
          name_bn: doctorNameBn.trim() || null,
          name_en: doctorNameEn.trim() || null,
          qualifications: qualifications.trim() || null,
          specialization: specialization.trim() || null,
          bmdc_registration_number: bmdcNumber.trim() || null,
          primary_phone: primaryPhone.trim() || null,
          additional_phones_json: extraPhones.length > 0 ? JSON.stringify(extraPhones) : null,
          notes: doctorNotes.trim() || null,
          created_at: now,
          updated_at: now,
        };
      }

      // 2. Facility record
      let facilityRecord: Facility | null = null;
      if (hasFacilityData && facId) {
        facilityRecord = {
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
          created_at: now,
          updated_at: now,
        };
      }

      // 3. DoctorFacility relation
      let doctorFacilityRecord: DoctorFacility | null = null;
      if (docId && facId) {
        const feeNumber = consultationFee ? parseFloat(consultationFee) : null;
        doctorFacilityRecord = {
          id: generateUUID(),
          doctor_id: docId,
          facility_id: facId,
          visiting_days_json: JSON.stringify(visitingDays),
          visiting_start_time: visitingStartTime.trim() || null,
          visiting_end_time: visitingEndTime.trim() || null,
          appointment_phone: appointmentPhone.trim() || primaryPhone.trim() || null,
          consultation_fee: isNaN(feeNumber as number) ? null : feeNumber,
          verification_status: isDraft ? 'Draft' : 'Pending',
          created_at: now,
          updated_at: now,
        };
      }

      // 4. Survey record
      const surveyRecord: Survey = {
        id: surveyId,
        survey_type: surveyType,
        doctor_id: docId,
        facility_id: facId,
        survey_date: today,
        status: isDraft ? 'Draft' : 'Completed',
        latitude: location.location?.latitude ?? null,
        longitude: location.location?.longitude ?? null,
        gps_accuracy_meters: location.location?.accuracy ?? null,
        location_captured_at: location.location?.timestamp ?? null,
        address_notes: address.trim() || null,
        notes: surveyNotes.trim() || null,
        created_at: now,
        updated_at: now,
      };

      // 5. OCR log if available
      const ocrResults: SurveyOCRResult[] = [];
      if (ocr.lastResponse && ocr.lastResponse.rawText) {
        const matchingPhoto = camera.photos.find((p) => p.raw_ocr_text === ocr.lastResponse?.rawText);
        ocrResults.push({
          id: generateUUID(),
          survey_id: surveyId,
          photo_id: matchingPhoto ? matchingPhoto.id : (camera.photos.length > 0 ? camera.photos[0].id : null),
          provider: ocr.lastResponse.provider,
          raw_text: ocr.lastResponse.rawText,
          structured_result_json: JSON.stringify(ocr.lastResponse.structuredData),
          processing_status: ocr.lastResponse.success ? 'success' : 'failed',
          processed_at: now,
          error_message: ocr.lastResponse.errorMessage ?? null,
        });
      }

      // Also ensure any photo with raw_ocr_text has an OCR record if not already added
      for (const p of camera.photos) {
        if (p.raw_ocr_text && !ocrResults.some((r) => r.photo_id === p.id || r.raw_text === p.raw_ocr_text)) {
          ocrResults.push({
            id: generateUUID(),
            survey_id: surveyId,
            photo_id: p.id,
            provider: 'Photo OCR',
            raw_text: p.raw_ocr_text,
            structured_result_json: JSON.stringify(extractStructuredDataFromText(p.raw_ocr_text)),
            processing_status: 'success',
            processed_at: now,
            error_message: null,
          });
        }
      }

      // Execute transaction in SQLite!
      await surveyRepository.saveCompleteSurvey({
        survey: surveyRecord,
        doctor: doctorRecord,
        facility: facilityRecord,
        doctorFacility: doctorFacilityRecord,
        photos: camera.photos,
        ocrResults,
      });

      Alert.alert(
        isDraft ? 'Draft Saved' : 'Survey Saved Successfully',
        isDraft
          ? 'Survey saved as a draft. You can continue editing anytime from Survey History.'
          : 'Doctor & Facility survey records and original photos saved permanently to local storage.',
        [
          {
            text: 'View Survey',
            onPress: () => router.replace({ pathname: '/survey/[id]', params: { id: surveyId } }),
          },
          {
            text: 'Go to History',
            onPress: () => router.replace('/(tabs)/surveys'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save survey record to SQLite database.');
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="New Survey"
        subtitle="Collect Doctor & Facility Data"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 16) + 80 },
          ]}
        >
          {/* Duplicate Warnings Banner */}
          <DuplicateAlert
            matches={duplicateMatches}
            onSelectExisting={(match) => {
              if (match.recordType === 'survey') {
                router.push({ pathname: '/survey/[id]', params: { id: match.id } });
              }
            }}
            onDismiss={() => setDuplicateMatches([])}
          />

          {/* Survey Type Selector */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Survey Type / ধরন</Text>
            <TouchableOpacity
              onPress={() => setSurveyTypeModalVisible(true)}
              style={styles.selectRow}
            >
              <View style={styles.selectTextCol}>
                <Text style={styles.selectValue}>{surveyType}</Text>
                <Text style={styles.selectValueBn}>
                  ({SURVEY_TYPES.find((t) => t.value === surveyType)?.labelBn})
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Photographs Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Photographs & OCR</Text>
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
              hasUserEditedFields={hasUserEditedFields}
            />
          </View>

          {/* GPS Coordinates Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Location Coordinates</Text>
            <LocationSection
              location={location.location}
              isCapturing={location.isCapturing}
              error={location.error}
              onCapture={location.captureLocation}
              onClear={location.clearLocation}
            />
          </View>

          {/* Doctor Information Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>4. Doctor Information / চিকিৎসকের তথ্য</Text>

            <Input
              label="Doctor Name (বাংলা)"
              placeholder="যেমনঃ অধ্যাপক ডাঃ মুহাম্মদ রফিকুল ইসলাম"
              value={doctorNameBn}
              onChangeText={(t) => {
                setDoctorNameBn(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.doctorNameBn}
            />

            <Input
              label="Doctor Name (English)"
              placeholder="e.g. Prof. Dr. Muhammad Rafiqul Islam"
              value={doctorNameEn}
              onChangeText={(t) => {
                setDoctorNameEn(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.doctorNameEn}
            />

            <Input
              label="Qualifications / ডিগ্রি"
              placeholder="MBBS, FCPS (Medicine), MD (Cardiology)"
              value={qualifications}
              onChangeText={(t) => {
                setQualifications(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.qualifications}
              multiline
            />

            <Input
              label="Specialization / বিশেষজ্ঞতা"
              placeholder="Cardiology & Internal Medicine"
              value={specialization}
              onChangeText={(t) => {
                setSpecialization(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.specialization}
            />

            <Input
              label="BMDC Registration Number"
              placeholder="A-12345"
              value={bmdcNumber}
              onChangeText={(t) => {
                setBmdcNumber(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.bmdcNumber}
              autoCapitalize="characters"
            />

            <Input
              label="Primary Phone Number"
              placeholder="01711234567"
              value={primaryPhone}
              onChangeText={(t) => {
                setPrimaryPhone(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.phones?.[0]}
              keyboardType="phone-pad"
            />

            <Input
              label="Additional Phone Numbers"
              placeholder="01819876543, 01912345678"
              value={additionalPhones}
              onChangeText={(t) => {
                setAdditionalPhones(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.phones && ocr.structuredData.phones.length > 1 ? ocr.structuredData.phones.slice(1).join(', ') : null}
              keyboardType="phone-pad"
              helperText="Comma-separated if multiple"
            />

            <Input
              label="Doctor Notes"
              placeholder="Designation, department, or special instructions"
              value={doctorNotes}
              onChangeText={(t) => {
                setDoctorNotes(t);
                setHasUserEditedFields(true);
              }}
              multiline
            />
          </View>

          {/* Facility & Chamber Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>5. Facility & Address / প্রতিষ্ঠান ও ঠিকানা</Text>

            <Input
              label="Facility Name (বাংলা)"
              placeholder="যেমনঃ ইবনে সিনা কনসালটেশন সেন্টার"
              value={facilityNameBn}
              onChangeText={(t) => {
                setFacilityNameBn(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.facilityNameBn}
            />

            <Input
              label="Facility Name (English)"
              placeholder="e.g. Ibn Sina Consultation Centre"
              value={facilityNameEn}
              onChangeText={(t) => {
                setFacilityNameEn(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.facilityNameEn}
            />

            <Input
              label="Street Address / ঠিকানা"
              placeholder="House 48, Road 9/A, Dhanmondi"
              value={address}
              onChangeText={(t) => {
                setAddress(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.address}
              multiline
            />

            {/* Division Selector */}
            <Text style={styles.fieldLabel}>Division / বিভাগ</Text>
            <TouchableOpacity
              onPress={() => setDivisionModalVisible(true)}
              style={styles.selectRow}
            >
              <Text style={styles.selectValue}>{division || 'Select Division'}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>

            {/* District Selector */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>District / জেলা</Text>
            <TouchableOpacity
              onPress={() => setDistrictModalVisible(true)}
              style={styles.selectRow}
            >
              <Text style={styles.selectValue}>{district || 'Select District'}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <View style={{ height: 12 }} />
            <Input
              label="Upazila / Police Station / থানা"
              placeholder="e.g. Dhanmondi, Mirpur, etc."
              value={upazila}
              onChangeText={(t) => {
                setUpazila(t);
                setHasUserEditedFields(true);
              }}
            />
          </View>

          {/* Chamber Schedule & Visiting Hours */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>6. Chamber Schedule / চেম্বার সময়সূচী</Text>

            <Text style={styles.fieldLabel}>Visiting Days / রোগী দেখার দিনসমূহ</Text>
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
              label="Visiting Hours (Start - End)"
              placeholder="e.g. 5:00 PM - 9:00 PM"
              value={visitingStartTime}
              onChangeText={(t) => {
                setVisitingStartTime(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.visitingStartTime}
            />

            <Input
              label="Visiting End Time"
              placeholder="e.g. 9:00 PM"
              value={visitingEndTime}
              onChangeText={(t) => {
                setVisitingEndTime(t);
                setHasUserEditedFields(true);
              }}
            />

            <Input
              label="Appointment Serial Phone"
              placeholder="01711234567"
              value={appointmentPhone}
              onChangeText={(t) => {
                setAppointmentPhone(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.appointmentPhone || (ocr.structuredData?.phones && ocr.structuredData.phones.length > 1 ? ocr.structuredData.phones[1] : undefined)}
              keyboardType="phone-pad"
            />

            <Input
              label="Consultation Fee (BDT / টাকা)"
              placeholder="1000"
              value={consultationFee}
              onChangeText={(t) => {
                setConsultationFee(t);
                setHasUserEditedFields(true);
              }}
              ocrSuggestion={ocr.structuredData?.consultationFee ? String(ocr.structuredData.consultationFee) : undefined}
              keyboardType="numeric"
            />
          </View>

          {/* Survey Notes */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>7. Field Survey Notes</Text>
            <Input
              placeholder="Field surveyor notes, signboard condition, verification details..."
              value={surveyNotes}
              onChangeText={setSurveyNotes}
              multiline
            />
          </View>

          {/* Bottom Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <Button
              title="Save as Draft"
              onPress={() => handleSave(true)}
              variant="outline"
              size="lg"
              loading={isSaving}
              style={{ flex: 1, marginRight: 8 }}
            />

            <Button
              title="Save Complete"
              onPress={() => handleSave(false)}
              variant="primary"
              size="lg"
              loading={isSaving}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
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
    paddingBottom: 60,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
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
  },
  selectTextCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  selectValueBn: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
  },
});

