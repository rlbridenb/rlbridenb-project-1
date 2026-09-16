export {};

declare global {
  interface Window {
    electron: {
      getToken: () => string | Promise<string>;
      getPlanes: (token: any, latitude: string, longitude: string) => any;
      getFlightInfo: (string) => any;
      getCoordinates: (number: string, street: string, city: string, zipCode: string) => any;
      toggleFullscreen: () => void;
    };
  }
}
