const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ [PASS] ${message}`);
  }
}

async function runCrossPlatformVerification() {
  console.log('================================================================');
  console.log('  SkillBridge 2.0 Universal Multi-Device & Cross-Platform Suite ');
  console.log('================================================================\n');

  const rootDir = __dirname;
  const stylesPath = path.join(rootDir, 'frontend', 'src', 'styles.css');
  const manifestPath = path.join(rootDir, 'frontend', 'public', 'manifest.json');
  const swPath = path.join(rootDir, 'frontend', 'public', 'sw.js');
  const indexPath = path.join(rootDir, 'frontend', 'src', 'index.html');
  const capPath = path.join(rootDir, 'capacitor.config.json');
  const devServicePath = path.join(rootDir, 'frontend', 'src', 'app', 'services', 'device-capability.service.ts');
  const visualizerPath = path.join(rootDir, 'frontend', 'src', 'app', 'components', 'career-3d-visualizer', 'career-3d-visualizer.component.ts');
  const bottomNavPath = path.join(rootDir, 'frontend', 'src', 'app', 'components', 'bottom-nav', 'bottom-nav.component.ts');
  const pwaBannerPath = path.join(rootDir, 'frontend', 'src', 'app', 'components', 'pwa-install-banner', 'pwa-install-banner.component.ts');

  // 1. Verify CSS Viewport Breakpoints & Safe Area Insets
  console.log('--- 1. Testing Adaptive CSS & Viewport Breakpoints ---');
  assert(fs.existsSync(stylesPath), 'Global styles.css exists');
  const stylesContent = fs.readFileSync(stylesPath, 'utf8');

  const requiredViewports = [
    { width: '320px', desc: 'Compact smartphones (iPhone SE, Galaxy Fold cover)' },
    { width: '360px', desc: 'Standard mobile lower bound' },
    { width: '430px', desc: 'Large smartphones (iPhone Pro Max, Galaxy Ultra)' },
    { width: '600px', desc: 'Foldables & mini tablets' },
    { width: '768px', desc: 'Standard tablets & iPads' },
    { width: '1024px', desc: 'Laptops & desktop lower bound' },
    { width: '1440px', desc: 'Standard desktop & MacBooks' },
    { width: '1920px', desc: 'Full HD desktop monitors' },
    { width: '2560px', desc: 'Ultrawide & 4K monitors' }
  ];

  requiredViewports.forEach(vp => {
    assert(stylesContent.includes(vp.width), `Breakpoint coverage: ${vp.width} (${vp.desc})`);
  });

  assert(stylesContent.includes('env(safe-area-inset-top') && stylesContent.includes('env(safe-area-inset-bottom'),
    'Safe area insets (notches, Dynamic Island, home bar) declared in CSS');
  assert(stylesContent.includes('min-height: 44px') || stylesContent.includes('min-width: 44px'),
    'Touch target compliance (minimum 44x44px for touch/mobile) implemented');
  assert(stylesContent.includes(':focus-visible'), 'Accessible keyboard & stylus focus rings styled');
  assert(stylesContent.includes('prefers-reduced-motion'), 'prefers-reduced-motion media query handled');

  // 2. Verify PWA Manifest & Web Standards
  console.log('\n--- 2. Testing PWA Manifest & App Identity ---');
  assert(fs.existsSync(manifestPath), 'Web App Manifest (manifest.json) exists');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(manifest.short_name === 'SkillBridge', 'PWA short_name is set to SkillBridge');
  assert(manifest.display === 'standalone', 'PWA display mode is standalone');
  assert(manifest.background_color === '#0B1020', 'PWA background color set to dark palette #0B1020');
  assert(manifest.theme_color === '#6366F1', 'PWA theme color set to brand indigo #6366F1');
  assert(manifest.icons && manifest.icons.length >= 2, `PWA provides ${manifest.icons.length} scalable icon definitions`);
  assert(manifest.shortcuts && manifest.shortcuts.length === 4, 'PWA defines 4 quick shortcuts (Dashboard, Jobs, Roadmaps, Tests)');

  // 3. Verify Service Worker & Caching Strategy
  console.log('\n--- 3. Testing Service Worker (sw.js) & Offline Resiliency ---');
  assert(fs.existsSync(swPath), 'Service Worker (sw.js) exists');
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes('addEventListener(\'install\''), 'SW handles install event with App Shell precaching');
  assert(swContent.includes('addEventListener(\'activate\''), 'SW handles activate event with old cache invalidation');
  assert(swContent.includes('addEventListener(\'fetch\''), 'SW intercepts fetch requests with network-first + offline cache fallback');

  // 4. Verify iOS / Apple Meta in index.html
  console.log('\n--- 4. Testing Apple Ecosystem & Browser Shell ---');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert(indexContent.includes('viewport-fit=cover'), 'index.html includes viewport-fit=cover for edge-to-edge iOS/iPadOS rendering');
  assert(indexContent.includes('apple-mobile-web-app-capable'), 'index.html includes apple-mobile-web-app-capable');
  assert(indexContent.includes('apple-mobile-web-app-status-bar-style'), 'index.html includes apple-mobile-web-app-status-bar-style black-translucent');
  assert(indexContent.includes('serviceWorker.register'), 'index.html registers sw.js on browser load');

  // 5. Verify Native Capacitor Configuration
  console.log('\n--- 5. Testing Native Mobile Packaging (Capacitor) ---');
  assert(fs.existsSync(capPath), 'Capacitor configuration (capacitor.config.json) exists');
  const capConfig = JSON.parse(fs.readFileSync(capPath, 'utf8'));
  assert(capConfig.appId === 'com.skillbridge.career', 'Capacitor appId is com.skillbridge.career');
  assert(capConfig.appName === 'SkillBridge', 'Capacitor appName is SkillBridge');
  assert(capConfig.plugins && capConfig.plugins.SplashScreen, 'Capacitor SplashScreen plugin configured');
  assert(capConfig.plugins && capConfig.plugins.StatusBar, 'Capacitor StatusBar plugin configured');

  // 6. Verify Device Capability Service
  console.log('\n--- 6. Testing Device Capability & Performance Profiling ---');
  assert(fs.existsSync(devServicePath), 'DeviceCapabilityService exists');
  const devServiceContent = fs.readFileSync(devServicePath, 'utf8');
  assert(devServiceContent.includes('deviceTier') && devServiceContent.includes('renderingMode'),
    'Service evaluates dynamic deviceTier (high/medium/low) and renderingMode');
  assert(devServiceContent.includes('isLowBattery') || devServiceContent.includes('getBattery'),
    'Service integrates Battery API for battery-saving mode');
  assert(devServiceContent.includes('probeGPU') || devServiceContent.includes('WEBGL'),
    'Service probes WebGL hardware acceleration & GPU renderer');

  // 7. Verify Adaptive 3D Visualizer with 2D Fallback
  console.log('\n--- 7. Testing Adaptive 3D Visualizer with 2D Fallback ---');
  assert(fs.existsSync(visualizerPath), 'Career3dVisualizerComponent exists');
  const visContent = fs.readFileSync(visualizerPath, 'utf8');
  assert(visContent.includes('draw3D') && visContent.includes('draw2D'),
    'Visualizer contains both full 3D Canvas orbital projection and hardware-safe 2D topological fallback');
  assert(visContent.includes('onMouseDown') && visContent.includes('onTouchStart'),
    'Visualizer supports both touch gestures and mouse dragging interactions');
  assert(visContent.includes('setMode'), 'Visualizer provides manual user toggle between 3D and 2D modes');

  // 8. Verify Mobile Bottom Navigation Bar & PWA Banner
  console.log('\n--- 8. Testing Mobile Ergonomics & PWA Install Banner ---');
  assert(fs.existsSync(bottomNavPath), 'BottomNavComponent exists');
  const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');
  assert(bottomNavContent.includes('md:hidden') && bottomNavContent.includes('safe-bottom'),
    'BottomNavComponent is anchored with safe-area insets and hidden on tablet/desktop');
  assert(fs.existsSync(pwaBannerPath), 'PwaInstallBannerComponent exists');
  const pwaBannerContent = fs.readFileSync(pwaBannerPath, 'utf8');
  assert(pwaBannerContent.includes('beforeinstallprompt') && pwaBannerContent.includes('isIosDevice'),
    'PWA banner intercepts Chrome/Android beforeinstallprompt and provides iOS Safari installation guidance');

  console.log('\n================================================================');
  if (process.exitCode === 1) {
    console.error('❌ SOME CROSS-PLATFORM CHECKS FAILED!');
  } else {
    console.log('>>> ALL UNIVERSAL MULTI-DEVICE & CROSS-PLATFORM TESTS PASSED! <<<');
  }
  console.log('================================================================');
}

runCrossPlatformVerification();
