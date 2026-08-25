# Build vbaProject.bin — sheet macros only (no UserForm / popup).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$macroDir = Join-Path $root "src\lib\import\macros"
$outBin = Join-Path $macroDir "vbaProject.bin"
$tmpXlsm = Join-Path $env:TEMP "shs-import-form.xlsm"
$modBas = Join-Path $macroDir "modStudentForm.bas"

if (-not (Test-Path $modBas)) { throw "Missing $modBas" }

foreach ($ver in @("16.0", "15.0", "14.0")) {
  $key = "HKCU:\Software\Microsoft\Office\$ver\Excel\Security"
  if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
  Set-ItemProperty -Path $key -Name AccessVBOM -Value 1 -Type DWord -Force
  Set-ItemProperty -Path $key -Name VBAWarnings -Value 1 -Type DWord -Force
}

Get-Process excel -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 400

$excel = $null
$wb = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.AutomationSecurity = 3
  $wb = $excel.Workbooks.Add()
  $vbproj = $wb.VBProject

  $null = $vbproj.VBComponents.Import($modBas)

  foreach ($comp in @($vbproj.VBComponents)) {
    if ($comp.Type -eq 3) { throw "UserForm must not be in project: $($comp.Name)" }
    if ($comp.Type -eq 1 -or $comp.Type -eq 3) {
      $n = $comp.CodeModule.CountOfLines
      if ($n -lt 1) { continue }
      for ($ln = 1; $ln -le $n; $ln++) {
        $line = $comp.CodeModule.Lines($ln, 1)
        $trim = $line.Trim()
        if ($trim.StartsWith("'")) { continue }
        if ($line -match '(?i)frmStudent|\.Show\b|UserForm') {
          throw "Popup/UserForm code found in $($comp.Name) line $ln"
        }
      }
    }
  }

  try {
    $null = $excel.VBE.CommandBars.FindControl(1, 578).Execute()
    Write-Output "VBA compile OK (no UserForm)"
  } catch {
    throw "VBA compile failed: $_"
  }

  if (Test-Path $tmpXlsm) { Remove-Item $tmpXlsm -Force }
  $wb.SaveAs($tmpXlsm, 52)
  $wb.Close($false)
  $wb = $null
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
  $excel = $null
  Start-Sleep -Seconds 1

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($tmpXlsm)
  $entry = $zip.GetEntry("xl/vbaProject.bin")
  if (-not $entry) { throw "xl/vbaProject.bin missing in saved xlsm" }
  $destFile = [System.IO.File]::Create($outBin)
  $entry.Open().CopyTo($destFile)
  $destFile.Close()
  $zip.Dispose()
  Write-Output "Wrote $outBin ($((Get-Item $outBin).Length) bytes)"
  Write-Output "ALL CHECKS PASSED - popup removed"
}
catch {
  Write-Error $_
  if ($wb -ne $null) { try { $wb.Close($false) } catch {} }
  if ($excel -ne $null) { try { $excel.Quit() } catch {} }
  exit 1
}
