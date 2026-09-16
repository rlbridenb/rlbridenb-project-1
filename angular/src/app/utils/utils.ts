import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Separates number and street name from user entered address, used to
 * request Mapbox
 * @param address full entered address string from user
 * @returns address number and street
 */
export function parseAddress(address: string): {
  number: string | null;
  street: string;
} {
  const trimmed = address.trim();

  const match = trimmed.match(/^(\d+)\s+(.*)$/);

  if (!match) {
    return {
      number: null,
      street: trimmed,
    };
  }

  return {
    number: match[1],
    street: match[2],
  };
}

/**
 * Opens snackbar notification
 * @param message Message to display in snackbar
 * @param action Button text (e.g., OK, Dismiss)
 * @param duration Duration the notification should remain on screen, default 3000ms
 */
export function openSnackBar(
  snackBar: MatSnackBar,
  message: string,
  action: string,
  duration: number = 3000,
) {
  snackBar.open(message, action, {
    duration: duration,
  });
}
