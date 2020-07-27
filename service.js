var Service = require('node-windows').Service

// Create a new service object
var svc = new Service({
  name:         'AMS - CHECK',
  description:  'AMS - Monitoring Service ', 
  script:       require('path').join(__dirname,'ams_check.js')
})

svc.workingdirectory = "C:\\ams\\ams_check\\"
// Install the service.
svc.install()