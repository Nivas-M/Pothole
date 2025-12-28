import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps'; // Removing PROVIDER_GOOGLE to use OSM if configured or default to Apple/Google depending on platform. Actually for OSM tiles we need to use UrlTile or similar, but react-native-maps default provider is easiest for MVP.
import * as Location from 'expo-location';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebaseConfig';

import { getDistance } from 'geolib'; // Ensure this package is installed or implement haversine
// Simple Haversine implementation if geolib not available
const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [alertShown, setAlertShown] = useState<string | null>(null); // Track alerts to avoid spam

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      // Initial position
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Watch position
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10 // Update every 10 meters
        },
        (newLoc) => {
          setLocation(newLoc);
          checkProximity(newLoc.coords);
        }
      );
    })();

    // Listen to Firestore
    const q = query(collection(db, "reports"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
    });

    return () => {
      if (subscription) subscription.remove();
      unsubscribe();
    };
  }, []);

  const checkProximity = (coords: { latitude: number; longitude: number }) => {
    reports.forEach(report => {
      if (!report.location) return;
      const dist = getDist(coords.latitude, coords.longitude, report.location.lat, report.location.lng);

      // Alert if within 50 meters and hasn't been shown recently for this report
      if (dist < 50 && alertShown !== report.id) {
        Alert.alert("⚠️ Caution!", `Pothole detected ${Math.round(dist)}m ahead! (${report.severity} severity)`);
        setAlertShown(report.id);
        // Reset alert cooldown after 30 seconds
        setTimeout(() => setAlertShown(null), 30000);
      }
    });
  };

  if (!location) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>{errorMsg || 'Waiting for location...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
      >
        {reports.map((report) => (
          report.location && (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.location.lat, longitude: report.location.lng }}
              title={`${report.severity.toUpperCase()} Severity`}
              description={`Reported by ${report.userName}`}
              pinColor={report.severity === 'high' ? 'red' : report.severity === 'medium' ? 'orange' : 'yellow'}
            />
          )
        ))}
      </MapView>

      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => Alert.alert("Report Pothole", "Navigation to report screen would happen here.")}
      >
        <Text style={styles.reportButtonText}>+ Report Pothole</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  reportButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reportButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});
