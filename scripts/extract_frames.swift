import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

guard CommandLine.arguments.count >= 3 else {
    print("Usage: extract_frames <videoPath> <outputDir> [stepSeconds]")
    exit(1)
}

let videoPath = CommandLine.arguments[1]
let outDir = URL(fileURLWithPath: CommandLine.arguments[2])
let stepSec: Double = CommandLine.arguments.count >= 4 ? (Double(CommandLine.arguments[3]) ?? 2.0) : 2.0

let fileManager = FileManager.default
try? fileManager.createDirectory(at: outDir, withIntermediateDirectories: true)

let asset = AVAsset(url: URL(fileURLWithPath: videoPath))
let duration = CMTimeGetSeconds(asset.duration)
print("Video duration: \(duration) seconds")

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 1280, height: 720)
// Force exact requested timestamps (no keyframe snapping) so extracted frames
// reflect the true content at that time.
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero

var currentTime: Double = 0.5
var frameIndex = 0

while currentTime < duration {
    let time = CMTime(seconds: currentTime, preferredTimescale: 600)
    do {
        let cgImage = try generator.copyCGImage(at: time, actualTime: nil)
        let outURL = outDir.appendingPathComponent(String(format: "frame_%03d_%04.1fs.jpg", frameIndex, currentTime))
        if let destination = CGImageDestinationCreateWithURL(outURL as CFURL, kUTTypeJPEG, 1, nil) {
            CGImageDestinationAddImage(destination, cgImage, [kCGImageDestinationLossyCompressionQuality: 0.8] as CFDictionary)
            if !CGImageDestinationFinalize(destination) {
                print("Warning: failed to finalize JPEG at \(outURL.lastPathComponent)")
            }
            print("Extracted: \(outURL.lastPathComponent)")
        } else {
            print("Warning: could not create image destination for \(outURL.lastPathComponent)")
        }
    } catch {
        print("Error at \(currentTime)s: \(error)")
    }
    currentTime += stepSec
    frameIndex += 1
}
print("Done extracting \(frameIndex) frames.")

