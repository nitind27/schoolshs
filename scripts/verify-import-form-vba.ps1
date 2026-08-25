# Verify trusted Excel-built VBA host can save; separately scan template bin sources for ZOrder.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$vbaHost = Join-Path $env:TEMP "shs-import-form.xlsm"
$macroDir = Join-Path $root "src\lib\import\macros"

if (-not (Test-Path $vbaHost)) { throw "Missing $vbaHost - run build-import-form-vba.ps1 first" }

# Source scan (catches ZOrder before Excel)
foreach ($f in @("modStudentForm.bas", "frmStudent.bas")) {
  $p = Join-Path $macroDir $f
  $t = Get-Content -Raw $p
  if ($t -match '(?i)\.ZOrder\b') { throw "$f still contains .ZOrder" }
}
Write-Output "Source scan OK (no ZOrder)"

foreach ($ver in @("16.0", "15.0", "14.0")) {
  $key = "HKCU:\Software\Microsoft\Office\$ver\Excel\Security"
  if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
  Set-ItemProperty -Path $key -Name AccessVBOM -Value 1 -Type DWord -Force
  Set-ItemProperty -Path $key -Name VBAWarnings -Value 1 -Type DWord -Force
}

Get-Process excel -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

$excel = $null
$wb = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.AutomationSecurity = 3
  $wb = $excel.Workbooks.Open($vbaHost)

  $names = @($wb.VBProject.VBComponents | ForEach-Object { $_.Name })
  if ($names -notcontains "frmStudent") { throw "frmStudent missing" }
  if ($names -notcontains "modStudentForm") { throw "modStudentForm missing" }

  foreach ($comp in @($wb.VBProject.VBComponents)) {
    if ($comp.Type -eq 1 -or $comp.Type -eq 3) {
      $n = $comp.CodeModule.CountOfLines
      if ($n -lt 1) { continue }
      $code = $comp.CodeModule.Lines(1, $n)
      if ($code -match '(?i)\.ZOrder\b') { throw "$($comp.Name) has .ZOrder in compiled project" }
    }
  }

  $ctrl = $excel.VBE.CommandBars.FindControl(1, 578)
  if ($ctrl) { $ctrl.Execute() }
  Write-Output "Host VBA compile OK"

  # Minimal sheets for SaveStudentRowFromEntry
  foreach ($n in @("FormMeta", "Entry Form", "Students")) {
    foreach ($ws in @($wb.Worksheets)) {
      if ($ws.Name -eq $n) { $ws.Delete(); break }
    }
  }
  $meta = $wb.Worksheets.Add()
  $meta.Name = "FormMeta"
  $entry = $wb.Worksheets.Add()
  $entry.Name = "Entry Form"
  $dest = $wb.Worksheets.Add()
  $dest.Name = "Students"

  $meta.Cells.Item(1, 1).Value2 = "Col"
  $meta.Cells.Item(1, 2).Value2 = "Key"
  $meta.Cells.Item(1, 3).Value2 = "Label"
  $meta.Cells.Item(1, 5).Value2 = "Required"
  $meta.Cells.Item(1, 8).Value2 = "InputRow"

  $meta.Cells.Item(2, 1).Value2 = 1
  $meta.Cells.Item(2, 2).Value2 = "firstName"
  $meta.Cells.Item(2, 3).Value2 = "First Name"
  $meta.Cells.Item(2, 5).Value2 = "Y"
  $meta.Cells.Item(2, 8).Value2 = 6

  $meta.Cells.Item(3, 1).Value2 = 2
  $meta.Cells.Item(3, 2).Value2 = "surname"
  $meta.Cells.Item(3, 3).Value2 = "Surname"
  $meta.Cells.Item(3, 5).Value2 = "Y"
  $meta.Cells.Item(3, 8).Value2 = 7

  $dest.Cells.Item(1, 1).Value2 = "First Name"
  $dest.Cells.Item(1, 2).Value2 = "Surname"
  $entry.Cells.Item(6, 2).Value2 = "Ravi"
  $entry.Cells.Item(7, 2).Value2 = "Patel"

  $excel.Run("SaveStudentRowFromEntry", $false)

  $v1 = [string]$dest.Cells.Item(2, 1).Value2
  $v2 = [string]$dest.Cells.Item(2, 2).Value2
  if ($v1 -ne "Ravi" -or $v2 -ne "Patel") {
    throw "Save failed: got [$v1]/[$v2]"
  }

  Write-Output "VERIFY OK: compile ok, no ZOrder, SaveStudentRowFromEntry wrote Ravi/Patel"
}
finally {
  if ($wb -ne $null) { try { $wb.Close($false) } catch {} }
  if ($excel -ne $null) { try { $excel.Quit() } catch {} }
  Get-Process excel -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
