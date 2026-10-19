import ExpoModulesCore

public class FaceScanModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FaceScan")

    View(FaceScanView.self) {
      Events("onFrame", "onCameraError")

      Prop("active") { (view: FaceScanView, active: Bool) in
        view.setActive(active)
      }

      Prop("regions") { (view: FaceScanView, regions: [Double]) in
        view.setRegions(regions)
      }

      Prop("reference") { (view: FaceScanView, rect: [Double]) in
        view.setReference(rect)
      }

      Prop("lockExposure") { (view: FaceScanView, lock: Bool) in
        view.setLockExposure(lock)
      }
    }
  }
}
