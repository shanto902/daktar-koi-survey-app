import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '../../constants/colors';
import { SURVEY_TYPES } from '../../constants/surveyTypes';
import { MapSurveyItem } from './SurveyMapFallback';

// react-native-webview defines class WebView<P = undefined>, which causes Component<WebViewProps & undefined>
// to collapse to `never` under TypeScript 5+ and React 19 types.
const RNWebView = WebView as unknown as React.ComponentType<any>;

interface LeafletMapProps {
  surveys: MapSurveyItem[];
  onSelectSurvey: (id: string) => void;
}

export function LeafletMap({ surveys, onSelectSurvey }: LeafletMapProps) {
  const webViewRef = useRef<WebView | null>(null);

  // Prepare map points JSON data
  const mapDataJson = useMemo(() => {
    const points = surveys.map((s) => {
      const typeConfig = SURVEY_TYPES.find((t) => t.value === s.survey_type);
      return {
        id: s.id,
        type: s.survey_type,
        color: typeConfig?.color || '#2563EB',
        icon: typeConfig?.icon || 'medical',
        title: s.doctor_name || s.facility_name || `${s.survey_type} Survey`,
        subtitle: s.doctor_name && s.facility_name ? s.facility_name : null,
        address: s.address || '',
        lat: s.latitude,
        lng: s.longitude,
        accuracy: s.gps_accuracy_meters ? Math.round(s.gps_accuracy_meters) : null,
      };
    });
    return JSON.stringify(points);
  }, [surveys]);

  // Generate self-contained Leaflet HTML with OpenStreetMap tiles
  const htmlContent = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background-color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #map { width: 100%; height: 100%; }

    /* Custom Marker Styles */
    .custom-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      border: 2px solid #ffffff;
    }
    .custom-pin-inner {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #ffffff;
      transform: rotate(45deg);
    }

    /* Popup Styling */
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
      padding: 0;
      overflow: hidden;
    }
    .leaflet-popup-content {
      margin: 12px 14px;
      line-height: 1.4;
      min-width: 180px;
      max-width: 240px;
    }
    .popup-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .popup-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 3px;
    }
    .popup-subtitle {
      font-size: 12px;
      color: #4b5563;
      margin-bottom: 4px;
    }
    .popup-address {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .popup-coords {
      font-size: 10px;
      color: #0284c7;
      font-family: monospace;
      margin-bottom: 8px;
    }
    .popup-btn {
      display: block;
      width: 100%;
      background-color: #0284c7;
      color: #ffffff;
      text-align: center;
      padding: 7px 0;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
    }
    .popup-btn:active {
      background-color: #0369a1;
    }

    /* Custom Floating Action Control */
    .fab-container {
      position: absolute;
      bottom: 20px;
      right: 14px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .fab-btn {
      width: 42px;
      height: 42px;
      background: #ffffff;
      border-radius: 21px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25);
      border: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 18px;
    }
    .fab-btn:active {
      background: #f3f4f6;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <div class="fab-container">
    <button class="fab-btn" onclick="fitAllPoints()" title="Fit all surveyed points">🎯</button>
    <button class="fab-btn" onclick="locateUser()" title="Find My Location">📍</button>
  </div>

  <script>
    var surveys = ${mapDataJson};

    // Default center is Dhaka, Bangladesh
    var defaultLat = 23.8103;
    var defaultLng = 90.4125;
    var defaultZoom = 12;

    if (surveys.length > 0) {
      defaultLat = surveys[0].lat;
      defaultLng = surveys[0].lng;
    }

    // Initialize Leaflet Map with smooth interaction
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLng], defaultZoom);

    // Zoom control at top-left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // High performance OpenStreetMap Tile Layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true
    }).addTo(map);

    var markersGroup = L.featureGroup().addTo(map);

    // Add marker for each survey
    surveys.forEach(function(s) {
      var iconHtml = '<div class="custom-pin" style="background-color: ' + s.color + ';">' +
                     '<div class="custom-pin-inner"></div>' +
                     '</div>';

      var customIcon = L.divIcon({
        className: '',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30]
      });

      var marker = L.marker([s.lat, s.lng], { icon: customIcon });

      var popupHtml = '<div>' +
        '<span class="popup-badge" style="background-color: ' + s.color + ';">' + s.type + '</span>' +
        '<div class="popup-title">' + (s.title || 'Survey Record') + '</div>' +
        (s.subtitle ? '<div class="popup-subtitle">' + s.subtitle + '</div>' : '') +
        (s.address ? '<div class="popup-address">📍 ' + s.address + '</div>' : '') +
        '<div class="popup-coords">' + s.lat.toFixed(5) + ', ' + s.lng.toFixed(5) + (s.accuracy ? ' (±' + s.accuracy + 'm)' : '') + '</div>' +
        '<button class="popup-btn" onclick="selectRecord(\\'' + s.id + '\\')">View Details →</button>' +
        '</div>';

      marker.bindPopup(popupHtml);
      markersGroup.addLayer(marker);
    });

    // Fit bounds to all markers if points exist
    function fitAllPoints() {
      if (surveys.length > 0) {
        map.fitBounds(markersGroup.getBounds(), { padding: [50, 50], maxZoom: 16 });
      } else {
        map.setView([23.8103, 90.4125], 11);
      }
    }

    if (surveys.length > 0) {
      fitAllPoints();
    }

    // Handle selecting a record and notifying React Native
    function selectRecord(id) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_SURVEY', id: id }));
      }
    }

    // Locate user position
    function locateUser() {
      map.locate({ setView: true, maxZoom: 16 });
    }

    map.on('locationfound', function(e) {
      var radius = e.accuracy / 2;
      L.circle(e.latlng, radius, { color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.2 }).addTo(map);
      L.circleMarker(e.latlng, { radius: 8, color: '#ffffff', fillColor: '#0284c7', fillOpacity: 1, weight: 3 }).addTo(map)
        .bindPopup('<b>You are here</b><br>Accuracy: ' + Math.round(e.accuracy) + 'm').openPopup();
    });

    map.on('locationerror', function(e) {
      alert('Unable to retrieve current location: ' + e.message);
    });
  </script>
</body>
</html>`;
  }, [mapDataJson]);

  return (
    <View style={styles.container}>
      <RNWebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        originWhitelist={['*']}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
        onMessage={(event: WebViewMessageEvent) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'SELECT_SURVEY' && data.id) {
              onSelectSurvey(data.id);
            }
          } catch (e) {
            console.warn('Error handling Leaflet WebView message:', e);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
