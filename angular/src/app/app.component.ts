import { ChangeDetectorRef, Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { minBy } from 'lodash-es';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LocationDialog } from './dialogs/location-dialog.component';
import { SettingsDialog } from './dialogs/settings-dialog.component';
import { PlaneService } from './services/plane.service';
import { parseAddress } from './utils/utils';
import { airlines, knownAirlines } from './data/airlines';
import { aircraft } from './data/aircraft';
import {
  Coordinates,
  LocationDialogData,
  LocationRequest,
  SettingsDialogData,
} from './types/types';
import { exhaustMap, Subscription, switchMap, timer } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [MatButtonModule, MatCardModule, MatProgressSpinnerModule, MatMenuModule, MatIconModule],
})
export class AppComponent implements OnInit, OnDestroy {
  locationData: LocationDialogData = {
    address: '',
    city: '',
    state: '',
    zipCode: '',
  };

  coordinates: Coordinates = {
    longitude: '',
    latitude: '',
  };

  // Polling variables
  timer: Subscription = new Subscription;
  isRunning = false;
  shutOffTime = {
    hour: 22,
    minute: 0,
  };
  maxAltitude = 1400;

  settingsData: SettingsDialogData = {
    shutOffTime: {
      hour: this.shutOffTime.hour,
      minute: this.shutOffTime.minute,
    },
    maxAltitude: this.maxAltitude,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    longitude: '',
    latitude: '',
  };

  // Plane variables
  lowestPlane: any | null = null;
  lastProcessedCallSign: string | null = null;
  airline = '';
  altitude = '';
  origin = '';
  destination = '';
  flightNumber = '';
  aircraftType = '';
  imgSrc = '';
  planeFound = false;

  // Other variables
  isNight = false;
  loading = false;
  dialog = inject(MatDialog);
  private _snackBar = inject(MatSnackBar);

  constructor(
    private service: PlaneService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    // Automatically open location dialog on app start
    if (this.locationData.address == '') {
      this.openLocationDialog();
    }
    // Set day/night theme
    this.updateTheme();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  /**
   * Calls getPlanes() once every minute until stopped or until shut off time.
   * Default shut off time is 10pm.
   */
  async startPolling() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = timer(0, 50_000)
      .pipe(
        exhaustMap(async () => {
          if (!this.isRunning) return;

          this.updateTheme();

          if (this.isPastShutOffTime()) {
            this.stopPolling();
            return;
          }

          await this.getPlanes();
          this.cdr.detectChanges();
        })
      )
      .subscribe();
  }

  // Clears timer and stops polling once paused
  stopPolling() {
    console.log('Stopped polling');
    this.isRunning = false;

    this.timer.unsubscribe();
  }

  /**
   * Checks if shut off time has been reached. This prevents the app from running
   * overnight, reducing the chance charges are incurred by calling AeroAPI (max
   * of 1000 free calls per month)
   * @returns true if shut off time has been reached, otherwise false
   */
  isPastShutOffTime(): boolean {
    const now = new Date();

    const shutOff = new Date();
    shutOff.setHours(this.shutOffTime.hour, this.shutOffTime.minute, 0, 0);

    return now >= shutOff;
  }

  // Allows polling for planes to be manually stopped/started
  togglePolling() {
    if (!this.locationData.address) {
      this.openSnackBar('Location not set', 'OK');
      return;
    }
    if (this.isRunning) {
      this.stopPolling();
      this.openSnackBar('App stopped', 'OK');
    } else {
      this.startPolling();
      this.openSnackBar('App started', 'OK');
    }
  }

  /**
   * Helper method to check time and set to night theme
   */
  updateTheme(): void {
    const hour = new Date().getHours();
    const isNightNow = hour >= 18 || hour < 6;

    if (this.isNight !== isNightNow) {
      this.isNight = isNightNow;
    }
  }

