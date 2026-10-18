import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Header } from '../../src/components/common/Header';
import { Button } from '../../src/components/common/Button';
import { ConfirmModal } from '../../src/components/common/ConfirmModal';
import { exportService } from '../../src/services/backup/exportService';
import { importService } from '../../src/services/backup/importService';
import { surveyRepository } from '../../src/database/repositories/surveyRepository';
import { fileStorage } from '../../src/services/storage/fileStorage';
import { DashboardStats } from '../../src/types';

export default function ExportBackupScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [storageStats, setStorageStats] = useState<{ photoCount: number; totalBytes: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; stage: string } | null>(null);

  // Restore state
  const [pendingFileUri, setPendingFileUri] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [confirmReplaceModalVisible, setConfirmReplaceModalVisible] = useState(false);

  const loadStats = async () => {
    try {
      const [dStats, sStats] = await Promise.all([
        surveyRepository.getDashboardStats(),
        fileStorage.getStorageStats(),
      ]);
      setStats(dStats);
      setStorageStats(sStats);
    } catch (e) {
      console.warn('Failed loading export stats:', e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 1. Export Complete JSON Backup
  const handleExportComplete = async () => {
    try {
      setIsExporting(true);
      setExportProgress({ current: 0, total: 100, stage: 'Starting complete backup...' });

      const { filePath, totalPhotos } = await exportService.exportCompleteJson(
        (progress) => setExportProgress(progress)
      );

      await exportService.shareFile(filePath, 'application/json');
      Alert.alert(
        'Complete Backup Generated',
        `Successfully packaged all survey records and ${totalPhotos} Base64 encoded photographs. You can now save or share this backup file.`
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to export complete backup.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // 2. Export Data-Only JSON
  const handleExportDataOnly = async () => {
    try {
      setIsExporting(true);
      const filePath = await exportService.exportDataOnlyJson();
      await exportService.shareFile(filePath, 'application/json');
      Alert.alert(
        'Data-Only JSON Exported',
        'Exported structured records without embedded images. Note: This file does NOT include photograph binary data.'
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to export data-only JSON.');
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Export ZIP Backup
  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      setExportProgress({ current: 0, total: 100, stage: 'Building ZIP archive...' });

      const filePath = await exportService.exportZipBackup((progress) => setExportProgress(progress));
      await exportService.shareFile(filePath, 'application/zip');
      Alert.alert('ZIP Backup Generated', 'Successfully created ZIP archive containing backup.json, manifest.json, and all original photographs.');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to create ZIP archive.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // 4. Export CSV Files
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const csvFiles = await exportService.exportAllCsv();
      await exportService.shareFile(csvFiles.surveys, 'text/csv');
      Alert.alert(
        'CSV Export Complete',
        'Generated Excel-compatible UTF-8 BOM CSV files for surveys, doctors, facilities, and chamber relationships.'
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to export CSVs.');
    } finally {
      setIsExporting(false);
    }
  };

  // 5. Restore File Picker
  const handlePickRestoreFile = async (mode: 'merge' | 'replace') => {
    try {
      const picked = await importService.pickBackupFile();
      if (!picked) return;

      if (mode === 'replace') {
        setPendingFileUri(picked.uri);
        setPendingFileName(picked.name);
        setConfirmReplaceModalVisible(true);
      } else {
        await executeRestore(picked.uri, 'merge');
      }
    } catch (err: any) {
      Alert.alert('File Selection Failed', err?.message);
    }
  };

  const executeRestore = async (uri: string, mode: 'merge' | 'replace') => {
    try {
      setIsImporting(true);
      const res = await importService.importFromFileUri(uri, mode);
      await loadStats();

      if (res.success) {
        Alert.alert(
          'Restore Succeeded',
          `Successfully restored ${res.totalSurveysImported} surveys, ${res.totalDoctorsImported} doctors, ${res.totalFacilitiesImported} facilities, and ${res.totalPhotosRestored} photographs.` +
            (res.conflictsReported > 0 ? `\n\nSkipped ${res.conflictsReported} conflicting records to avoid overwriting.` : '')
        );
      } else {
        Alert.alert('Restore Error', res.errors.join('\n'));
      }
    } catch (err: any) {
      Alert.alert('Restore Failed', err?.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmReplace = async () => {
    setConfirmReplaceModalVisible(false);
    if (pendingFileUri) {
      await executeRestore(pendingFileUri, 'replace');
      setPendingFileUri(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header title="Export & Backup" subtitle="Local Source of Truth Management" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 80 },
        ]}
      >
        {/* Dataset Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current Local Dataset</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{stats?.totalSurveys ?? 0}</Text>
              <Text style={styles.summaryLabel}>Surveys</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{stats?.totalDoctors ?? 0}</Text>
              <Text style={styles.summaryLabel}>Doctors</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{stats?.totalFacilities ?? 0}</Text>
              <Text style={styles.summaryLabel}>Facilities</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{storageStats?.photoCount ?? 0}</Text>
              <Text style={styles.summaryLabel}>Photos</Text>
            </View>
          </View>
          <Text style={styles.storageSizeText}>
            Local Photos Storage: {formatBytes(storageStats?.totalBytes ?? 0)}
          </Text>
        </View>

        {/* Export Progress Indicator */}
        {isExporting && exportProgress && (
          <View style={styles.progressCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.progressStage}>{exportProgress.stage}</Text>
            <Text style={styles.progressPercent}>{exportProgress.current}%</Text>
          </View>
        )}

        {/* Section 1: Export Options */}
        <Text style={styles.sectionTitle}>Export Options / ব্যাকআপ তৈরি</Text>

        {/* Complete JSON Backup (Primary) */}
        <View style={styles.exportCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            <View style={styles.cardHeaderTextCol}>
              <Text style={styles.cardHeaderTitle}>Complete Base64 JSON Backup</Text>
              <Text style={styles.recommendedBadge}>RECOMMENDED FOR ARCHIVE</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            Contains all structured SQLite records, doctor details, chamber schedules, and the actual photograph files encoded in Base64. Completely standalone.
          </Text>
          <Button
            title="Export Complete JSON Backup"
            onPress={handleExportComplete}
            variant="primary"
            icon="download-outline"
            loading={isExporting}
          />
        </View>

        {/* ZIP Package Backup */}
        <View style={styles.exportCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="archive-outline" size={22} color="#0D9488" />
            <View style={styles.cardHeaderTextCol}>
              <Text style={styles.cardHeaderTitle}>Export ZIP Backup Archive</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            Bundles metadata.json, manifest.json, and original image files inside a standard compressed ZIP archive. Ideal for desktop inspection.
          </Text>
          <Button
            title="Export ZIP Backup"
            onPress={handleExportZip}
            variant="outline"
            icon="archive-outline"
            loading={isExporting}
          />
        </View>

        {/* Data-Only JSON (Clearly labeled) */}
        <View style={styles.exportCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="code-slash-outline" size={22} color={Colors.secondary} />
            <View style={styles.cardHeaderTextCol}>
              <Text style={styles.cardHeaderTitle}>Export Data-Only JSON</Text>
              <Text style={styles.sublabelBadge}>NO EMBEDDED IMAGES</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            Exports all textual and relational data without embedded image binaries. Fast and lightweight, but cannot restore original photographs.
          </Text>
          <Button
            title="Export Data-Only JSON"
            onPress={handleExportDataOnly}
            variant="outline"
            icon="document-text-outline"
            loading={isExporting}
          />
        </View>

        {/* CSV Exports */}
        <View style={styles.exportCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="grid-outline" size={22} color={Colors.textSecondary} />
            <View style={styles.cardHeaderTextCol}>
              <Text style={styles.cardHeaderTitle}>Export CSV Spreadsheets</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            Exports separate CSV tables with UTF-8 BOM encoding for proper Bangla font rendering in Microsoft Excel and Google Sheets.
          </Text>
          <Button
            title="Export CSV Files"
            onPress={handleExportCsv}
            variant="outline"
            icon="receipt-outline"
            loading={isExporting}
          />
        </View>

        {/* Section 2: Restore / Import */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Restore & Import / ব্যাকআপ পুনরুদ্ধার</Text>

        <View style={styles.restoreCard}>
          <Text style={styles.restoreDesc}>
            Restore previously exported JSON or ZIP backups to this device. You can choose to merge new records or replace all local data.
          </Text>

          <View style={styles.restoreBtnRow}>
            <Button
              title="Merge Restore"
              onPress={() => handlePickRestoreFile('merge')}
              variant="outline"
              icon="git-merge-outline"
              loading={isImporting}
              style={{ flex: 1, marginRight: 8 }}
            />

            <Button
              title="Replace All Data"
              onPress={() => handlePickRestoreFile('replace')}
              variant="danger"
              icon="refresh-outline"
              loading={isImporting}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Confirm Replace All Modal */}
      <ConfirmModal
        visible={confirmReplaceModalVisible}
        title="Replace All Local Data?"
        message={`WARNING: Restoring "${pendingFileName}" in Replace All mode will wipe all current local surveys, doctors, and photos on this device and replace them with the backup dataset.\n\nThis cannot be undone. Are you sure you wish to proceed?`}
        confirmLabel="Yes, Replace All"
        isDangerous
        onConfirm={handleConfirmReplace}
        onCancel={() => {
          setConfirmReplaceModalVisible(false);
          setPendingFileUri(null);
        }}
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
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  storageSizeText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
  },
  progressCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStage: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryDark,
    flex: 1,
    marginLeft: 10,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  exportCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  recommendedBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 1,
  },
  sublabelBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.warning,
    marginTop: 1,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  restoreCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restoreDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  restoreBtnRow: {
    flexDirection: 'row',
  },
});
