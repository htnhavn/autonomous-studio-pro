import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

guard CommandLine.arguments.count >= 4 else {
    fputs("Usage: native_mp4_encoder.swift <frames_dir> <fps> <output_mp4>\n", stderr)
    exit(1)
}

let framesDir = URL(fileURLWithPath: CommandLine.arguments[1])
let fps = Int32(CommandLine.arguments[2]) ?? 30
let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])

let fm = FileManager.default
if fm.fileExists(atPath: outputURL.path) {
    try? fm.removeItem(at: outputURL)
}

let files = (try? fm.contentsOfDirectory(at: framesDir, includingPropertiesForKeys: nil))?
    .filter { ["png", "jpg", "jpeg"].contains($0.pathExtension.lowercased()) }
    .sorted { $0.lastPathComponent < $1.lastPathComponent } ?? []

guard !files.isEmpty else {
    fputs("No PNG frames found in \(framesDir.path)\n", stderr)
    exit(1)
}

guard let firstSource = CGImageSourceCreateWithURL(files[0] as CFURL, nil),
      let firstImage = CGImageSourceCreateImageAtIndex(firstSource, 0, nil) else {
    fputs("Failed to load first frame\n", stderr)
    exit(1)
}

let width = firstImage.width
let height = firstImage.height

guard let writer = try? AVAssetWriter(outputURL: outputURL, fileType: .mp4) else {
    fputs("Failed to create AVAssetWriter\n", stderr)
    exit(1)
}

let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 6_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
]

let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
writerInput.expectsMediaDataInRealTime = false

let sourcePixelBufferAttributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height
]

let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: writerInput,
    sourcePixelBufferAttributes: sourcePixelBufferAttributes
)

writer.add(writerInput)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let colorSpace = CGColorSpaceCreateDeviceRGB()

for (idx, fileURL) in files.enumerated() {
    while !writerInput.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.002)
    }

    guard let src = CGImageSourceCreateWithURL(fileURL as CFURL, nil),
          let cgImg = CGImageSourceCreateImageAtIndex(src, 0, nil),
          let pool = adaptor.pixelBufferPool else {
        continue
    }

    var pixelBufferOut: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pixelBufferOut)
    guard let pixelBuffer = pixelBufferOut else { continue }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    if let ctx = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    ) {
        ctx.draw(cgImg, in: CGRect(x: 0, y: 0, width: width, height: height))
    }
    CVPixelBufferUnlockBaseAddress(pixelBuffer, [])

    let presentationTime = CMTime(value: CMTimeValue(idx), timescale: fps)
    adaptor.append(pixelBuffer, withPresentationTime: presentationTime)
}

writerInput.markAsFinished()
let sema = DispatchSemaphore(value: 0)
writer.finishWriting {
    sema.signal()
}
sema.wait()

if writer.status == .completed {
    print("OK:\(outputURL.path)")
    exit(0)
} else {
    fputs("Encoder error: \(String(describing: writer.error))\n", stderr)
    exit(1)
}

