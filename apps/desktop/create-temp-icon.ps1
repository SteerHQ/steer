# Create a simple colored PNG icon using .NET
Add-Type -AssemblyName System.Drawing

$size = 512
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Fill with gradient-like colors
$brush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(79, 70, 229))
$graphics.FillRectangle($brush1, 0, 0, $size, $size)

# Add a simple circle
$brush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.FillEllipse($brush2, $size * 0.25, $size * 0.25, $size * 0.5, $size * 0.5)

# Save
$outputPath = "src-tauri\icons\icon.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Icon created at $outputPath"
Write-Host "Now run: bun tauri icon src-tauri/icons/icon.png"

$graphics.Dispose()
$bitmap.Dispose()
