// FIXED: Map controller with proper route restoration and visualization
// NEW: Import UI helpers
import toast from '../helpers/toasts.js';
import modal from '../helpers/modals.js';

export class MapController {
  constructor() {
    this.map = null;
    this.marker = null;
    this.routePolylines = [];
    this.routeMarkers = [];
    this.lastBearing = 0;
  }

  async initialize() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      throw new Error('Map element not found');
    }

    this.map = L.map('map').setView([32.0853, 34.7818], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Create custom arrow marker instead of default marker
const arrowIcon = L.divIcon({
  html: `
    <div class="location-arrow">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <!-- Outer glow -->
        <circle cx="20" cy="20" r="18" fill="rgba(66, 133, 244, 0.2)" />
        <!-- Main circle -->
        <circle cx="20" cy="20" r="12" fill="#4285F4" stroke="white" stroke-width="3" />
        <!-- Direction arrow -->
        <path d="M 20 8 L 25 18 L 20 15 L 15 18 Z" 
              fill="white" 
              id="direction-arrow" />
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: 'location-marker-arrow'
});

this.marker = L.marker([32.0853, 34.7818], { icon: arrowIcon })
  .addTo(this.map)
  .bindPopup("Current Location");

// Store arrow element reference for rotation
this.arrowElement = null;
setTimeout(() => {
  this.arrowElement = document.querySelector('#direction-arrow');
}, 100);

    await this.getCurrentLocation();
    this.setupRecenterButton();
    console.log('✅ Map controller initialized');
  }

  setupRecenterButton() {
  const recenterBtn = document.getElementById('recenterBtn');
  if (!recenterBtn) return;

  recenterBtn.addEventListener('click', async () => {
    console.log('🎯 Recentering map...');
    
    const location = await this.getCurrentLocation();
    
    if (location) {
      this.map.flyTo([location.lat, location.lng], 17, {
        duration: 1.5
      });
      
      recenterBtn.style.transform = 'scale(1.2)';
      setTimeout(() => {
        recenterBtn.style.transform = 'scale(1)';
      }, 200);
      
      console.log('✅ Map recentered');
    }
  });
}

  async getCurrentLocation() {
    if (!navigator.geolocation) return;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.map.setView([userLocation.lat, userLocation.lng], 17);
          this.marker.setLatLng([userLocation.lat, userLocation.lng]);
          resolve(userLocation);
        },
        (error) => {
          console.warn('Geolocation failed:', error);
          toast.warning('Unable to get your current location. Please check GPS settings.');
          resolve(null);
        }
      );
    });
  }

  updateMarkerPosition(coords) {
    if (!this.marker || !coords) return;
    this.marker.setLatLng([coords.lat, coords.lng]);
    this.map.panTo([coords.lat, coords.lng]);
  }

  updateMarkerDirection(bearing) {
  if (!this.arrowElement) {
    this.arrowElement = document.querySelector('#direction-arrow');
  }
  
  if (this.arrowElement) {
    if (Math.abs(bearing - this.lastBearing) > 5) {
      this.arrowElement.style.transform = `rotate(${bearing}deg)`;
      this.arrowElement.style.transformOrigin = '20px 14px';
      this.arrowElement.style.transition = 'transform 0.3s ease-out';
      this.lastBearing = bearing;
      
      console.log(`🧭 Arrow bearing: ${Math.round(bearing)}°`);
    }
  }
}

  addRouteSegment(startCoords, endCoords) {
    if (!startCoords || !endCoords) return;

    const polyline = L.polyline([
      [startCoords.lat, startCoords.lng], 
      [endCoords.lat, endCoords.lng]
    ], {
      color: '#4CAF50',
      weight: 4,
      opacity: 0.8
    }).addTo(this.map);

    this.routePolylines.push(polyline);
    return polyline;
  }

  // FIXED: Enhanced route data visualization with proper data handling
  showRouteData(routeData) {
    if (!routeData || routeData.length === 0) {
      toast.warning('No route data to display');
      return;
    }

    console.log(`🗺️ Displaying route with ${routeData.length} data points`);
    
    this.clearRouteDisplay();
    const bounds = L.latLngBounds([]);

    const locationPoints = routeData.filter(entry => 
      entry.type === 'location' && 
      entry.coords && 
      entry.coords.lat && 
      entry.coords.lng
    );

    console.log(`📍 Found ${locationPoints.length} GPS location points`);

    if (locationPoints.length === 0) {
      toast.warning('No GPS location points found in route data');
      return;
    }

    // Draw route line
    if (locationPoints.length > 1) {
  const routeLine = locationPoints.map(point => [point.coords.lat, point.coords.lng]);
  
  const polyline = L.polyline(routeLine, {
    color: '#4CAF50',
    weight: 4,
    opacity: 0.8
  }).addTo(this.map);
  
  this.routePolylines.push(polyline);
  
  bounds.extend(polyline.getBounds());
}

    // Add markers for all data points
    routeData.forEach((entry, index) => {
      if (!entry.coords || !entry.coords.lat || !entry.coords.lng) return;
      
      bounds.extend([entry.coords.lat, entry.coords.lng]);

      if (entry.type === 'photo') {
        const icon = L.divIcon({
          html: '📷',
          iconSize: [30, 30],
          className: 'custom-div-icon photo-marker'
        });

        const photoMarker = L.marker([entry.coords.lat, entry.coords.lng], { icon })
          .addTo(this.map)
          .bindPopup(`
            <div style="text-align: center;">
              <img src="${entry.content}" style="width:200px; max-height:150px; object-fit:cover; border-radius:8px;">
              <br><small>${new Date(entry.timestamp).toLocaleString()}</small>
            </div>
          `);
        
        this.routeMarkers.push(photoMarker);
        
      } else if (entry.type === 'text') {
        const icon = L.divIcon({
          html: '📝',
          iconSize: [30, 30],
          className: 'custom-div-icon note-marker'
        });

        const noteMarker = L.marker([entry.coords.lat, entry.coords.lng], { icon })
          .addTo(this.map)
          .bindPopup(`
            <div style="max-width: 200px;">
              <strong>Note:</strong><br>
              ${entry.content}<br>
              <small>${new Date(entry.timestamp).toLocaleString()}</small>
            </div>
          `);
        
        this.routeMarkers.push(noteMarker);
        
      } else if (entry.type === 'location' && (index === 0 || index === locationPoints.length - 1)) {
        const isStart = index === 0;
        const icon = L.divIcon({
          html: isStart ? '🚩' : '🏁',
          iconSize: [30, 30],
          className: 'custom-div-icon location-marker'
        });

        const locationMarker = L.marker([entry.coords.lat, entry.coords.lng], { icon })
          .addTo(this.map)
          .bindPopup(`
            <div>
              <strong>${isStart ? 'Start' : 'End'} Point</strong><br>
              <small>${new Date(entry.timestamp).toLocaleString()}</small>
            </div>
          `);
        
        this.routeMarkers.push(locationMarker);
      }
    });

    // Fit map to show all route data
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [20, 20] });
      console.log('🎯 Map fitted to route bounds');
    } else {
      console.warn('⚠️ No valid bounds found for route data');
    }

    // Show summary info
    const photos = routeData.filter(p => p.type === 'photo').length;
    const notes = routeData.filter(p => p.type === 'text').length;
    
    console.log(`✅ Route displayed: ${locationPoints.length} GPS points, ${photos} photos, ${notes} notes`);
    toast.success(`Route displayed: ${locationPoints.length} points, ${photos} photos, ${notes} notes`);
  }

  // FIXED: Complete route clearing including all markers
  clearRouteDisplay() {
    this.routePolylines.forEach(polyline => {
      this.map.removeLayer(polyline);
    });
    this.routePolylines = [];

    this.routeMarkers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.routeMarkers = [];

    console.log('🧹 Route display cleared');
  }

  clearRoute() {
    this.routePolylines.forEach(polyline => {
      this.map.removeLayer(polyline);
    });
    this.routePolylines = [];
  }

  addRouteSegmentWithBounds(startCoords, endCoords) {
    const segment = this.addRouteSegment(startCoords, endCoords);
    
    if (segment) {
      const bounds = L.latLngBounds([]);
      this.routePolylines.forEach(polyline => {
        bounds.extend(polyline.getBounds());
      });
      
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [10, 10] });
      }
    }
    
    return segment;
  }

  displayFirebaseRoute(routeDoc) {
    try {
      console.log(`🔥 Displaying Firebase route: ${routeDoc.routeName}`);
      
      if (!routeDoc.routeData || !Array.isArray(routeDoc.routeData)) {
        console.error('❌ Invalid Firebase route data structure');
        toast.error('Invalid route data structure from Firebase');
        return;
      }

      this.showRouteData(routeDoc.routeData);

      const locationPoints = routeDoc.routeData.filter(p => 
        p.type === 'location' && p.coords
      );

      if (locationPoints.length > 0) {
        const firstPoint = locationPoints[0];
        const routeInfoMarker = L.marker([firstPoint.coords.lat, firstPoint.coords.lng], {
          icon: L.divIcon({
            html: '🌍',
            iconSize: [40, 40],
            className: 'custom-div-icon firebase-route-marker'
          })
        }).addTo(this.map);

        routeInfoMarker.bindPopup(`
          <div style="text-align: center; max-width: 250px;">
            <h3>${routeDoc.routeName}</h3>
            <p><strong>Distance:</strong> ${routeDoc.totalDistance?.toFixed(2) || 0} km</p>
            <p><strong>Created:</strong> ${new Date(routeDoc.createdAt).toLocaleDateString()}</p>
            <p><strong>By:</strong> ${routeDoc.userEmail}</p>
            ${routeDoc.stats ? `
              <hr>
              <small>
                📍 ${routeDoc.stats.locationPoints} GPS points<br>
                📷 ${routeDoc.stats.photos} photos<br>
                📝 ${routeDoc.stats.notes} notes
              </small>
            ` : ''}
          </div>
        `).openPopup();

        this.routeMarkers.push(routeInfoMarker);
      }

      console.log(`✅ Firebase route "${routeDoc.routeName}" displayed successfully`);
      
    } catch (error) {
      console.error('❌ Failed to display Firebase route:', error);
      toast.error('Failed to display Firebase route: ' + error.message);
    }
  }

  getRouteStats() {
    return {
      polylines: this.routePolylines.length,
      markers: this.routeMarkers.length,
      hasRoute: this.routePolylines.length > 0
    };
  }

  setRotation(angle) {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.transform = `rotate(${-angle}deg)`;
    }
  }

  resetRotation() {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.transform = 'rotate(0deg)';
    }
  }
}
