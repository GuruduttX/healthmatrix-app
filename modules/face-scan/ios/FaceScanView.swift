import AVFoundation
import ExpoModulesCore
import UIKit

/// The front camera for the face scan. Shows the member's face filling the view (which the app
/// sizes 3:4, like the frames) and, on every frame, sends the mean colour of the face's skin in the
/// oval to JavaScript, where the pulse is worked out (`src/features/face-scan/dsp.ts`). The same
/// steps as `src/features/face-scan/frame-reader.ts`, which the web uses. Frames never leave the
/// phone and are never stored.
final class FaceScanView: ExpoView, AVCaptureVideoDataOutputSampleBufferDelegate {
  let onFrame = EventDispatcher()
  let onCameraError = EventDispatcher()

  private let session = AVCaptureSession()
  private let sessionQueue = DispatchQueue(label: "in.healthmatrix.facescan.session")
  private let frameQueue = DispatchQueue(label: "in.healthmatrix.facescan.frames")
  private let previewLayer: AVCaptureVideoPreviewLayer
  private var device: AVCaptureDevice?
  private var configured = false

  /// Read on the frame queue, written from JavaScript; the lock keeps the two apart.
  private let regionsLock = NSLock()
  private var regions: [CGRect] = []
  private var reference: CGRect = .zero
  /// The face's skin tone (Y, Cb, Cr), smoothed from frame to frame. Only touched on the frame queue.
  private var tone: (y: Double, cb: Double, cr: Double)?

  /// Must match `TONE_MATCH` and `TONE_EASE` in the app's `geometry.ts` and `frame-reader.ts`.
  private static let toneLuma = 0.3
  private static let toneChroma = 10.0
  private static let toneEase = 0.15

  required init(appContext: AppContext? = nil) {
    previewLayer = AVCaptureVideoPreviewLayer(session: session)
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    previewLayer.videoGravity = .resizeAspectFill
    layer.addSublayer(previewLayer)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds
  }

  override func willMove(toWindow newWindow: UIWindow?) {
    super.willMove(toWindow: newWindow)
    if newWindow == nil {
      setActive(false)
    }
  }

  deinit {
    let session = self.session
    sessionQueue.async {
      if session.isRunning { session.stopRunning() }
    }
  }

  func setRegions(_ flat: [Double]) {
    var rects: [CGRect] = []
    var i = 0
    while i + 3 < flat.count {
      rects.append(CGRect(x: flat[i], y: flat[i + 1], width: flat[i + 2], height: flat[i + 3]))
      i += 4
    }
    regionsLock.lock()
    regions = rects
    regionsLock.unlock()
  }

  func setReference(_ rect: [Double]) {
    guard rect.count == 4 else { return }
    regionsLock.lock()
    reference = CGRect(x: rect[0], y: rect[1], width: rect[2], height: rect[3])
    regionsLock.unlock()
  }

  func setActive(_ active: Bool) {
    // A new scan learns the face's tone afresh.
    frameQueue.async { [weak self] in self?.tone = nil }
    sessionQueue.async { [weak self] in
      guard let self = self else { return }
      if active {
        if !self.configured {
          self.configured = self.configure()
        }
        if self.configured && !self.session.isRunning {
          self.session.startRunning()
        }
      } else if self.session.isRunning {
        self.session.stopRunning()
      }
    }
  }

