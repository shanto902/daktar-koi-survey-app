import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { cleanOcrLine, mergeOcrLines, appendOcrText } from '../../utils/textMerger';

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

const DELIMITER_OPTIONS = [
  { key: ', ', label: 'Comma (, )', sub: 'Qualifications' },
  { key: '\n', label: 'New Line (↵)', sub: 'Address / Notes' },
  { key: ' ', label: 'Space (␣)', sub: 'Full Names' },
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
  const [addFieldModalVisible, setAddFieldModalVisible] = useState(false);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);

  // Multi-line selection and text merging state
  const [isMergeMode, setIsMergeMode] = useState<boolean>(false);
  const [selectedLineIndices, setSelectedLineIndices] = useState<number[]>([]);
  const [mergeDelimiter, setMergeDelimiter] = useState<string>(', ');

  // Line index -> field key mapping
  const [lineAssignments, setLineAssignments] = useState<Record<number, string>>({});
  // Applied field keys tracker (for green checkmarks on individual buttons)
  const [appliedFieldKeys, setAppliedFieldKeys] = useState<Record<string, boolean>>({});
  // User-added custom fields in smart tab
  const [userAddedFieldKeys, setUserAddedFieldKeys] = useState<string[]>([]);
  // Working structured data
  const [workingData, setWorkingData] = useState<StructuredExtractedData>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Initialize or re-sync when ocrResponse changes
  useEffect(() => {
    if (!ocrResponse || !ocrResponse.success) {
      setLineAssignments({});
      setWorkingData({});
      setAppliedFieldKeys({});
      setUserAddedFieldKeys([]);
      setIsMergeMode(false);
      setSelectedLineIndices([]);
      setSelectedLineIndex(null);
      return;
    }

    const s = { ...ocrResponse.structuredData };
    setWorkingData(s);
    setIsMergeMode(false);
    setSelectedLineIndices([]);
    setSelectedLineIndex(null);

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

  // Derived merged preview from selected line indices
  const mergedTextPreview = useMemo(() => {
    if (selectedLineIndices.length === 0) return '';
    return mergeOcrLines(lines, selectedLineIndices, mergeDelimiter);
  }, [lines, selectedLineIndices, mergeDelimiter]);

  // Active text being assigned in the modal (merged vs single line)
  const activeTextToAssign = useMemo(() => {
    if (selectedLineIndices.length > 0) {
      return mergedTextPreview;
    }
    if (selectedLineIndex !== null && lines[selectedLineIndex]) {
      return cleanOcrLine(lines[selectedLineIndex]);
    }
    return '';
  }, [selectedLineIndices, mergedTextPreview, selectedLineIndex, lines]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  // Toggle selection of a line in merge mode
  const handleToggleLineSelection = (idx: number) => {
    setSelectedLineIndices((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx);
      } else {
        return [...prev, idx].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectAllLines = () => {
    setSelectedLineIndices(lines.map((_, i) => i));
  };

  const handleClearSelection = () => {
    setSelectedLineIndices([]);
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

  // Unified assign handler: handles single line, merged lines, replace or append
  const handleAssignToField = (
    fieldKey: string,
    action: 'replace' | 'append' = 'replace',
    customText?: string
  ) => {
    const rawTargetText = customText !== undefined ? customText : activeTextToAssign;
    const cleanText = rawTargetText.trim();

    if (fieldKey === 'clear') {
      if (selectedLineIndex !== null) {
        const prevKey = lineAssignments[selectedLineIndex];
        const updatedAssignments = { ...lineAssignments };
        delete updatedAssignments[selectedLineIndex];
        setLineAssignments(updatedAssignments);

        if (prevKey) {
          const updatedData = { ...workingData };
          delete (updatedData as any)[prevKey];
          setWorkingData(updatedData);
        }
      }
      setTargetModalVisible(false);
      return;
    }

    if (!cleanText) return;

    // Determine value to assign
    let finalText = cleanText;
    if (action === 'append') {
      const existing = (workingData as any)[fieldKey] || '';
      const delimiter = fieldKey === 'address' || fieldKey === 'doctorNotes' ? '\n' : ', ';
      finalText = appendOcrText(existing, cleanText, delimiter);
    } else {
      if (fieldKey === 'consultationFee') {
        finalText = cleanText.replace(/[^0-9]/g, '');
      }
    }

    // Update line assignments
    const updatedAssignments = { ...lineAssignments };
    const numMerged = selectedLineIndices.length;
    if (numMerged > 0) {
      selectedLineIndices.forEach((idx) => {
        updatedAssignments[idx] = fieldKey;
      });
    } else if (selectedLineIndex !== null) {
      updatedAssignments[selectedLineIndex] = fieldKey;
    }
    setLineAssignments(updatedAssignments);

    // Update workingData
    const updatedData: StructuredExtractedData = {
      ...workingData,
      [fieldKey]: finalText,
    };
    if (fieldKey === 'phone') {
      const p = cleanText.replace(/[^0-9]/g, '');
      updatedData.phones = [p];
      updatedData.appointmentPhone = p;
    }
    setWorkingData(updatedData);

    // Push to form
    if (onAssignField) {
      onAssignField(fieldKey, finalText);
    }
    setAppliedFieldKeys((prev) => ({ ...prev, [fieldKey]: true }));

    // Reset selection & modal
    setTargetModalVisible(false);
    setSelectedLineIndex(null);
    setSelectedLineIndices([]);
    setIsMergeMode(false);

    const meta = TARGET_FIELDS.find((f) => f.key === fieldKey);
    const label = meta?.label || fieldKey;

    if (numMerged > 1) {
      showToast(`✓ Merged ${numMerged} lines into ${label}`);
    } else if (action === 'append') {
      showToast(`✓ Appended to ${label}`);
    } else {
      showToast(`✓ Assigned to ${label}`);
    }
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

  // Field editing handlers for Smart Tab
  const handleUpdateFieldValue = (key: string, newText: string) => {
    setWorkingData((prev) => {
      const updated: StructuredExtractedData = { ...prev };
      if (key === 'phone') {
        const cleanPhone = newText.replace(/[^0-9]/g, '');
        updated.phones = cleanPhone ? [cleanPhone] : [];
        updated.appointmentPhone = cleanPhone;
      } else if (key === 'consultationFee') {
        const digits = newText.replace(/[^0-9]/g, '');
        updated.consultationFee = digits ? parseInt(digits, 10) : undefined;
      } else {
        (updated as any)[key] = newText;
      }
      return updated;
    });

    // Unmark applied so user knows it's modified and can be added to form
    setAppliedFieldKeys((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  };

  const handleRevertField = (key: string) => {
    const orig = ocrResponse?.structuredData;
    if (!orig) return;
    setWorkingData((prev) => {
      const updated: StructuredExtractedData = { ...prev };
      if (key === 'phone') {
        updated.phones = orig.phones ? [...orig.phones] : [];
        updated.appointmentPhone = orig.appointmentPhone;
      } else {
        (updated as any)[key] = (orig as any)[key] || '';
      }
      return updated;
    });
    showToast(`Reset to original OCR value`);
  };

  const handleRemoveField = (key: string) => {
    setWorkingData((prev) => {
      const updated = { ...prev };
      delete (updated as any)[key];
      return updated;
    });
    setUserAddedFieldKeys((prev) => prev.filter((k) => k !== key));
  };

  const handleAddCustomField = (key: string) => {
    if (!userAddedFieldKeys.includes(key)) {
      setUserAddedFieldKeys((prev) => [...prev, key]);
    }
    setAddFieldModalVisible(false);
    const meta = TARGET_FIELDS.find((f) => f.key === key);
    showToast(`Added ${meta?.label || key} to Smart Review`);
  };

  // Filter smart fields that have extracted content or were added by user
  const detectedFieldsList = useMemo(() => {
    const list: {
      key: string;
      value: string;
      meta: TargetFieldMeta;
      isEdited: boolean;
      isUserAdded: boolean;
    }[] = [];
    const orig = ocrResponse?.structuredData || {};

    TARGET_FIELDS.forEach((meta) => {
      let val = '';
      let isPresent = false;
      let origVal = '';

      if (meta.key === 'phone') {
        val = workingData.phones?.[0] || workingData.appointmentPhone || '';
        origVal = orig.phones?.[0] || orig.appointmentPhone || '';
        isPresent = Boolean(val || userAddedFieldKeys.includes('phone'));
      } else if (meta.key === 'consultationFee') {
        val = workingData.consultationFee ? String(workingData.consultationFee) : '';
        origVal = orig.consultationFee ? String(orig.consultationFee) : '';
        isPresent = Boolean(val || userAddedFieldKeys.includes('consultationFee'));
      } else {
        val = (workingData as any)[meta.key] || '';
        origVal = (orig as any)[meta.key] || '';
        isPresent = Boolean(val || userAddedFieldKeys.includes(meta.key));
      }

      if (isPresent) {
        const isEdited = Boolean(origVal && val !== origVal);
        const isUserAdded = userAddedFieldKeys.includes(meta.key) && !origVal;
        list.push({ key: meta.key, value: val, meta, isEdited, isUserAdded });
      }
    });

    return list;
  }, [workingData, ocrResponse?.structuredData, userAddedFieldKeys]);

  const availableFieldsToAdd = useMemo(() => {
    const existingKeys = new Set(detectedFieldsList.map((f) => f.key));
    return TARGET_FIELDS.filter((f) => !existingKeys.has(f.key));
  }, [detectedFieldsList]);

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

      {/* TAB 1: SMART DETECTED FIELDS (EDITABLE) */}
      {ocrResponse.success && activeTab === 'smart' && (
        <View style={styles.tabContent}>
          {detectedFieldsList.length > 0 ? (
            detectedFieldsList.map(({ key, value, meta, isEdited, isUserAdded }) => {
              const isApplied = Boolean(appliedFieldKeys[key]);

              return (
                <View key={key} style={styles.fieldCard}>
                  <View style={styles.fieldCardHeader}>
                    <View style={[styles.fieldIconCircle, { backgroundColor: meta.bgLight }]}>
                      <Ionicons name={meta.icon} size={15} color={meta.color} />
                    </View>
                    <View style={styles.fieldLabelContainer}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={styles.fieldCardLabel}>{meta.label}</Text>
                        {isEdited && (
                          <View style={styles.fieldEditedBadge}>
                            <Ionicons name="pencil" size={10} color="#B45309" />
                            <Text style={styles.fieldEditedText}>Edited</Text>
                          </View>
                        )}
                        {isUserAdded && (
                          <View style={styles.fieldUserAddedBadge}>
                            <Text style={styles.fieldUserAddedText}>Custom</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.fieldCardLabelBn}>{meta.labelBn}</Text>
                    </View>

                    <View style={styles.fieldHeaderActions}>
                      {key === 'qualifications' && lines.length > 1 && (
                        <TouchableOpacity
                          style={styles.fieldMergeLinesShortcut}
                          onPress={() => {
                            setActiveTab('lines');
                            setIsMergeMode(true);
                            showToast('Select 2 or 3 lines to merge into qualifications');
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="git-merge" size={12} color="#7C3AED" />
                          <Text style={styles.fieldMergeLinesShortcutText}>Merge Lines</Text>
                        </TouchableOpacity>
                      )}
                      {isUserAdded && (
                        <TouchableOpacity
                          style={styles.fieldDeleteBtn}
                          onPress={() => handleRemoveField(key)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                        </TouchableOpacity>
                      )}
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
                  </View>

                  {/* Editable Input Box */}
                  <View style={styles.fieldEditContainer}>
                    <TextInput
                      style={[
                        styles.fieldEditInput,
                        (key === 'address' || key === 'qualifications' || key === 'doctorNotes') && styles.fieldEditInputMultiline,
                      ]}
                      value={value}
                      onChangeText={(t) => handleUpdateFieldValue(key, t)}
                      placeholder={`Tap to edit ${meta.label}...`}
                      placeholderTextColor={Colors.textMuted}
                      multiline={key === 'address' || key === 'qualifications' || key === 'doctorNotes'}
                    />
                    <View style={styles.fieldEditPencilIconBox}>
                      {isEdited && (
                        <TouchableOpacity
                          onPress={() => handleRevertField(key)}
                          style={styles.fieldResetBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="refresh" size={11} color="#B45309" />
                          <Text style={styles.fieldResetText}>Reset</Text>
                        </TouchableOpacity>
                      )}
                      <Ionicons name="pencil" size={12} color={Colors.textMuted} />
                    </View>
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

          {/* Add Missing Field Button */}
          {availableFieldsToAdd.length > 0 && (
            <TouchableOpacity
              style={styles.addMissingFieldBtn}
              onPress={() => setAddFieldModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.addMissingFieldText}>+ Add Another Field</Text>
            </TouchableOpacity>
          )}

          {/* Quick tip */}
          <View style={styles.tipBox}>
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
            <Text style={styles.tipText}>
              All smart fields above are <Text style={{ fontWeight: '700' }}>directly editable</Text>. Tap any field to correct typos before adding to form!
            </Text>
          </View>
        </View>
      )}

      {/* TAB 2: INTERACTIVE TEXT LINES (WITH MULTI-LINE TEXT MERGER) */}
      {ocrResponse.success && activeTab === 'lines' && (
        <View style={styles.tabContent}>
          {/* Header & Mode Switcher */}
          <View style={styles.linesTabHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.linesTabTitle}>Text Lines ({lines.length})</Text>
              <Text style={styles.linesTabSub}>
                {isMergeMode
                  ? 'Select 2 or more lines to combine'
                  : 'Tap a line to assign, or merge 2-3 liner qualifications'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.mergeToggleBtn, isMergeMode && styles.mergeToggleBtnActive]}
              onPress={() => {
                if (isMergeMode) {
                  setIsMergeMode(false);
                  setSelectedLineIndices([]);
                } else {
                  setIsMergeMode(true);
                  setSelectedLineIndex(null);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isMergeMode ? 'close-circle' : 'git-merge'}
                size={14}
                color={isMergeMode ? Colors.white : Colors.primaryDark}
              />
              <Text style={[styles.mergeToggleBtnText, isMergeMode && styles.mergeToggleBtnTextActive]}>
                {isMergeMode ? 'Cancel Merge' : 'Merge Lines'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Helper banner when in merge mode */}
          {isMergeMode && (
            <View style={styles.mergeInstructionsBanner}>
              <View style={styles.mergeInstructionsLeft}>
                <Ionicons name="information-circle" size={16} color={Colors.primary} />
                <Text style={styles.mergeInstructionsText}>
                  Tap lines to select (e.g. multi-line degrees). They will be combined in top-to-bottom order.
                </Text>
              </View>
              <View style={styles.mergeQuickLinksRow}>
                <TouchableOpacity onPress={handleSelectAllLines} style={styles.mergeQuickLink}>
                  <Text style={styles.mergeQuickLinkText}>Select All</Text>
                </TouchableOpacity>
                {selectedLineIndices.length > 0 && (
                  <TouchableOpacity onPress={handleClearSelection} style={styles.mergeQuickLink}>
                    <Text style={[styles.mergeQuickLinkText, { color: Colors.danger }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Lines List */}
          {lines.map((line, idx) => {
            const assignedKey = lineAssignments[idx];
            const meta = assignedKey ? TARGET_FIELDS.find((f) => f.key === assignedKey) : null;
            const isSelected = selectedLineIndices.includes(idx);
            const selectionOrder = selectedLineIndices.indexOf(idx) + 1;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.lineCard,
                  assignedKey ? styles.lineCardAssigned : null,
                  isSelected ? styles.lineCardSelectedForMerge : null,
                ]}
                onPress={() => {
                  if (isMergeMode) {
                    handleToggleLineSelection(idx);
                  } else {
                    setSelectedLineIndex(idx);
                    setSelectedLineIndices([]);
                    setTargetModalVisible(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.lineCardRow}>
                  {/* Left: Checkbox in merge mode */}
                  {isMergeMode && (
                    <View
                      style={[
                        styles.mergeCheckCircle,
                        isSelected ? styles.mergeCheckCircleSelected : styles.mergeCheckCircleUnselected,
                      ]}
                    >
                      {isSelected ? (
                        <Text style={styles.mergeCheckOrderText}>#{selectionOrder}</Text>
                      ) : (
                        <Ionicons name="add" size={14} color={Colors.textMuted} />
                      )}
                    </View>
                  )}

                  {/* Right: Content */}
                  <View style={{ flex: 1 }}>
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
                        !isMergeMode && (
                          <View style={styles.tapToAssignTag}>
                            <Ionicons name="add-circle-outline" size={13} color={Colors.primary} />
                            <Text style={styles.tapToAssignText}>Tap to Assign</Text>
                          </View>
                        )
                      )}
                    </View>

                    <Text style={styles.lineBodyText} selectable>
                      {line}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Merge Action Card (Docked at bottom of lines tab when lines are selected) */}
          {isMergeMode && selectedLineIndices.length > 0 && (
            <View style={styles.mergeDockedCard}>
              <View style={styles.mergeDockedHeader}>
                <View style={styles.mergeDockedCountBadge}>
                  <Ionicons name="git-merge" size={14} color={Colors.white} />
                  <Text style={styles.mergeDockedCountText}>
                    {selectedLineIndices.length} {selectedLineIndices.length === 1 ? 'Line' : 'Lines'} Selected (Lines{' '}
                    {selectedLineIndices.map((i) => i + 1).join(', ')})
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClearSelection} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.mergeDockedClearText}>Clear</Text>
                </TouchableOpacity>
              </View>

              {/* Delimiter Selector */}
              <View style={styles.delimiterContainer}>
                <Text style={styles.delimiterHeaderLabel}>Separator:</Text>
                <View style={styles.delimiterPillRow}>
                  {DELIMITER_OPTIONS.map((opt) => {
                    const active = mergeDelimiter === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.delimiterPill, active && styles.delimiterPillActive]}
                        onPress={() => setMergeDelimiter(opt.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.delimiterPillText, active && styles.delimiterPillTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Merged Preview */}
              <View style={styles.mergePreviewBox}>
                <Text style={styles.mergePreviewLabel}>Merged Preview:</Text>
                <Text style={styles.mergePreviewText} numberOfLines={3}>
                  "{mergedTextPreview}"
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.mergeActionButtonsRow}>
                {/* Fast Qualifications Button */}
                <TouchableOpacity
                  style={styles.fastQualificationsBtn}
                  onPress={() => handleAssignToField('qualifications', 'replace')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="school" size={16} color={Colors.white} />
                  <Text style={styles.fastQualificationsBtnText}>Merge to Qualifications</Text>
                </TouchableOpacity>

                {/* Choose other field */}
                <TouchableOpacity
                  style={styles.chooseTargetFieldBtn}
                  onPress={() => setTargetModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chooseTargetFieldText}>Other Field...</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
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

      {/* Modal: Target Field Selector (for Single Line or Merged Lines) */}
      <Modal
        visible={targetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTargetModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.targetModalCard}>
            <View style={styles.targetModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {selectedLineIndices.length > 1 && (
                    <Ionicons name="git-merge" size={18} color="#7C3AED" />
                  )}
                  <Text style={styles.targetModalTitle}>
                    {selectedLineIndices.length > 1
                      ? `Assign Merged Text (${selectedLineIndices.length} Lines)`
                      : 'Assign Line to Field'}
                  </Text>
                </View>
                <Text style={styles.targetModalSub}>
                  {selectedLineIndices.length > 1
                    ? `Combined lines: ${selectedLineIndices.map((i) => `#${i + 1}`).join(', ')}`
                    : `Line ${selectedLineIndex !== null ? selectedLineIndex + 1 : ''}`}
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
              <Text style={styles.targetLinePreviewLabel}>
                {selectedLineIndices.length > 1 ? 'Merged text to assign:' : 'Selected text:'}
              </Text>
              <Text style={styles.targetLinePreviewContent} numberOfLines={3}>
                "{activeTextToAssign}"
              </Text>
            </View>

            <Text style={styles.targetGridTitle}>Choose target form field:</Text>

            {/* Target Options Grid */}
            <ScrollView style={styles.targetsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.targetsGrid}>
                {TARGET_FIELDS.map((field) => {
                  const existingVal = (workingData as any)[field.key];
                  const hasExisting = Boolean(existingVal && String(existingVal).trim().length > 0);

                  return (
                    <View key={field.key} style={styles.targetOptionCardContainer}>
                      <TouchableOpacity
                        style={[
                          styles.targetOptionCard,
                          hasExisting ? styles.targetOptionCardWithExisting : null,
                        ]}
                        onPress={() => handleAssignToField(field.key, 'replace')}
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
                          {hasExisting && (
                            <Text style={styles.targetOptionExistingPreview} numberOfLines={1}>
                              Current: {String(existingVal)}
                            </Text>
                          )}
                        </View>

                        {/* If field already has a value, show Replace vs Append action buttons */}
                        {hasExisting ? (
                          <View style={styles.targetSplitActionRow}>
                            <TouchableOpacity
                              style={styles.targetReplaceBtn}
                              onPress={() => handleAssignToField(field.key, 'replace')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.targetReplaceBtnText}>Replace</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.targetAppendBtn}
                              onPress={() => handleAssignToField(field.key, 'append')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="add" size={12} color={Colors.white} />
                              <Text style={styles.targetAppendBtnText}>
                                {field.key === 'address' || field.key === 'doctorNotes' ? 'Append ↵' : 'Append ,'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Ionicons name="arrow-forward-circle-outline" size={18} color={field.color} />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {/* Clear Option */}
              {selectedLineIndex !== null && lineAssignments[selectedLineIndex] && (
                <TouchableOpacity
                  style={styles.clearTargetBtn}
                  onPress={() => handleAssignToField('clear')}
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

      {/* ADD MISSING FIELD MODAL */}
      <Modal
        visible={addFieldModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddFieldModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.targetModalCard}>
            <View style={styles.targetModalHeader}>
              <View>
                <Text style={styles.targetModalTitle}>Add Field to Smart Review</Text>
                <Text style={styles.targetModalSub}>Select which field to add and edit:</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddFieldModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.targetsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.targetsGrid}>
                {availableFieldsToAdd.map((field) => (
                  <TouchableOpacity
                    key={field.key}
                    style={styles.targetOptionCard}
                    onPress={() => handleAddCustomField(field.key)}
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
                    <Ionicons name="add" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
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
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
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
  fieldEditedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 3,
  },
  fieldEditedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  fieldUserAddedBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fieldUserAddedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  fieldHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
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
  fieldEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 40,
  },
  fieldEditInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    paddingVertical: 4,
  },
  fieldEditInputMultiline: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  fieldEditPencilIconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },
  fieldResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  fieldResetText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  addMissingFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
    backgroundColor: '#F0FDFA',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  addMissingFieldText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
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
  // Tab 2: Lines Header & Merge Controls
  linesTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  linesTabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  linesTabSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  mergeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 5,
  },
  mergeToggleBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  mergeToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  mergeToggleBtnTextActive: {
    color: Colors.white,
  },
  mergeInstructionsBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 8,
    marginBottom: 10,
  },
  mergeInstructionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mergeInstructionsText: {
    fontSize: 11,
    color: '#3730A3',
    flex: 1,
    lineHeight: 15,
  },
  mergeQuickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  mergeQuickLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  mergeQuickLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  lineCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineCardSelectedForMerge: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
  },
  mergeCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mergeCheckCircleUnselected: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mergeCheckCircleSelected: {
    backgroundColor: Colors.primary,
  },
  mergeCheckOrderText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
  },
  mergeDockedCard: {
    marginTop: 12,
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D8B4FE',
    padding: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  mergeDockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mergeDockedCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  mergeDockedCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  mergeDockedClearText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.danger,
  },
  delimiterContainer: {
    marginBottom: 8,
  },
  delimiterHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  delimiterPillRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  delimiterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  delimiterPillActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#9333EA',
  },
  delimiterPillText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  delimiterPillTextActive: {
    color: '#7E22CE',
    fontWeight: '700',
  },
  mergePreviewBox: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 8,
    marginBottom: 10,
  },
  mergePreviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E22CE',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  mergePreviewText: {
    fontSize: 12,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  mergeActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  fastQualificationsBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  fastQualificationsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  chooseTargetFieldBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  chooseTargetFieldText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  targetOptionCardContainer: {
    marginBottom: 2,
  },
  targetOptionCardWithExisting: {
    borderColor: '#CBD5E1',
  },
  targetOptionExistingPreview: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  targetSplitActionRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  targetReplaceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  targetReplaceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  targetAppendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
    gap: 3,
  },
  targetAppendBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  fieldMergeLinesShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    marginLeft: 'auto',
    marginRight: 6,
  },
  fieldMergeLinesShortcutText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
});
