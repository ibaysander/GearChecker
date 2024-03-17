@echo off
cd "C:\Program Files (x86)\Metalforce\GearChecker"

echo "------------------------------------------------------------------------------------------------" >> start_log.txt
echo Started: %DATE% %TIME% >> start_log.txt

npm start >> start_log.txt