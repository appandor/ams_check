/* Restart AMS Check Service  */

require('child_process').exec(
  'start cmd.exe /c "net stop amscheck.exe & net start amscheck.exe"', 
  function(){}
)