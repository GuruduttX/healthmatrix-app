package expo.modules.facescan

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.RectF
import android.hardware.camera2.CaptureRequest
import android.util.Size
import android.view.View
import android.view.ViewGroup
import androidx.annotation.OptIn
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.CaptureRequestOptions
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.abs

/**
 * The front camera for the face scan. Shows the member's face filling the view (which the app
 * sizes 3:4, like the frames) and, on every frame, sends the mean colour of the face's skin in the
 * oval to JavaScript, where the pulse is worked out (`src/features/face-scan/dsp.ts`). The same
 * steps as `src/features/face-scan/frame-reader.ts`, which the web uses. Frames never leave the
 * phone and are never stored.
 */
@SuppressLint("ViewConstructor")
class FaceScanView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onFrame by EventDispatcher()
  private val onCameraError by EventDispatcher()

  private val previewView = PreviewView(context).apply {
    // A TextureView, so React Native can clip and round it like any other view.
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    scaleType = PreviewView.ScaleType.FILL_CENTER
  }
  private val analysisExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private var provider: ProcessCameraProvider? = null
  private var camera: Camera? = null
  private var active = false
  private var lockExposure = false

  /** Read on the analysis thread, written from JavaScript. */
  @Volatile private var regions: List<RectF> = emptyList()
  @Volatile private var reference = RectF()

  /** The face's skin tone (Y, Cb, Cr), smoothed from frame to frame. Only touched on the analysis thread. */
  private var tone: DoubleArray? = null

  /** A pixel: its colour and the same colour in YCbCr. */
  private class Pixel(val r: Double, val g: Double, val b: Double) {
    val y = 0.299 * r + 0.587 * g + 0.114 * b
    val cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
    val cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    /** Skin in YCbCr, wide enough for every skin tone (the website's test): the first cut. */
    val isSkin get() = y > 35 && y < 250 && cb > 77 && cb < 130 && cr > 132 && cr < 178
  }

  init {
    // React Native doesn't lay out views it doesn't manage: size the preview's surface by hand
    // when PreviewView adds it, as expo-camera does.
    previewView.setOnHierarchyChangeListener(object : OnHierarchyChangeListener {
      override fun onChildViewRemoved(parent: View?, child: View?) = Unit
      override fun onChildViewAdded(parent: View?, child: View?) {
        parent?.measure(
          MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY),
          MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
        )
        parent?.layout(0, 0, parent.measuredWidth, parent.measuredHeight)
      }
    })
    addView(
      previewView,
      ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    )
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    previewView.layout(0, 0, right - left, bottom - top)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    setActive(false)
  }

  fun setRegions(flat: List<Double>) {
    regions = flat.chunked(4).filter { it.size == 4 }.map { (x, y, w, h) ->
      RectF(x.toFloat(), y.toFloat(), (x + w).toFloat(), (y + h).toFloat())
    }
  }

  fun setReference(rect: List<Double>) {
    if (rect.size != 4) return
    reference = RectF(
      rect[0].toFloat(),
      rect[1].toFloat(),
      (rect[0] + rect[2]).toFloat(),
      (rect[1] + rect[3]).toFloat()
    )
  }

  fun setActive(value: Boolean) {
    if (value == active) return
    active = value
    // A new scan learns the face's tone afresh.
    analysisExecutor.execute { tone = null }
    if (value) start() else stop()
  }

  /**
   * Exposure and white balance hold still once the face is in place: their adjustments change the
   * skin colour far more than the pulse does.
   */
  fun setLockExposure(lock: Boolean) {
    lockExposure = lock
    applyExposureLock()
  }

  @OptIn(ExperimentalCamera2Interop::class)
  private fun applyExposureLock() {
    val control = camera?.cameraControl ?: return
    try {
      Camera2CameraControl.from(control).setCaptureRequestOptions(
        CaptureRequestOptions.Builder()
          .setCaptureRequestOption(CaptureRequest.CONTROL_AE_LOCK, lockExposure)
          .setCaptureRequestOption(CaptureRequest.CONTROL_AWB_LOCK, lockExposure)
          .build()
      )
    } catch (e: Exception) {
      // Not every camera allows it; the scan still works, a little noisier.
    }
  }

  private fun start() {
    val owner = appContext.currentActivity as? LifecycleOwner
    if (owner == null) {
      report("The camera can’t start right now.")
      return
    }
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      if (!active) return@addListener
      try {
        val cameraProvider = future.get()
        provider = cameraProvider
        val selector = CameraSelector.DEFAULT_FRONT_CAMERA
        if (!cameraProvider.hasCamera(selector)) {
          report("This phone’s front camera isn’t available.")
          return@addListener
        }
        // 640×480 (4:3), plenty for a mean colour and light on the battery.
        val resolution = ResolutionSelector.Builder()
          .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
          .setResolutionStrategy(
            ResolutionStrategy(Size(640, 480), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER)
          )
          .build()
        val preview = Preview.Builder().setResolutionSelector(resolution).build()
        preview.setSurfaceProvider(previewView.surfaceProvider)
        val analysis = ImageAnalysis.Builder()
          .setResolutionSelector(resolution)
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
          .build()
        analysis.setAnalyzer(analysisExecutor) { image -> analyze(image) }
        cameraProvider.unbindAll()
        camera = cameraProvider.bindToLifecycle(owner, selector, preview, analysis)
        applyExposureLock()
      } catch (e: Exception) {
        report("The front camera couldn’t start: ${e.message ?: "unknown error"}")
      }
    }, ContextCompat.getMainExecutor(context))
  }

  private fun stop() {
    provider?.unbindAll()
    camera = null
  }

  private fun report(message: String) {
    post { onCameraError(mapOf("message" to message)) }
  }

  /** One frame: the mean colour of the skin in the face regions, on the analysis thread. */
  private fun analyze(image: ImageProxy) {
    try {
      val rotation = image.imageInfo.rotationDegrees
      val width = image.width
      val height = image.height
      val plane = image.planes[0]
      val buffer = plane.buffer
      val rowStride = plane.rowStride
      val pixelStride = plane.pixelStride

      // The frame as it stands upright, and the part of it the 3:4 view shows (filling the view,
      // cropping any extra).
      val uprightWidth = if (rotation % 180 == 0) width else height
      val uprightHeight = if (rotation % 180 == 0) height else width
      var visibleWidth = uprightWidth.toDouble()
      var visibleHeight = uprightHeight.toDouble()
      if (visibleWidth / visibleHeight > 3.0 / 4.0) {
        visibleWidth = visibleHeight * 3.0 / 4.0
      } else {
        visibleHeight = visibleWidth * 4.0 / 3.0
      }
      val cropX = (uprightWidth - visibleWidth) / 2 / uprightWidth
      val cropY = (uprightHeight - visibleHeight) / 2 / uprightHeight
      val scaleX = visibleWidth / uprightWidth
      val scaleY = visibleHeight / uprightHeight

      /** Every other pixel of a region each way: plenty for a mean, a quarter of the work. */
      fun forEachPixel(region: RectF, body: (Pixel) -> Unit) {
        // Region corners as fractions of the upright frame, then of the frame as the sensor gave it.
        val (ax, ay) = toSensor(cropX + region.left * scaleX, cropY + region.top * scaleY, rotation)
        val (bx, by) = toSensor(cropX + region.right * scaleX, cropY + region.bottom * scaleY, rotation)
        val x0 = (minOf(ax, bx) * width).toInt().coerceIn(0, width)
        val x1 = (maxOf(ax, bx) * width).toInt().coerceIn(0, width)
        val y0 = (minOf(ay, by) * height).toInt().coerceIn(0, height)
        val y1 = (maxOf(ay, by) * height).toInt().coerceIn(0, height)
        var y = y0
        while (y < y1) {
          var x = x0
          while (x < x1) {
            val i = y * rowStride + x * pixelStride
            body(
              Pixel(
                (buffer.get(i).toInt() and 0xFF).toDouble(),
                (buffer.get(i + 1).toInt() and 0xFF).toDouble(),
                (buffer.get(i + 2).toInt() and 0xFF).toDouble()
              )
            )
            x += 2
          }
          y += 2
        }
      }

      // 1. The face's tone, from the skin in the oval's middle: a mean, then a mean of the skin
      //    near it, so shadows there don't drag it.
      var total = 0
      var skin = 0
      var sumY = 0.0
      var sumCb = 0.0
      var sumCr = 0.0
      forEachPixel(reference) { p ->
        total++
        if (p.isSkin) {
          skin++
          sumY += p.y
          sumCb += p.cb
          sumCr += p.cr
        }
      }
      if (skin > 0) {
        val rough = sumY / skin
        var n = 0
        var toneY = 0.0
        var toneCb = 0.0
        var toneCr = 0.0
        forEachPixel(reference) { p ->
          if (p.isSkin && abs(p.y - rough) <= rough * TONE_LUMA) {
            n++
            toneY += p.y
            toneCb += p.cb
            toneCr += p.cr
          }
        }
        val now = if (n > 0) {
          doubleArrayOf(toneY / n, toneCb / n, toneCr / n)
        } else {
          doubleArrayOf(rough, sumCb / skin, sumCr / skin)
        }
        val previous = tone
        tone = if (previous == null) now else DoubleArray(3) { previous[it] + (now[it] - previous[it]) * TONE_EASE }
      }

      // 2. The pixels in the oval that match the face's tone: hair, a beard, eyes and the
      //    background don't.
      var red = 0.0
      var green = 0.0
      var blue = 0.0
      var kept = 0
      tone?.let { (faceY, faceCb, faceCr) ->
        for (region in regions) {
          forEachPixel(region) { p ->
            if (
              p.isSkin &&
              abs(p.y - faceY) <= faceY * TONE_LUMA &&
              abs(p.cb - faceCb) <= TONE_CHROMA &&
              abs(p.cr - faceCr) <= TONE_CHROMA
            ) {
              kept++
              red += p.r
              green += p.g
              blue += p.b
            }
          }
        }
      }
      if (total == 0) return

      val reading = mapOf(
        "t" to image.imageInfo.timestamp / 1e9,
        "r" to if (kept > 0) red / kept else 0.0,
        "g" to if (kept > 0) green / kept else 0.0,
        "b" to if (kept > 0) blue / kept else 0.0,
        "skin" to skin.toDouble() / total,
        "luma" to if (skin > 0) sumY / skin else 0.0
      )
      post { onFrame(reading) }
    } catch (e: Exception) {
      // A frame that can't be read is skipped; the scan copes with gaps.
    } finally {
      image.close()
    }
  }

  /**
   * A point in the upright frame (fractions of its width and height) as a point in the frame as
   * the sensor delivered it, which the upright frame is rotated clockwise from by `rotation`.
   */
  private fun toSensor(x: Double, y: Double, rotation: Int): Pair<Double, Double> = when (rotation) {
    90 -> Pair(y, 1 - x)
    180 -> Pair(1 - x, 1 - y)
    270 -> Pair(1 - y, x)
    else -> Pair(x, y)
  }

  companion object {
    /** Must match `TONE_MATCH` and `TONE_EASE` in the app's `geometry.ts` and `frame-reader.ts`. */
    private const val TONE_LUMA = 0.3
    private const val TONE_CHROMA = 10.0
    private const val TONE_EASE = 0.15
  }
}
