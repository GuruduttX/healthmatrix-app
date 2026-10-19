package expo.modules.facescan

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FaceScanModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FaceScan")

    View(FaceScanView::class) {
      Events("onFrame", "onCameraError")

      Prop("active") { view: FaceScanView, active: Boolean ->
        view.setActive(active)
      }

      Prop("regions") { view: FaceScanView, regions: List<Double> ->
        view.setRegions(regions)
      }

      Prop("reference") { view: FaceScanView, rect: List<Double> ->
        view.setReference(rect)
      }

      Prop("lockExposure") { view: FaceScanView, lock: Boolean ->
        view.setLockExposure(lock)
      }
    }
  }
}
