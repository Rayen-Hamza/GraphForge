import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upload-zone"
         [class.dragging]="isDragging()"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
         (drop)="onDrop($event)"
         (click)="fileInput.click()">
      <input #fileInput type="file" multiple
             accept=".csv,.md,.txt,.json,.tsv"
             (change)="onFileSelect($event)"
             style="display: none">

      @if (uploading()) {
        <div class="upload-progress">
          <svg class="spinner" width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="40 60" stroke-linecap="round"/>
          </svg>
          <span>Uploading...</span>
        </div>
      } @else {
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="upload-text">Drop files here or click to upload</span>
        <span class="upload-hint">CSV, Markdown, TXT, JSON (max 50MB)</span>
      }
    </div>

    @if (uploadedFiles().length > 0) {
      <div class="file-chips">
        @for (file of uploadedFiles(); track file.name) {
          <div class="file-chip">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 1h5.5L14 5.5V13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.3"/>
            </svg>
            <span>{{ file.name }}</span>
            <button class="chip-remove" (click)="removeFile(file.name); $event.stopPropagation()">
              <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        }
      </div>
    }

    @if (error()) {
      <div class="upload-error">{{ error() }}</div>
    }
  `,
  styles: [`
    .upload-zone {
      border: 2px dashed var(--color-border, #e0ddd6);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: var(--color-text-secondary, #5A6B5E);
    }
    .upload-zone:hover, .upload-zone.dragging {
      border-color: var(--color-primary, #4A5D4F);
      background: rgba(74, 93, 79, 0.04);
    }
    .upload-text { font-size: 13px; font-weight: 500; }
    .upload-hint { font-size: 11px; color: var(--color-text-tertiary, #8B9D83); }
    .upload-progress { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .file-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .file-chip {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 8px; border-radius: 6px;
      background: var(--color-surface-alt, #f0ece4);
      font-size: 11px; font-weight: 500;
      color: var(--color-text, #1A2F1E);
    }
    .chip-remove {
      background: none; border: none; cursor: pointer; padding: 0;
      color: var(--color-text-tertiary, #8B9D83);
      display: flex; align-items: center;
    }
    .chip-remove:hover { color: #C94A4A; }
    .upload-error { font-size: 11px; color: #C94A4A; margin-top: 6px; }
  `],
})
export class FileUploadComponent {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly filesUploaded = output<UploadedFile[]>();

  isDragging = signal(false);
  uploading = signal(false);
  uploadedFiles = signal<UploadedFile[]>([]);
  error = signal<string | null>(null);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.uploadFiles(Array.from(files));
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFiles(Array.from(input.files));
      input.value = '';
    }
  }

  async removeFile(name: string) {
    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/files/${encodeURIComponent(name)}`),
      );
      this.uploadedFiles.update(files => files.filter(f => f.name !== name));
    } catch {
      // ignore
    }
  }

  private async uploadFiles(files: File[]) {
    this.uploading.set(true);
    this.error.set(null);

    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }

    try {
      const resp = await firstValueFrom(
        this.http.post<{ status: string; files: UploadedFile[] }>(
          `${this.baseUrl}/files/upload`,
          formData,
        ),
      );
      this.uploadedFiles.update(existing => [...existing, ...resp.files]);
      this.filesUploaded.emit(resp.files);
    } catch (e: any) {
      this.error.set(e?.error?.detail || 'Upload failed');
    } finally {
      this.uploading.set(false);
    }
  }
}
