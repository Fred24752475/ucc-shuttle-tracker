@echo off
echo ========================================
echo  UCC Shuttle Tracker - Firewall Setup
echo ========================================
echo.
echo This will allow port 3001 through Windows Firewall
echo.
pause

echo Adding firewall rule for port 3001...
netsh advfirewall firewall add rule name="UCC Shuttle Tracker - Port 3001" dir=in action=allow protocol=TCP localport=3001

echo.
echo ========================================
echo  Firewall rule added successfully!
echo ========================================
echo.
echo Your friends can now access:
echo http://192.168.137.1:3001/htmls/index.html
echo.
pause
