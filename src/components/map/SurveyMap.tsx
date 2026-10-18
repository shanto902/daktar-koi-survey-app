import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { SURVEY_TYPES } from '../../constants/surveyTypes';
import { MapSurveyItem, SurveyMapFallback } from './SurveyMapFallback';
import { LeafletMap } from './LeafletMap';
import { locationService } from '../../services/location/locationService';

interface SurveyMapProps {
  surveys: MapSurveyItem[];
  onSelectSurvey: (id: string) => void;
  onSwitchToList?: () => void;
}

export function SurveyMap({ surveys, onSelectSurvey, onSwitchToList }: SurveyMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [mapEngine, setMapEngine] = useState<'osm' | 'google'>('osm');
  const [forceListView, setForceListView] = useState(Platform.OS === 'web');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Check location permissions
  useEffect(() => {
    let isMounted = true;
    locationService.checkPermissions().then((granted) => {
      if (isMounted) setHasLocationPermission(granted);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Center calculation for native Google Maps
  const initialRegion = useMemo(() => {
    if (surveys.length === 0) {
      return {
        latitude: 23.8103,
        longitude: 90.4125,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };
    }

    const lats = surveys.map((s) => s.latitude);
    const lngs = surveys.map((s) => s.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const latDelta = Math.max(maxLat - minLat + 0.05, 0.08);
    const lngDelta = Math.max(maxLng - minLng + 0.05, 0.08);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [surveys]);

  const handleFitAll = useCallback(() => {
    if (mapRef.current && surveys.length > 0) {
      const coords = surveys.map((s) => ({
        latitude: s.latitude,
        longitude: s.longitude,
      }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 70, right: 50, bottom: 90, left: 50 },
        animated: true,
      });
    }
  }, [surveys]);

  useEffect(() => {
    if (mapReady && surveys.length > 0 && mapEngine === 'google') {
      handleFitAll();
    }
  }, [mapReady, surveys, mapEngine, handleFitAll]);

  // Fallback to list mode if requested
  if (forceListView) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => setForceListView(false)}
            style={styles.toggleBtn}
          >
            <Ionicons name="map" size={16} color={Colors.primary} />
            <Text style={styles.toggleBtnText}>Switch to Interactive Map</Text>
          </TouchableOpacity>
        </View>
        <SurveyMapFallback surveys={surveys} onSelectSurvey={onSelectSurvey} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* MAP ENGINE: OpenStreetMap (Default, reliable, zero API key) */}
      {mapEngine === 'osm' ? (
        <LeafletMap surveys={surveys} onSelectSurvey={onSelectSurvey} />
      ) : (
        /* Native Google Maps */
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={hasLocationPermission}
          loadingEnabled
          loadingIndicatorColor={Colors.primary}
          loadingBackgroundColor="#F9FAFB"
          onMapReady={() => setMapReady(true)}
        >
          {surveys.map((item) => {
            const typeConfig = SURVEY_TYPES.find((t) => t.value === item.survey_type);
            const pinColor = typeConfig?.color || Colors.primary;
            const title = item.doctor_name || item.facility_name || `${item.survey_type} Survey`;

            return (
              <Marker
                key={item.id}
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                pinColor={pinColor}
                title={title}
                description={item.address || item.survey_type}
              >
                <Callout onPress={() => onSelectSurvey(item.id)}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle}>{title}</Text>
                    {item.facility_name && item.doctor_name && (
                      <Text style={styles.calloutSubtitle}>{item.facility_name}</Text>
                    )}
                    {item.address && (
                      <Text style={styles.calloutAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                    )}
                    <View style={styles.calloutAction}>
                      <Text style={styles.calloutActionText}>Tap to View Details →</Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Floating Control Toolbar */}
      <View style={styles.floatingToolbar}>
        {/* Layer Source Toggle */}
        <TouchableOpacity
          onPress={() => setMapEngine(mapEngine === 'osm' ? 'google' : 'osm')}
          style={styles.controlPill}
          activeOpacity={0.8}
        >
          <Ionicons
            name={mapEngine === 'osm' ? 'earth' : 'logo-google'}
            size={14}
            color={Colors.primary}
          />
          <Text style={styles.controlPillText}>
            {mapEngine === 'osm' ? 'OpenStreetMap' : 'Google Maps'}
          </Text>
          <Ionicons name="swap-horizontal" size={13} color={Colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Switch to List View */}
        <TouchableOpacity
          onPress={() => {
            if (onSwitchToList) {
              onSwitchToList();
            } else {
              setForceListView(true);
            }
          }}
          style={styles.controlPill}
          activeOpacity={0.8}
        >
          <Ionicons name="list" size={14} color={Colors.primary} />
          <Text style={styles.controlPillText}>List ({surveys.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Notice if Google Maps is active and might be blank on Android without API Key */}
      {mapEngine === 'google' && Platform.OS === 'android' && (
        <View style={styles.hintBanner}>
          <Ionicons name="information-circle" size={16} color="#92400E" />
          <Text style={styles.hintText}>
            Google Maps requires an Android API key. If blank, tap above to switch to OpenStreetMap.
          </Text>
          <TouchableOpacity onPress={() => setMapEngine('osm')} style={styles.hintBtn}>
            <Text style={styles.hintBtnText}>Use OSM</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    padding: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 6,
  },
  floatingToolbar: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 6,
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  controlPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 6,
  },
  hintBanner: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  hintText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    marginLeft: 6,
    lineHeight: 15,
  },
  hintBtn: {
    backgroundColor: '#B45309',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 6,
  },
  hintBtnText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  calloutCard: {
    padding: 8,
    minWidth: 160,
    maxWidth: 220,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  calloutAddress: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  calloutAction: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  calloutActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
});

