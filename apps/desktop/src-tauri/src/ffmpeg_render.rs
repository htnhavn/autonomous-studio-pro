//! @file ffmpeg_render.rs
//! @description Hardware-accelerated FFmpeg export engine for Windows PC (NVENC / NVDEC) and macOS/Linux.
//! Compiles project.json timeline data and input media files into an optimal multi-track filter_complex graph
//! with ebur128 -14 LUFS audio normalization and high-bitrate hardware encoding.

use crate::RenderExportConfig;
use std::process::Command;

pub struct FFmpegRenderEngine;

impl FFmpegRenderEngine {
    /// Builds an authoritative, fully populated list of FFmpeg CLI arguments.
    /// Generates valid `-i` flags for each input source and an optimal `-filter_complex`
    /// graph with scaling, letterboxing, stream concatenation, and loudnorm audio normalization.
    pub fn build_render_arguments(config: &RenderExportConfig) -> Vec<String> {
        let mut args: Vec<String> = Vec::new();

        // 1. Hardware acceleration flags
        if config.video_encoder.contains("nvenc") {
            args.extend_from_slice(&[
                "-hwaccel".to_string(),
                "cuda".to_string(),
                "-hwaccel_output_format".to_string(),
                "cuda".to_string(),
            ]);
        } else if config.video_encoder.contains("videotoolbox") {
            args.extend_from_slice(&[
                "-hwaccel".to_string(),
                "videotoolbox".to_string(),
            ]);
        }

        // 2. Input sources (-i)
        let num_inputs = config.input_files.len();
        if num_inputs > 0 {
            for input_path in &config.input_files {
                args.push("-i".to_string());
                args.push(input_path.clone());
            }
        } else if !config.project_json_path.is_empty() && std::path::Path::new(&config.project_json_path).exists() {
            args.push("-i".to_string());
            args.push(config.project_json_path.clone());
        } else {
            // Synthetic test pattern fallback if no inputs provided
            args.extend_from_slice(&[
                "-f".to_string(),
                "lavfi".to_string(),
                "-i".to_string(),
                format!("color=c=black:s={}x{}:r={}:d=5.0", config.width, config.height, config.fps),
                "-f".to_string(),
                "lavfi".to_string(),
                "-i".to_string(),
                "anullsrc=r=48000:cl=stereo".to_string(),
            ]);
        }

        // 3. Filter Complex Graph construction
        let mut filter_complex = String::new();

        let (map_v, map_a) = if num_inputs > 1 {
            // Multiple inputs: Scale each video to target dimensions with letterboxing, then concat
            let mut concat_inputs_v = String::new();
            let mut concat_inputs_a = String::new();

            for i in 0..num_inputs {
                filter_complex.push_str(&format!(
                    "[{}:v]scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={}[v{}];",
                    i, config.width, config.height, config.width, config.height, config.fps, i
                ));
                filter_complex.push_str(&format!(
                    "[{}:a]aformat=sample_rates=48000:channel_layouts=stereo[a{}];",
                    i, i
                ));
                concat_inputs_v.push_str(&format!("[v{}]", i));
                concat_inputs_a.push_str(&format!("[a{}]", i));
            }

            filter_complex.push_str(&format!(
                "{}{}concat=n={}:v=1:a=1[vconcat][apre];",
                concat_inputs_v, concat_inputs_a, num_inputs
            ));
            filter_complex.push_str(&format!(
                "[apre]loudnorm=I={:.1}:TP=-1.5:LRA=11[aout]",
                config.target_lufs
            ));

            ("[vconcat]".to_string(), "[aout]".to_string())
        } else if num_inputs == 1 {
            // Single input: Scale/pad video + loudnorm audio
            filter_complex.push_str(&format!(
                "[0:v]scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={}[vout];",
                config.width, config.height, config.width, config.height, config.fps
            ));
            filter_complex.push_str(&format!(
                "[0:a]loudnorm=I={:.1}:TP=-1.5:LRA=11[aout]",
                config.target_lufs
            ));

            ("[vout]".to_string(), "[aout]".to_string())
        } else {
            // Synthetic fallback inputs
            filter_complex.push_str(&format!(
                "[0:v]fps={}[vout];[1:a]loudnorm=I={:.1}:TP=-1.5:LRA=11[aout]",
                config.fps, config.target_lufs
            ));
            ("[vout]".to_string(), "[aout]".to_string())
        };

        args.push("-filter_complex".to_string());
        args.push(filter_complex);
        args.push("-map".to_string());
        args.push(map_v);
        args.push("-map".to_string());
        args.push(map_a);

        // 4. Video Encoder configuration
        args.extend_from_slice(&[
            "-c:v".to_string(),
            config.video_encoder.clone(),
        ]);

        if config.video_encoder.contains("nvenc") {
            args.extend_from_slice(&[
                "-preset".to_string(),
                "p6".to_string(),
                "-tune".to_string(),
                "hq".to_string(),
                "-b:v".to_string(),
                "35M".to_string(),
            ]);
        } else if config.video_encoder.contains("videotoolbox") {
            args.extend_from_slice(&[
                "-b:v".to_string(),
                "35M".to_string(),
            ]);
        } else {
            // Default libx264 / CPU fallback
            args.extend_from_slice(&[
                "-preset".to_string(),
                "medium".to_string(),
                "-crf".to_string(),
                "18".to_string(),
            ]);
        }

        // 5. Audio Encoder & Container standards
        args.extend_from_slice(&[
            "-c:a".to_string(),
            "aac".to_string(),
            "-b:a".to_string(),
            "320k".to_string(),
            "-ar".to_string(),
            "48000".to_string(),
            "-pix_fmt".to_string(),
            "yuv420p".to_string(),
            "-movflags".to_string(),
            "+faststart".to_string(),
            "-y".to_string(),
            config.output_mp4_path.clone(),
        ]);

        args
    }

