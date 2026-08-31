param(
    [int]$DeviceIndex = 0,
    [string]$DeviceId = "",
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

if (-not $OutputPath) {
    Write-Error "OutputPath required"
    exit 1
}

$jpegFormatId = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"

function Save-WiaJpeg($image, [string]$path) {
    $ip = New-Object -ComObject WIA.ImageProcess
    $ip.Filters.Add($ip.FilterInfos.Item("Convert").FilterID) | Out-Null
    $ip.Filters.Item(1).Properties.Item("FormatID").Value = $jpegFormatId
    try { $ip.Filters.Item(1).Properties.Item("Quality").Value = 85 } catch { }
    $image = $ip.Apply($image)
    $image.SaveFile($path)
}

function Convert-FileToJpeg([string]$src, [string]$dest) {
    $ext = [IO.Path]::GetExtension($src).ToLowerInvariant()
    if ($ext -eq ".jpg" -or $ext -eq ".jpeg") {
        Copy-Item -Force $src $dest
        return
    }
    $img = New-Object -ComObject WIA.ImageFile
    $img.LoadFile($src)
    Save-WiaJpeg $img $dest
}

function Scan-WindowsPick([string]$dest) {
    $dialog = New-Object -ComObject WIA.CommonDialog
    $image = $dialog.ShowAcquireImage()
    if (-not $image) { throw "Scan cancelled" }
    Save-WiaJpeg $image $dest
}

function Get-VendorExe([string]$id) {
    $map = @{
        "vendor-canon" = @(
            "${env:ProgramFiles(x86)}\Canon\IJ Scan Utility\SCANUTILITY.exe",
            "$env:ProgramFiles\Canon\IJ Scan Utility\SCANUTILITY.exe"
        )
        "vendor-hp" = @(
            "$env:ProgramFiles\HP\HP Scan\HPScan.exe",
            "${env:ProgramFiles(x86)}\HP\HP Scan\HPScan.exe"
        )
        "vendor-epson" = @(
            "$env:ProgramFiles\epson\Epson Scan 2\Core\es2.exe",
            "${env:ProgramFiles(x86)}\epson\Epson Scan 2\Core\es2.exe",
            "$env:ProgramFiles\EPSON\Epson Scan 2\Core\es2.exe"
        )
        "vendor-brother" = @(
            "${env:ProgramFiles(x86)}\Brother\ControlCenter4\BrCcBoot.exe",
            "$env:ProgramFiles\Brother\ControlCenter4\BrCcBoot.exe"
        )
    }
    foreach ($c in @($map[$id])) {
        if ($c -and (Test-Path $c)) { return $c }
    }
    return $null
}

function Scan-VendorApp([string]$exe, [string]$dest) {
    $started = Get-Date
    $watch = @(
        (Join-Path $env:USERPROFILE "Pictures"),
        (Join-Path $env:USERPROFILE "Pictures\Scanned Documents"),
        (Join-Path $env:USERPROFILE "Documents"),
        (Join-Path $env:USERPROFILE "Desktop"),
        (Join-Path $env:USERPROFILE "Downloads")
    )
    Get-ChildItem (Join-Path $env:USERPROFILE "Pictures") -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match "Canon|Epson|HP|Brother|Scan" } |
        ForEach-Object { $watch += $_.FullName }

    $watch = $watch | Where-Object { Test-Path $_ } | Select-Object -Unique
    Start-Process -FilePath $exe | Out-Null
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 700
        foreach ($folder in $watch) {
            $hit = Get-ChildItem -Path $folder -File -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.LastWriteTime -ge $started -and
                    $_.Extension -match "\.(jpg|jpeg|png|bmp|tif|tiff)$" -and
                    $_.Length -gt 20000
                } |
                Sort-Object LastWriteTime -Descending |
                Select-Object -First 1
            if ($hit) {
                Convert-FileToJpeg $hit.FullName $dest
                return
            }
        }
    }
    throw "No scan file received. Finish the scan in the maker's window (HP / Epson / Canon / Brother), save as JPG to Pictures."
}

function Test-IsWebcamName([string]$name) {
    $n = ("{0}" -f $name).ToLowerInvariant()
    return [bool]($n -match "webcam|integrated camera|face camera|rgb camera|ir camera|life cam|hd camera")
}

function Get-WiaName($info) {
    try { return [string]$info.Properties.Item("Name").Value } catch { return "" }
}

function Test-IsScannerDevice($info) {
    $type = 0
    try { $type = [int]$info.Type } catch { $type = 0 }
    $name = Get-WiaName $info
    if ($type -eq 1) { return $true }
    if (Test-IsWebcamName $name) { return $false }
    $blob = $name.ToLowerInvariant()
    if ($blob -match "scan|epson|canon|brother|hp |hewlett|kodak|fujitsu|panasonic|xerox|ricoh|samsung|lexmark|adf|flatbed") { return $true }
    if ($type -eq 2 -and $blob -match "document|page|sheet") { return $true }
    return $false
}

$dir = Split-Path -Parent $OutputPath
if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
if (Test-Path $OutputPath) { Remove-Item -Force $OutputPath }

try {
    if ($DeviceId -eq "windows-pick" -or $DeviceId -eq "") {
        Scan-WindowsPick $OutputPath
        Write-Output $OutputPath
        exit 0
    }

    if ($DeviceId -like "vendor-*") {
        $exe = Get-VendorExe $DeviceId
        if ($exe) {
            try {
                Scan-VendorApp $exe $OutputPath
                Write-Output $OutputPath
                exit 0
            } catch {
                Scan-WindowsPick $OutputPath
                Write-Output $OutputPath
                exit 0
            }
        }
        Scan-WindowsPick $OutputPath
        Write-Output $OutputPath
        exit 0
    }

    $dm = New-Object -ComObject WIA.DeviceManager
    $scanners = @($dm.DeviceInfos | Where-Object { Test-IsScannerDevice $_ })
    if ($scanners.Count -eq 0) {
        Scan-WindowsPick $OutputPath
        Write-Output $OutputPath
        exit 0
    }
    if ($DeviceIndex -lt 0 -or $DeviceIndex -ge $scanners.Count) {
        Scan-WindowsPick $OutputPath
        Write-Output $OutputPath
        exit 0
    }

    try {
        $device = $scanners[$DeviceIndex].Connect()
        if ($device.Items.Count -lt 1) { throw "no items" }
        $item = $device.Items.Item(1)
        $image = $item.Transfer()
        Save-WiaJpeg $image $OutputPath
    } catch {
        Scan-WindowsPick $OutputPath
    }
    Write-Output $OutputPath
} catch {
    Write-Error "Scan failed. Connect any USB / Wi-Fi scanner to THIS computer, put paper on the glass, and use Scan Now (Windows will list HP, Epson, Brother, Canon, and others)."
    exit 4
}
