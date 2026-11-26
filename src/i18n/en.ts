import type { Translations } from './he';

export const en: Translations = {
  appName: 'BCI Workshop 2026 Hub',
  appSubtitle: 'Multidisciplinary Brain Research Center, Bar-Ilan University',
  previewBadge: 'Browser Preview Mode (Simulated Backend)',
  nav: {
    onboarding: 'Onboarding & Setup',
    diagnostics: 'System Check & Troubleshooting',
    dashboard: 'Daily Dashboard',
  },
  langToggle: 'עברית',
  signIn: {
    welcomeTitle: 'Welcome to BCI Workshop 2026',
    welcomeBody:
      'This app guides you through pre-workshop setup and serves as your daily launchpad across all 5 days. Install only the tools you need, verify your computer without hardware connected, and open course materials in one click.',
    privacyTitle: 'Transparency, Identity & Privacy',
    privacyIntro:
      'To verify class readiness before Day 1 and help quickly if anything fails, sign-in uses your Google account.',
    sentListTitle: 'What is sent to the instructor:',
    sentItems: [
      'Your verified Google Name and Email address',
      'Operating System and CPU architecture (Windows / macOS)',
      'Pass/Fail status per check and technical installer/diagnostic logs only',
      'Any optional troubleshooting note you write yourself',
    ],
    neverSentTitle: 'What is NEVER collected or sent:',
    neverSentItems: [
      'Personal files, documents, passwords, or browser history',
      'Anything outside the BCI_Workshop_2026 workshop directory',
    ],
    consentCheckbox:
      'I understand and consent to signing in and submitting a technical diagnostic report for workshop support.',
    signInButton: 'Sign in with Google',
    signingIn: 'Waiting for browser sign-in...',
    signOut: 'Sign out',
  },
  guardrails: {
    title: 'Pre-Flight System Guardrails',
    osLabel: 'Operating System',
    diskLabel: 'Free Disk Space',
    diskOk: 'OK (more than 5 GB free)',
    diskLow: 'Warning: Less than 5 GB free — consider freeing space before installing',
    pathLabel: 'Install Root',
    asciiWarning:
      'Detected non-ASCII characters in your Windows username folder. To prevent crashes in Python and Arduino CLI, workshop files will be placed in a clean ASCII path:',
    internetLabel: 'Internet Connection',
    internetOk: 'Connected',
    internetFail: 'Offline — internet is required to download installers',
  },
  onboarding: {
    heading: 'Component Selection & Guided Setup',
    subheading:
      'Your computer was pre-scanned. Core workshop tools are marked as Required and pre-selected if missing; IDEs and companion tools are completely optional.',
    rescanBtn: 'Re-Scan System',
    scanning: 'Scanning installed programs and drivers...',
    alreadyInstalled: 'Already Installed ✓',
    notFound: 'Not Found',
    optionalBadge: 'Optional',
    requiredBadge: 'Required',
    selectAllRequired: 'Select Missing Required Tools',
    clearSelection: 'Clear Selection',
    installSelected: 'Install Selected Components',
    installing: 'Installing...',
    installingKeepOpen:
      'Installation in progress — downloading Python packages (~450 MB) typically takes 2–4 minutes. Please keep this window open.',
    skipToDiagnostics: 'Skip to System Verification',
    continueToDiagnostics: 'Continue to System Verification →',
    manualNeeded: 'Manual Step Required',
    detectedAt: 'Detected at:',
    liveLogTitle: 'Live Installation Log',
    pythonVenvReady: 'Workshop isolated .venv is already ready ({ver}).',
    pythonVenvIncomplete:
      'Incomplete workshop .venv detected ({ver}) — package installation was interrupted. Keep checked and click Install to finish.',
    pythonReuseCompatible:
      'Compatible Python {ver} detected — the installer will reuse it to create an isolated .venv.',
    pythonIncompatibleFound:
      'Python {ver} detected (incompatible with pylsl/brainflow which require 3.10–3.12). An isolated Python 3.11 environment will be installed without touching your existing Python.',
    pythonNotFound:
      'No compatible Python detected — an isolated Python 3.11 environment will be installed inside the workshop folder.',
    arduinoIdeOnlyBanner:
      'Arduino IDE is already installed ✓ — keep checked to automatically add the workshop libraries (arduino:avr, Servo, AccelStepper) without reinstalling Arduino IDE.',
    preScanUploading: 'Uploading initial system report...',
    preScanUploadOk: 'Initial system report sent to instructor ✓',
    installFailedTitle: 'Installation failed for one or more components:',
    installErrorAutoSent: 'An automatic error report with the install log was sent to the instructor ✓',
    installErrorSendFailed: 'Could not auto-upload the error report — you can use the Help button anytime.',
    installAllSuccess: 'All selected components installed successfully ✓',
  },
  components: {
    python_env: {
      title: 'Workshop Python Environment (3.10–3.12)',
      subtitle: 'Includes pyserial, numpy, scipy, PyQt6, sounddevice, pylsl, mne, brainflow',
      whyNeeded:
        'Core computational engine for Days 1–5: reading Arduino serial streams, ECG/EDA/EEG signal processing, LSL time-sync, and interactive lab experiments. Reuses compatible Python 3.10–3.12 if present, or installs an isolated env with zero admin prompts.',
      recommendedTag: 'Required for Workshop',
      approxSize: '~450 MB',
    },
    jupyterlab: {
      title: 'JupyterLab (Interactive Python Workspace)',
      subtitle: 'Interactive notebooks (.ipynb) to plot biosignals inline step-by-step',
      whyNeeded:
        'Lets you run code cell-by-cell and inspect heart rate, skin conductance, and brainwave charts right below each block without touching a terminal.',
      recommendedTag: 'Optional — Very Beginner-Friendly',
      approxSize: '~120 MB',
    },
    thonny: {
      title: 'Thonny IDE (Beginner Python Editor)',
      subtitle: 'Lightweight editor for plain .py scripts with a built-in serial plotter',
      whyNeeded:
        'Great ultra-simple alternative if you prefer plain scripts over notebooks — includes a point-and-click package manager and clear variable inspector.',
      approxSize: '~35 MB',
    },
    arduino_ide: {
      title: 'Arduino IDE 2.x + Libraries (arduino-cli)',
      subtitle: 'Includes arduino:avr, Servo, AccelStepper, Adafruit ADS1X15, NeoPixel',
      whyNeeded:
        'Needed on Days 1–3 to upload sketches to Arduino Uno, drive servos/steppers, wire biosensors, and view live streams in the Serial Plotter.',
      recommendedTag: 'Required for Workshop',
      approxSize: '~220 MB',
    },
    drivers: {
      title: 'Hardware USB Drivers (CH340 + FTDI)',
      subtitle: 'Serial drivers for Arduino Uno clones (CH340) & OpenBCI dongle (FTDI)',
      whyNeeded:
        'Required so your laptop recognizes the Arduino COM/Serial port (CH340 chip) and the OpenBCI EEG communication dongle (FTDI chip).',
      recommendedTag: 'Required for Workshop',
      approxSize: '~10 MB',
    },
    openbci_gui: {
      title: 'OpenBCI GUI (Pinned Latest Release)',
      subtitle: 'Official EEG visualization & electrode impedance inspection app',
      whyNeeded:
        'Required on Days 4–5 to visualize live scalp EEG channels, check electrode contact impedance, and stream brainwaves into Lab Streaming Layer.',
      recommendedTag: 'Required for Workshop',
      approxSize: '~250 MB',
    },
    lab_recorder: {
      title: 'LSL LabRecorder',
      subtitle: 'Standalone recorder saving time-synchronized multi-sensor .xdf files',
      whyNeeded:
        'Required from Day 2 onward to record aligned ECG, GSR, EEG, and event markers into one unified .xdf file.',
      recommendedTag: 'Required for Workshop',
      approxSize: '~45 MB',
    },
    antigravity: {
      title: 'Antigravity (AI Coding Agent Environment)',
      subtitle: 'AI pair-programming tool for writing code, debugging & reading datasheets',
      whyNeeded:
        'Recommended if you want an AI-assisted coding environment for building circuits and debugging Python/Arduino code during labs.',
      approxSize: '~180 MB',
    },
    github_desktop: {
      title: 'GitHub Desktop (Visual Git Client)',
      subtitle: 'Clone and update course code repositories with zero terminal commands',
      whyNeeded:
        'Optional tool for students who want to manage Git repositories visually or pull live code updates directly from GitHub.',
      approxSize: '~130 MB',
    },
  },
  preAction: {
    titlePrefix: 'Your Action Required:',
    whatHappensLabel: 'What is about to happen:',
    whatToClickLabel: 'What you need to do next:',
    openLinkBtn: 'Open Download Link',
    verifyDoneBtn: 'I Finished — Verify & Continue',
    skipBtn: 'Skip for Now',
    actions: {
      windows_uac_driver: {
        title: 'Hardware Driver Administrator Prompt (Windows UAC)',
        whatHappens:
          'Windows will show a User Account Control (UAC) security popup asking permission to install the USB serial driver.',
        whatToClick:
          '1. Click "Yes" on the Windows security prompt.\n2. In the driver window that opens, click "INSTALL".\n3. Once you see "Driver Install Success", return here and click the button below.',
      },
      windows_installer_wizard: {
        title: 'Standard Installer Wizard (Windows)',
        whatHappens:
          'The official software installer is launching and may prompt for Administrator approval.',
        whatToClick:
          '1. Complete the installer steps (Next → Install → Finish) using default paths.\n2. Return here once finished and click "I Finished — Verify & Continue".',
      },
      macos_dmg_drag: {
        title: 'macOS Application Install (DMG)',
        whatHappens:
          'The macOS disk image (.dmg) has opened in Finder.',
        whatToClick:
          '1. Drag the app icon into the Applications folder.\n2. Open it once to clear macOS first-launch confirmation.\n3. Return here and click "I Finished — Verify & Continue".',
      },
      macos_pkg_wizard: {
        title: 'macOS Package Installer (PKG)',
        whatHappens:
          'The standard macOS Installer is opening and may ask for your Mac login password.',
        whatToClick:
          '1. Follow the installer prompts and enter your Mac password if asked.\n2. When installation finishes, return here and click "I Finished — Verify & Continue".',
      },
      browser_download_page: {
        title: 'Download from Official Vendor Page',
        whatHappens:
          'Your browser opened the official vendor download page because the vendor requires manual platform selection.',
        whatToClick:
          '1. Download and install the version matching your computer (Windows 64-bit / macOS).\n2. Return here once installed and click "I Finished — Verify & Continue".',
      },
      macos_system_extension: {
        title: 'Approve Driver System Extension on macOS',
        whatHappens:
          'Recent macOS versions require manual approval before loading third-party USB serial drivers.',
        whatToClick:
          '1. Open System Settings → Privacy & Security.\n2. Scroll down and click "Allow" next to the driver notice if shown.\n3. Return here and click "I Finished — Verify & Continue".',
      },
    },
  },
  diagnostics: {
    heading: 'Hardware-Free System Verification',
    subheading:
      'Automatically tests Arduino offline compilation, drivers, Python GUI stack, synthetic LSL loopback, BrainFlow, and microphone permissions with no physical hardware attached.',
    runBtn: 'Re-Run Verification',
    running: 'Running diagnostic suite...',
    uploadBtn: 'Re-Send Diagnostic Report',
    uploading: 'Uploading verified report to instructor...',
    uploadSuccess: 'Report automatically saved to the workshop dashboard ✓',
    uploadError: 'Failed to upload report:',
    goDashboard: 'Continue to Daily Dashboard →',
    overallLabels: {
      pass: 'All Clear! Your laptop is ready for the workshop',
      warn: 'Almost Ready — minor warnings worth reviewing',
      fail: 'Action Needed — some checks failed and need troubleshooting',
    },
    statusLabels: {
      pass: 'PASS',
      warn: 'WARN',
      fail: 'FAIL',
      skipped: 'SKIPPED',
    },
    checkNames: {
      system_path: '1. System, Disk Space & ASCII Path Guard',
      arduino_compile: '2. Hardware-Free Arduino Uno Compile (Servo + AccelStepper)',
      drivers: '3. USB Serial Drivers (CH340 + FTDI)',
      python_gui: '4. Python Stack, tkinter & PyQt6 Smoke Test',
      lsl_loopback: '5. Synthetic LSL Loopback & Firewall Check',
      brainflow_synthetic: '6. Synthetic BrainFlow Stream Test',
      mic_audio: '7. Microphone & Audio Permission Check (sounddevice)',
      optional_apps: '8. Selected Optional Apps Presence',
    },
    remediations: {
      non_ascii_path:
        'Ensure the workshop root is C:\\BCI_Workshop_2026 rather than inside a non-ASCII Windows user directory.',
      arduino_compile_fail:
        'Make sure Arduino IDE / arduino-cli setup ran and that Servo and AccelStepper libraries were installed.',
      drivers_missing:
        'If your Arduino Uno is not detected on Day 1, return to Onboarding and install the CH340 driver.',
      python_missing:
        'Install the Workshop Python environment from the Onboarding screen (or ensure existing Python has tkinter).',
      lsl_fail:
        'If Windows Defender Firewall prompted, allow Private/Public network access and retry the check.',
      brainflow_fail:
        'Verify Python version is 3.10–3.12 (not 3.13+) and that brainflow installation completed.',
      mic_fail:
        'Grant Microphone permission in OS Privacy Settings and ensure an input device is active.',
      apps_missing:
        'Missing optional apps will not block setup — you can install them anytime from Onboarding or use browser backups.',
    },
  },
  dashboard: {
    heading: 'Daily Dashboard — BCI Workshop 2026',
    subheading: 'One-click access to installed tools, course materials, and hardware helpers.',
    materialsSection: 'Course Materials & Documentation',
    openGitbook: 'Open Course Website',
    openGitbookDesc: 'Guides, wiring diagrams, daily ZIP downloads & slide links',
    openGithub: 'Open Code Repo (GitHub)',
    createShortcut: 'Create Course Website Shortcut on Desktop',
    shortcutCreated: 'Desktop shortcut created ✓',
    appsSection: 'Launch Installed Tools',
    launchBtn: 'Launch',
    installMissingBtn: 'Install in Onboarding',
    toolsSection: 'Classroom Helpers',
    findArduinoBtn: 'Find My Arduino (COM Port Check)',
    rerunDiagBtn: 'Re-Run System Verification',
    reopenOnboardingBtn: 'Open Software Onboarding',
    stuckBtn: "I'm Stuck — Send Report to Instructor",
    advancedTitle: 'Advanced Settings (Optional)',
    advancedDesc:
      'By default, downloading daily packages directly from the course website is recommended. For advanced users: 1-click local sync of the Student_Facing repository.',
    syncMaterialsBtn: 'Sync All Course Files Locally',
    syncing: 'Syncing repository...',
    appLabels: {
      jupyterlab: { name: 'JupyterLab', desc: 'Interactive Python notebooks' },
      thonny: { name: 'Thonny IDE', desc: 'Beginner Python script editor' },
      arduino_ide: { name: 'Arduino IDE', desc: 'Microcontroller code & Serial Plotter' },
      openbci_gui: { name: 'OpenBCI GUI', desc: 'EEG monitor & impedance check' },
      lab_recorder: { name: 'LabRecorder', desc: 'LSL .xdf stream recorder' },
      antigravity: { name: 'Antigravity', desc: 'AI coding agent environment' },
      github_desktop: { name: 'GitHub Desktop', desc: 'Visual Git client' },
    },
  },
  findArduino: {
    title: 'Find My Arduino Port',
    subtitle: 'Plug your Arduino Uno in via USB and click "Scan Ports".',
    scanBtn: 'Scan USB / COM Ports',
    scanning: 'Scanning...',
    empty: 'No Arduino serial ports detected right now. Check the USB cable and port.',
    ch340Badge: 'CH340 Chip Detected (Workshop Arduino Uno)',
    ftdiBadge: 'FTDI Chip Detected (OpenBCI Dongle / Serial)',
    busyWarning:
      'Port is currently locked (likely by Arduino IDE Serial Monitor — close Serial Monitor before running Python!).',
    freeBadge: 'Available ✓',
    closeBtn: 'Close',
  },
  helpModal: {
    title: "I'm Stuck — Send Report to Instructor",
    subtitle:
      'Briefly describe what went wrong or what step you are on. A fresh technical diagnostic log will be attached automatically.',
    placeholder: 'e.g. CH340 driver is not showing up on my Mac / Arduino compile failed...',
    sendBtn: 'Send Report + Diagnostics',
    sending: 'Collecting diagnostics & uploading...',
    sentSuccess: 'Report received! Feel free to raise your hand or share your email in class.',
    cancelBtn: 'Cancel',
  },
  update: {
    pillLabel: 'Update:',
    title: 'A Newer Version of BCI Workshop Hub Is Available',
    versionLabel: 'Installed → Latest:',
    body: 'A newer release with setup fixes and improvements has been published. Click below to download and launch the new installer.',
    installBtn: 'Download & Install Update',
    downloadingBtn: 'Downloading and opening installer...',
    openedNote:
      'Installer downloaded and opened. On Windows: close this window if prompted and finish Next → Install. On Mac: drag to Applications and choose Replace.',
    openBrowserBtn: 'Download in Browser',
    laterBtn: 'Remind Me Later',
    closeBtn: 'Close',
    errorPrefix: 'Automatic download failed:',
  },
  uninstall: {
    triggerBtn: 'Uninstall Hub & Workshop Tools',
    dashboardBtn: 'Uninstall Hub & Clean Up Workshop Files',
    title: 'Uninstall BCI Workshop Hub & Tools',
    subtitle:
      'Choose what else to remove from your computer. Anything installed before the Hub was first opened is protected and excluded.',
    loading: 'Inspecting Hub-installed components...',
    protectedPrefix: 'Protected (already installed before Hub):',
    workshopDataHeading: 'Workshop Folders & Portable Tools',
    hubAppsHeading: 'Standalone Apps Installed via the Hub Only',
    externalUninstallerHint: 'Launches the official Windows uninstaller',
    emptyItems: 'No workshop data or Hub-installed tools remain on disk.',
    uninstallSelfLabel: 'Also uninstall BCI Workshop Hub itself',
    uninstallSelfDescWindows:
      'Closes the Hub and launches the Windows uninstaller automatically.',
    uninstallSelfDescMac:
      'Closes the Hub and moves BCI Workshop Hub.app to the Trash.',
    confirmBtn: 'Uninstall Selected',
    runningBtn: 'Removing selected items...',
    cancelBtn: 'Cancel',
    closeBtn: 'Close',
    doneRemoved: 'Removed:',
    doneLaunched: 'Opened Windows uninstaller for:',
    doneErrors: 'Errors:',
  },
};
