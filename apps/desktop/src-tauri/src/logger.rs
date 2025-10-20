use std::path::PathBuf;
use std::fs;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use tracing_appender::rolling::{RollingFileAppender, Rotation};

const LOG_DIR_NAME: &str = "VoiceAssistant";
const LOG_SUBDIR: &str = "logs";
const LOG_FILE_PREFIX: &str = "voice-assistant";
const MAX_LOG_FILES: usize = 5;
const MAX_LOG_SIZE_MB: u64 = 10;

/// Initialize the logging system with file rotation
/// Logs are stored in %APPDATA%/VoiceAssistant/logs/
/// Maximum 5 files, 10MB each
pub fn init_logger() -> Result<(), Box<dyn std::error::Error>> {
    let log_dir = get_log_directory()?;
    
    // Ensure log directory exists
    fs::create_dir_all(&log_dir)?;
    
    // Clean up old log files if necessary
    cleanup_old_logs(&log_dir)?;
    
    // Create rolling file appender (daily rotation)
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        &log_dir,
        LOG_FILE_PREFIX,
    );
    
    // Configure tracing subscriber with file output
    let file_layer = fmt::layer()
        .with_writer(file_appender)
        .with_ansi(false)
        .with_target(false)
        .with_thread_ids(false)
        .with_thread_names(false);
    
    // Set up environment filter for minimal logging
    // Only log warnings and errors by default
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("warn"));
    
    tracing_subscriber::registry()
        .with(env_filter)
        .with(file_layer)
        .init();
    
    tracing::info!("Logger initialized. Log directory: {:?}", log_dir);
    
    Ok(())
}

/// Get the log directory path: %APPDATA%/VoiceAssistant/logs/
fn get_log_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let appdata = std::env::var("APPDATA")
        .map_err(|_| "APPDATA environment variable not found")?;
    
    let mut log_path = PathBuf::from(appdata);
    log_path.push(LOG_DIR_NAME);
    log_path.push(LOG_SUBDIR);
    
    Ok(log_path)
}

/// Clean up old log files to maintain maximum of MAX_LOG_FILES
/// Also removes files exceeding MAX_LOG_SIZE_MB
fn cleanup_old_logs(log_dir: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let mut log_files: Vec<_> = fs::read_dir(log_dir)?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().is_file() && 
            entry.file_name().to_string_lossy().starts_with(LOG_FILE_PREFIX)
        })
        .collect();
    
    // Sort by modification time (oldest first)
    log_files.sort_by_key(|entry| {
        entry.metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
    });
    
    // Remove files exceeding size limit
    for entry in &log_files {
        if let Ok(metadata) = entry.metadata() {
            let size_mb = metadata.len() / (1024 * 1024);
            if size_mb > MAX_LOG_SIZE_MB {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
    
    // Refresh the list after size-based cleanup
    let mut log_files: Vec<_> = fs::read_dir(log_dir)?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().is_file() && 
            entry.file_name().to_string_lossy().starts_with(LOG_FILE_PREFIX)
        })
        .collect();
    
    log_files.sort_by_key(|entry| {
        entry.metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
    });
    
    // Keep only MAX_LOG_FILES most recent files
    if log_files.len() > MAX_LOG_FILES {
        let files_to_remove = log_files.len() - MAX_LOG_FILES;
        for entry in log_files.iter().take(files_to_remove) {
            let _ = fs::remove_file(entry.path());
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_get_log_directory() {
        let result = get_log_directory();
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("VoiceAssistant"));
        assert!(path.to_string_lossy().contains("logs"));
    }
}
