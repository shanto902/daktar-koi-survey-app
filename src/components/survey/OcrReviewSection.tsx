import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { StructuredExtractedData } from '../../types';
import { OCRResponse } from '../../services/ocr/types';
import { ConfirmModal } from '../common/ConfirmModal';

interface OcrReviewSectionProps {
  ocrResponse: OCRResponse | null;
  isProcessing: boolean;
  onApplyFields: (structured: StructuredExtractedData) => void;
  onAssignField?: (fieldKey: string, value: string) => void;
  onRetry: () => void;
  hasUserEditedFields?: boolean;
}

interface TargetFieldMeta {
  key: string;
  label: string;
  labelBn: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgLight: string;
}

const TARGET_FIELDS: TargetFieldMeta[] = [
  { key: 'doctorNameBn', label: 'Doctor Name (বাংলা)', labelBn: 'ডাক্তারের নাম (বাংলা)', icon: 'person', color: Colors.primary, bgLight: '#F0FDFA' },
  { key: 'doctorNameEn', label: 'Doctor Name (English)', labelBn: 'ডাক্তারের নাম (ইংরেজি)', icon: 'person-outline', color: Colors.primaryDark, bgLight: '#ECFEFF' },
  { key: 'qualifications', label: 'Qualifications / Degrees', labelBn: 'ডিগ্রী ও পদবী (MBBS, FCPS ইত্যাদি)', icon: 'school', color: '#7C3AED', bgLight: '#F5F3FF' },
  { key: 'specialization', label: 'Specialization', labelBn: 'বিশেষজ্ঞ (মেডিসিন, শিশু ইত্যাদি)', icon: 'medkit', color: '#059669', bgLight: '#ECFDF5' },
  { key: 'bmdcNumber', label: 'BMDC Registration No', labelBn: 'বিএমডিসি রেজিঃ নম্বর', icon: 'card', color: '#D97706', bgLight: '#FFFBEB' },
  { key: 'phone', label: 'Primary Contact Phone', labelBn: 'প্রধান মোবাইল নম্বর', icon: 'call', color: '#2563EB', bgLight: '#EFF6FF' },
  { key: 'facilityNameBn', label: 'Facility Name (বাংলা)', labelBn: 'হাসপাতাল/চেম্বার নাম (বাংলা)', icon: 'business', color: '#DC2626', bgLight: '#FEF2F2' },
  { key: 'facilityNameEn', label: 'Facility Name (English)', labelBn: 'হাসপাতাল/চেম্বার নাম (ইংরেজি)', icon: 'business-outline', color: '#E11D48', bgLight: '#FFF1F2' },
  { key: 'address', label: 'Facility Address', labelBn: 'ঠিকানা / চেম্বারের অবস্থান', icon: 'location', color: '#0891B2', bgLight: '#ECFEFF' },
  { key: 'visitingStartTime', label: 'Visiting Schedule', labelBn: 'রোগী দেখার সময়সূচী', icon: 'time', color: '#4F46E5', bgLight: '#EEF2FF' },
  { key: 'consultationFee', label: 'Consultation Fee', labelBn: 'ভিজিট ফি', icon: 'cash', color: '#16A34A', bgLight: '#F0FDF4' },
  { key: 'doctorNotes', label: 'Field Notes', labelBn: 'অন্যান্য তথ্য বা নোট', icon: 'document-text', color: '#64748B', bgLight: '#F8FAFC' },
];

