import React, { useState, useEffect } from 'react'
import axios from 'axios'

const ProcessingStatus = ({jobId, onProcessingComplete, onError}) => {
    const [status, setStatus] = useState('starting')
    const [progress, setProgress] = useState(0)
    const [message, setMessage] = useState('')
    const [error, setError] = useState(null)

    useEffect(() => {
        console.log('🔍 ProcessingStatus received jobId:', jobId);
        if (!jobId) return

        const pollStatus = async () => {
            console.log('🔍 Polling status for jobId:', jobId);
            try{
                const response = await axios.get(`/api/status/${jobId}`)
                const data = response.data
                setStatus(data.status)
                setProgress(data.progress)
                setMessage(data.message)

                if (data.status === 'completed') {
                    onProcessingComplete?.(data)
                } else if (data.status === 'failed') {
                    setError(data.error || 'Processing failed')
                    onError?.(data.error || 'Processing failed')
                } else if (data.error) {
                    setError(data.error)
                    onError?.(data.error)
                }

            } catch (err){
                setError('failed to check processing status')
                onError?.('Failed to check processing status')
            }
        }
        pollStatus()

        const interval = setInterval(pollStatus, 5000)
        return () => clearInterval(interval)
    }, [jobId, onProcessingComplete, onError])
    
    const getStatusIcon = () => {
        switch (status){
            case 'uploading': return '⬆️'
            case 'translating': return '🔄'
            case 'completed': return '✅'
            case 'failed': return '❌'
            default: return '⏳'
        }
    }
    
    const getStatusColor = () => {
        switch (status){
            case 'completed': return '#28a745'
            case 'failed': return '#dc3545'
            default: return '#007ACC'
        }
    }

    const getStepDescription = () => {
        switch (status){
            case 'uploading': return 'Uploading Revit file to Autodesk Platform Services'
            case 'translating': return 'Translating Revit file to SVF format'
            case 'completed': return 'Processing completed successfully'
            case 'failed': return 'Processing failed'
            default: return 'Processing in progress'
        }
    }
    
    return (
        <div className="status-card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px'}}>
                <div>
                    <h3 style={{ margin: '0', color: getStatusColor()}}>{status.charAt(0).toUpperCase() + status.slice(1)}</h3>
                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>JOB ID: {jobId}</p>
                </div>
            </div>
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: getStatusColor()}}></div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                <span style={{color: '#666', fontSize: '14px'}}>{getStepDescription()}</span>
                <span style={{color: '#666', fontSize: '14px'}}>{progress}%</span>
            </div>
            {/*processing steps indicator*/ }
            <div style={{ marginTop: '20px', fontSize: '12px', color: '#666'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ 
                        color: ['uploading', 'translating', 'completed'].includes(status) ? '#28a745' : '#ccc',
                        fontWeight: status === 'uploading' ? 'bold' : 'normal'
                    }}>
                        1. Uploading
                    </span>
                    <span style={{ 
                        color: ['translating', 'completed'].includes(status) ? '#28a745' : '#ccc',
                        fontWeight: status === 'translating' ? 'bold' : 'normal'}}>2. Translating to SVF </span>
                    <span style={{ 
                        color: status === 'completed' ? '#28a745' : '#ccc',
                        fontWeight: status === 'completed' ? 'bold' : 'normal'
                    }}>
                        3. Ready!
                    </span>
                </div>
            </div>
            {error && (
                <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    background: '#f8d7da', 
                    border: '1px solid #f5c6cb',
                    borderRadius: '6px',
                    color: '#721c24'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {status === 'completed' && (
                <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    background: '#d4edda', 
                    border: '1px solid #c3e6cb',
                    borderRadius: '6px',
                    color: '#155724'
                }}>
                    <strong>🎉 Success!</strong><br />
                    Your model is ready! You can now view it in the APS Viewer.
                </div>
            )}
        </div>
    )
}

export default ProcessingStatus; 