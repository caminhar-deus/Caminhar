# Make file uploads accessible

> File upload components are accessible with proper labels, file type restrictions, and progress feedback.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 25 min

---
Accessible file uploads require proper labeling, clear instructions, and feedback that works for all users.

## Code Example

```html
<div class="file-upload">
  <label for="document-upload">
    Upload document
    <span class="file-upload__hint">
      Accepted formats: PDF, DOC, DOCX. Max size: 10MB.
    </span>
  </label>
  <input
    type="file"
    id="document-upload"
    name="document"
    accept=".pdf,.doc,.docx,application/pdf,application/msword"
    aria-describedby="document-help document-error"
  />
  <span id="document-help" class="file-upload__help">
    Select a file from your computer
  </span>
  <span id="document-error" class="file-upload__error" role="alert" hidden>
    <!-- Error message appears here -->
  </span>
</div>
```

## Why It Matters

Unlabeled file inputs and inaccessible drag zones exclude screen reader and keyboard users from completing file upload tasks.

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Label association | `<label>` linked to input |
| File restrictions | `accept` attribute + visible text |
| Size limits | Clear messaging |
| Progress feedback | ARIA live regions |
| Error messages | Associated with input |

## React File Upload Component

```tsx

interface FileUploadProps {
  label: string
  accept?: string
  maxSize?: number // in bytes
  multiple?: boolean
  onUpload: (files: File[]) => Promise<void>
  hint?: string
}

  label,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onUpload,
  hint
}: FileUploadProps) {
  const [files, setFiles] = useState {
    if (!fileList) return

    setError(null)
    const newFiles = Array.from(fileList)

    // Validate all files
    for (const file of newFiles) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setFiles(newFiles)
    setUploading(true)
    setProgress(0)

    try {
      await onUpload(newFiles)
      setProgress(100)
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (e: ChangeEvent{hint}</span>
        )}
      </label>

      {/* Drag and drop zone */}
      <div
        className={`file-upload__dropzone ${isDragOver ? 'file-upload__dropzone--active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-describedby={`${helpId} ${error ? errorId : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          id={inputId}
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={`${helpId} ${error ? errorId : ''}`}
          className="file-upload__input"
        />

        <div className="file-upload__content">
          <span className="file-upload__icon" aria-hidden="true">📁</span>
          <span>
            Drag and drop files here, or{' '}
            <span className="file-upload__browse">browse</span>
          </span>
        </div>
      </div>

      <span id={helpId} className="file-upload__help">
        {accept && `Accepted formats: ${accept}`}
        {maxSize && ` Max size: ${formatBytes(maxSize)}`}
      </span>

      {/* Error message */}
      {error && (
        <span id={errorId} className="file-upload__error" role="alert">
          {error}
        </span>
      )}

      {/* Progress */}
      {uploading && (
        <div
          id={progressId}
          className="file-upload__progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Upload progress"
        >
          <div
            className="file-upload__progress-bar"
            style={{ width: `${progress}%` }}
          />
          <span className="sr-only">{progress}% uploaded</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && !uploading && (
        <ul className="file-upload__files" aria-label="Selected files">
          {files.map((file, index) => (
            <li key={index}>
              {file.name} ({formatBytes(file.size)})
            </li>
          ))}
        </ul>
      )}

      {/* Live region for announcements */}
      <div aria-live="polite" className="sr-only">
        {uploading && `Uploading ${files.length} file(s)... ${progress}% complete`}
        {progress === 100 && 'Upload complete'}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

## Usage

```tsx
 formData.append('files', file))
    await fetch('/api/upload', { method: 'POST', body: formData })
  }}
/>
```

## Custom Styled File Input

```tsx
function CustomFileInput({ label, ...props }: FileUploadProps) {
  const inputRef = useRef
      <input
        ref={inputRef}
        type="file"
        id={inputId}
        className="sr-only"
        {...props}
      />
      <label htmlFor={inputId} className="custom-file-input__label">
        {label}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="custom-file-input__button"
      >
        Choose File
      </button>
    </div>
  )
}
```

## Styling

```css
.file-upload__dropzone {
  padding: 2rem;
  border: 2px dashed #ccc;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.file-upload__dropzone:hover,
.file-upload__dropzone:focus-visible {
  border-color: #0066cc;
  background: #f0f7ff;
}

.file-upload__dropzone--active {
  border-color: #0066cc;
  background: #e3f2fd;
}

.file-upload__dropzone:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.file-upload__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.file-upload__browse {
  color: #0066cc;
  text-decoration: underline;
}

.file-upload__hint {
  display: block;
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.file-upload__help {
  display: block;
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
}

.file-upload__error {
  display: block;
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.file-upload__progress {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
}

.file-upload__progress-bar {
  height: 100%;
  background: #0066cc;
  transition: width 0.2s;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

## Verification

1. Navigate to file input with keyboard
2. Press Enter/Space to open file picker
3. Verify label is announced by screen reader
4. Test drag and drop with mouse
5. Verify error messages are announced
6. Check progress updates are announced
7. Test with invalid file types and oversized files

While you can visually hide the native file input, it must remain in the DOM and focusable for keyboard users. Use `sr-only` styles, not `display: none`.