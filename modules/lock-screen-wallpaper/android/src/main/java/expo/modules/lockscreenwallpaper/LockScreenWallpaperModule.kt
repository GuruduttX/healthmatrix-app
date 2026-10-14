package expo.modules.lockscreenwallpaper

import android.app.WallpaperManager
import android.graphics.BitmapFactory
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WallpaperException(message: String, cause: Throwable? = null) :
  CodedException("ERR_LOCK_SCREEN_WALLPAPER", message, cause)

/**
 * Puts an image on the lock screen only, leaving the home screen as it is, and takes it off again.
 * Android lets an app do this with SET_WALLPAPER; some phone makers' launchers still show their
 * own lock screen picture instead.
 */
class LockScreenWallpaperModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("LockScreenWallpaper")

    /** Whether this phone lets apps set the wallpaper at all (some work profiles and kiosks don't). */
    Function("isSupported") {
      val manager = WallpaperManager.getInstance(context)
      manager.isWallpaperSupported && manager.isSetWallpaperAllowed
    }

    /** Sets the image at `uri` (a file:// path) as the lock screen wallpaper. */
    AsyncFunction("setLockScreen") { uri: String ->
      val path = Uri.parse(uri).path ?: throw WallpaperException("Not a file path: $uri")
      val bitmap = BitmapFactory.decodeFile(path) ?: throw WallpaperException("Could not read the image")
      try {
        WallpaperManager.getInstance(context)
          .setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
      } catch (e: Exception) {
        throw WallpaperException("Android didn't accept the wallpaper", e)
      } finally {
        bitmap.recycle()
      }
    }

    /** Takes the image off the lock screen, which then shows the home screen wallpaper again. */
    AsyncFunction("clearLockScreen") {
      try {
        WallpaperManager.getInstance(context).clear(WallpaperManager.FLAG_LOCK)
      } catch (e: Exception) {
        throw WallpaperException("Android didn't clear the lock screen wallpaper", e)
      }
    }
  }
}
