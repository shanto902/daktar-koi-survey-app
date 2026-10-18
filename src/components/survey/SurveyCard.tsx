import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { SurveySummaryItem } from '../../types';
import { Badge } from '../common/Badge';
import { fileStorage } from '../../services/storage/fileStorage';

interface SurveyCardProps {
  item: SurveySummaryItem;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SurveyCard({ item, onPress, onEdit, onDelete }: SurveyCardProps) {
  const title =
    item.doctor_name_bn ||
    item.doctor_name_en ||
    item.facility_name_bn ||
    item.facility_name_en ||
    `${item.survey_type} Survey`;

  const subtitle =
    (item.doctor_name_bn && item.facility_name_bn) ||
    (item.doctor_name_en && item.facility_name_en) ||
    item.facility_name_bn ||
    item.facility_name_en ||
    null;

  const hasGps = item.latitude !== null && item.longitude !== null;
  const imageUri = item.primary_photo_path ? fileStorage.resolveUri(item.primary_photo_path) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <Badge label={item.survey_type} variant="type" typeValue={item.survey_type} size="sm" />
          <View style={{ width: 6 }} />
          <Badge label={item.status} variant="status" statusValue={item.status} size="sm" />
        </View>

        <Text style={styles.dateText}>{item.survey_date}</Text>
      </View>

      <View style={styles.bodyRow}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Ionicons name="camera-outline" size={24} color={Colors.textMuted} />
          </View>
        )}

        <View style={styles.contentCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          {item.primary_phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{item.primary_phone}</Text>
            </View>
          )}

          <View style={styles.footerRow}>
            {/* GPS Indicator */}
            <View style={styles.metaBadge}>
              <Ionicons
                name={hasGps ? 'location' : 'location-outline'}
                size={13}
                color={hasGps ? Colors.success : Colors.danger}
              />
              <Text
                style={[
                  styles.metaText,
                  { color: hasGps ? Colors.success : Colors.danger },
                ]}
              >
                {hasGps
                  ? `GPS (${item.gps_accuracy_meters ? Math.round(item.gps_accuracy_meters) + 'm' : 'OK'})`
                  : 'No GPS'}
              </Text>
            </View>

            {/* Photos count */}
            <View style={styles.metaBadge}>
              <Ionicons name="images-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{item.photo_count} photo{item.photo_count !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Row */}
      {(onEdit || onDelete) && (
        <View style={styles.actionRow}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Ionicons name="create-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionBtnDanger}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              <Text style={styles.actionBtnTextDanger}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  bodyRow: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginRight: 12,
  },
  placeholderThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 10,
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 4,
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  actionBtnTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
    marginLeft: 4,
  },
});

