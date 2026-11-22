# Puts bright, tilted Hebrew "sticker" labels on a cover illustration and saves a 1280x720 PNG.
# The picture is generated WITHOUT text (image models garble Hebrew); the text is drawn here so it is always correct.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File compose-cover.ps1 -Base "T:\הורדות\base.png" -Labels "T:\הורדות\labels.json" -Out "T:\הורדות\cover.png"
#
# (Parameter names must differ from variable names: PowerShell variables are case-insensitive, so -Labels and $labels would be the same variable.)
# labels.json (UTF-8) is an array; every label:
#   { "text": "סט מבחן", "fill": "#F6E53A", "color": "#17172B", "x": 0.72, "y": 0.18, "size": 0.14, "angle": -4 }
#   x, y   = centre of the label as a fraction of the picture width / height
#   size   = text height as a fraction of the picture height (0.12 to 0.18 reads well as a thumbnail)
#   angle  = tilt in degrees (small, -8 to 8)
#   fill / color = pill colour / text colour (optional; defaults cycle through the channel palette)
param(
  [Parameter(Mandatory)][string]$Base,
  [Parameter(Mandatory)][string]$LabelsFile,
  [Parameter(Mandatory)][string]$Out,
  [string]$FontName = 'Heebo Black',
  [int]$Width = 1280,
  [int]$Height = 720
)
Add-Type -AssemblyName System.Drawing

$palette = @('#F6E53A', '#3FD0C0', '#A6E22E', '#FF9F43', '#B565F2', '#FF6FA5')
function Convert-Hex([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

function New-RoundedPath([single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc(0, 0, $d, $d, 180, 90)
  $p.AddArc($w - $d, 0, $d, $d, 270, 90)
  $p.AddArc($w - $d, $h - $d, $d, $d, 0, 90)
  $p.AddArc(0, $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# Windows PowerShell 5.1 hands a JSON array over as one object when piped, so read it with -InputObject and unroll it once.
$parsed = ConvertFrom-Json -InputObject ([IO.File]::ReadAllText($LabelsFile, [Text.Encoding]::UTF8))
$labels = @($parsed | ForEach-Object { $_ })
$src = [System.Drawing.Image]::FromFile($Base)
$bmp = New-Object System.Drawing.Bitmap($Width, $Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.PixelOffsetMode = 'HighQuality'

# Fill the frame (crop to 16:9, never stretch).
$scale = [Math]::Max($Width / $src.Width, $Height / $src.Height)
$dw = $src.Width * $scale; $dh = $src.Height * $scale
$g.DrawImage($src, [single](($Width - $dw) / 2), [single](($Height - $dh) / 2), [single]$dw, [single]$dh)

$format = New-Object System.Drawing.StringFormat
$format.Alignment = 'Center'
$format.LineAlignment = 'Center'
$format.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft -bor [System.Drawing.StringFormatFlags]::NoWrap

$i = 0
foreach ($label in $labels) {
  $px = [single]($Height * $(if ($label.size) { $label.size } else { 0.14 }))
  # (PowerShell variables are case-insensitive: the font variable must not share a name with the -FontName parameter.)
  # Points, converted from pixels (a pixel-unit font trips MeasureString in Windows PowerShell). Heebo Black is already the heavy cut, so Regular.
  $labelFont = [System.Drawing.Font]::new($FontName, [single]($px * 72 / $g.DpiY), [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
  $text = [string]$label.text
  $size = $g.MeasureString($text, $labelFont, 4000, $format)
  $padX = $px * 0.5; $padY = $px * 0.22
  $w = [single]($size.Width + 2 * $padX); $h = [single]($size.Height + 2 * $padY)
  $fill = Convert-Hex $(if ($label.fill) { $label.fill } else { $palette[$i % $palette.Count] })
  $ink = Convert-Hex $(if ($label.color) { $label.color } else { '#17172B' })
  $cx = [single]($Width * $label.x); $cy = [single]($Height * $label.y)
  $angle = [single]$(if ($null -ne $label.angle) { $label.angle } else { 0 })

  $state = $g.Save()
  $g.TranslateTransform($cx, $cy)
  $g.RotateTransform($angle)
  $g.TranslateTransform(-$w / 2, -$h / 2)

  $radius = [single]($h * 0.32)
  # Soft shadow, a white rim so the sticker stands out on any picture, then the colour.
  $shadow = New-RoundedPath $w $h $radius
  $m = New-Object System.Drawing.Drawing2D.Matrix; $m.Translate(5, 8); $shadow.Transform($m)
  $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 0, 0, 0))), $shadow)
  $pill = New-RoundedPath $w $h $radius
  $g.FillPath((New-Object System.Drawing.SolidBrush($fill)), $pill)
  $g.DrawPath((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 255, 255, 255), [single]($px * 0.07))), $pill)
  # Heebo has a tall ascent, so the glyphs sit a little low in the box: lift them to the optical centre.
  $rect = New-Object System.Drawing.RectangleF(0, [single](-$px * 0.07), $w, $h)
  $g.DrawString($text, $labelFont, (New-Object System.Drawing.SolidBrush($ink)), $rect, $format)
  $g.Restore($state)
  $i++
}

# YouTube thumbnails must stay under 2 MB: a .jpg output is saved at quality 92 (a 1280x720 PNG of an illustration often is not).
if ($Out -match ".jpe?g$") {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]92)
  $bmp.Save($Out, $codec, $params)
} else {
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
}
$g.Dispose(); $bmp.Dispose(); $src.Dispose()
Write-Output $Out
