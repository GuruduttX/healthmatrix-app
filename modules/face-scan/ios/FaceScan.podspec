Pod::Spec.new do |s|
  s.name           = 'FaceScan'
  s.version        = '1.0.0'
  s.summary        = 'Front camera that reads skin colour in face regions for the face scan'
  s.description    = 'Samples the mean skin colour of the forehead and cheeks on every frame, for rPPG'
  s.author         = 'HealthMatrix'
  s.homepage       = 'https://healthmatrix.in'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
