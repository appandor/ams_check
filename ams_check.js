const version   = '1.5.5'
/* ****************************************** */
/* AMS_Check                                  */
/* 1.5.3 - last_reboot                        */
/* 1.5.4 - url_get / url_put                  */
/* 1.5.5 - interval set to 30 minutes         */
/*         new check intervals 1 hour         */
/* ****************************************** */
// Cool stuff:
//  - https://www.npmjs.com/package/express-status-monitor

var startDateTime = new Date().toLocaleString()
console.log ('AMS_CHECK',version,'- START:',startDateTime,'PID:',process.pid)

/* ------------------------------------------ */
/* Requirements                               */
/* ------------------------------------------ */
  const os            = require('os')
  const child_process = require('child_process')
  const request       = require('request')
  const path          = require('path')
  const fs            = require('fs')
  // Get rid of 3rd party request see: https://flaviocopes.com/node-http-post
  const checkDiskSpace = require('check-disk-space')
  // Get rid of check-disk-space, make it self 

  /* ------------------------------------------ */
  /* Configuration and Initialization           */
  /* ------------------------------------------ */

  const serviceInterval = 1800000 // one hour
  const serverurl       = 'http://10.16.148.108:443/'
  const ep              = 'ams_check_checks'
  const hostname        = os.hostname()  // my name 
  const homePath        = 'c:\\ams\\ams_check\\'

/*
  DAS KANN MAN NOCH BESSER MACHEN !!! 
*/
function execShellCommand(cmd) {
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
   exec(cmd, (error, stdout, stderr) => {
    if (error) {
      resolve('')  
      //console.warn(error)
    }
    resolve(stdout? stdout : stderr)
   })
  })
 }
  //process.exec('wmic service where (name="amsamsel.exe") get state /value', (error, stdout, stderr) => {
    //console.log('EXEC ERROR:   ',error)
    //console.log('EXEC STDOUT:  ',stdout)    
    //console.log('EXEC STDERROR:',stderr)
    //stdout = stdout.replace(/(\r\n|\n|\r)/gm, "")
    //console.log(stdout.split('='))
    //console.log(stdout.replace(/(\r\n|\n|\r)/gm, "").split('=')[1])
  //})

  /* ------------------------------------------ */
  /* Functions for dynamic calls                */
  /* These are the defined function that can    */
  /* be called - put name into db column CODE   */
  /* ------------------------------------------ */

  var env = {}
  /* ------------------------------------------ */
  /* Housekeeping                               */
  /* ------------------------------------------ */
  env.check_restart_service = async function(service) {
    //console.log('check_restart_service')
    require('child_process').fork('./restart_service.js', [])
    return true
  }

  env.check_version = async function() {
    return version
  }  
  env.check_update = async function(url) {

    var reqParam = { "url": url }
    request.get(reqParam, function (error, response, payload) {
      
      if (!error) {
        const data = JSON.parse(payload)
        if (data[0]) {
          fs.mkdir(path.dirname(data[0].target), { recursive: true }, (err) => {
            if (!err) {
              fs.writeFile(data[0].target,data[0].content, function (err) {
                if (!err) {
                  return true
                } else {
                  return false
                }
              })
            } else {
              return false
            }
          })
        } else {
          return false
        }  
      } else {
        return false
      }
    })
  }
  /* ------------------------------------------ */
  /* OS                                         */
  /* ------------------------------------------ */
  env.os_platform = async function() {
    return os.platform()
  }
  env.os_arch = async function() {
    return os.arch()
  }
  env.os_release = async function() {
    return os.release()
  }
  env.os_ip = async function() {
    var ip = ""
    var ifaces = os.networkInterfaces()
    Object.keys(ifaces).forEach(function (ifname) {
      var alias = 0
      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          //console.log('skip')
        } else if (ip == ""){
          // this single interface has multiple ipv4 addresses
          //console.log(ifname + ':' + alias, iface.address)
          ip = iface.address
        }
        ++alias
      })
    }) 
    return ip
  }
  /* ------------------------------------------ */
  /* URL                                        */
  /* ------------------------------------------ */
  
  // get content from url and save in subfolder .data
  env.url_get = async function(param) {
    var start = param.indexOf('/',7)
    var end   = param.indexOf('?')
    console.log('START',start)
    console.log('END',end)
    var targetFile = homePath+'.data\\'+param.substring(start+1,end)+'.json'
    console.log('file',targetFile)
    var targetPath = path.dirname(targetFile)
    console.log('path',targetPath)
    fs.mkdir(targetPath, { recursive: true }, (err) => {
      console.log('mkdir')
      console.log('err',err)
      console.log(param)

      request.get({ "url": param+'&id='+hostname }, function (error, response, payload) {
        if (!error) {
          const data = JSON.parse(payload)
          console.log(data)
          if(data[0]) {
            fs.writeFile(targetFile, JSON.stringify(data[0]), function (err) {
              if (!err) {
                return true
              } else {
                return false
              }
            })
          }
        }
      })
    })
    return true
  }
  env.url_put = async function(param) {

  }
  /* ------------------------------------------ */
  /* WINDOWS                                    */
  /* ------------------------------------------ */
  env.windows_description = async function() {
    return await execShellCommand('@FOR /F "tokens=2* delims= " %A IN (\'REG QUERY "HKLM\\System\\CurrentControlSet\\services\\LanmanServer\\Parameters" /v srvcomment\') DO @ECHO %B')
  }    
  env.windows_getdrives = async function() {
    var x = await execShellCommand('@for /f "skip=1 delims=" %x in (\'wmic logicaldisk where "drivetype=3" get caption\') do @echo.%x')
    x = (x.replace( new RegExp(' ', 'g') ,'').split('\r\r\n'))   // remove blanks and put to array  
    return x    
  }
  env.windows_lastboot = async function() {
    var x = await execShellCommand('powershell -command "Get-WmiObject -class Win32_OperatingSystem | Select-Object  @{label=\'LastBoot\';expression={$_.ConvertToDateTime($_.LastBootUpTime)}} | foreach { ([DateTime]$_.LastBoot).ToString(\'yyyy.MM.dd HH:mm:ss\') }"')
    return x    
  }


  /* ------------------------------------------ */
  /* SYSTEM                                     */
  /* ------------------------------------------ */
  env.system_cpus = async function() {
    return os.cpus().length
  }    
  env.system_memory = async function() {
    return os.totalmem()  
  }
  env.system_service = async function(service) {
    var x = await execShellCommand('wmic service where (name="'+service+'") get state /value')
    return x.replace(/(\r\n|\n|\r)/gm, "").split('=')[1]
  }
  env.system_disk_total = async function(drive) {
    if (drive) {
      try {
        const diskSpace = await checkDiskSpace(drive)
        return diskSpace.size  
      }
      catch { return undefined }  
    } else {
      return undefined
    }
  }
  env.system_disk_free = async function(drive) {
    if (drive) {
      try {
        const diskSpace = await checkDiskSpace(drive)
        return diskSpace.free
      }
      catch { return undefined }  
    } else {
      return undefined
    }
  }

