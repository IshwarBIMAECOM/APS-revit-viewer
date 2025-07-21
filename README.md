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
   uvicorn main:app --reload
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

## Troubleshooting

### Common Setup Issues

**Environment Variables Not Loading:**
- Ensure your `.env` file is in the root directory (same level as `README.md`)
- Check that there are no spaces around the `=` sign in your `.env` file
- Restart your backend server after making changes to `.env`

**APS Authentication Errors:**
- Verify your Client ID and Client Secret are correct
- Ensure your APS app has the necessary permissions enabled
- Check that your bucket key is valid and accessible

**Model Processing Issues:**
- Ensure your Revit file (.rvt) is not corrupted
- Check that the file size is within APS limits
- Verify your APS account has sufficient credits for translation

**Frontend Connection Issues:**
- Ensure the backend server is running on the correct port
- Check that CORS is properly configured
- Verify the frontend is pointing to the correct backend URL

### Getting Help

If you encounter issues:
1. Check the browser console for frontend errors
2. Check the terminal running the backend for server errors
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed properly

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Autodesk Platform Services for the 3D viewer technology
- React and Vite for the frontend framework