  /// Exposure and white balance hold still once the face is in place: their adjustments change the
  /// skin colour far more than the pulse does.
  func setLockExposure(_ lock: Bool) {
    sessionQueue.async { [weak self] in
      guard let device = self?.device else { return }
      do {
        try device.lockForConfiguration()
        if lock {
          if device.isExposureModeSupported(.locked) { device.exposureMode = .locked }
          if device.isWhiteBalanceModeSupported(.locked) { device.whiteBalanceMode = .locked }
        } else {
          if device.isExposureModeSupported(.continuousAutoExposure) {
            device.exposureMode = .continuousAutoExposure
          }
          if device.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) {
            device.whiteBalanceMode = .continuousAutoWhiteBalance
          }
        }
        device.unlockForConfiguration()
      } catch {
        // Not every camera allows it; the scan still works, a little noisier.
      }
    }
  }

  /// Front camera, 640×480 at 30 frames a second, frames upright as BGRA. On the session queue.
  private func configure() -> Bool {
    guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
          let input = try? AVCaptureDeviceInput(device: camera) else {
      report("This phone’s front camera isn’t available.")
      return false
    }
    session.beginConfiguration()
    if session.canSetSessionPreset(.vga640x480) {
      session.sessionPreset = .vga640x480
    }
    guard session.canAddInput(input) else {
      session.commitConfiguration()
      report("The front camera is in use by something else.")
      return false
    }
    session.addInput(input)

    let output = AVCaptureVideoDataOutput()
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    output.alwaysDiscardsLateVideoFrames = true
    output.setSampleBufferDelegate(self, queue: frameQueue)
    guard session.canAddOutput(output) else {
      session.commitConfiguration()
      report("The front camera can’t be read on this phone.")
      return false
    }
    session.addOutput(output)
    if let connection = output.connection(with: .video) {
      FaceScanView.makeUpright(connection)
    }
    session.commitConfiguration()

    // A steady 30 frames a second: the pulse is read from the timing of colour changes.
    do {
      try camera.lockForConfiguration()
      let rate = CMTime(value: 1, timescale: 30)
      let supported = camera.activeFormat.videoSupportedFrameRateRanges.contains { $0.maxFrameRate >= 30 && $0.minFrameRate <= 30 }
      if supported {
        camera.activeVideoMinFrameDuration = rate
        camera.activeVideoMaxFrameDuration = rate
      }
      camera.unlockForConfiguration()
    } catch {
      // The camera's own frame rate will do; frames carry their capture times.
    }

    device = camera
    DispatchQueue.main.async { [weak self] in
      if let connection = self?.previewLayer.connection {
        FaceScanView.makeUpright(connection)
      }
    }
    return true
  }

  private static func makeUpright(_ connection: AVCaptureConnection) {
    if #available(iOS 17.0, *) {
      if connection.isVideoRotationAngleSupported(90) {
        connection.videoRotationAngle = 90
      }
    } else if connection.isVideoOrientationSupported {
      connection.videoOrientation = .portrait
    }
  }

  private func report(_ message: String) {
    DispatchQueue.main.async { [weak self] in
      self?.onCameraError(["message": message])
    }
  }

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    let t = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))

    regionsLock.lock()
    let rects = regions
    let middle = reference
    regionsLock.unlock()

    CVPixelBufferLockBaseAddress(pixels, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(pixels)?.assumingMemoryBound(to: UInt8.self) else { return }
    let width = CVPixelBufferGetWidth(pixels)
    let height = CVPixelBufferGetHeight(pixels)
    let rowBytes = CVPixelBufferGetBytesPerRow(pixels)

    // The part of the frame the 3:4 view shows (it fills the view, cropping any extra).
    var visibleWidth = Double(width)
    var visibleHeight = Double(height)
    if visibleWidth / visibleHeight > 3.0 / 4.0 {
      visibleWidth = visibleHeight * 3.0 / 4.0
    } else {
      visibleHeight = visibleWidth * 4.0 / 3.0
    }
    let left = (Double(width) - visibleWidth) / 2
    let top = (Double(height) - visibleHeight) / 2

    /// Every other pixel of a region each way (plenty for a mean, a quarter of the work), as
    /// (r, g, b, y, cb, cr).
    func forEachPixel(in rect: CGRect, _ body: (Double, Double, Double, Double, Double, Double) -> Void) {
      let x0 = max(0, Int(left + rect.minX * visibleWidth))
      let x1 = min(width, Int(left + rect.maxX * visibleWidth))
      let y0 = max(0, Int(top + rect.minY * visibleHeight))
      let y1 = min(height, Int(top + rect.maxY * visibleHeight))
      if x0 >= x1 || y0 >= y1 { return }
      for y in stride(from: y0, to: y1, by: 2) {
        let row = base + y * rowBytes
        for x in stride(from: x0, to: x1, by: 2) {
          let pixel = row + x * 4
          let b = Double(pixel[0]), g = Double(pixel[1]), r = Double(pixel[2])
          body(
            r, g, b,
            0.299 * r + 0.587 * g + 0.114 * b,
            128 - 0.168736 * r - 0.331264 * g + 0.5 * b,
            128 + 0.5 * r - 0.418688 * g - 0.081312 * b
          )
        }
      }
    }

    // 1. The face's tone, from the skin in the oval's middle: a mean, then a mean of the skin near
    //    it, so shadows there don't drag it.
    var total = 0, skin = 0
    var sumY = 0.0, sumCb = 0.0, sumCr = 0.0
    forEachPixel(in: middle) { _, _, _, y, cb, cr in
      total += 1
      guard FaceScanView.isSkin(y, cb, cr) else { return }
      skin += 1
      sumY += y
      sumCb += cb
      sumCr += cr
    }
    if skin > 0 {
      let rough = sumY / Double(skin)
      var n = 0
      var toneY = 0.0, toneCb = 0.0, toneCr = 0.0
      forEachPixel(in: middle) { _, _, _, y, cb, cr in
        guard FaceScanView.isSkin(y, cb, cr), abs(y - rough) <= rough * FaceScanView.toneLuma else { return }
        n += 1
        toneY += y
        toneCb += cb
        toneCr += cr
      }
      let now = n > 0
        ? (y: toneY / Double(n), cb: toneCb / Double(n), cr: toneCr / Double(n))
        : (y: rough, cb: sumCb / Double(skin), cr: sumCr / Double(skin))
      if let previous = tone {
        let ease = FaceScanView.toneEase
        tone = (
          y: previous.y + (now.y - previous.y) * ease,
          cb: previous.cb + (now.cb - previous.cb) * ease,
          cr: previous.cr + (now.cr - previous.cr) * ease
        )
      } else {
        tone = now
      }
    }

    // 2. The pixels in the oval that match the face's tone: hair, a beard, eyes and the
    //    background don't.
    var red = 0.0, green = 0.0, blue = 0.0
    var kept = 0
    if let face = tone {
      for rect in rects {
        forEachPixel(in: rect) { r, g, b, y, cb, cr in
          guard FaceScanView.isSkin(y, cb, cr),
                abs(y - face.y) <= face.y * FaceScanView.toneLuma,
                abs(cb - face.cb) <= FaceScanView.toneChroma,
                abs(cr - face.cr) <= FaceScanView.toneChroma else { return }
          kept += 1
          red += r
          green += g
          blue += b
        }
      }
    }
    guard total > 0 else { return }

    let reading: [String: Any] = [
      "t": t,
      "r": kept > 0 ? red / Double(kept) : 0,
      "g": kept > 0 ? green / Double(kept) : 0,
      "b": kept > 0 ? blue / Double(kept) : 0,
      "skin": Double(skin) / Double(total),
      "luma": skin > 0 ? sumY / Double(skin) : 0,
    ]
    DispatchQueue.main.async { [weak self] in
      self?.onFrame(reading)
    }
  }

  /// Skin in YCbCr, wide enough for every skin tone (the website's test): the first cut.
  private static func isSkin(_ y: Double, _ cb: Double, _ cr: Double) -> Bool {
    return y > 35 && y < 250 && cb > 77 && cb < 130 && cr > 132 && cr < 178
  }
}
