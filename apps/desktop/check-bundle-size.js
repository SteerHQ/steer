#!/usr/bin/env node

import { statSync, readdirSync } from "fs";
import { join } from "path";

const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function findMSIFiles(dir) {
  try {
    const files = readdirSync(dir, { recursive: true });
    return files
      .filter((file) => file.endsWith(".msi"))
      .map((file) => join(dir, file));
  } catch (error) {
    return [];
  }
}

function checkBundleSize() {
  const bundleDir = "./src-tauri/target/release/bundle";
  const msiFiles = findMSIFiles(bundleDir);

  if (msiFiles.length === 0) {
    console.log('⚠️  No MSI files found. Run "bun run tauri:build" first.');
    process.exit(1);
  }

  console.log("\n📦 Bundle Size Check\n");
  console.log("═".repeat(60));

  let allPassed = true;

  for (const msiFile of msiFiles) {
    try {
      const stats = statSync(msiFile);
      const sizeMB = stats.size / (1024 * 1024);
      const passed = stats.size <= MAX_SIZE_BYTES;

      const status = passed ? "✅" : "❌";
      const fileName = msiFile.split(/[/\\]/).pop();

      console.log(`${status} ${fileName}`);
      console.log(`   Size: ${formatBytes(stats.size)} / ${MAX_SIZE_MB} MB`);

      if (!passed) {
        allPassed = false;
        const excess = formatBytes(stats.size - MAX_SIZE_BYTES);
        console.log(`   ⚠️  Exceeds limit by ${excess}`);
      }

      console.log("");
    } catch (error) {
      console.error(`Error checking ${msiFile}:`, error.message);
    }
  }

  console.log("═".repeat(60));

  if (allPassed) {
    console.log("✅ All bundles are within size limit!\n");
    process.exit(0);
  } else {
    console.log("❌ Some bundles exceed the size limit.\n");
    console.log("Optimization suggestions:");
    console.log("  • Review and remove unused dependencies");
    console.log("  • Check for large assets in the bundle");
    console.log("  • Ensure Rust optimizations are enabled");
    console.log("  • Consider using dynamic imports in React\n");
    process.exit(1);
  }
}

checkBundleSize();
