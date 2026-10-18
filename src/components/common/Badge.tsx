import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { SURVEY_STATUSES, SURVEY_TYPES, SurveyStatus, SurveyType } from '../../constants/surveyTypes';

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  variant?: 'status' | 'type' | 'custom';
  statusValue?: SurveyStatus;
  typeValue?: SurveyType;
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  color,
  backgroundColor,
  variant = 'custom',
  statusValue,
  typeValue,
  size = 'md',
}: BadgeProps) {
  let badgeColor = color || Colors.primary;
  let badgeBg = backgroundColor || Colors.primaryLight;
  let text = label;

  if (variant === 'status' && statusValue) {
    const s = SURVEY_STATUSES.find((st) => st.value === statusValue);
    if (s) {
      badgeColor = s.color;
      badgeBg = s.bgColor;
      text = `${s.label} (${s.labelBn})`;
    }
  } else if (variant === 'type' && typeValue) {
    const t = SURVEY_TYPES.find((tp) => tp.value === typeValue);
    if (t) {
      badgeColor = t.color;
      badgeBg = `${t.color}15`; // 15% opacity hex
      text = `${t.label}`;
    }
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeBg },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: badgeColor },
          isSmall && styles.textSm,
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  textSm: {
    fontSize: 10,
    fontWeight: '600',
  },
});

