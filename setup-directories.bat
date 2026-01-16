# Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

# Create uploads directory if it doesn't exist  
if not exist "uploads" mkdir uploads
if not exist "uploads\profiles" mkdir uploads\profiles

echo "Directories created successfully!"
echo "Logs directory: logs"
echo "Uploads directory: uploads"
echo "Profiles directory: uploads\profiles"

echo.
echo "You can now run: npm start"
echo "Or: npm run dev"