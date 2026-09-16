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
import { SettingsDialogData } from '../types/types';
import { from } from 'rxjs';

@Component({
  selector: 'settings-dialog',
  templateUrl: 'settings-dialog.component.html',
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
export class SettingsDialog {
  readonly dialogRef = inject(MatDialogRef<SettingsDialog>);
  readonly data = inject<SettingsDialogData>(MAT_DIALOG_DATA);

  form = new FormGroup({
    shutOffHour: new FormControl(22),
    shutOffMin: new FormControl(0),
    maxAltitude: new FormControl(1300)
  });

  ngOnInit() {
    if (!this.data) return;

    this.form.patchValue({
      shutOffHour: this.data.shutOffTime.hour ?? 22,
      shutOffMin: this.data.shutOffTime.minute ?? 0,
      maxAltitude: this.data.maxAltitude ?? 1300
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.form.valid) return;

    const { shutOffHour, shutOffMin, maxAltitude } = this.form.value;

    this.dialogRef.close({
      maxAltitude,
      shutOffTime: {
        hour: shutOffHour ?? 22,
        minute: shutOffMin ?? 0
      }
    });
  }
}