  /**
   * Main method to get planes within a latitude/longitude boundary
   */
  async getPlanes() {
    // Return if location data not set
    if (!this.coordinates && !this.locationData) {
      console.log('Location data not set, exiting getPlanes()');
      return;
    }

    // Calls OpenSky API to get planes within latitude/longitude boundary
    const planes = await this.service.getPlanesOverhead(
      this.coordinates.latitude,
      this.coordinates.longitude,
    );

    // Return if no planes found
    if (!planes?.states) {
      console.log('No planes found');
      this.planeFound = false;
      this.cdr.detectChanges();
      return;
    }

    console.log('States: ', planes.states)

    // Filter to find lowest plane matching altitude criteria
    this.lowestPlane = this.filterPlanes(planes.states);

    // Return if no planes found matching altitude criteria
    if (!this.lowestPlane) {
      this.lowestPlane = null;
      this.planeFound = false;
      console.log(`Aircraft found, but none within altitude criteria of 300-${this.maxAltitude}m`);
      this.cdr.detectChanges();
      return;
    }

    // Proceed if plane was found matching altitude criteria
    console.log('Found aircraft nearby: ', this.lowestPlane);
    this.planeFound = true;
    this.loading = true;
    this.cdr.detectChanges();
    const operatorIcao = this.lowestPlane[1]?.slice(0, 3);

    /**
     * Only call AeroAPI if plane belongs to a known airline. This helps cut back on
     * calls to AeroAPI since data is often incomplete or missing for private/military aircraft
     */
    if (operatorIcao && knownAirlines.includes(operatorIcao)) {
      const callSign = this.lowestPlane[1];
      const flightInfo = await this.service.getFlightInfo(callSign);
      this.setInfoValues(flightInfo);
      this.cdr.detectChanges();
    } else {
      // If aircraft does not belong to a known airline, set default values
      this.origin = 'N/A';
      this.destination = 'N/A';
      this.flightNumber = 'Unknown';
      this.airline = 'Unknown';
      this.imgSrc = `../assets/unknown.png`;
      this.aircraftType = 'Unknown';
      this.cdr.detectChanges();
    }

    // Convert altitude from m to ft
    const altitudeFt = Math.round(this.lowestPlane[7] * 3.28084);
    this.altitude = `${altitudeFt} ft`;

    this.loading = false;
    this.cdr.detectChanges();
  }

  /**
   * Filters lists of states (planes) from OpenSky to return the lowest new plane within
   * the altitude range of 300-1400m. The maxAltitude can be adjusted in settings.
   * @param states List of plane lists returned by OpenSky API
   * @returns Plane object with lowest valid altitude OR null if no matches
   */
  filterPlanes(states: any[][]): any[] | null {
    console.log('Filtering by max altitude: ', this.maxAltitude);
    const lowestPlane = minBy(
      states.filter((plane) => {
        const altitude = plane[7];
        return typeof altitude === 'number' && altitude > 300 && altitude < this.maxAltitude;
      }),
      (plane) => plane[7],
    );

    if (!lowestPlane) return null;

    const callSign = lowestPlane[1];

    // Return null to avoid repeat calls of same plane
    if (callSign && callSign === this.lastProcessedCallSign) {
      return null;
    }

    // Save call sign so repeat calls are not made and return new plane
    this.lastProcessedCallSign = callSign;
    return lowestPlane;
  }

  /**
   * Extracts data from AeroAPI response and sets variables for use on UI
   * @param flightInfo - AeroAPI response
   */
  setInfoValues(flightInfo: any) {
    this.origin = flightInfo.origin.code_iata ?? 'N/A';
    this.destination = flightInfo.destination.code_iata ?? 'N/A';

    const operatorIata = flightInfo.operator_iata;

    /**
     * If matching airline found for operator IATA value, set flight # equal to
     * if codeshare array has values. If yes, pass array to filterCodeshares. If no,
     * set flight # equal to IATA identifier.
     */
    if (airlines[operatorIata]) {
      this.flightNumber = flightInfo.ident_iata ?? 'Unknown';
    } else {
      if (flightInfo.codeshares_iata) {
        this.flightNumber = this.filterCodeshares(flightInfo.codeshares_iata);
      } else {
        this.flightNumber = flightInfo.ident_iata ?? 'Unknown';
      }
    }

    this.aircraftType = aircraft[flightInfo?.aircraft_type] ?? flightInfo.aircraft_type;
    this.getAirline(this.flightNumber);
  }

