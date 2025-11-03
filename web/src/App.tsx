import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      setSelectedFiles(files)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('Please select log files first')
      return
    }

    // TODO: Implement actual upload logic
    console.log(`Uploading ${selectedFiles.length} file(s)`)

    // Example: Process files
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      console.log(`File ${i + 1}: ${file.name} (${file.size} bytes)`)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Log File Upload</h1>

      <div style={{ marginTop: '20px' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".log,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <button
          onClick={handleUploadClick}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          Select Log Files
        </button>

        {selectedFiles && selectedFiles.length > 0 && (
          <>
            <button
              onClick={handleUpload}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Upload {selectedFiles.length} File(s)
            </button>

            <div style={{ marginTop: '20px' }}>
              <h3>Selected Files:</h3>
              <ul>
                {Array.from(selectedFiles).map((file, index) => (
                  <li key={index}>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
