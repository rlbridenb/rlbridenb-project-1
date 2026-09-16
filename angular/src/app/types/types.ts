// Longitude/latitude coordinates
export interface Coordinates {
  longitude: string;
  latitude: string;
}

// Address data from location dialog
export interface LocationDialogData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

// Request data to send to Mapbox to get longitude/latitude for an address
export interface LocationRequest {
  number: string;
  street: string;
  city: string;
  zipCode: string;
}

// Setting/info for app
export interface SettingsDialogData {
  shutOffTime: ShutOffTime;
  maxAltitude: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
}

// Time the app should stop running daily
export interface ShutOffTime {
  hour: number;
  minute: number;
}
