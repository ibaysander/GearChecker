$appDir = "C:\Program Files (x86)\Metalforce\GearChecker"
$pm2ProcessName = "GearChecker"

cd $appDir
git pull origin main

node install

pm2 restart $pm2ProcessName | pm2 start "C:\Program Files (x86)\Metalforce\GearChecker\ecosystem.config.js" >> start_log.txt