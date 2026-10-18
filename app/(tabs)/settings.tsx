import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { Header } from '../../src/components/common/Header';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { ConfirmModal } from '../../src/components/common/ConfirmModal';
import { SelectModal, SelectOption } from '../../src/components/common/SelectModal';
import { settingsRepository } from '../../src/database/repositories/settingsRepository';
import { resetDatabase } from '../../src/database';
import { seedSampleSurveys } from '../../src/database/seedData';
import { fileStorage } from '../../src/services/storage/fileStorage';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState<'google' | 'mock' | 'gateway'>('google');
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [googleKey, setGoogleKey] = useState('');
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [languageHints, setLanguageHints] = useState('bn,en');
  const [proximityMeters, setProximityMeters] = useState('100');

  const [storageInfo, setStorageInfo] = useState<{ photoCount: number; totalBytes: number } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [confirmWipeVisible, setConfirmWipeVisible] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const loadSettings = React.useCallback(async () => {
    try {
      const p = await settingsRepository.get('ocr_provider', 'google');
      const gk = await settingsRepository.get('google_cloud_vision_key', '');
      const gw = await settingsRepository.get('ocr_gateway_url', '');
      const lh = await settingsRepository.get('ocr_language_hints', 'bn,en');
      const pm = await settingsRepository.get('proximity_threshold_meters', '100');

      setProvider(p as any);
      setGoogleKey(gk || '');
      setGatewayUrl(gw || '');
      setLanguageHints(lh || 'bn,en');
      setProximityMeters(pm || '100');

      const st = await fileStorage.getStorageStats();
      setStorageInfo(st);
    } catch (e) {
      console.warn('Failed loading settings:', e);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      await Promise.all([
        settingsRepository.set('ocr_provider', provider),
        settingsRepository.set('google_cloud_vision_key', googleKey.trim()),
        settingsRepository.set('ocr_gateway_url', gatewayUrl.trim()),
        settingsRepository.set('ocr_language_hints', languageHints.trim()),
        settingsRepository.set('proximity_threshold_meters', proximityMeters.trim()),
      ]);
      Alert.alert('Settings Saved', 'Configuration saved to local database successfully.');
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      setIsSeeding(true);
      const res = await seedSampleSurveys();
      await loadSettings();
      Alert.alert(
        'Demo Data Seeded',
        `Successfully populated ${res.surveysSeeded} realistic Bangladesh doctor and facility surveys with GPS coordinates, chamber timings, and Bangla doctor profiles.`
      );
    } catch (e: any) {
      Alert.alert('Seeding Failed', e?.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleConfirmWipe = async () => {
    try {
      setIsWiping(true);
      setConfirmWipeVisible(false);
      await resetDatabase();
      await fileStorage.clearPhotos();
      await fileStorage.clearExports();
      await loadSettings();
      Alert.alert('Database Reset', 'All local records and photographs have been wiped clean.');
    } catch (e: any) {
      Alert.alert('Wipe Failed', e?.message || 'Could not reset local database.');
    } finally {
      setIsWiping(false);
    }
  };

  const providerOptions: SelectOption[] = [
    {
      label: 'Google Cloud Vision',
      labelBn: 'গুগল ক্লাউড ভিশন',
      value: 'google',
      icon: 'cloud-outline',
      subtitle: 'Official Google Vision OCR with Bengali language hints',
    },
    {
      label: 'Simulation (Offline Demo)',
      labelBn: 'অফলাইন ডেমো',
      value: 'mock',
      icon: 'phone-portrait-outline',
      subtitle: 'Deterministic offline simulation for testing without API keys',
    },
    {
      label: 'Custom Backend Gateway',
      labelBn: 'কাস্টম গেটওয়ে',
      value: 'gateway',
      icon: 'server-outline',
      subtitle: 'Proxy OCR requests through an organizational secure server',
    },
  ];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header title="Settings" subtitle="Configuration & Offline Storage" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 80 },
        ]}
      >
        {/* Section 1: OCR Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OCR Service Configuration</Text>
          <Text style={styles.cardSubtitle}>
            Configure Bangla and English text extraction from visiting cards and signboards.
          </Text>

          {/* Provider Selector */}
          <Text style={styles.fieldLabel}>Active OCR Provider</Text>
          <TouchableOpacity
            onPress={() => setProviderModalVisible(true)}
            style={styles.selectRow}
          >
            <View>
              <Text style={styles.selectValue}>
                {providerOptions.find((p) => p.value === provider)?.label}
              </Text>
              <Text style={styles.selectSubtitle}>
                {providerOptions.find((p) => p.value === provider)?.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {/* Google Vision API Key Input */}
          {provider === 'google' && (
            <View style={{ marginTop: 14 }}>
              <Input
                label="Google Cloud Vision API Key"
                placeholder="AIzaSy..."
                value={googleKey}
                onChangeText={setGoogleKey}
                secureTextEntry={!showApiKey}
                rightIcon={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowApiKey((prev) => !prev)}
                helperText="Stored locally in device SQLite private storage. Never hardcoded into application bundles."
              />
            </View>
          )}

          {/* Custom Gateway URL */}
          {provider === 'gateway' && (
            <View style={{ marginTop: 14 }}>
              <Input
                label="Gateway Endpoint URL"
                placeholder="https://api.yourorganization.org/ocr"
                value={gatewayUrl}
                onChangeText={setGatewayUrl}
                autoCapitalize="none"
                keyboardType="url"
                helperText="POST endpoint accepting Base64 image JSON payloads."
              />
            </View>
          )}

          {/* Language Hints */}
          <Input
            label="Language Hints (ISO codes)"
            placeholder="bn,en"
            value={languageHints}
            onChangeText={setLanguageHints}
            helperText="Default: bn,en (Bengali & English)"
          />

          <Button
            title="Save OCR Settings"
            onPress={handleSaveSettings}
            loading={isSavingSettings}
            variant="primary"
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Section 2: Duplicate Detection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Duplicate Detection</Text>
          <Text style={styles.cardSubtitle}>
            Alert surveyors when surveying near an existing chamber or duplicate phone/BMDC.
          </Text>

          <Input
            label="GPS Proximity Threshold (Meters)"
            placeholder="100"
            value={proximityMeters}
            onChangeText={setProximityMeters}
            keyboardType="numeric"
            helperText="Warns if an existing surveyed location is within this radius."
          />
        </View>

        {/* Section 3: Data Management & Testing Tools */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data & Testing Tools</Text>
          <Text style={styles.cardSubtitle}>
            Populate sample surveys for testing or wipe local storage.
          </Text>

          {storageInfo && (
            <View style={styles.storageBox}>
              <Ionicons name="folder-outline" size={20} color={Colors.primary} />
              <View style={styles.storageTextCol}>
                <Text style={styles.storageTitle}>Local Document Storage</Text>
                <Text style={styles.storageDesc}>
                  {storageInfo.photoCount} photographs ({formatBytes(storageInfo.totalBytes)})
                </Text>
              </View>
            </View>
          )}

          <Button
            title="Seed Realistic Demo Surveys"
            onPress={handleSeedDemoData}
            variant="outline"
            icon="flask-outline"
            loading={isSeeding}
            style={{ marginBottom: 12 }}
          />

          <Button
            title={isWiping ? "Wiping Local Database..." : "Wipe Local Database"}
            onPress={() => setConfirmWipeVisible(true)}
            variant="danger"
            icon="trash-outline"
            loading={isWiping}
            disabled={isWiping || isSeeding}
          />
        </View>

        {/* Section 4: App Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Doctor Survey - Android Field Edition</Text>
          <Text style={styles.infoRowText}>App Version: 1.0.0 (Expo SDK 58)</Text>
          <Text style={styles.infoRowText}>Relational Database: SQLite (expo-sqlite)</Text>
          <Text style={styles.infoRowText}>Architecture: Offline-First Local Source of Truth</Text>
          <Text style={styles.infoRowText}>Target Country: Bangladesh (Bangla Unicode & Geodata)</Text>
        </View>
      </ScrollView>

      {/* Select Provider Modal */}
      <SelectModal
        visible={providerModalVisible}
        title="Select OCR Provider"
        options={providerOptions}
        selectedValue={provider}
        onSelect={(opt) => setProvider(opt.value as any)}
        onClose={() => setProviderModalVisible(false)}
        searchable={false}
      />

      {/* Confirm Wipe Modal */}
      <ConfirmModal
        visible={confirmWipeVisible}
        title="Wipe Entire Local Database?"
        message="This will permanently delete all surveys, doctors, facilities, and local photograph files from this device. Please ensure you have exported a backup if you need this data."
        confirmLabel="Yes, Wipe Everything"
        isDangerous
        onConfirm={handleConfirmWipe}
        onCancel={() => setConfirmWipeVisible(false)}
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
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 14,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
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
    marginBottom: 14,
  },
  selectValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  selectSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  storageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  storageTextCol: {
    marginLeft: 10,
  },
  storageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  storageDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoCard: {
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  infoRowText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

