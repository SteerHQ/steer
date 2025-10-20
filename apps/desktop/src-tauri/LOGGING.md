# Logging System Implementation

## Overview

The VoiceAssistant application now includes a comprehensive logging system that meets all privacy and security requirements. Logs are stored locally in `%APPDATA%/VoiceAssistant/logs/` with automatic rotation to prevent excessive disk usage.

## Features

### 1. Local Storage Only

- All logs are stored in `%APPDATA%/VoiceAssistant/logs/`
- No telemetry or external data transmission
- Logs remain completely local to the user's machine

### 2. Log Rotation

- **Maximum Files**: 5 log files
- **Maximum Size**: 10MB per file
- **Rotation Strategy**: Daily rotation with automatic cleanup
- Old files are automatically removed when limits are exceeded

### 3. Minimal Logging

- **Default Level**: WARN (warnings and errors only)
- **No Debug/Info**: Reduces log verbosity and disk usage
- **Privacy-Focused**: Only logs errors and critical warnings

### 4. Log Format

- Timestamp for each entry
- Log level (WARN, ERROR)
- Message content
- No thread IDs or names (minimal overhead)
- No ANSI colors in files (clean text format)

## Implementation Details

### Dependencies Added

```toml
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-appender = "0.2"
```

### Module Structure

```
src-tauri/src/
├── logger.rs       # Logging initialization and rotation logic
├── main.rs         # Logger initialization on startup
├── audio.rs        # Audio capture with error logging
└── commands.rs     # Tauri commands with error logging
```

### Key Functions

#### `logger::init_logger()`

Initializes the logging system with:

- Log directory creation
- File rotation setup
- Environment filter configuration
- Cleanup of old logs

#### `logger::cleanup_old_logs()`

Maintains log file limits by:

- Removing files exceeding 10MB
- Keeping only the 5 most recent files
- Sorting by modification time

### Log Locations

**Windows**: `C:\Users\<username>\AppData\Roaming\VoiceAssistant\logs\`

Log files are named: `voice-assistant.YYYY-MM-DD`

Example:

```
voice-assistant.2025-10-20
voice-assistant.2025-10-19
voice-assistant.2025-10-18
```

## Usage Examples

### In Rust Code

```rust
// Error logging (always logged)
tracing::error!("Failed to initialize audio capture: {}", error);

// Warning logging (always logged)
tracing::warn!("Audio buffer not initialized");

// Info logging (not logged by default)
tracing::info!("Application started"); // Only in main.rs startup
```

### Logged Events

The following events are logged:

1. **Application Startup**

   - Logger initialization
   - Log directory path

2. **Audio Capture Errors**

   - Device not found
   - Configuration errors
   - Stream errors
   - Audio stream failures

3. **Command Errors**
   - Failed audio capture initialization
   - Failed to start/stop capture
   - Uninitialized capture warnings

## Privacy Compliance

✅ **No Audio Data**: Audio buffers are never logged
✅ **No Transcriptions**: Speech-to-text results are never logged
✅ **No API Keys**: Credentials are never logged
✅ **No Telemetry**: No external data transmission
✅ **Local Only**: All logs stay on the user's machine
✅ **Automatic Cleanup**: Old logs are automatically removed

## Configuration

### Change Log Level

Users can set the `RUST_LOG` environment variable to change log levels:

```powershell
# Show all logs (debug, info, warn, error)
$env:RUST_LOG="debug"

# Show only errors
$env:RUST_LOG="error"

# Default (warn and error)
$env:RUST_LOG="warn"
```

### Disable Logging

To disable file logging, the user would need to modify the code. However, this is not recommended as error logs are crucial for troubleshooting.

## Testing

### Manual Testing

1. **Verify Log Directory Creation**

   ```powershell
   # Check if directory exists
   Test-Path "$env:APPDATA\VoiceAssistant\logs"
   ```

2. **Verify Log Files**

   ```powershell
   # List log files
   Get-ChildItem "$env:APPDATA\VoiceAssistant\logs"
   ```

3. **Verify Log Rotation**

   - Run the application for multiple days
   - Verify only 5 most recent files are kept
   - Verify no file exceeds 10MB

4. **Verify Error Logging**
   - Trigger an error (e.g., start without VB-Cable)
   - Check log file for error message
   - Verify timestamp and format

### Unit Tests

The logger module includes a test for directory path generation:

```rust
#[test]
fn test_get_log_directory() {
    let result = get_log_directory();
    assert!(result.is_ok());
    let path = result.unwrap();
    assert!(path.to_string_lossy().contains("VoiceAssistant"));
    assert!(path.to_string_lossy().contains("logs"));
}
```

## Troubleshooting

### Logs Not Created

1. Check if `%APPDATA%` environment variable is set
2. Verify write permissions to `%APPDATA%\VoiceAssistant\logs\`
3. Check application startup logs in console (development mode)

### Logs Too Large

The system automatically limits logs to:

- 5 files maximum
- 10MB per file maximum
- Total maximum: ~50MB

If logs grow beyond this, the cleanup function will remove old files.

### Missing Error Logs

1. Verify log level is set to "warn" or lower
2. Check if the error actually occurred
3. Verify logger was initialized (check main.rs)

## Requirements Compliance

This implementation satisfies **Requirement 5.5**:

> THE VoiceAssistant SHALL not send telemetry, analytics or logs to external servers

✅ All logs are stored locally in `%APPDATA%/VoiceAssistant/logs/`
✅ No network transmission of log data
✅ Automatic rotation prevents excessive disk usage
✅ Minimal logging (warnings and errors only)
✅ Privacy-focused design with no sensitive data logging

## Future Enhancements

Potential improvements (not currently implemented):

1. **Compression**: Compress old log files to save space
2. **User Settings**: Allow users to configure log levels via UI
3. **Log Viewer**: Built-in log viewer in the application
4. **Export**: Export logs for troubleshooting support
