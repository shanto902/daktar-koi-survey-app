import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { LocationCaptureResult } from '../../services/location/locationService';

interface LocationSectionProps {
  location: LocationCaptureResult | null;
  isCapturing: boolean;
  error?: string | null;
  onCapture: () => void;
  onClear: () => void;
}

export function LocationSection({
  location,
  isCapturing,
  error,
  onCapture,
  onClear,
}: LocationSectionProps) {
  const isAccurate = location?.isAccurate ?? false;
  const accuracyMeters = location?.accuracy ? Math.round(location.accuracy) : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>GPS Location / অবস্থান</Text>
          <Text style={styles.sectionSubtitle}>
            Coordinates will be pinned onto the field survey map
          </Text>
        </View>

        {location && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {location ? (
        <View style={styles.locationCard}>
          <View style={styles.statusRow}>
            <View style={styles.coordsCol}>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>Latitude:</Text>
                <Text style={styles.coordValue}>{location.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>Longitude:</Text>
                <Text style={styles.coordValue}>{location.longitude.toFixed(6)}</Text>
              </View>
            </View>

            {/* Accuracy Badge */}
            {accuracyMeters !== null && (
              <View
                style={[
                  styles.accuracyBadge,
                  { backgroundColor: isAccurate ? Colors.successLight : Colors.warningLight },
                ]}
              >
                <Ionicons
                  name={isAccurate ? 'shield-checkmark' : 'alert-circle'}
                  size={16}
                  color={isAccurate ? Colors.success : Colors.warning}
                />
                <Text
                  style={[
                    styles.accuracyText,
                    { color: isAccurate ? Colors.success : Colors.warning },
                  ]}
                >
                  ±{accuracyMeters}m
                </Text>
              </View>
            )}
          </View>

          {/* Reverse Geocoded Address */}
          {location.address?.formattedAddress && (
            <View style={styles.addressBox}>
              <Ionicons name="map-outline" size={15} color={Colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.addressText} numberOfLines={2}>
                {location.address.formattedAddress}
              </Text>
            </View>
          )}

          {/* Accuracy warning if > 30m */}
          {!isAccurate && accuracyMeters !== null && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={16} color={Colors.warning} />
              <Text style={styles.warningText}>
                GPS accuracy is ±{accuracyMeters}m (poor). Try stepping outdoors or recapture for better precision.
              </Text>
            </View>
          )}

          {/* Recapture Button */}
          <TouchableOpacity
            onPress={onCapture}
            disabled={isCapturing}
            style={styles.recaptureBtn}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
                <Text style={styles.recaptureBtnText}>Recapture Current GPS Position</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="location-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No GPS coordinates captured yet</Text>
          <Text style={styles.emptySubtext}>
            Capture your current position while standing in front of the chamber or facility.
          </Text>

          <TouchableOpacity
            onPress={onCapture}
            disabled={isCapturing}
            style={[styles.captureBtn, isCapturing && styles.disabledBtn]}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="locate" size={18} color={Colors.white} />
                <Text style={styles.captureBtnText}>Capture Current GPS Position</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordsCol: {
    flex: 1,
  },
  coordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  coordLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    width: 75,
  },
  coordValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  addressText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  warningText: {
    fontSize: 12,
    color: '#B45309',
    marginLeft: 6,
    flex: 1,
  },
  recaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: Colors.primary,
  },
  recaptureBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: Colors.card,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
    marginBottom: 14,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  captureBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
  },
});

