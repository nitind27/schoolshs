# Lists WIA scanner devices (USB printer-scanner, flatbed, etc.)
$ErrorActionPreference = "Stop"
$dm = New-Object -ComObject WIA.DeviceManager
$list = New-Object System.Collections.Generic.List[Object]
$idx = 0
foreach ($info in $dm.DeviceInfos) {
    if ($info.Type -eq 1) {
        $name = $info.Properties.Item("Name").Value
        $list.Add([PSCustomObject]@{
            id   = [string]$idx
            name = [string]$name
        }) | Out-Null
        $idx++
    }
}
@{ devices = $list } | ConvertTo-Json -Compress
