# Lists all WIA scanners — USB cable and Wi‑Fi / network MFPs
$ErrorActionPreference = "Stop"

function Get-WiaProp([object]$info, [string]$name) {
    try {
        return [string]$info.Properties.Item($name).Value
    } catch {
        return $null
    }
}

function Get-ConnectionType([string]$port, [string]$server, [string]$deviceId, [string]$name) {
    $blob = ("{0} {1} {2} {3}" -f $port, $server, $deviceId, $name).ToLowerInvariant()
    if ($blob -match 'usb|\\.usb') { return "usb" }
    if ($blob -match 'wifi|wi-?fi|wlan|wireless') { return "wifi" }
    if ($blob -match '\d{1,3}(\.\d{1,3}){3}') { return "wifi" }
    if ($blob -match 'wsd|network|tcp|http|escl|airscan|lan|ethernet') { return "wifi" }
    if ($port -and $port.Trim().Length -gt 0 -and $port -notmatch '(?i)usb') { return "wifi" }
    return "unknown"
}

$dm = New-Object -ComObject WIA.DeviceManager
$list = New-Object System.Collections.Generic.List[Object]
$idx = 0

foreach ($info in $dm.DeviceInfos) {
    # Type 1 = Scanner (WIA_DEVICE_TYPE_SCANNER)
    if ($info.Type -ne 1) { continue }

    $name = Get-WiaProp $info "Name"
    if (-not $name) { $name = "Scanner $($idx + 1)" }

    $port = Get-WiaProp $info "Port"
    if (-not $port) { $port = Get-WiaProp $info "Port Name" }

    $server = Get-WiaProp $info "Server"
    $deviceId = Get-WiaProp $info "Unique Device ID"
    if (-not $deviceId) { $deviceId = Get-WiaProp $info "Device ID" }

    $manufacturer = Get-WiaProp $info "Manufacturer"
    $connection = Get-ConnectionType $port $server $deviceId $name

    $list.Add([PSCustomObject]@{
        id           = [string]$idx
        name         = [string]$name
        connection   = [string]$connection
        port         = if ($port) { [string]$port } else { $null }
        server       = if ($server) { [string]$server } else { $null }
        manufacturer = if ($manufacturer) { [string]$manufacturer } else { $null }
    }) | Out-Null

    $idx++
}

@{ devices = $list } | ConvertTo-Json -Compress -Depth 4