  /**
   * Filter through codeshare list and slice to get 2-character IATA code. If IATA
   * code matches a code in airlines, return the match. If no match, return the
   * first code in the list in full.
   * @param codeshares Array of flight codeshares
   * @returns Matching airline OR first item in codeshares array
   */
  filterCodeshares(codeshares: string[]): string {
    const match = codeshares.find((code) => code.slice(0, 2) in airlines);

    return match ?? codeshares[0];
  }

  /**
   * Given flight number, slice to get first 2 letters (IATA code). If IATA code matches
   * an entry in airlines, set airline name and image. If not, airline name set to
   * unknown and image set to default.
   * @param callSign Flight number of an aircraft
   */
  getAirline(callSign: string) {
    if (!callSign) {
      this.airline = 'Unknown';
      return;
    }

    const acro = callSign.slice(0, 2);
    const airline = airlines[acro];
    this.airline = airline ?? 'Unknown';

    if (this.airline != 'Unknown' && this.airline != undefined) {
      this.imgSrc = `../assets/${acro.toLowerCase()}.png`;
    } else {
      this.imgSrc = `../assets/unknown.png`;
    }
  }

  /**
   * Opens location dialog and retrieve address from user
   */
  openLocationDialog(): void {
    const dialogRef = this.dialog.open(LocationDialog, {
      data: this.locationData,
    });

    dialogRef.afterClosed().subscribe(async (result: LocationDialogData | undefined) => {
      if (result) {
        this.locationData = result;
        await this.fetchCoordinates(result);
        this.startPolling();
      }
    });
  }

  /**
   * Formats data from user location input and passes it to service to get coordinates
   * @param address - Address string (e.g., 123 Test St)
   */
  async fetchCoordinates(address: LocationDialogData) {
    // Split address number and street to send request to MapBox
    const parsedAddress = parseAddress(address.address);

    const locationRequest: LocationRequest = {
      number: parsedAddress.number!,
      street: parsedAddress.street,
      city: address.city,
      zipCode: address.zipCode,
    };
    const coords = await this.service.getCoordinates(locationRequest);

    if (coords) {
      this.coordinates = {
        longitude: coords.longitude,
        latitude: coords.latitude,
      };

      this.settingsData = {
        maxAltitude: this.maxAltitude,
        shutOffTime: this.shutOffTime,
        address: address.address,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        longitude: coords.longitude,
        latitude: coords.latitude,
      };

      this.openSnackBar('Successfully set location', 'OK');
    } else {
      this.openSnackBar('Error setting location, check entered data and try again', 'OK');
    }
  }

  /**
   * Opens settings dialog and retrieves setting changes from user
   */
  openSettingsDialog(): void {
    const dialogRef = this.dialog.open(SettingsDialog, {
      data: {
        ...this.settingsData,
        shutOffTime: { ...this.settingsData.shutOffTime },
      },
    });

    dialogRef.afterClosed().subscribe((result: SettingsDialogData | undefined) => {
      if (!result) return;

      this.settingsData = {
        ...this.settingsData,
        maxAltitude: result.maxAltitude,
        shutOffTime: { ...result.shutOffTime },
      };

      this.maxAltitude = result.maxAltitude;
      this.shutOffTime = result.shutOffTime;
    });
  }

  /**
   * Opens snackbar notification
   * @param message Message to display in snackbar
   * @param action Button text (e.g., OK, Dismiss)
   * @param duration Duration the notification should remain on screen, default 3000ms
   */
  openSnackBar(message: string, action: string, duration: number = 3000) {
    this._snackBar.open(message, action, {
      duration: duration,
    });
  }

  toggleFullscreen() {
    window.electron.toggleFullscreen();
  }

  openScreensaver(): void {
    const screensaver = document.getElementById('screensaver');
    if (screensaver) {
      screensaver.style.display = 'block';
    }
  }

  closeScreensaver(): void {
    const screensaver = document.getElementById('screensaver');
    if (screensaver) {
      screensaver.style.display = 'none';
    }
  }
}
