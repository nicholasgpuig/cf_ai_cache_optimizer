import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [testResult, setTestResult] = useState<string>('')
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

  const testButton = async () => {
    try {
      console.log('Calling Worker API...')
      const response = await fetch('/api/test')
      console.log(response)
      const data = await response.json()
      console.log('Worker response:', data)
      setTestResult(JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Error calling Worker:', error)
      setTestResult(`Error: ${String(error)}`)
    }
  }

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('Please select log files first')
      return
    }

    try {
      console.log(`Processing ${selectedFiles.length} file(s)...`)

      // Compile all JSON files into one array
      const compiledData: unknown[] = []
      const errors: string[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        console.log(`Reading file ${i + 1}/${selectedFiles.length}: ${file.name}`)

        try {
          const fileText = await file.text()
          const jsonData = JSON.parse(fileText)

          // If jsonData is an array, spread it; otherwise add as single item
          if (Array.isArray(jsonData)) {
            compiledData.push(...jsonData)
          } else {
            compiledData.push(jsonData)
          }

          console.log(`✓ Successfully parsed ${file.name}`)
        } catch (error) {
          const errorMsg = `Failed to parse ${file.name}: ${error}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      if (compiledData.length === 0) {
        alert('No valid JSON data found in the selected files')
        return
      }

      console.log(`Compiled ${compiledData.length} log entries from ${selectedFiles.length} files`)

      // Send compiled data to Worker for analysis
      console.log('Sending data to Worker for analysis...')
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: compiledData,
          metadata: {
            fileCount: selectedFiles.length,
            totalEntries: compiledData.length,
            timestamp: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Worker request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Analysis result:', result)

      // Show success message
      let message = `Successfully analyzed ${compiledData.length} log entries from ${selectedFiles.length} file(s)`
      if (errors.length > 0) {
        message += `\n\nWarnings:\n${errors.join('\n')}`
      }
      alert(message)

      // Optionally display results
      setTestResult(JSON.stringify(result, null, 2))

    } catch (error) {
      console.error('Upload error:', error)
      alert(`Error: ${String(error)}`)
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
          accept=".log,.txt,.json"
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

        <button
          onClick={testButton}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Test Worker API
        </button>

        {testResult && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}>
            <h3>Worker Response:</h3>
            <pre style={{ margin: 0, fontSize: '14px' }}>{testResult}</pre>
          </div>
        )}

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
