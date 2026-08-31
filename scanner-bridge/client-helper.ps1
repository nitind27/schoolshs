# SHS Scanner Helper — runs on the school PC that has the USB / Wi-Fi scanner.
# No Node / npm. Portal (even if hosted online) talks to http://127.0.0.1:9847
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$listScript = Join-Path $here "list-devices.ps1"
$scanScript = Join-Path $here "scan.ps1"
$port = 9847
$prefix = "http://127.0.0.1:$port/"

function Send-Json($res, [int]$status, $obj) {
    $json = $obj | ConvertTo-Json -Compress -Depth 6
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $res.StatusCode = $status
    $res.ContentType = "application/json; charset=utf-8"
    $origin = $res.Headers["Access-Control-Allow-Origin"]
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.OutputStream.Close()
}

function Add-Cors($res, $req) {
    $origin = $req.Headers["Origin"]
    if (-not $origin) { $origin = "*" }
    $res.Headers.Add("Access-Control-Allow-Origin", $origin)
    $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
    $res.Headers.Add("Vary", "Origin")
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
} catch {
    Write-Output "Scanner helper already running or port $port is busy."
    exit 0
}

Write-Output "SHS Scanner Helper ready at $prefix"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    Add-Cors $res $req
    try {
        if ($req.HttpMethod -eq "OPTIONS") {
            $res.StatusCode = 204
            $res.Close()
            continue
        }
        $path = $req.Url.AbsolutePath
        if ($req.HttpMethod -eq "GET" -and $path -eq "/health") {
            Send-Json $res 200 @{ ok = $true; platform = "win32"; wia = $true; supportsWifi = $true; port = $port; helper = $true }
            continue
        }
        if ($req.HttpMethod -eq "GET" -and $path -eq "/devices") {
            $out = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $listScript
            $parsed = $out | ConvertFrom-Json
            Send-Json $res 200 $parsed
            continue
        }
        if ($req.HttpMethod -eq "POST" -and $path -eq "/scan") {
            $reader = New-Object IO.StreamReader($req.InputStream, $req.ContentEncoding)
            $raw = $reader.ReadToEnd()
            $reader.Close()
            $deviceId = "windows-pick"
            if ($raw) {
                try { $deviceId = [string](($raw | ConvertFrom-Json).deviceId) } catch { }
                if (-not $deviceId) { $deviceId = "windows-pick" }
            }
            $tmp = Join-Path $env:TEMP ("shs-scan-" + [guid]::NewGuid().ToString() + ".jpg")
            $index = "0"
            if ($deviceId -match "^\d+$") { $index = $deviceId }
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scanScript -DeviceIndex $index -DeviceId $deviceId -OutputPath $tmp
            if (-not (Test-Path $tmp)) { throw "Scan produced no file" }
            $bytes = [IO.File]::ReadAllBytes($tmp)
            Remove-Item $tmp -Force -ErrorAction SilentlyContinue
            $b64 = [Convert]::ToBase64String($bytes)
            Send-Json $res 200 @{ mimeType = "image/jpeg"; size = $bytes.Length; imageBase64 = $b64 }
            continue
        }
        Send-Json $res 404 @{ error = "Not found" }
    } catch {
        try { Send-Json $res 500 @{ error = [string]$_.Exception.Message } } catch { $res.Close() }
    }
}
