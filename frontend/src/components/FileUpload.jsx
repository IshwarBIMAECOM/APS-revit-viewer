import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

const FileUpload = ({onUploadSuccess, onUploadError}) => {
    const [uploading, setUploading] = useState(false)
    const onDrop = useCallback(async(acceptedFiles) => {
        const file = acceptedFiles[0]
        if (!file) return

        const allowedTypes = ['.rvt', '.ifc', '.dwg', '.rfa']
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

        if (!allowedTypes.includes(fileExtension)){
            onUploadError(`File type ${fileExtension} not supported. Use: ${allowedTypes.join(', ')}`)
            return
        }

        setUploading(true)
        try{
            const formData = new FormData()
            formData.append('file', file)

            const response = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000, // 5 minutes
              })
              onUploadSuccess(response.data)
            } catch (error){
                const errorMessage = error.response?.data?.detail || error.message || 'Upload failed'
                onUploadError(errorMessage) 
            } finally {
                setUploading(false)
            }
        },
        [onUploadSuccess, onUploadError]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/octet-stream': ['.rvt', '.rfa'],
            'application/x-dwg': ['.dwg'],
            'model/ifc': ['.ifc']    
        },
        multiple: false,
        disabled: uploading 
    })
    return (
        <div
      {...getRootProps()}
      className={`upload-area ${isDragActive ? 'dragover' : ''}`}
      style={{ opacity: uploading ? 0.6 : 1, minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: '2px dashed #ccc', borderRadius: '8px', margin: '2rem auto 1.5rem auto', background: '#fff', maxWidth: '900px', transition: 'border 0.2s' }}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div>
          <div style={{
            width: '32px',
            height: '32px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007ACC',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }}></div>
          <div style={{fontSize: '1.1rem'}}>Uploading...</div>
        </div>
      ) : (
        <div style={{width: '100%', textAlign: 'center', padding: '0.7em 0'}}>
          UPLOAD REVIT FILE
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    )
}
export default FileUpload;