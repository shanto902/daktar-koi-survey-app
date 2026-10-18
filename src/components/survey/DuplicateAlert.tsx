import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DuplicateMatch } from '../../types';

interface DuplicateAlertProps {
  matches: DuplicateMatch[];
  onSelectExisting?: (match: DuplicateMatch) => void;
  onDismiss?: () => void;
}

export function DuplicateAlert({ matches, onSelectExisting, onDismiss }: DuplicateAlertProps) {
  if (!matches || matches.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="warning" size={20} color="#B45309" />
          <Text style={styles.title}>
            Potential Duplicate Records Detected ({matches.length})
          </Text>
        </View>

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Ionicons name="close" size={18} color="#B45309" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>
        Existing records match your entered phone number, BMDC number, or GPS coordinates:
      </Text>

      {matches.map((item, idx) => (
        <View key={`${item.id}-${idx}`} style={styles.matchItem}>
          <View style={styles.matchContent}>
            <Text style={styles.matchTitle}>{item.title}</Text>
            {item.subtitle && <Text style={styles.matchSubtitle}>{item.subtitle}</Text>}
            <Text style={styles.matchReason}>• {item.reason}</Text>
          </View>

          {onSelectExisting && (
            <TouchableOpacity
              onPress={() => onSelectExisting(item)}
              style={styles.viewExistingBtn}
            >
              <Text style={styles.viewExistingText}>View</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: '#FDE68A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 6,
  },
  dismissBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: 10,
    lineHeight: 16,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  matchContent: {
    flex: 1,
    marginRight: 8,
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  matchSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  matchReason: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 3,
    fontWeight: '600',
  },
  viewExistingBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewExistingText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});

