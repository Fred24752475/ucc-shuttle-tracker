@echo off
echo ========================================
echo  UCC Shuttle Tracker - Google Cloud Deploy
echo ========================================
echo.

echo Step 1: Checking Google Cloud SDK...
gcloud --version
if errorlevel 1 (
    echo.
    echo ERROR: Google Cloud SDK not found!
    echo Please install from: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

echo.
echo Step 2: Login to Google Cloud...
gcloud auth login

echo.
echo Step 3: Set project...
set /p PROJECT_ID="Enter your Google Cloud Project ID (or press Enter for 'ucc-shuttle-tracker'): "
if "%PROJECT_ID%"=="" set PROJECT_ID=ucc-shuttle-tracker
gcloud config set project %PROJECT_ID%

echo.
echo Step 4: Enable required APIs...
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

echo.
echo Step 5: Deploying to Cloud Run...
gcloud run deploy ucc-shuttle-tracker --source . --platform managed --region us-central1 --allow-unauthenticated --port 3001

echo.
echo ========================================
echo  Deployment Complete!
echo ========================================
echo.
echo Your app is now live on Google Cloud!
echo Check the URL above to access it.
echo.
pause
