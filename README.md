# Enhanced Revit Viewer

A modern web application for viewing and interacting with Revit models using Autodesk Platform Services (APS) Viewer.

## Features

- **3D Model Viewing**: Load and display Revit models in a web browser
- **Interactive Controls**: Pan, zoom, rotate, and navigate through 3D models
- **Material Override**: Apply custom materials to model geometry
- **Studio Lighting**: Professional lighting setup for better model visualization
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Processing**: Track model processing status in real-time

## Project Structure

```
enhanced-revit-viewer/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── utils/           # Utility functions
│   │   └── main.jsx         # Application entry point
│   └── package.json
├── backend/                  # Python FastAPI backend
│   ├── main.py              # Main server file
│   ├── aps_client.py        # APS API client
│   └── requirements.txt

```
   **Environment Variables Setup:**
   
   Create a `.env` file in the root directory of the project with the following variables:
   
   ```env
   # Autodesk Platform Services (APS) Credentials
   APS_CLIENT_ID=your_aps_client_id_here
   APS_CLIENT_SECRET=your_aps_client_secret_here
   APS_BUCKET_KEY=your_bucket_key_here
   
   # Optional: Server Configuration
   HOST=0.0.0.0
   PORT=8000
   DEBUG=false
   ```
   
   **How to get APS credentials:**
   
   1. Go to [Autodesk Platform Services](https://platform.autodesk.com/)
   2. Sign in with your Autodesk account
   3. Navigate to "My Apps" in the developer portal
   4. Create a new app or use an existing one
   5. Copy the Client ID and Client Secret from your app settings
   6. Create a bucket in the Data Management API section
   7. Copy the Bucket Key
   
   **Important Security Notes:**
   - Never commit your `.env` file to version control
   - Keep your credentials secure and don't share them
   - The `.env` file is already included in `.gitignore`
   - Use different credentials for development and production
     
## Prerequisites

- Node.js (v16 or higher)
- Python 3.8 or higher


## Installation

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables (create a `.env` file):
   ```
   APS_CLIENT_ID=your_client_id
   APS_CLIENT_SECRET=your_client_secret
   APS_BUCKET_KEY=your_bucket_key
   ```

5. Start the backend server:
   ```bash
   python main.py
   ```

## Usage

1. Start both frontend and backend servers
2. Open your browser and navigate to `http://localhost:5173`
3. Upload a Revit file (.rvt) through the web interface
4. Wait for the model to be processed and translated
5. View the 3D model in the interactive viewer

## API Endpoints

- `POST /api/upload` - Upload Revit files
- `GET /api/models/{job_id}/status` - Get processing status
- `GET /api/models/{job_id}/viewer-token` - Get viewer access token
- `GET /api/models/{job_id}/info` - Get model information


## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Autodesk Platform Services for the 3D viewer technology
- React and Vite for the frontend framework
- Flask for the backend API 
