import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { SURVEY_TYPES, SurveyType } from '../../constants/surveyTypes';
import { Badge } from '../common/Badge';

export interface MapSurveyItem {
  id: string;
  survey_type: SurveyType;
  latitude: number;
  longitude: number;
  gps_accuracy_meters: number | null;
  status: any;
  doctor_name: string | null;
  facility_name: string | null;
  address: string | null;
}

interface SurveyMapFallbackProps {
  surveys: MapSurveyItem[];
  onSelectSurvey: (id: string) => void;
}

export function SurveyMapFallback({ surveys, onSelectSurvey }: SurveyMapFallbackProps) {
  return (
    <View style={styles.container}>
      <FlatList
        data={surveys}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const typeConfig = SURVEY_TYPES.find((t) => t.value === item.survey_type);
          const title = item.doctor_name || item.facility_name || `${item.survey_type} Survey`;
          const subtitle = item.doctor_name && item.facility_name ? item.facility_name : null;

          return (
            <TouchableOpacity
              onPress={() => onSelectSurvey(item.id)}
              style={styles.card}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: `${typeConfig?.color || Colors.primary}15` },
                ]}
              >
                <Ionicons
                  name={(typeConfig?.icon as any) || 'medical'}
                  size={24}
                  color={typeConfig?.color || Colors.primary}
                />
              </View>

              <View style={styles.detailsCol}>
                <View style={styles.topRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                  <Badge label={item.survey_type} size="sm" color={typeConfig?.color} />
                </View>

                {subtitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}

                {item.address && (
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                )}

                <View style={styles.coordsRow}>
                  <Text style={styles.coordsText}>
                    {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                  </Text>
                  {item.gps_accuracy_meters !== null && (
                    <Text style={styles.accuracyText}>
                      ±{Math.round(item.gps_accuracy_meters)}m
                    </Text>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Coordinates Available</Text>
            <Text style={styles.emptySubtitle}>
              None of the current surveys have GPS coordinates attached.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsCol: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  coordsText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  accuracyText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});

