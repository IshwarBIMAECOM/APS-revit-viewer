import React, { useState } from "react";
import FileUpload from "./components/FileUpload";
import ProcessingStatus from "./components/ProcessingStatus";
import ViewerDemo from "./components/ViewerDemo";

function App() {
  const [currentJob, setCurrentJob] = useState(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [completedJobData, setCompletedJobData] = useState(null);
  const [error, setError] = useState(null);

  const handleUploadSuccess = (jobData) => {
    setCurrentJob(jobData);
    setError(null);
    setProcessingComplete(false);
  };

  const handleUploadError = (errorMessage) => {
    setError(errorMessage);
    setCurrentJob(null);
  };

  const handleProcessingComplete = (statusData) => {
    setProcessingComplete(true);
    setCompletedJobData(currentJob);
    setCurrentJob(null);
  };

  const handleProcessingError = (errorMessage) => {
    setError(errorMessage);
  };

  const resetDemo = () => {
    setCurrentJob(null);
    setProcessingComplete(false);
    setCompletedJobData(null);
    setError(null);
  };

  return (
    <div>
      {/* Title Banner */}
      <div
        className="demo-header"
        style={{
          background: "linear-gradient(90deg, #e0e0e0 0%, #ffffff 100%)",
          padding: "2rem 0 1.5rem 0",
          textAlign: "center",
          letterSpacing: "0.15em",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: "2.5rem",
            color: "#222",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          SIMPLE REVIT VIEWER DEMO
        </h1>
      </div>
      {/* Error Display */}
      {error && (
        <div
          className="status-card"
          style={{ background: "#f8d7da", border: "1px solid #f5c6cb" }}
        >
          <h3 style={{ color: "#721c24" }}>Error</h3>
          <p style={{ color: "#721c24" }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {/* File Upload */}
      {!currentJob && !error && !processingComplete && (
        <>
          <FileUpload onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} />
          {/* No blank space here after upload */}
        </>
      )}
      {/* Processing Status */}
      {currentJob && !processingComplete && (
        <ProcessingStatus
          jobId={currentJob.job_id}
          onProcessingComplete={handleProcessingComplete}
          onError={handleProcessingError}
        />
      )}
      {/* 3D Viewer and New Demo Button */}
      {processingComplete && completedJobData && (
        <>
          <ViewerDemo jobData={completedJobData} />
          <div
            style={{
              width: "100%",
              padding: "1.5rem 0.5rem 0.5rem 0.5rem",
              boxSizing: "border-box",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <button
              className="btn btn-secondary"
              style={{
                width: "100%",
                maxWidth: "900px",
                fontSize: "1.1rem",
                fontWeight: 600,
                padding: "1.1em 0",
                borderRadius: "8px",
                margin: 0,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
              onClick={resetDemo}
            >
              New Demo
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App; 