import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { SURVEY_TYPES, SurveyType } from '../../src/constants/surveyTypes';
import { Header } from '../../src/components/common/Header';
import { SurveyMap } from '../../src/components/map/SurveyMap';
import { MapSurveyItem, SurveyMapFallback } from '../../src/components/map/SurveyMapFallback';
import { surveyRepository } from '../../src/database/repositories/surveyRepository';

export default function MapViewScreen() {
  const [allPoints, setAllPoints] = useState<MapSurveyItem[]>([]);
  const [selectedType, setSelectedType] = useState<SurveyType | 'ALL'>('ALL');
  const [missingCoordsCount, setMissingCoordsCount] = useState(0);

  const loadMapData = useCallback(async () => {
    const points = await surveyRepository.getForMap();
    setAllPoints(points as MapSurveyItem[]);

    const stats = await surveyRepository.getDashboardStats();
    setMissingCoordsCount(stats.surveysMissingGps);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMapData();
    }, [loadMapData])
  );

  const filteredPoints =
    selectedType === 'ALL'
      ? allPoints
      : allPoints.filter((p) => p.survey_type === selectedType);

  const handleSelectSurvey = (id: string) => {
    router.push({ pathname: '/survey/[id]', params: { id } });
  };

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Field Map"
        subtitle={`${filteredPoints.length} locations mapped`}
        rightAction={{
          icon: 'refresh',
          onPress: loadMapData,
        }}
      />

      {/* View Switcher: Interactive Map vs Location List */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          onPress={() => setViewMode('map')}
          style={[styles.viewModeBtn, viewMode === 'map' && styles.viewModeBtnActive]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="map"
            size={16}
            color={viewMode === 'map' ? Colors.primary : Colors.textMuted}
          />
          <Text
            style={[
              styles.viewModeBtnText,
              viewMode === 'map' && styles.viewModeBtnTextActive,
            ]}
          >
            Interactive Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="list"
            size={16}
            color={viewMode === 'list' ? Colors.primary : Colors.textMuted}
          />
          <Text
            style={[
              styles.viewModeBtnText,
              viewMode === 'list' && styles.viewModeBtnTextActive,
            ]}
          >
            Location List ({filteredPoints.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Facility Type Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            onPress={() => setSelectedType('ALL')}
            style={[styles.typePill, selectedType === 'ALL' && styles.typePillActive]}
          >
            <Text style={[styles.typePillText, selectedType === 'ALL' && styles.typePillTextActive]}>
              All Types ({allPoints.length})
            </Text>
          </TouchableOpacity>

          {SURVEY_TYPES.map((t) => {
            const active = selectedType === t.value;
            const count = allPoints.filter((p) => p.survey_type === t.value).length;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => setSelectedType(active ? 'ALL' : t.value)}
                style={[
                  styles.typePill,
                  active && { backgroundColor: `${t.color}20`, borderColor: t.color },
                ]}
              >
                <Ionicons name={t.icon as any} size={14} color={active ? t.color : Colors.textSecondary} />
                <Text
                  style={[
                    styles.typePillText,
                    active && { color: t.color, fontWeight: '700' },
                  ]}
                >
                  {t.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Missing Coordinates Notification if any */}
      {missingCoordsCount > 0 && (
        <View style={styles.missingNotice}>
          <Ionicons name="information-circle" size={16} color={Colors.warning} />
          <Text style={styles.missingNoticeText}>
            {missingCoordsCount} survey record{missingCoordsCount !== 1 ? 's do' : ' does'} not have GPS coordinates.
          </Text>
        </View>
      )}

      {/* Map or List View */}
      <View style={styles.mapContainer}>
        {viewMode === 'map' ? (
          <SurveyMap
            surveys={filteredPoints}
            onSelectSurvey={handleSelectSurvey}
            onSwitchToList={() => setViewMode('list')}
          />
        ) : (
          <SurveyMapFallback surveys={filteredPoints} onSelectSurvey={handleSelectSurvey} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewModeBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  viewModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  viewModeBtnTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  filterBar: {
    backgroundColor: Colors.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  typePillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  typePillTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  missingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  missingNoticeText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 6,
  },
  mapContainer: {
    flex: 1,
  },
});

