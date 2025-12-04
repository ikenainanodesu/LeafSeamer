$port = 9090
$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connection) {
    $processId = $connection.OwningProcess
    Write-Host "Found NodeCG running on port $port (PID: $processId). Killing..."
    Stop-Process -Id $processId -Force
    Write-Host "NodeCG process terminated."
} else {
    Write-Host "No process found running on port $port."
}
