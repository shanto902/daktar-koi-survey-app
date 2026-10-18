import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useDashboard } from '../../src/hooks/useDashboard';
import { StatCard } from '../../src/components/common/StatCard';
import { SurveyCard } from '../../src/components/survey/SurveyCard';
import { EmptyState } from '../../src/components/common/EmptyState';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { stats, recentSurveys, loading, refresh } = useDashboard();

  // Refresh every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 80 },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} colors={[Colors.primary]} />}
      >
        {/* Header Banner */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>Doctor Survey</Text>
            <Text style={styles.appSubtitle}>
              Bangladesh Health Facilities & Doctor Chamber Directory
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/settings')}
            style={styles.settingsIconBtn}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/new-survey')}
            style={[styles.quickActionBtn, { backgroundColor: Colors.primary }]}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color={Colors.white} />
            <Text style={styles.quickActionText}>New Survey</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/surveys')}
            style={[styles.quickActionBtn, { backgroundColor: Colors.secondary }]}
            activeOpacity={0.85}
          >
            <Ionicons name="folder-open" size={20} color={Colors.white} />
            <Text style={styles.quickActionText}>All Surveys</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/map')}
            style={[styles.quickActionBtn, { backgroundColor: '#0D9488' }]}
            activeOpacity={0.85}
          >
            <Ionicons name="map" size={20} color={Colors.white} />
            <Text style={styles.quickActionText}>Map View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/export')}
            style={[styles.quickActionBtn, { backgroundColor: '#6366F1' }]}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload" size={20} color={Colors.white} />
            <Text style={styles.quickActionText}>Backup</Text>
          </TouchableOpacity>
        </View>

        {/* Real Statistics Calculated from SQLite */}
        <Text style={styles.sectionHeader}>Field Data Overview</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Surveys"
              count={stats.totalSurveys}
              subtitle="All local records"
              icon="document-text"
              color={Colors.primary}
              bgColor={Colors.primaryLight}
              onPress={() => router.push('/(tabs)/surveys')}
            />
            <StatCard
              title="Doctors"
              count={stats.totalDoctors}
              subtitle="Registered doctors"
              icon="person"
              color={Colors.secondary}
              bgColor={Colors.secondaryLight}
            />
          </View>

          <View style={styles.statsRow}>
            <StatCard
              title="Facilities"
              count={stats.totalFacilities}
              subtitle="Hospitals, clinics, etc."
              icon="business"
              color="#8B5CF6"
              bgColor="#EDE9FE"
            />
            <StatCard
              title="Created Today"
              count={stats.surveysToday}
              subtitle="Today's fieldwork"
              icon="today"
              color={Colors.success}
              bgColor={Colors.successLight}
            />
          </View>

          <View style={styles.statsRow}>
            <StatCard
              title="OCR Completed"
              count={stats.surveysWithOcr}
              subtitle="Text extracted"
              icon="scan"
              color="#F59E0B"
              bgColor="#FEF3C7"
            />
            <StatCard
              title="Missing GPS"
              count={stats.surveysMissingGps}
              subtitle={stats.surveysMissingGps > 0 ? 'Needs coordinate tagging' : 'All tagged'}
              icon="location"
              color={stats.surveysMissingGps > 0 ? Colors.danger : Colors.textMuted}
              bgColor={stats.surveysMissingGps > 0 ? Colors.dangerLight : Colors.borderLight}
            />
          </View>
        </View>

        {/* Recently Created Surveys */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionHeader}>Recent Surveys</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/surveys')}>
            <Text style={styles.viewAllText}>View All ({stats.totalSurveys}) →</Text>
          </TouchableOpacity>
        </View>

        {recentSurveys.length > 0 ? (
          recentSurveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              item={survey}
              onPress={() => router.push({ pathname: '/survey/[id]', params: { id: survey.id } })}
              onEdit={() => router.push({ pathname: '/survey/edit/[id]', params: { id: survey.id } })}
            />
          ))
        ) : (
          <EmptyState
            icon="document-text-outline"
            title="No Surveys Yet"
            description="Start collecting doctor visiting cards, chamber banners, and clinic signboards."
            actionLabel="Start First Survey"
            onAction={() => router.push('/(tabs)/new-survey')}
          />
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  appSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: 280,
  },
  settingsIconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quickActionText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  statsGrid: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
