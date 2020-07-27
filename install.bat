cd C:\AMS\ams_check\
msiexec.exe /i node-v12.16.1-x86.msi INSTALLDIR="C:\AMS\ams_check\NodeJS" /qn
C:\AMS\ams_check\NodeJS\node service.js
timeout /T 3 /nobreak
net start amscheck.exe
timeout /T 10
logoff
