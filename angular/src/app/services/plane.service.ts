import { Injectable } from '@angular/core';
import { Coordinates, LocationRequest } from '../types/types';

interface PlaneResponse {
  time: number;
  states: any[][];
}

@Injectable({
  providedIn: 'root',
})
export class PlaneService {
  async getPlanesOverhead(latitude: string, longitude: string): Promise<PlaneResponse> {
    const token = await window.electron.getToken();
    console.log(`Calling OpenSky API with latitude ${latitude} and longitude ${longitude}`);
    const planes = await window.electron.getPlanes(token, latitude, longitude);

    return planes;
  }

  async getFlightInfo(callSign: string): Promise<any> {
    console.log(`Calling AeroAPI for info on flight ${callSign}`);
    const data = await window.electron.getFlightInfo(callSign);

    if (data) {
      const flights = data.flights;

      for (const flight of flights) {
        if (flight.status.startsWith('En Route')) {
          return flight;
        }
      }

      return flights[0];
    }
  }

  async getCoordinates(request: LocationRequest): Promise<Coordinates> {
    console.log(
      `Calling MapBox to get coordinates for address ${request.number} ${request.street}`,
    );
    const response = await window.electron.getCoordinates(
      request.number,
      request.street,
      request.city,
      request.zipCode,
    );

    const coords = {
      latitude: response.features[0].geometry.coordinates[1],
      longitude: response.features[0].geometry.coordinates[0],
    };

    console.log(`MapBox returned latitude ${coords.latitude} and longitude ${coords.longitude}`);
    return coords;
  }
}