/* ****************************************** */
/* Create default checks                      */
/* ****************************************** */
async function CreateChecks() {
  console.log('create checks')
  var table = 'ams_check_server'
  request.get({ url: serverurl+table+'?id='+hostname+'&out=rows' }, function (error, response, payload) {
    if (!error) {
      const data = JSON.parse(payload)
      //console.log(data)
      if (!data[0]) {  // no entry exists
        //console.log('no entry exists')
        request.post(serverurl+table, { json: { id: hostname} }, (error, res, body) => {
          //console.log('ERROR:', error)
          if (!error) {
            var myUUID = body.data._uuid 

            // Default Checks
            // Fire and forget - CALLBACK is undefined
            request.post(serverurl+ep, { json: { column: 'ams_check_version',     function: 'check_version',       id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            request.post(serverurl+ep, { json: { column: 'os_platform',           function: 'os_platform',         id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            request.post(serverurl+ep, { json: { column: 'os_release',            function: 'os_release',          id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            request.post(serverurl+ep, { json: { column: 'os_arch',               function: 'os_arch',             id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            request.post(serverurl+ep, { json: { column: 'os_ip',                 function: 'os_ip',               id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            request.post(serverurl+ep, { json: { column: 'cpus',                  function: 'system_cpus',         id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            request.post(serverurl+ep, { json: { column: 'memory',                function: 'system_memory',       id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            request.post(serverurl+ep, { json: { column: 'description',           function: 'windows_description', id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            request.post(serverurl+ep, { json: { column: 'lastboot',              function: 'windows_lastboot',    id: hostname, table: 'ams_check_server', key: myUUID, interval: 3600 } }, undefined)
            
            // Restart Service
            request.post(serverurl+ep, { json: { column: '', function: 'check_restart_service', id: hostname, table: 'ams_check_server', key: myUUID, interval: 86400, _lastcheck: new Date() } }, undefined)
            // Update Service Code
            request.post(serverurl+ep, { json: { column: 'source', param: 'http://10.16.148.108:443/ams_checks_downloads?id=ams_checks.js&columns=content,target&out=rows&limit=1&orderby=version%20desc', function: 'check_update', id: hostname, table: 'ams_check_code', key: myUUID, interval: 43200 } }, undefined)

            /* Create disk checks */
            var disktable = 'ams_check_server_disk'
            env.windows_getdrives().then( x => { 
              x.forEach(element => {
                if( element != '') {
                  request.post(serverurl+disktable, { json: { id: hostname, drive: element } }, (error, res, body) => {
                    var myUUID = body.data._uuid 
                    request.post(serverurl+ep, { json: { column: 'free',  param: element, function: 'system_disk_free',  id: hostname, table: 'ams_check_server_disk', key: myUUID, interval: 300 } }, undefined)
                    request.post(serverurl+ep, { json: { column: 'total', param: element, function: 'system_disk_total', id: hostname, table: 'ams_check_server_disk', key: myUUID, interval: 300 } }, undefined)
                  })  
                }
              })
              return true
            })                   
          } else {
            return false
          }
        })
      } else {
        //console.log('default exists')
        return false
      }
    }
  })
}

/* ****************************************** */
/* Service Main                               */
/* ****************************************** */
function Main() {

  /* ------------------------------------------ */
  /* Get checks                                 */
  /* ------------------------------------------ */

  //console.log('GET CHECKS')
  var reqParam = { url: serverurl+ep+'?id='+hostname }
  request.get(reqParam, function (error, response, payload) {
    if (!error) {
      const data = JSON.parse(payload)  
      if (Array.isArray(data.rows)) {
        data.rows.forEach(element => {
            //console.log('ELEMENT:', element)
      
            /* ------------------------------------------ */
            /* Check interval expired?                    */
            /* ------------------------------------------ */
            var currentDateTime = new Date()
            var lastCheck = new Date(element._lastcheck)
            //console.log('LASTCHECK:',lastCheck)
            var verifyDate = new Date(lastCheck.getTime() + (1000 * element.interval))
            //console.log('NEXTCHECK:',verifyDate)
            if (currentDateTime > verifyDate ) {
              //console.log('Do the CHECK')
      
            /* ------------------------------------------ */
            /* Run the check                              */
            /* ------------------------------------------ */
            try{
              //console.log('Function:',element.function)
              env[element.function](element.param).then(checkresult => {
                //console.log('RESULT OF CHECK:',checkresult)
      
                /* ------------------------------------------ */
                /* Put the check result                       */
                /* ------------------------------------------ */
                var content = {}
                content[element.column] = checkresult
                content._lastupdate = currentDateTime
                var body = { json: content }
                //console.log('URL',serverurl+element.table+'/'+element.key)
                //console.log('BODY:', body)
                request.put(serverurl+element.table+'/'+element.key, { json: content }, (error, res, body) => {
                  //console.log('StatusCode', res.statusCode)
                /* ------------------------------------------ */
                /* Update the check                           */
                /* ------------------------------------------ */
                
                  request.put(serverurl+ep+'/'+element._uuid, { json: { _lastcheck: currentDateTime, _status: res.statusCode} }, (error, res, body) => {
                  //console.log('ERROR', error)
                  //console.log('RES', res)
                  //console.log('BODY', body)
                  })
                })
              })
            }
            catch (e){
              //console.log('ERROR:',e)
              request.put(serverurl+ep+'/'+element._uuid, { json: { _lastcheck: currentDateTime, _status: 'ERROR: Please correct the check'} }, (error, res, body) => {
              })
            }
          }
        })
      } else {
        // No checks -> Create checks
        CreateChecks().then ( () => {
          console.log('Checks initialized')
        })                 
      }
    }
  })
}

/* ****************************************** */
/* Service Loop                               */
/* ****************************************** */

  Main()
  setInterval(Main, serviceInterval)
