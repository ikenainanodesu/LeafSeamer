
> leafseamer@1.0.0 start
> nodecg start

NodeCG is installed as a dependency. This is an experimental feature. Please report any issues you encounter.
2025-12-15 16:46:29 - [37minfo[39m: [server] Starting NodeCG 2.6.4 (Running on Node.js v24.11.1)
2025-12-15 16:46:29 - [36mdebug[39m: [bundle-manager] Loading bundle leafseamer
2025-12-15 16:46:29 - [36mdebug[39m: [bundle-manager] Loading bundle backup-system
2025-12-15 16:46:30 - [36mdebug[39m: [bundle-manager] Loading bundle data-sync-service
2025-12-15 16:46:30 - [36mdebug[39m: [bundle-manager] Loading bundle graphics-package
2025-12-15 16:46:30 - [36mdebug[39m: [bundle-manager] Loading bundle logger-system
2025-12-15 16:46:31 - [36mdebug[39m: [bundle-manager] Loading bundle mixer-control
2025-12-15 16:46:31 - [36mdebug[39m: [bundle-manager] Loading bundle obs-control
2025-12-15 16:46:31 - [36mdebug[39m: [bundle-manager] Loading bundle schedule-manager
2025-12-15 16:46:32 - [36mdebug[39m: [bundle-manager] Loading bundle seamer
[16:46:32.106] ERROR (#1):
  Error: Panel file "dashboard/seamer.html" in bundle "seamer" does not exist.
      at E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:1380:39
      at Array.forEach (<anonymous>)
      at parsePanels (E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:1376:18)
      at parseBundle (E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:1485:12)
      at handleBundle (E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:1580:20)
      at E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:1600:5
      at Array.forEach (<anonymous>)
      at E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:1599:95
      at Array.forEach (<anonymous>)
      at new BundleManager (E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:1539:136)
      at createServer (E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:3866:36)
      at createServer (E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:4124:24)
      at main (E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:4121:28)
      at main (E:\GitHub repository\LeafSeamer\node_modules\nodecg\dist\server\bootstrap.js:4127:44)
