"use client"
import { useState, useEffect } from "react"

const CSV_FILES = [
  { name: "all_sales_report.csv", path: "backend/all_sales_report.csv" },
  { name: "employees.csv", path: "backend/employees.csv" },
  { name: "guests.csv", path: "backend/guests.csv" },
  { name: "events.csv", path: "backend/app/scripts/events.csv" },
]

export default function UploadedPage() {
  const [fileStatus, setFileStatus] = useState<{ [key: string]: boolean }>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [message, setMessage] = useState<string>("")

  // Check if each file exists (via FastAPI backend)
  useEffect(() => {
    async function checkFiles() {
      const status: { [key: string]: boolean } = {}
      for (const file of CSV_FILES) {
        try {
          // FastAPI endpoint to check file existence
          const res = await fetch(`http://localhost:8000/api/sales/check-csv?filename=${file.name}`)
          status[file.name] = res.ok
        } catch {
          status[file.name] = false
        }
      }
      setFileStatus(status)
    }
    checkFiles()
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, filename: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(filename)
    setMessage("")
    const formData = new FormData()
    formData.append("file", file)
    formData.append("filename", filename)
    try {
      const res = await fetch("http://localhost:8000/api/sales/upload-csv", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        setMessage(`Uploaded ${filename} successfully!`)
        setFileStatus((prev) => ({ ...prev, [filename]: true }))
      } else {
        const err = await res.json()
        setMessage(`Failed to upload ${filename}: ${err.detail || err.error || res.statusText}`)
      }
    } catch (err) {
      setMessage(`Failed to upload ${filename}: ${err}`)
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload/Replace CSV Files</h1>
      {CSV_FILES.map((file) => (
        <div key={file.name} className="mb-6 p-4 border rounded bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">{file.name}</div>
            <div className={fileStatus[file.name] ? "text-green-600" : "text-red-600"}>
              {fileStatus[file.name] ? "File exists" : "File not found"}
            </div>
          </div>
          <label className="mt-2 sm:mt-0 inline-block px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
            {uploading === file.name ? "Uploading..." : fileStatus[file.name] ? "Replace" : "Upload"}
            <input
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              disabled={!!uploading}
              onChange={(e) => handleUpload(e, file.name)}
            />
          </label>
        </div>
      ))}
      {message && <div className="mt-4 text-center text-blue-700 font-semibold">{message}</div>}
    </div>
  )
} 