export function OcrReviewSection({
  ocrResponse,
  isProcessing,
  onApplyFields,
  onAssignField,
  onRetry,
  hasUserEditedFields = false,
}: OcrReviewSectionProps) {
  const [activeTab, setActiveTab] = useState<'smart' | 'lines' | 'raw'>('smart');
  const [confirmApplyVisible, setConfirmApplyVisible] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);

  // Line index -> field key mapping
  const [lineAssignments, setLineAssignments] = useState<Record<number, string>>({});
  // Applied field keys tracker (for green checkmarks on individual buttons)
  const [appliedFieldKeys, setAppliedFieldKeys] = useState<Record<string, boolean>>({});
  // Working structured data
  const [workingData, setWorkingData] = useState<StructuredExtractedData>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Initialize or re-sync when ocrResponse changes
  useEffect(() => {
    if (!ocrResponse || !ocrResponse.success) {
      setLineAssignments({});
      setWorkingData({});
      setAppliedFieldKeys({});
      return;
    }

    const s = { ...ocrResponse.structuredData };
    setWorkingData(s);

    const rawLines = (ocrResponse.rawText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const initialAssignments: Record<number, string> = {};

    rawLines.forEach((line, idx) => {
      if (s.doctorNameBn && (line === s.doctorNameBn || line.includes(s.doctorNameBn))) {
        initialAssignments[idx] = 'doctorNameBn';
      } else if (s.doctorNameEn && (line === s.doctorNameEn || line.includes(s.doctorNameEn))) {
        initialAssignments[idx] = 'doctorNameEn';
      } else if (s.bmdcNumber && line.toUpperCase().includes(s.bmdcNumber.replace('A-', ''))) {
        initialAssignments[idx] = 'bmdcNumber';
      } else if (s.phones && s.phones.some((p) => line.replace(/[^0-9]/g, '').includes(p.slice(-8)))) {
        initialAssignments[idx] = 'phone';
      } else if (s.facilityNameBn && (line === s.facilityNameBn || line.includes(s.facilityNameBn))) {
        initialAssignments[idx] = 'facilityNameBn';
      } else if (s.facilityNameEn && (line === s.facilityNameEn || line.includes(s.facilityNameEn))) {
        initialAssignments[idx] = 'facilityNameEn';
      } else if (s.qualifications && s.qualifications.split(',').some((q) => line.includes(q.trim()))) {
        initialAssignments[idx] = 'qualifications';
      }
    });

    setLineAssignments(initialAssignments);
  }, [ocrResponse]);

  const lines = useMemo(() => {
    return (ocrResponse?.rawText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [ocrResponse?.rawText]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  // Apply single field directly to form
  const handleApplySingleField = (fieldKey: string, value: string) => {
    if (!value) return;
    if (onAssignField) {
      onAssignField(fieldKey, value);
    }
    setAppliedFieldKeys((prev) => ({ ...prev, [fieldKey]: true }));
    const meta = TARGET_FIELDS.find((f) => f.key === fieldKey);
    showToast(`✓ Added to ${meta?.label || fieldKey}`);
  };

  // Assign a specific line of text to a field
  const handleAssignLineToField = (lineIndex: number, fieldKey: string) => {
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    const lineText = lines[lineIndex];
    const cleanText = lineText.replace(/^[^\w\u0980-\u09FF]+/, '').trim();

    if (fieldKey === 'clear') {
      const prevKey = lineAssignments[lineIndex];
      const updatedAssignments = { ...lineAssignments };
      delete updatedAssignments[lineIndex];
      setLineAssignments(updatedAssignments);

      if (prevKey) {
        const updatedData = { ...workingData };
        delete (updatedData as any)[prevKey];
        setWorkingData(updatedData);
      }
      setTargetModalVisible(false);
      return;
    }

    const updatedAssignments = { ...lineAssignments };
    updatedAssignments[lineIndex] = fieldKey;
    setLineAssignments(updatedAssignments);

    const updatedData: StructuredExtractedData = {
      ...workingData,
      [fieldKey]: fieldKey === 'consultationFee' ? cleanText.replace(/[^0-9]/g, '') : cleanText,
    };
    if (fieldKey === 'phone') {
      const p = cleanText.replace(/[^0-9]/g, '');
      updatedData.phones = [p];
      updatedData.appointmentPhone = p;
    }
    setWorkingData(updatedData);

    if (onAssignField) {
      onAssignField(fieldKey, cleanText);
    }
    setAppliedFieldKeys((prev) => ({ ...prev, [fieldKey]: true }));

    setTargetModalVisible(false);
    const meta = TARGET_FIELDS.find((f) => f.key === fieldKey);
    showToast(`✓ Assigned to ${meta?.label || fieldKey}`);
  };

  const handleApplyAllPress = () => {
    if (hasUserEditedFields) {
      setConfirmApplyVisible(true);
    } else {
      executeApplyAll();
    }
  };

  const executeApplyAll = () => {
    setConfirmApplyVisible(false);
    onApplyFields(workingData);
    // Mark all available fields as applied
    const allApplied: Record<string, boolean> = {};
    Object.keys(workingData).forEach((k) => {
      allApplied[k] = true;
    });
    setAppliedFieldKeys(allApplied);
    showToast('✓ All detected OCR fields applied to form!');
  };

  // Filter smart fields that have extracted content
  const detectedFieldsList = useMemo(() => {
    const list: { key: string; value: string; meta: TargetFieldMeta }[] = [];

    if (workingData.doctorNameBn) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'doctorNameBn')!;
      list.push({ key: 'doctorNameBn', value: workingData.doctorNameBn, meta });
    }
    if (workingData.doctorNameEn) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'doctorNameEn')!;
      list.push({ key: 'doctorNameEn', value: workingData.doctorNameEn, meta });
    }
    if (workingData.qualifications) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'qualifications')!;
      list.push({ key: 'qualifications', value: workingData.qualifications, meta });
    }
    if (workingData.specialization) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'specialization')!;
      list.push({ key: 'specialization', value: workingData.specialization, meta });
    }
    if (workingData.bmdcNumber) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'bmdcNumber')!;
      list.push({ key: 'bmdcNumber', value: workingData.bmdcNumber, meta });
    }
    if (workingData.phones && workingData.phones.length > 0) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'phone')!;
      list.push({ key: 'phone', value: workingData.phones[0], meta });
    }
    if (workingData.facilityNameBn) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'facilityNameBn')!;
      list.push({ key: 'facilityNameBn', value: workingData.facilityNameBn, meta });
    }
    if (workingData.facilityNameEn) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'facilityNameEn')!;
      list.push({ key: 'facilityNameEn', value: workingData.facilityNameEn, meta });
    }
    if (workingData.address) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'address')!;
      list.push({ key: 'address', value: workingData.address, meta });
    }
    if (workingData.visitingStartTime) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'visitingStartTime')!;
      list.push({ key: 'visitingStartTime', value: workingData.visitingStartTime, meta });
    }
    if (workingData.consultationFee) {
      const meta = TARGET_FIELDS.find((f) => f.key === 'consultationFee')!;
      list.push({ key: 'consultationFee', value: `${workingData.consultationFee} BDT`, meta });
    }

    return list;
  }, [workingData]);

  if (isProcessing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Extracting text from photo...</Text>
        <Text style={styles.loadingSubtext}>
          Analyzing doctor title, degrees, BMDC registration number, and chamber details.
        </Text>
      </View>
    );
  }

  if (!ocrResponse) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* OCR Status Header */}
      <View style={styles.header}>
        <View style={styles.headerStatusRow}>
          <View style={[styles.statusBadge, ocrResponse.success ? styles.statusBadgeSuccess : styles.statusBadgeFail]}>
            <Ionicons
              name={ocrResponse.success ? 'sparkles' : 'alert-circle'}
              size={14}
              color={ocrResponse.success ? '#047857' : Colors.danger}
            />
            <Text style={[styles.statusBadgeText, ocrResponse.success ? styles.statusBadgeTextSuccess : styles.statusBadgeTextFail]}>
              {ocrResponse.success ? `${detectedFieldsList.length} Fields Detected` : 'Extraction Failed'}
            </Text>
          </View>

          <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.7}>
            <Ionicons name="refresh" size={13} color={Colors.primary} />
            <Text style={styles.retryText}>Re-scan</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.providerMetaText}>
          Provider: {ocrResponse.provider} {ocrResponse.durationMs > 0 ? `• ${ocrResponse.durationMs}ms` : ''}
        </Text>
      </View>

      {/* Toast Banner */}
      {feedbackMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
          <Text style={styles.toastText}>{feedbackMessage}</Text>
        </View>
      )}

      {/* Hero Apply All Button */}
      {ocrResponse.success && detectedFieldsList.length > 0 && (
        <TouchableOpacity
          onPress={handleApplyAllPress}
          style={styles.heroApplyBtn}
          activeOpacity={0.85}
        >
          <View style={styles.heroApplyIconBg}>
            <Ionicons name="flash" size={16} color={Colors.white} />
          </View>
          <View style={styles.heroApplyTextContainer}>
            <Text style={styles.heroApplyTitle}>Apply All Detected Fields</Text>
            <Text style={styles.heroApplySubtitle}>
              Auto-fill {detectedFieldsList.length} fields into doctor & chamber form
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Tab Controls */}
      {ocrResponse.success && (
        <View style={styles.tabBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'smart' && styles.tabButtonActive]}
              onPress={() => setActiveTab('smart')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sparkles"
                size={15}
                color={activeTab === 'smart' ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.tabButtonText, activeTab === 'smart' && styles.tabButtonTextActive]}>
                Smart Fields ({detectedFieldsList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'lines' && styles.tabButtonActive]}
              onPress={() => setActiveTab('lines')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="list"
                size={15}
                color={activeTab === 'lines' ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.tabButtonText, activeTab === 'lines' && styles.tabButtonTextActive]}>
                Text Lines ({lines.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'raw' && styles.tabButtonActive]}
              onPress={() => setActiveTab('raw')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="document-text-outline"
                size={15}
                color={activeTab === 'raw' ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.tabButtonText, activeTab === 'raw' && styles.tabButtonTextActive]}>
                Raw Text
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* TAB 1: SMART DETECTED FIELDS */}
      {ocrResponse.success && activeTab === 'smart' && (
        <View style={styles.tabContent}>
          {detectedFieldsList.length > 0 ? (
            detectedFieldsList.map(({ key, value, meta }) => {
              const isApplied = Boolean(appliedFieldKeys[key]);

              return (
                <View key={key} style={styles.fieldCard}>
                  <View style={styles.fieldCardHeader}>
                    <View style={[styles.fieldIconCircle, { backgroundColor: meta.bgLight }]}>
                      <Ionicons name={meta.icon} size={15} color={meta.color} />
                    </View>
                    <View style={styles.fieldLabelContainer}>
                      <Text style={styles.fieldCardLabel}>{meta.label}</Text>
                      <Text style={styles.fieldCardLabelBn}>{meta.labelBn}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.applyFieldBtn, isApplied && styles.applyFieldBtnDone]}
                      onPress={() => handleApplySingleField(key, value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isApplied ? 'checkmark-circle' : 'arrow-down-circle'}
                        size={14}
                        color={isApplied ? Colors.white : Colors.primary}
                      />
                      <Text style={[styles.applyFieldBtnText, isApplied && styles.applyFieldBtnTextDone]}>
                        {isApplied ? 'Applied' : 'Add to Form'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldValueBox}>
                    <Text style={styles.fieldValueText} selectable>
                      {value}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyFieldsBox}>
              <Ionicons name="scan-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyFieldsTitle}>No specific medical fields detected</Text>
              <Text style={styles.emptyFieldsSub}>
                Switch to the "Text Lines" tab to manually tap and assign lines directly to your form.
              </Text>
            </View>
          )}

          {/* Quick tip */}
          <View style={styles.tipBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.tipText}>
              Need to add more fields? Switch to the <Text style={{ fontWeight: '700' }}>Text Lines</Text> tab to assign any line with 1 tap.
            </Text>
          </View>
        </View>
      )}

      {/* TAB 2: INTERACTIVE TEXT LINES (LINE MAPPER) */}
      {ocrResponse.success && activeTab === 'lines' && (
        <View style={styles.tabContent}>
          <Text style={styles.linesHelperText}>
            Tap any line below to assign its text directly to a form field:
          </Text>

          {lines.map((line, idx) => {
            const assignedKey = lineAssignments[idx];
            const meta = assignedKey ? TARGET_FIELDS.find((f) => f.key === assignedKey) : null;

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.lineCard, assignedKey ? styles.lineCardAssigned : null]}
                onPress={() => {
                  setSelectedLineIndex(idx);
                  setTargetModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.lineCardHeader}>
                  <View style={styles.lineNumPill}>
                    <Text style={styles.lineNumText}>Line {idx + 1}</Text>
                  </View>

                  {meta ? (
                    <View style={[styles.assignedTag, { backgroundColor: meta.bgLight, borderColor: meta.color + '40' }]}>
                      <Ionicons name={meta.icon} size={11} color={meta.color} />
                      <Text style={[styles.assignedTagText, { color: meta.color }]}>
                        ✓ {meta.label}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.tapToAssignTag}>
                      <Ionicons name="add-circle-outline" size={13} color={Colors.primary} />
                      <Text style={styles.tapToAssignText}>Tap to Assign</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.lineBodyText} selectable>
                  {line}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* TAB 3: FULL RAW OCR TEXT */}
      {ocrResponse.success && activeTab === 'raw' && (
        <View style={styles.rawContainer}>
          <ScrollView style={styles.rawScrollBox} nestedScrollEnabled>
            <Text style={styles.rawTextContent} selectable>
              {ocrResponse.rawText || '(No text detected in this image)'}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* Confirm Overwrite Modal */}
      <ConfirmModal
        visible={confirmApplyVisible}
        title="Apply OCR Data to Form?"
        message="This will update the doctor and facility fields with the OCR extracted values. Any manually entered values in those fields will be updated."
        confirmLabel="Apply Fields"
        cancelLabel="Keep Current"
        onConfirm={executeApplyAll}
        onCancel={() => setConfirmApplyVisible(false)}
      />

      {/* Modal: Target Field Selector for Tapped Line */}
      <Modal
        visible={targetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTargetModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.targetModalCard}>
            <View style={styles.targetModalHeader}>
              <View>
                <Text style={styles.targetModalTitle}>Assign Line to Field</Text>
                <Text style={styles.targetModalSub}>
                  Line {selectedLineIndex !== null ? selectedLineIndex + 1 : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setTargetModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Line Text Preview */}
            <View style={styles.targetLinePreview}>
              <Text style={styles.targetLinePreviewLabel}>Selected text:</Text>
              <Text style={styles.targetLinePreviewContent} numberOfLines={3}>
                "{selectedLineIndex !== null ? lines[selectedLineIndex] : ''}"
              </Text>
            </View>

            <Text style={styles.targetGridTitle}>Choose target form field:</Text>

            {/* Target Options Grid */}
            <ScrollView style={styles.targetsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.targetsGrid}>
                {TARGET_FIELDS.map((field) => (
                  <TouchableOpacity
                    key={field.key}
                    style={styles.targetOptionCard}
                    onPress={() => {
                      if (selectedLineIndex !== null) {
                        handleAssignLineToField(selectedLineIndex, field.key);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.targetOptionIconCircle, { backgroundColor: field.bgLight }]}>
                      <Ionicons name={field.icon} size={16} color={field.color} />
                    </View>
                    <View style={styles.targetOptionTextWrap}>
                      <Text style={styles.targetOptionLabel} numberOfLines={1}>
                        {field.label}
                      </Text>
                      <Text style={styles.targetOptionLabelBn} numberOfLines={1}>
                        {field.labelBn}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Clear Option */}
              {selectedLineIndex !== null && lineAssignments[selectedLineIndex] && (
                <TouchableOpacity
                  style={styles.clearTargetBtn}
                  onPress={() => handleAssignLineToField(selectedLineIndex, 'clear')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                  <Text style={styles.clearTargetText}>Remove Field Assignment</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#99F6E4',
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeSuccess: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeFail: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgeTextSuccess: {
    color: '#047857',
  },
  statusBadgeTextFail: {
    color: Colors.danger,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  providerMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  toastText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  heroApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 14,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heroApplyIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroApplyTextContainer: {
    flex: 1,
  },
  heroApplyTitle: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  heroApplySubtitle: {
    color: '#CCFBF1',
    fontSize: 11,
    marginTop: 1,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: 12,
    backgroundColor: '#F8FAFC',
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  tabContent: {
    padding: 14,
  },
  fieldCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  fieldCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  fieldLabelContainer: {
    flex: 1,
  },
  fieldCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  fieldCardLabelBn: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  applyFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 4,
  },
  applyFieldBtnDone: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  applyFieldBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  applyFieldBtnTextDone: {
    color: Colors.white,
  },
  fieldValueBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  fieldValueText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  emptyFieldsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyFieldsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  emptyFieldsSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  linesHelperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  lineCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginBottom: 8,
  },
  lineCardAssigned: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  lineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  lineNumPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lineNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  assignedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  assignedTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tapToAssignTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tapToAssignText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  lineBodyText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  rawContainer: {
    padding: 14,
  },
  rawScrollBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    maxHeight: 240,
  },
  rawTextContent: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 19,
    fontFamily: 'monospace',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  targetModalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  targetModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  targetModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  targetModalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLinePreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: 10,
    marginBottom: 14,
  },
  targetLinePreviewLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  targetLinePreviewContent: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  targetGridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  targetsScroll: {
    maxHeight: 340,
  },
  targetsGrid: {
    gap: 8,
  },
  targetOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  targetOptionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetOptionTextWrap: {
    flex: 1,
  },
  targetOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  targetOptionLabelBn: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  clearTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
    gap: 6,
  },
  clearTargetText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
  },
});
