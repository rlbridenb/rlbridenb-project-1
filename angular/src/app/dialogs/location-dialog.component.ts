import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LocationDialogData } from '../types/types';

@Component({
  selector: 'location-dialog',
  templateUrl: 'location-dialog.component.html',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
  ],
})
export class LocationDialog {
  readonly dialogRef = inject(MatDialogRef<LocationDialog>);
  readonly data = inject<LocationDialogData>(MAT_DIALOG_DATA);

  form = new FormGroup({
    address: new FormControl(this.data.address),
    city: new FormControl(this.data.city),
    state: new FormControl(this.data.state),
    zipCode: new FormControl(this.data.zipCode),
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}