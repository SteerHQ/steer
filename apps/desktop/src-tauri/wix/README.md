# WiX Installer Assets

This directory contains WiX templates and assets for building the MSI installer.

## Required Files

- `main.wxs` - Main WiX template with Russian localization
- `license.rtf` - License agreement in Russian (RTF format)
- `dialog.bmp` - Dialog background image (493x312 pixels, 24-bit BMP)
- `banner.bmp` - Banner image (493x58 pixels, 24-bit BMP)

## Creating Custom Images

To customize the installer appearance, replace the placeholder images:

1. **dialog.bmp**: 493x312 pixels, 24-bit color depth
   - Used as the background for installer dialogs
   
2. **banner.bmp**: 493x58 pixels, 24-bit color depth
   - Used as the top banner in installer windows

You can create these images using any image editor (GIMP, Photoshop, Paint.NET, etc.)
and save them as 24-bit BMP files.

## Default Behavior

If custom images are not provided, WiX will use default Windows Installer UI.
