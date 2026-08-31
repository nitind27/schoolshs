# Lists every scanner Windows can see on THIS PC: USB, Wi-Fi, any brand.
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

function Get-WiaProp([object]$info, [string]$name) {
    try { return [string]$info.Properties.Item($name).Value } catch { return $null }
}

function Test-IsWebcamName([string]$name) {
    $n = ("{0}" -f $name).ToLowerInvariant()
    return [bool]($n -match "webcam|integrated camera|face camera|rgb camera|ir camera|life cam|hd camera")
}

function Test-IsScannerDevice([object]$info, [string]$name) {
    $type = 0
    try { $type = [int]$info.Type } catch { $type = 0 }
    if ($type -eq 1) { return $true }
    if (Test-IsWebcamName $name) { return $false }
    $blob = $name.ToLowerInvariant()
    if ($blob -match "scan|epson|canon|brother|hp |hewlett|kodak|fujitsu|panasonic|xerox|ricoh|samsung|lexmark|kyocera|sharp|fi-|dr-|adf|flatbed|iris|czur|mustek|plustek") { return $true }
    if ($type -eq 2 -and $blob -match "document|page|sheet") { return $true }
    return $false
}

function Get-ConnectionType([string]$port, [string]$server, [string]$deviceId, [string]$name) {
    $blob = ("{0} {1} {2} {3}" -f $port, $server, $deviceId, $name).ToLowerInvariant()
    if ($blob -match "usb") { return "usb" }
    if ($blob -match "wifi|wi-?fi|wlan|wireless") { return "wifi" }
    if ($blob -match "\d{1,3}(\.\d{1,3}){3}") { return "wifi" }
    if ($blob -match "wsd|network|tcp|http|escl|airscan|lan|ethernet") { return "wifi" }
    if ($port -and $port.Trim().Length -gt 0 -and $port -notmatch "(?i)usb") { return "wifi" }
    return "usb"
}

function Test-NameExists($list, [string]$name) {
    foreach ($existing in $list) {
        if (("" + $existing.name) -eq $name) { return $true }
    }
    return $false
}

$vendorApps = @(
    @{ id = "vendor-canon";  brand = "Canon";  match = "Canon";  exe = @(
        "${env:ProgramFiles(x86)}\Canon\IJ Scan Utility\SCANUTILITY.exe",
        "$env:ProgramFiles\Canon\IJ Scan Utility\SCANUTILITY.exe"
    )},
    @{ id = "vendor-hp";     brand = "HP";     match = "HP|Hewlett"; exe = @(
        "$env:ProgramFiles\HP\HP Scan\HPScan.exe",
        "${env:ProgramFiles(x86)}\HP\HP Scan\HPScan.exe",
        "$env:ProgramFiles\HP\HP Smart\HP.Smart.exe"
    )},
    @{ id = "vendor-epson";  brand = "Epson";  match = "Epson";  exe = @(
        "$env:ProgramFiles\epson\Epson Scan 2\Core\es2.exe",
        "${env:ProgramFiles(x86)}\epson\Epson Scan 2\Core\es2.exe",
        "$env:ProgramFiles\EPSON\Epson Scan 2\Core\es2.exe"
    )},
    @{ id = "vendor-brother"; brand = "Brother"; match = "Brother"; exe = @(
        "${env:ProgramFiles(x86)}\Brother\ControlCenter4\BrCcBoot.exe",
        "$env:ProgramFiles\Brother\ControlCenter4\BrCcBoot.exe"
    )}
)

try {
    $list = New-Object System.Collections.Generic.List[Object]

    $list.Add([PSCustomObject]@{
        id           = "windows-pick"
        name         = "Windows Scan (any scanner on this PC)"
        connection   = "usb"
        port         = $null
        server       = $null
        manufacturer = $null
        provider     = "windows-pick"
    }) | Out-Null

    $dm = New-Object -ComObject WIA.DeviceManager
    $idx = 0
    foreach ($info in $dm.DeviceInfos) {
        $name = Get-WiaProp $info "Name"
        if (-not $name) { $name = "Scanner $($idx + 1)" }
        if (-not (Test-IsScannerDevice $info $name)) { continue }

        $port = Get-WiaProp $info "Port"
        if (-not $port) { $port = Get-WiaProp $info "Port Name" }
        $server = Get-WiaProp $info "Server"
        $deviceId = Get-WiaProp $info "Unique Device ID"
        if (-not $deviceId) { $deviceId = Get-WiaProp $info "Device ID" }
        $manufacturer = Get-WiaProp $info "Manufacturer"

        $list.Add([PSCustomObject]@{
            id           = [string]$idx
            name         = [string]$name
            connection   = Get-ConnectionType $port $server $deviceId $name
            port         = if ($port) { [string]$port } else { $null }
            server       = if ($server) { [string]$server } else { $null }
            manufacturer = if ($manufacturer) { [string]$manufacturer } else { $null }
            provider     = "wia"
        }) | Out-Null
        $idx++
    }

    $printers = @()
    try {
        $printers = @(Get-Printer -ErrorAction SilentlyContinue | Where-Object {
            $_.DriverName -notmatch "Fax|PDF|OneNote|XPS|Generic"
        })
    } catch { }

    foreach ($vendor in $vendorApps) {
        $exePath = $null
        foreach ($c in $vendor.exe) {
            if ($c -and (Test-Path $c)) { $exePath = $c; break }
        }
        if (-not $exePath) { continue }

        $matchPrinters = @($printers | Where-Object { $_.Name -match $vendor.match -or $_.DriverName -match $vendor.match })
        if ($matchPrinters.Count -eq 0) { continue }

        foreach ($p in $matchPrinters) {
            if (Test-NameExists $list $p.Name) { continue }
            $portName = ""
            try { $portName = [string]$p.PortName } catch { }
            $conn = "usb"
            if ($portName -match "IP_|WSD|TCP|WS") { $conn = "wifi" }
            $list.Add([PSCustomObject]@{
                id           = [string]$vendor.id
                name         = [string]$p.Name
                connection   = $conn
                port         = if ($portName) { $portName } else { $null }
                server       = $null
                manufacturer = [string]$vendor.brand
                provider     = [string]$vendor.id
            }) | Out-Null
        }
    }

    @{ devices = $list } | ConvertTo-Json -Compress -Depth 4
} catch {
    @{ devices = @(); error = [string]$_.Exception.Message } | ConvertTo-Json -Compress
}
