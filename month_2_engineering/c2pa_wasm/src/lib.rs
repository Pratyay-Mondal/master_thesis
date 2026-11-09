//! c2pa_wasm: WebAssembly bridge for C2PA manifest verification.
//!
//! Provides a single JavaScript-callable entry point `verify_c2pa_buffer`
//! to inspect in-memory media bytes, parse JUMBF stores, and extract
//! cryptographic claims and `c2pa.ai_info` assertions.

use std::io::Cursor;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct C2paValidationResult {
    pub status: String,
    pub valid: bool,
    pub claim_generator: Option<String>,
    pub title: Option<String>,
    pub format: Option<String>,
    pub ai_generator: Option<String>,
    pub ai_info: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// Verifies a raw media byte buffer for C2PA provenance credentials.
/// 
/// Accepts a byte slice (from Uint8Array in JS) and returns a JSON string
/// conforming to C2paValidationResult.
#[wasm_bindgen]
pub fn verify_c2pa_buffer(buffer: &[u8]) -> String {
    // Forward panics to console.error in developer tools
    console_error_panic_hook::set_once();

    if buffer.is_empty() {
        return serde_json::to_string(&C2paValidationResult {
            status: "EMPTY_BUFFER".to_string(),
            valid: false,
            claim_generator: None,
            title: None,
            format: None,
            ai_generator: None,
            ai_info: None,
            error: Some("Supplied buffer is 0 bytes".to_string()),
        }).unwrap_or_default();
    }

    // Attempt detection across standard web formats
    let candidate_formats = ["image/jpeg", "image/png", "image/webp"];
    let mut last_error = String::from("No supported manifest found");

    for format in &candidate_formats {
        let stream = Cursor::new(buffer);
        match c2pa::Reader::from_stream(format, stream) {
            Ok(reader) => {
                let manifest_json = reader.json();
                let parsed: serde_json::Value = serde_json::from_str(&manifest_json).unwrap_or_default();

                // 1. Locate active manifest or root manifest
                let active_manifest = parsed.get("active_manifest")
                    .or_else(|| {
                        parsed.get("manifests")
                            .and_then(|m| m.as_object())
                            .and_then(|obj| obj.values().next())
                    });

                let claim_generator = active_manifest
                    .and_then(|m| m.get("claim_generator"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let title = active_manifest
                    .and_then(|m| m.get("title"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                // 2. Scan assertions for AI generation declarations
                let mut ai_generator = None;
                let mut ai_info_payload = None;

                if let Some(assertions) = active_manifest.and_then(|m| m.get("assertions")).and_then(|a| a.as_array()) {
                    for assertion in assertions {
                        let label = assertion.get("label").and_then(|l| l.as_str()).unwrap_or("");
                        
                        // Check for official c2pa.ai_info assertion (v2.1+)
                        if label.contains("ai_info") || label.contains("c2pa.ai") {
                            ai_info_payload = assertion.get("data").cloned();
                            if let Some(data) = &ai_info_payload {
                                if let Some(model) = data.get("model")
                                    .or_else(|| data.get("generator"))
                                    .and_then(|m| m.as_str()) 
                                {
                                    ai_generator = Some(model.to_string());
                                }
                            }
                        }

                        // Check c2pa.actions for trainedAlgorithmicMedia
                        if label.contains("c2pa.actions") {
                            if let Some(actions) = assertion.get("data").and_then(|d| d.get("actions")).and_then(|a| a.as_array()) {
                                for action in actions {
                                    let digital_source = action.get("digitalSourceType")
                                        .and_then(|s| s.as_str())
                                        .unwrap_or("");
                                    if digital_source.contains("trainedAlgorithmicMedia") {
                                        if ai_generator.is_none() {
                                            ai_generator = Some("Algorithmic / Generative AI".to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                let result = C2paValidationResult {
                    status: "VALID".to_string(),
                    valid: true,
                    claim_generator,
                    title,
                    format: Some(format.to_string()),
                    ai_generator,
                    ai_info: ai_info_payload,
                    error: None,
                };

                return serde_json::to_string(&result).unwrap_or_else(|_| r#"{"status":"ERROR","valid":false}"#.to_string());
            }
            Err(err) => {
                last_error = err.to_string();
            }
        }
    }

    // No valid manifest was found across any format
    let status = if last_error.contains("JumbfNotFound") || last_error.contains("not found") {
        "NO_MANIFEST".to_string()
    } else {
        "INVALID".to_string()
    };

    let result = C2paValidationResult {
        status,
        valid: false,
        claim_generator: None,
        title: None,
        format: None,
        ai_generator: None,
        ai_info: None,
        error: Some(last_error),
    };

    serde_json::to_string(&result).unwrap_or_else(|_| r#"{"status":"NO_MANIFEST","valid":false}"#.to_string())
}