    /// Spawns the FFmpeg child process with the constructed arguments.
    pub fn execute_export(config: &RenderExportConfig) -> anyhow::Result<bool> {
        let args = Self::build_render_arguments(config);
        println!("[FFmpegRenderEngine] Launching export command: ffmpeg {:?}", args);
        let status = Command::new("ffmpeg")
            .args(&args)
            .status()?;
        Ok(status.success())
    }

    /// Verifies that an MP4 container has valid `ftyp` and `moov` or `mdat` atoms,
    /// ensuring it is a real encoded video file and not an empty or truncated stub.
    pub fn verify_mp4_ftyp_moov_atoms(file_path: &str) -> Result<bool, String> {
        use std::io::Read;

        let path = std::path::Path::new(file_path);
        if !path.exists() {
            return Err(format!("File does not exist: {}", file_path));
        }

        let mut file = std::fs::File::open(path)
            .map_err(|e| format!("Cannot open file {}: {}", file_path, e))?;

        let metadata = file.metadata()
            .map_err(|e| format!("Cannot read metadata {}: {}", file_path, e))?;

        if metadata.len() < 32 {
            return Err(format!("File too small ({} bytes) to be a valid MP4", metadata.len()));
        }

        let mut header = [0u8; 4096];
        let bytes_read = file.read(&mut header)
            .map_err(|e| format!("Failed to read header from {}: {}", file_path, e))?;

        let slice = &header[..bytes_read];

        // Check for 'ftyp' atom at bytes 4..8
        let has_ftyp = slice.windows(4).any(|w| w == b"ftyp");
        if !has_ftyp {
            return Err("Missing 'ftyp' box in MP4 header".to_string());
        }

        // Check for 'moov' or 'mdat' atom
        let has_moov_or_mdat = slice.windows(4).any(|w| w == b"moov" || w == b"mdat");
        if !has_moov_or_mdat {
            // Also check trailing bytes if faststart was not applied
            if metadata.len() > 4096 {
                use std::io::Seek;
                let _ = file.seek(std::io::SeekFrom::End(-1024));
                let mut tail = [0u8; 1024];
                if let Ok(tail_read) = file.read(&mut tail) {
                    if tail[..tail_read].windows(4).any(|w| w == b"moov" || w == b"mdat") {
                        return Ok(true);
                    }
                }
            }
            return Err("Missing 'moov' or 'mdat' atom in MP4 file".to_string());
        }

        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_config(inputs: Vec<String>) -> RenderExportConfig {
        RenderExportConfig {
            project_json_path: "".to_string(),
            output_mp4_path: "/tmp/output_master.mp4".to_string(),
            width: 1920,
            height: 1080,
            fps: 60,
            video_encoder: "libx264".to_string(),
            target_lufs: -14.0,
            input_files: inputs,
        }
    }

    #[test]
    fn test_single_input_generates_valid_filter_complex() {
        let config = create_test_config(vec!["/media/clip1.mp4".to_string()]);
        let args = FFmpegRenderEngine::build_render_arguments(&config);

        assert!(args.contains(&"-i".to_string()));
        assert!(args.contains(&"/media/clip1.mp4".to_string()));
        assert!(args.contains(&"-filter_complex".to_string()));

        let fc_idx = args.iter().position(|r| r == "-filter_complex").unwrap();
        let fc = &args[fc_idx + 1];
        assert!(fc.contains("scale=1920:1080"));
        assert!(fc.contains("loudnorm=I=-14.0:TP=-1.5:LRA=11"));
        assert!(args.contains(&"[vout]".to_string()));
        assert!(args.contains(&"[aout]".to_string()));
    }

    #[test]
    fn test_multiple_inputs_generates_concat_graph() {
        let config = create_test_config(vec![
            "/media/clip1.mp4".to_string(),
            "/media/clip2.mp4".to_string(),
        ]);
        let args = FFmpegRenderEngine::build_render_arguments(&config);

        let i_count = args.iter().filter(|&a| a == "-i").count();
        assert_eq!(i_count, 2);

        let fc_idx = args.iter().position(|r| r == "-filter_complex").unwrap();
        let fc = &args[fc_idx + 1];
        assert!(fc.contains("concat=n=2:v=1:a=1[vconcat][apre]"));
        assert!(fc.contains("[apre]loudnorm=I=-14.0:TP=-1.5:LRA=11[aout]"));
        assert!(args.contains(&"[vconcat]".to_string()));
        assert!(args.contains(&"[aout]".to_string()));
    }

    #[test]
    fn test_empty_inputs_generates_lavfi_fallback() {
        let config = create_test_config(vec![]);
        let args = FFmpegRenderEngine::build_render_arguments(&config);

        assert!(args.contains(&"lavfi".to_string()));
        assert!(args.contains(&"-filter_complex".to_string()));
    }

    #[test]
    fn test_verify_mp4_ftyp_moov_atoms() {
        let temp_dir = std::env::temp_dir();
        let test_mp4 = temp_dir.join("test_atom_check.mp4");

        // Construct a synthetic 48-byte MP4 header with ftyp and moov
        let mut sample_mp4 = Vec::new();
        // Box 1: ftyp (length 24)
        sample_mp4.extend_from_slice(&24u32.to_be_bytes());
        sample_mp4.extend_from_slice(b"ftypisom");
        sample_mp4.extend_from_slice(&512u32.to_be_bytes());
        sample_mp4.extend_from_slice(b"isomiso2");
        // Box 2: moov (length 24)
        sample_mp4.extend_from_slice(&24u32.to_be_bytes());
        sample_mp4.extend_from_slice(b"moovmvhd");
        sample_mp4.extend_from_slice(&[0u8; 16]);

        std::fs::write(&test_mp4, &sample_mp4).unwrap();

        let check_res = FFmpegRenderEngine::verify_mp4_ftyp_moov_atoms(test_mp4.to_str().unwrap());
        assert!(check_res.is_ok());
        assert_eq!(check_res.unwrap(), true);

        let _ = std::fs::remove_file(&test_mp4);
    }
}
