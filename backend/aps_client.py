import os
import base64
import requests
import time
from urllib.parse import quote
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import json

load_dotenv()

class APSClient:
    def __init__(self):
        self.client_id = os.getenv("APS_CLIENT_ID")
        self.client_secret = os.getenv("APS_CLIENT_SECRET")
        self.bucket_key = os.getenv('APS_BUCKET_KEY', 'enhanced-revit-viewer-v3')
        self.base_url = "https://developer.api.autodesk.com"
        self.access_token = None
        self.token_expires_at = 0

        if not self.client_id or not self.client_secret:
            raise ValueError("APS_CLIENT_ID and APS_CLIENT_SECRET must be set")

    def get_access_token(self, force_refresh: bool = False):
        """Get OAuth v2 access token with proper scope for Model Derivative"""
        current_time = time.time()

        if not force_refresh and self.access_token and current_time < self.token_expires_at:
            return self.access_token

        url = f"{self.base_url}/authentication/v2/token"

        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': f'Basic {encoded_credentials}'
        }
        
        # Proper scope including viewables:read for Model Derivative
        data = {
            'grant_type': 'client_credentials',
            'scope': 'bucket:create bucket:read bucket:update bucket:delete data:read data:write data:create data:search viewables:read'
        }
        
        try:
            response = requests.post(url, headers=headers, data=data)
            response.raise_for_status()

            token_data = response.json()
            self.access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 3600)
            self.token_expires_at = current_time + expires_in - 60

            print(f"🔑 Token obtained with Model Derivative scope")
            return self.access_token
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                raise ValueError(f"APS Authentication failed - check your CLIENT_ID and CLIENT_SECRET. Error: {e.response.text}")
            raise
        except Exception as e:
            raise Exception(f"Failed to get APS access token: {str(e)}")

    def ensure_bucket_exists(self):
        """Create bucket with persistent policy for Model Derivative compatibility"""
        token = self.get_access_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        url = f"{self.base_url}/oss/v2/buckets/{self.bucket_key}/details"
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            print(f"✅ Bucket '{self.bucket_key}' exists")
            return True

        if response.status_code == 404:
            print(f"📦 Creating bucket '{self.bucket_key}'...")
            url = f"{self.base_url}/oss/v2/buckets"
            
            # Use persistent policy for Model Derivative compatibility
            data = {
                "bucketKey": self.bucket_key,
                "policyKey": "persistent"
            }

            response = requests.post(url, headers=headers, json=data)
            if response.status_code in [200, 409]:
                print(f"✅ Bucket '{self.bucket_key}' created with persistent policy")
                return True
            else:
                print(f"❌ Failed to create bucket: {response.status_code} - {response.text}")

        response.raise_for_status()
        return False

    def upload_file(self, file_path: str, object_key: str):
        """Upload file using proper APS signed S3 upload endpoints"""
        self.ensure_bucket_exists()
        
        # Validate file before upload
        if not os.path.exists(file_path):
            raise Exception(f"File not found: {file_path}")
        
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise Exception(f"File is empty: {file_path}")
        
        print(f"📁 File validation: {file_path} ({file_size:,} bytes)")
        
        # Use the documented signed S3 upload process
        return self._upload_with_signed_s3(file_path, object_key)

    def _upload_with_signed_s3(self, file_path: str, object_key: str):
        
        #Implement official APS signed S3 upload workflow per documentation:
        #1. GET signeds3upload?parts=N → Get uploadKey + signed URLs
        #2. PUT to S3 URLs → Upload file parts
        #3. POST signeds3upload with uploadKey → Complete upload
        
        token = self.get_access_token()
        file_size = os.path.getsize(file_path)
        
        print(f"📝 Starting official APS signed S3 upload for: {object_key} ({file_size:,} bytes)")
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        base_endpoint = f"{self.base_url}/oss/v2/buckets/{self.bucket_key}/objects/{object_key}/signeds3upload"
        
        # Modified part calculation - use single part for files under 100MB
        max_single_part_size = 100 * 1024 * 1024  # 100MB threshold for single part
        num_parts = 1
        
        if file_size > max_single_part_size:
            # Only use multipart for very large files
            part_size = 10 * 1024 * 1024  # 10MB per part for large files
            num_parts = (file_size + part_size - 1) // part_size  # Ceiling division
            num_parts = min(num_parts, 10000)  # S3 limit is 10,000 parts
            print(f"📊 Large file detected: will use {num_parts} parts (file > 100MB)")
        else:
            print(f"📊 Using single part upload (file ≤ 100MB)")
        
        # Step 1: GET signeds3upload with parts query parameter
        print(f"🔗 Step 1: Getting uploadKey and signed URLs...")
        
        get_url = f"{base_endpoint}?parts={num_parts}"
        print(f"📡 GET URL: {get_url}")
        
        get_response = requests.get(get_url, headers=headers)
        
        print(f"📡 GET Response status: {get_response.status_code}")
        print(f"📄 GET Response text: {get_response.text}")
        
        if get_response.status_code != 200:
            raise Exception(f"Failed to get signed URLs: {get_response.status_code} - {get_response.text}")
        
        signed_data = get_response.json()
        upload_key = signed_data.get('uploadKey')
        upload_urls = signed_data.get('urls', [])
        
        if not upload_key:
            raise Exception("No uploadKey returned from GET signeds3upload")
        
        if not upload_urls:
            raise Exception("No upload URLs returned from GET signeds3upload")
        
        print(f"✅ Obtained uploadKey: {upload_key}")
        print(f"📊 Received {len(upload_urls)} upload URL(s)")
        
        # Step 2: Upload file to S3 using signed URLs
        print(f"⬆️ Step 2: Uploading to S3...")
        
        if len(upload_urls) == 1:
            # Single part upload
            print(f"   Uploading as single part...")
            upload_url = upload_urls[0]
            
            with open(file_path, 'rb') as f:
                upload_response = requests.put(upload_url, data=f)
            
            if upload_response.status_code not in [200, 201]:
                raise Exception(f"S3 upload failed: {upload_response.status_code} - {upload_response.text}")
            
            print(f"✅ Single part upload successful")
            
        else:
            # Multi-part upload
            print(f"   Uploading as {len(upload_urls)} parts...")
            
            bytes_per_part = file_size // len(upload_urls)
            
            with open(file_path, 'rb') as f:
                for i, upload_url in enumerate(upload_urls):
                    part_number = i + 1
                    
                    # Calculate chunk boundaries
                    if i == len(upload_urls) - 1:
                        # Last chunk gets remaining bytes
                        chunk_data = f.read()
                    else:
                        chunk_data = f.read(bytes_per_part)
                    
                    print(f"   Uploading part {part_number}/{len(upload_urls)} ({len(chunk_data):,} bytes)")
                    
                    upload_response = requests.put(upload_url, data=chunk_data)
                    
                    if upload_response.status_code not in [200, 201]:
                        raise Exception(f"S3 part {part_number} upload failed: {upload_response.status_code}")
                    
                    print(f"   ✅ Part {part_number} uploaded successfully")
        
        # Step 3: Complete upload with uploadKey only (per documentation)
        print(f"🏁 Step 3: Completing upload...")
        
        # According to documentation: only uploadKey needed for completion
        complete_request = {
            "uploadKey": upload_key
        }
        
        print(f"📋 Completion request: {json.dumps(complete_request, indent=2)}")
        
        complete_response = requests.post(base_endpoint, headers=headers, json=complete_request)
        
        print(f"📡 Completion response status: {complete_response.status_code}")
        print(f"📄 Completion response: {complete_response.text}")
        
        if complete_response.status_code not in [200, 201]:
            raise Exception(f"Failed to complete upload: {complete_response.status_code} - {complete_response.text}")
        
        completion_data = complete_response.json()
        print(f"✅ Upload completed successfully!")
        print(f"📋 Object created: {completion_data.get('objectId', 'N/A')}")
        print(f"📊 Final size: {completion_data.get('size', 'N/A')} bytes")
        
        # Step 4: Verify the upload
        self._verify_upload(object_key, file_size)
        
        return self._generate_urn(object_key)

    def _verify_upload(self, object_key: str, expected_size: int):
        """Verify uploaded file is accessible"""
        token = self.get_access_token()
        headers = {'Authorization': f'Bearer {token}'}
        
        # Check object details
        url = f"{self.base_url}/oss/v2/buckets/{self.bucket_key}/objects/{object_key}/details"
        
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = requests.get(url, headers=headers)
                if response.status_code == 200:
                    details = response.json()
                    actual_size = details.get('size', 0)
                    
                    if actual_size == expected_size:
                        print(f"✅ Upload verified: {actual_size:,} bytes")
                        return True
                    else:
                        print(f"⚠️ Size mismatch: expected {expected_size:,}, got {actual_size:,}")
                
                print(f"⚠️ Verification attempt {attempt + 1}/{max_retries} failed: {response.status_code}")
                if attempt < max_retries - 1:
                    time.sleep(3)  # Wait a bit longer for S3 propagation
                    
            except Exception as e:
                print(f"⚠️ Verification error (attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(3)
        
        print("⚠️ Upload verification failed - but proceeding anyway")
        return True  # Don't fail the entire process for verification issues

    def _generate_urn(self, object_key: str):
        """Generate URN from bucket and object key"""
        object_id = f"urn:adsk.objects:os.object:{self.bucket_key}/{object_key}"
        urn = base64.b64encode(object_id.encode()).decode()
        
        print(f"🔗 Generated URN: {urn}")
        print(f"📋 Object ID: {object_id}")
        
        return urn

    def translate_to_svf(self, urn: str):
        """Start SVF translation job with proper delay"""
        # Wait for S3 to APS propagation
        print("⏳ Waiting for file to be accessible to Model Derivative service...")
        time.sleep(20)  # Wait 20 seconds for S3 propagation
        
        token = self.get_access_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        url = f"{self.base_url}/modelderivative/v2/designdata/job"
        
        data = {
            "input": {"urn": urn},
            "output": {
                "formats": [{
                    "type": "svf",
                    "views": ["2d", "3d"]
                }]
            }
        }
        
        print(f"🔄 Starting SVF translation for URN: {urn}")
        
        try:
            response = requests.post(url, headers=headers, json=data)
            print(f"📡 Translation response status: {response.status_code}")
            
            if response.status_code == 409:
                print("⚠️ Translation already in progress or completed")
                return urn
            
            if response.status_code != 200:
                print(f"❌ Translation request failed: {response.status_code}")
                print(f"📄 Response text: {response.text}")
                raise Exception(f"Translation request failed: {response.status_code} - {response.text}")
            
            result = response.json()
            print(f"✅ Translation job submitted")
            return result.get('urn', urn)
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error during translation: {e}")
            raise
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON response: {e}")
            raise

    def get_translation_status(self, urn: str):
        """Get translation status with enhanced error reporting"""
        token = self.get_access_token()
        headers = {'Authorization': f'Bearer {token}'}
        url = f"{self.base_url}/modelderivative/v2/designdata/{urn}/manifest"
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            manifest = response.json()
            
            # Extract detailed error information
            status = manifest.get('status', 'pending')
            progress = manifest.get('progress', '0%')
            
            # Look for error messages in derivatives
            error_messages = []
            if 'derivatives' in manifest:
                for derivative in manifest['derivatives']:
                    if 'messages' in derivative:
                        for message in derivative['messages']:
                            if message.get('type') in ['error', 'warning']:
                                error_messages.append({
                                    'type': message.get('type'),
                                    'message': message.get('message'),
                                    'code': message.get('code')
                                })
            
            result = {
                'status': status,
                'progress': progress,
                'manifest': manifest,
                'error_messages': error_messages
            }
            
            # Enhanced logging for failed status
            if status == 'failed':
                print(f"❌ Translation failed - detailed analysis:")
                print(f"   Status: {status}")
                print(f"   Progress: {progress}")
                if error_messages:
                    print(f"   Error messages found: {len(error_messages)}")
                    for i, error in enumerate(error_messages, 1):
                        print(f"   Error {i}: [{error['type']}] {error['message']} (Code: {error.get('code', 'N/A')})")
                        
                        # Specific handling for TX Worker download failure
                        if 'download' in error['message'].lower() and 'worker' in error['message'].lower():
                            print(f"   🔧 TX Worker download failure detected")
                            print(f"      This indicates the Model Derivative service cannot access the uploaded file")
                            print(f"      Possible causes: S3 propagation delay, incorrect upload, file corruption")
                else:
                    print(f"   No specific error messages found in manifest")
            
            return result
            
        except Exception as e:
            print(f"❌ Error getting translation status: {e}")
            raise
    
    def wait_for_translation(self, urn: str, timeout: int = 300):
        """Wait for translation to complete with enhanced error reporting"""
        start_time = time.time()
        last_status = None
        
        while time.time() - start_time < timeout:
            try:
                status_info = self.get_translation_status(urn)
                status = status_info['status']
                
                # Only print status updates when they change
                if status != last_status:
                    print(f"🔄 Translation status: {status} - {status_info.get('progress', '0%')}")
                    last_status = status
                
                if status == 'success':
                    print("✅ Translation completed successfully!")
                    return status_info
                    
                if status == 'failed':
                    print("❌ Translation failed!")
                    
                    # Create detailed error message
                    error_details = []
                    if status_info.get('error_messages'):
                        for error in status_info['error_messages']:
                            error_details.append(f"{error['type']}: {error['message']}")
                    
                    if error_details:
                        detailed_error = f"Translation failed with errors: {'; '.join(error_details)}"
                    else:
                        detailed_error = f"Translation failed (no specific error details available)"
                    
                    raise Exception(detailed_error)
                
                time.sleep(5)
                
            except Exception as e:
                if "Translation failed" in str(e):
                    raise  # Re-raise translation failures
                print(f"⚠️ Error checking status: {e}")
                time.sleep(5)
                
        raise TimeoutError(f"Translation timed out after {timeout} seconds")

    def validate_file_for_translation(self, file_path: str) -> Dict[str, Any]:
        """Validate file before attempting translation"""
        validation_result = {
            'valid': True,
            'issues': [],
            'file_info': {}
        }
        
        try:
            # Basic file checks
            if not os.path.exists(file_path):
                validation_result['valid'] = False
                validation_result['issues'].append("File does not exist")
                return validation_result
            
            file_size = os.path.getsize(file_path)
            file_ext = os.path.splitext(file_path)[1].lower()
            
            validation_result['file_info'] = {
                'size': file_size,
                'size_mb': round(file_size / 1024 / 1024, 2),
                'extension': file_ext,
                'path': file_path
            }
            
            # Size checks
            if file_size == 0:
                validation_result['valid'] = False
                validation_result['issues'].append("File is empty")
            elif file_size > 500 * 1024 * 1024:  # 500MB limit
                validation_result['issues'].append(f"File is very large ({validation_result['file_info']['size_mb']}MB) - may cause translation issues")
            
            # Extension checks
            supported_extensions = ['.rvt', '.rfa', '.ifc', '.dwg']
            if file_ext not in supported_extensions:
                validation_result['valid'] = False
                validation_result['issues'].append(f"Unsupported file extension: {file_ext}")
            
            return validation_result
            
        except Exception as e:
            validation_result['valid'] = False
            validation_result['issues'].append(f"Validation error: {e}")
            return validation_result

    def get_svf_derivative_info(self, urn: str) -> Dict[str, Any]:
        """Extract SVF derivative information from manifest"""
        try:
            status_info = self.get_translation_status(urn)
            manifest = status_info.get('manifest', {})
            
            if status_info['status'] != 'success':
                raise Exception(f"Translation not complete. Status: {status_info['status']}")
            
            derivatives = manifest.get('derivatives', [])
            svf_derivatives = []
            
            for derivative in derivatives:
                if derivative.get('outputType') == 'svf':
                    # Find viewable children (3D models)
                    children = derivative.get('children', [])
                    for child in children:
                        if child.get('role') == '3d' and child.get('type') == 'geometry':
                            viewable_id = child.get('viewableID')
                            if viewable_id:
                                # ✅ CORRECT: For loadModel(), we need the SVF file URL, not manifest URL
                                # The SVF file is typically named 'objects_attrs.json.gz' or similar
                                # But for loadModel(), we actually need to use the URN + viewableID pattern
                                
                                # Method 1: Try the SVF bubble URL pattern
                                svf_url = f"{self.base_url}/derivativeservice/v2/derivatives/{viewable_id}"
                                
                                # Method 2: Alternative - use the urn + viewableID pattern that loadModel() expects
                                loadmodel_url = f"urn:{urn}?viewableID={viewable_id}"
                                
                                svf_derivatives.append({
                                    'name': child.get('name', 'Unknown'),
                                    'viewableID': viewable_id,
                                    'svf_url': svf_url,  # For direct SVF access
                                    'loadmodel_url': loadmodel_url,  # For loadModel() function
                                    'manifest_url': f"{self.base_url}/modelderivative/v2/designdata/{urn}/manifest/{viewable_id}",  # Original manifest URL
                                    'guid': child.get('guid'),
                                    'mime': child.get('mime'),
                                    'status': child.get('status')
                                })
            
            if not svf_derivatives:
                raise Exception("No SVF 3D viewables found in manifest")
            
            # For loadModel(), we should use the loadmodel_url format
            primary_url = svf_derivatives[0]['loadmodel_url']
            
            return {
                'success': True,
                'derivatives': svf_derivatives,
                'primary_svf_url': primary_url,  # Use loadmodel_url format
                'manifest': manifest
            }
            
        except Exception as e:
            print(f"❌ Error extracting SVF info: {e}")
            return {
                'success': False,
                'error': str(e),
                'derivatives': []
            }

    def get_viewer_token(self) -> str:
        """Get access token for frontend viewer"""
        return self.get_access_token()
    
    def test_connection(self) -> Dict[str, Any]:
        """Test APS connection and return status"""
        try:
            token = self.get_access_token()
            bucket_status = self.ensure_bucket_exists()
            
            return {
                "success": True,
                "token_obtained": bool(token),
                "bucket_accessible": bucket_status,
                "client_id": self.client_id[:8] + "..." if self.client_id else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "client_id": self.client_id[:8] + "..." if self.client_id else None
            }