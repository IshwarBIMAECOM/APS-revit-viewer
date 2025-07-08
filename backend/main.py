import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any
import aiofiles
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse, Response
from pydantic import BaseModel
from dotenv import load_dotenv
import sys

from aps_client import APSClient

load_dotenv()
app = FastAPI(title="Simple Revit Viewer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Define directories
UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', './models/temp'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Initialize APS client
aps_client = APSClient()

# In-memory job tracking
processing_jobs: Dict[str, Dict[str, Any]] = {}

class ProcessingStatus(BaseModel):
    job_id: str
    status: str  # 'uploading', 'translating', 'completed', 'failed'
    progress: int  # 0-100
    message: str
    urn: Optional[str] = None
    error: Optional[str] = None

class ModelInfo(BaseModel):
    job_id: str
    filename: str
    urn: str
    status: str
    created_at: str

async def process_file_pipeline(job_id: str, file_path: str, filename: str):
    """Simplified pipeline - only upload and translate to SVF"""
    try:
        processing_jobs[job_id].update({
            'status': 'uploading',
            'progress': 10,
            'message': 'Uploading file to APS...'
        })

        object_key = f"{job_id}_{filename}"
        urn = aps_client.upload_file(file_path, object_key)
        processing_jobs[job_id]['urn'] = urn
        
        processing_jobs[job_id].update({
            'status': 'translating',
            'progress': 50,
            'message': 'Translating model to SVF format...'
        })
        
        # Start translation
        aps_client.translate_to_svf(urn)
        
        # Wait for translation to complete
        translation_result = aps_client.wait_for_translation(urn)
        if translation_result['status'] != 'success':
            raise Exception(f"Translation failed: {translation_result}")
        
        # Update status: completed
        processing_jobs[job_id].update({
            'status': 'completed',
            'progress': 100,
            'message': 'SVF model ready for viewing',
        })
        
        # Clean up upload file
        if os.path.exists(file_path):
            os.remove(file_path)
            
    except Exception as e:
        processing_jobs[job_id].update({
            'status': 'failed',
            'progress': 0,
            'message': str(e),
            'error': str(e)
        })
        print(f"Processing failed for job {job_id}: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "Simple Revit Viewer API v1.0",
        "status": "running",
        "viewer": "APS Viewer only",
        "features": [
            "Unlimited file size upload to APS",
            "SVF translation",
            "APS Viewer integration",
            "Simple and reliable"
        ]
    }

@app.get("/api/health")
async def health_check():
    """Health check with APS diagnostics"""
    health_data = {
        "status": "healthy",
        "services": {},
        "viewer": "APS Viewer only",
        "version": "1.0.0",
        "diagnostics": {}
    }
    
    try:
        # Test APS connection
        try:
            token = aps_client.get_access_token()
            aps_connected = bool(token)
            health_data["diagnostics"]["aps_token_length"] = len(token) if token else 0
        except Exception as e:
            aps_connected = False
            health_data["diagnostics"]["aps_error"] = str(e)
        
        health_data["services"]["aps_connected"] = aps_connected
        
        # Test bucket access
        try:
            bucket_accessible = aps_client.ensure_bucket_exists()
            health_data["services"]["bucket_accessible"] = bucket_accessible
        except Exception as e:
            health_data["services"]["bucket_accessible"] = False
            health_data["diagnostics"]["bucket_error"] = str(e)
        
    except Exception as e:
        health_data["status"] = "unhealthy"
        health_data["error"] = str(e)
    
    return health_data

@app.post("/api/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Upload file and start processing pipeline"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Basic file validation
        content = await file.read()
        file_size = len(content)
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Save file temporarily
        file_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Initialize job tracking
        processing_jobs[job_id] = {
            'job_id': job_id,
            'filename': file.filename,
            'status': 'starting',
            'progress': 0,
            'message': 'Starting processing...',
            'created_at': str(asyncio.get_event_loop().time())
        }
        
        # Start background processing
        background_tasks.add_task(process_file_pipeline, job_id, str(file_path), file.filename)
        
        return {
            "job_id": job_id,
            "filename": file.filename,
            "status": "uploaded",
            "message": "File uploaded successfully, processing started"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/status/{job_id}")
async def get_processing_status(job_id: str):
    """Get processing status for a job"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = processing_jobs[job_id]
    return ProcessingStatus(**job_data)

@app.get("/api/models/{job_id}/viewer-token")
async def get_viewer_token(job_id: str):
    """Get APS viewer token for a model"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = processing_jobs[job_id]
    if job_data['status'] != 'completed':
        raise HTTPException(status_code=400, detail="Model not ready for viewing")
    
    try:
        token = aps_client.get_viewer_token()
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get viewer token: {str(e)}")

@app.get("/api/models/{job_id}/verify-svf")
async def verify_svf_access(job_id: str):
    """Verify SVF derivative is accessible from server side"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = processing_jobs[job_id]
    if job_data['status'] != 'completed':
        raise HTTPException(status_code=400, detail="Model not ready for viewing")
    
    try:
        urn = job_data.get('urn')
        if not urn:
            raise HTTPException(status_code=400, detail="No URN available for model")
        
        # Get SVF derivative info
        svf_info = aps_client.get_svf_derivative_info(urn)
        
        if not svf_info['success']:
            return {
                'success': False,
                'error': f"Failed to get SVF info: {svf_info.get('error')}",
                'svf_accessible': False
            }
        
        # Test SVF URL accessibility from server
        svf_url = svf_info['primary_svf_url']
        token = aps_client.get_access_token()
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        import requests
        response = requests.head(svf_url, headers=headers)
        
        # Get manifest data if accessible
        manifest_data = None
        if response.status_code == 200:
            try:
                manifest_response = requests.get(svf_url, headers=headers)
                if manifest_response.status_code == 200:
                    manifest_data = manifest_response.json()
            except Exception as e:
                print(f"Could not get manifest data: {e}")
        
        return {
            'success': True,
            'svf_url': svf_url,
            'svf_accessible': response.status_code == 200,
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'manifest_data': manifest_data,
            'all_derivatives': svf_info['derivatives']
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'svf_accessible': False
        }

@app.get("/api/models/{job_id}/svf-url")
async def get_svf_url(job_id: str):
    """Get SVF derivative URL for loadModel()"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = processing_jobs[job_id]
    if job_data['status'] != 'completed':
        raise HTTPException(status_code=400, detail="Model not ready for viewing")
    
    try:
        urn = job_data.get('urn')
        if not urn:
            raise HTTPException(status_code=400, detail="No URN available for model")
        
        # Get SVF derivative info
        svf_info = aps_client.get_svf_derivative_info(urn)
        
        if not svf_info['success']:
            raise HTTPException(status_code=500, detail=f"Failed to get SVF info: {svf_info.get('error')}")
        
        return {
            'success': True,
            'primary_svf_url': svf_info['primary_svf_url'],
            'all_derivatives': svf_info['derivatives'],
            'urn': urn
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get SVF URL: {str(e)}")

@app.get("/api/models/{job_id}/info")
async def get_model_info(job_id: str):
    """Get information about a processed model"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = processing_jobs[job_id]
    
    return {
        'job_id': job_id,
        'filename': job_data.get('filename', ''),
        'urn': job_data.get('urn', ''),
        'status': job_data.get('status', ''),
        'created_at': job_data.get('created_at', ''),
        'viewer_type': 'APS Viewer'
    }

@app.get("/api/models")
async def list_models():
    """List all processed models"""
    models = []
    for job_id, job_data in processing_jobs.items():
        if job_data.get('status') == 'completed':
            models.append({
                'job_id': job_id,
                'filename': job_data.get('filename', ''),
                'urn': job_data.get('urn', ''),
                'status': job_data.get('status', ''),
                'created_at': job_data.get('created_at', ''),
                'viewer_type': 'APS Viewer'
            })
    
    return {"models": models}

@app.delete("/api/models/{job_id}")
async def delete_model(job_id: str):
    """Delete a model (clean up job data)"""
    if job_id in processing_jobs:
        del processing_jobs[job_id]
        return {"message": "Model deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Job not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 