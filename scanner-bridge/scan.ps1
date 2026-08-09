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
    Write-Error "No WIA scanner found. Connect USB scanner or install Wi-Fi / network scanner driver so Windows can see it."
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

# Convert to JPEG so the portal preview/upload always gets a real .jpg
$jpegFormatId = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"
$ip = New-Object -ComObject WIA.ImageProcess
$ip.Filters.Add($ip.FilterInfos.Item("Convert").FilterID) | Out-Null
$ip.Filters.Item(1).Properties.Item("FormatID").Value = $jpegFormatId
try {
    $ip.Filters.Item(1).Properties.Item("Quality").Value = 85
} catch { }
$image = $ip.Apply($image)

$dir = Split-Path -Parent $OutputPath
if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
if (Test-Path $OutputPath) {
    Remove-Item -Force $OutputPath
}
$image.SaveFile($OutputPath)
Write-Output $OutputPath
