<#
.SYNOPSIS
  Renders every slide of a PPTX to PNG with the installed PowerPoint (COM), for fidelity QA.
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/render-pptx.ps1 -Pptx output/deck/deck.pptx -OutDir output/deck/pptx-render
#>
param(
  [Parameter(Mandatory = $true)][string]$Pptx,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$Width = 1920,
  [int]$Height = 1080
)

$ErrorActionPreference = 'Stop'
$Pptx = (Resolve-Path -LiteralPath $Pptx).Path
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path -LiteralPath $OutDir).Path

$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
  # Open(FileName, ReadOnly=msoTrue, Untitled=msoFalse, WithWindow=msoFalse)
  $presentation = $app.Presentations.Open($Pptx, -1, 0, 0)
  $count = 0
  foreach ($slide in $presentation.Slides) {
    $count++
    $file = Join-Path $OutDir ('slide-{0:D2}.png' -f $count)
    $slide.Export($file, 'PNG', $Width, $Height)
  }
  Write-Output "[render] $count slide(s) -> $OutDir"
}
finally {
  if ($presentation) { $presentation.Close() }
  # Only quit PowerPoint if this script was the only user of it.
  if ($app.Presentations.Count -eq 0) { $app.Quit() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
