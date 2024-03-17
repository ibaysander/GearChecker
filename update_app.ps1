# Define your app directory and PM2 process name
$appDir = "C:\Program Files (x86)\Metalforce\GearChecker\"
$pm2ProcessName = "GearChecker"

echo "Pull the latest changes from the main branch"
echo "--------------------------------------------"
cd $appDir
git pull origin main >> update_log.txt

echo ""
echo ""
echo "Restart your Node.js app with PM2"
echo "--------------------------------------------"
pm2 restart $pm2ProcessName >> update_log.txt
