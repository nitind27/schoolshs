param(
    [int]$DeviceIndex = 0,
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (-not $OutputPath) {
    Write-Error "OutputPath required"
    exit 1
}

$dm = New-Object -ComObject WIA.DeviceManager
$scanners = @($dm.DeviceInfos | Where-Object { $_.Type -eq 1 })
if ($scanners.Count -eq 0) {
    Write-Error "No WIA scanner found. Connect USB printer-scanner and install driver."
    exit 2
}
if ($DeviceIndex -lt 0 -or $DeviceIndex -ge $scanners.Count) {
    Write-Error "Invalid device index"
    exit 3
}

$device = $scanners[$DeviceIndex].Connect()
if ($device.Items.Count -lt 1) {
    Write-Error "Scanner has no scannable items"
    exit 4
}

# Item 1 = flatbed on most Epson/Canon/HP devices
$itemIndex = 1
if ($device.Items.Count -eq 1) { $itemIndex = 1 }
$item = $device.Items.Item($itemIndex)
$image = $item.Transfer()
$dir = Split-Path -Parent $OutputPath
if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
$image.SaveFile($OutputPath)
Write-Output $OutputPath
