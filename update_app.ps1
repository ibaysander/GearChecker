# Define your app directory and PM2 process name
$appDir = "C:\Program Files (x86)\Metalforce\GearChecker\"
$pm2ProcessName = "GearChecker"

# Pull the latest changes from the main branch
cd $appDir
git pull origin main

# Restart your Node.js app with PM2
pm2 restart $pm2ProcessName
