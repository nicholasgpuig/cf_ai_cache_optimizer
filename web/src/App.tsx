import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'

function App() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  //const [testResult, setTestResult] = useState<string>('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      setSelectedFiles(files)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDownloadExample = (filename: string) => {
    const link = document.createElement('a')
    link.href = `/examples/${filename}`
    link.download = filename
    link.click()
  }

  // const testWorker = async () => {
  //   try {
  //     console.log('Calling Worker API...')
  //     const response = await fetch('/api/test')
  //     console.log(response)
  //     const data = await response.json()
  //     console.log('Worker response:', data)
  //     setTestResult(JSON.stringify(data, null, 2))
  //   } catch (error) {
  //     console.error('Error calling Worker:', error)
  //     setTestResult(`Error: ${String(error)}`)
  //   }
  // }

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

      // Navigate to chat with analysis data
      navigate('/chat', { state: { analysisData: result } })

    } catch (error) {
      console.error('Upload error:', error)
      alert(`Error: ${String(error)}`)
    }
  }

  return (
    <div style={{ height: '100vh', width: '100%', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem', textAlign: 'center' }}>AI Cache Optimizer</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'normal', color: '#6b7280', marginTop: 0, marginBottom: '2rem', textAlign: 'center' }}>Log File Upload</h2>

      <div style={{ marginTop: '20px' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Main buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
          <button
            onClick={handleUploadClick}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Select Log Files
          </button>

          <button
            onClick={() => navigate('/chat')}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Open AI Chat
          </button>
        </div>

        {/* Example download buttons */}
        <div style={{ marginTop: '30px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', textAlign: 'center', marginBottom: '15px' }}>
            Download Example Logs
          </h3>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleDownloadExample('cache_miss_query.json')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              Cache Miss Logs
            </button>

            <button
              onClick={() => handleDownloadExample('ddos_attack.json')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              DDoS Attack Logs
            </button>

            <button
              onClick={() => handleDownloadExample('normal_traffic.json')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              Normal Traffic Logs
            </button>
          </div>
        </div>

        {/* Upload button appears below when files are selected */}
        {selectedFiles && selectedFiles.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
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
            </div>

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
    </div>
  )
}

export default App
