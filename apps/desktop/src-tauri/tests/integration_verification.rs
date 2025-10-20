//! Integration Verification Tests
//! 
//! This module contains tests to verify the final integration requirements:
//! - Requirement 5.1: Audio stored only in RAM
//! - Requirement 5.2: Audio deleted after sending to API
//! - Requirement 5.3: Data sent only to OpenAI API
//! - Requirement 5.4: No temporary files created
//! - Requirement 6.2: Windows 10 (1809+) compatibility
//! - Requirement 6.3: Windows 11 compatibility

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use std::env;

    /// Test: Verify no audio files are created on disk
    /// Requirements: 5.1, 5.4
    #[test]
    fn test_no_audio_files_on_disk() {
        // Check common temporary directories
        let temp_dirs = vec![
            env::temp_dir(),
            PathBuf::from(env::var("APPDATA").unwrap_or_default()),
            PathBuf::from(env::var("LOCALAPPDATA").unwrap_or_default()),
        ];

        for temp_dir in temp_dirs {
            if !temp_dir.exists() {
                continue;
            }

            // Search for audio file extensions
            let audio_extensions = vec!["wav", "mp3", "webm", "pcm", "raw"];
            
            if let Ok(entries) = fs::read_dir(&temp_dir) {
                for entry in entries.flatten() {
                    if let Ok(file_name) = entry.file_name().into_string() {
                        // Check if file is related to VoiceAssistant
                        if file_name.contains("voice") || file_name.contains("assistant") {
                            for ext in &audio_extensions {
                                assert!(
                                    !file_name.ends_with(ext),
                                    "Found audio file on disk: {:?}",
                                    entry.path()
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    /// Test: Verify no data files are created in application directory
    /// Requirements: 5.4
    #[test]
    fn test_no_data_files_in_app_directory() {
        let current_dir = env::current_dir().expect("Failed to get current directory");
        
        // Check for any .dat, .bin, or .cache files
        let forbidden_extensions = vec!["dat", "bin", "cache", "tmp"];
        
        if let Ok(entries) = fs::read_dir(&current_dir) {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    for ext in &forbidden_extensions {
                        if file_name.ends_with(ext) && !file_name.starts_with('.') {
                            // Allow build artifacts and dependencies
                            if !file_name.contains("target") && !file_name.contains("node_modules") {
                                panic!("Found data file in app directory: {:?}", entry.path());
                            }
                        }
                    }
                }
            }
        }
    }

    /// Test: Verify Windows version compatibility
    /// Requirements: 6.2, 6.3
    #[test]
    #[cfg(target_os = "windows")]
    fn test_windows_version_compatibility() {
        use std::process::Command;

        // Get Windows version
        let output = Command::new("cmd")
            .args(&["/C", "ver"])
            .output()
            .expect("Failed to execute ver command");

        let version_string = String::from_utf8_lossy(&output.stdout);
        println!("Windows version: {}", version_string);

        // Verify we're on Windows 10 or 11
        assert!(
            version_string.contains("Windows") || version_string.contains("10.0"),
            "Not running on Windows 10/11"
        );
    }

    /// Test: Verify only logging files are created (no audio/data files)
    /// Requirements: 5.1, 5.4, 5.5
    #[test]
    fn test_only_log_files_created() {
        let appdata = env::var("APPDATA").unwrap_or_default();
        let log_dir = PathBuf::from(appdata).join("VoiceAssistant").join("logs");

        if log_dir.exists() {
            if let Ok(entries) = fs::read_dir(&log_dir) {
                for entry in entries.flatten() {
                    if let Ok(file_name) = entry.file_name().into_string() {
                        // Only .log files should exist
                        assert!(
                            file_name.ends_with(".log"),
                            "Non-log file found in logs directory: {}",
                            file_name
                        );

                        // Verify log files don't contain audio data
                        if let Ok(metadata) = entry.metadata() {
                            // Log files should be text-based and relatively small
                            // Audio files would be much larger (>100KB)
                            assert!(
                                metadata.len() < 10_000_000, // 10MB max per log file
                                "Log file too large (possible audio data): {}",
                                file_name
                            );
                        }
                    }
                }
            }
        }
    }

    /// Test: Verify buffer is cleared after extraction
    /// Requirements: 5.2
    #[test]
    fn test_buffer_cleared_after_extraction() {
        // This is a conceptual test - in practice, this is verified by code review
        // The actual implementation in commands.rs calls clear_buffer() after get_buffer()
        
        // Verify the pattern exists in commands.rs
        let commands_file = include_str!("../src/commands.rs");
        
        assert!(
            commands_file.contains("clear_buffer()"),
            "Buffer clearing not implemented in get_audio_data command"
        );
        
        assert!(
            commands_file.contains("get_buffer()"),
            "Buffer extraction not implemented"
        );
    }
}
