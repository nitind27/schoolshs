# One-time setup on THIS computer (the PC with the USB / Wi-Fi scanner).
# Works with the online school portal — any brand: HP, Epson, Brother, Canon, …
param(
    [string]$PortalUrl = ""
)

$ErrorActionPreference = "Stop"
if (-not $PortalUrl) { $PortalUrl = $env:SHS_PORTAL_URL }
$dir = Join-Path $env:LOCALAPPDATA "SHS\scanner-helper"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$files = @("client-helper.ps1", "list-devices.ps1", "scan.ps1")
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($f in $files) {
    $src = Join-Path $here $f
    $dest = Join-Path $dir $f
    if (Test-Path $src) {
        Copy-Item -Force $src $dest
    } elseif ($PortalUrl) {
        $url = $PortalUrl.TrimEnd("/") + "/api/scanner-bridge/helper/" + $f
        Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest
    } else {
        throw "Missing $f. Run this installer from the downloaded helper folder, or pass -PortalUrl https://your-school-portal"
    }
}

$helper = Join-Path $dir "client-helper.ps1"
$vbs = Join-Path $dir "silent-start.vbs"
$vbsBody = @"
Set sh = CreateObject("Wscript.Shell")
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$helper""", 0, False
"@
Set-Content -Path $vbs -Value $vbsBody -Encoding ASCII

$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\SHS-Scanner-Helper.vbs"
Copy-Item -Force $vbs $startup

$cmd = "wscript.exe `"$vbs`""
New-Item -Path "HKCU:\Software\Classes\shs-scanner" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\shs-scanner" -Name "(Default)" -Value "URL:SHS Scanner Protocol"
New-ItemProperty -Path "HKCU:\Software\Classes\shs-scanner" -Name "URL Protocol" -Value "" -PropertyType String -Force | Out-Null
New-Item -Path "HKCU:\Software\Classes\shs-scanner\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\shs-scanner\shell\open\command" -Name "(Default)" -Value $cmd

Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbs`"" | Out-Null

Write-Host ""
Write-Host "Scanner helper is installed on THIS computer."
Write-Host "Any USB / Wi-Fi scanner (HP, Epson, Brother, Canon, ...) can be used from the school portal."
Write-Host "It will also start automatically when you log in to Windows."
Write-Host ""
