# Kill any processes using port 1420 (Vite dev server)
$procs = Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
if ($procs) {
    Write-Host "Killing processes on port 1420: $procs"
    $procs | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

# Launch the app
npm run tauri dev
