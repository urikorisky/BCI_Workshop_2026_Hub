import type { ComponentId } from '../types';

export interface ComponentCopy {
  title: string;
  subtitle: string;
  whyNeeded: string;
  recommendedTag?: string;
  approxSize: string;
}

export const he = {
  appName: 'מרכז הסדנה — BCI Workshop 2026',
  appSubtitle: 'המרכז הרב-תחומי לחקר המוח, אוניברסיטת בר-אילן',
  previewBadge: 'תצוגה מקדימה בדפדפן (מצב הדגמה)',
  nav: {
    onboarding: 'התקנה ואשף פתיחה',
    diagnostics: 'בדיקת מערכת ופתרון תקלות',
    dashboard: 'לוח בקרה יומי',
  },
  langToggle: 'English',
  signIn: {
    welcomeTitle: 'ברוכים הבאים לסדנת ממשקי מוח-מכונה (BCI) 2026',
    welcomeBody:
      'אפליקציה זו תלווה אתכם לפני הסדנה ובמהלך חמשת ימי העבודה. כאן תוכלו להתקין בצורה מודרכת את התוכנות הדרושות, לבדוק שהכל תקין עוד לפני שתחברו חומרה, ולפתוח את כלי העבודה והחומרים בלחיצה אחת.',
    privacyTitle: 'שקיפות, זיהוי ופרטיות',
    privacyIntro:
      'כדי שצוות הסדנה יוכל לוודא שכל הסטודנטים מוכנים ליום הראשון ולסייע מהר במקרה של תקלה, הכניסה מתבצעת עם חשבון Google.',
    sentListTitle: 'מה נשלח למרצה:',
    sentItems: [
      'שם מלא וכתובת אימייל מאומתת מחשבון ה-Google שלך',
      'סוג מערכת ההפעלה והמעבד (Windows / macOS)',
      'סטטוס בדיקות תקינות (עבר / נכשל) ויומן שגיאות טכני של ההתקנה בלבד',
      'הודעת עזרה שתכתבו מיוזמתכם במקרה של תקלה',
    ],
    neverSentTitle: 'מה לעולם לא נאסף או נשלח:',
    neverSentItems: [
      'קבצים אישיים, מסמכים, סיסמאות או היסטוריית דפדפן',
      'כל מידע מחוץ לתיקיית הסדנה BCI_Workshop_2026',
    ],
    consentCheckbox:
      'קראתי ואני מאשר/ת את ההתחברות ושליחת דוח אבחון טכני לצורך ליווי בסדנה.',
    signInButton: 'התחברות עם Google',
    signingIn: 'ממתין לאישור בדפדפן...',
    signOut: 'התנתקות',
  },
  guardrails: {
    title: 'בדיקות מקדימות למחשב',
    osLabel: 'מערכת הפעלה',
    diskLabel: 'מקום פנוי בדיסק',
    diskOk: 'תקין (מעל 5 GB פנויים)',
    diskLow: 'אזהרה: פחות מ-5 GB פנויים — מומלץ לפנות מקום לפני ההתקנה',
    pathLabel: 'תיקיית התקנה',
    asciiWarning:
      'זוהה שם משתמש עם תווים שאינם באנגלית (עברית/סימנים). כדי למנוע קריסות ב-Python וב-Arduino, הסדנה תותקן בנתיב נקי באנגלית:',
    internetLabel: 'חיבור לאינטרנט',
    internetOk: 'מחובר',
    internetFail: 'לא זוהה חיבור — נדרש אינטרנט להורדת כלים',
  },
  onboarding: {
    heading: 'בחירת רכיבים והתקנה מודרכת',
    subheading:
      'המערכת סרקה את המחשב מראש. רכיבי הליבה מסומנים כחובה לסדנה וייבחרו אוטומטית אם הם חסרים; תוכנות וסביבות משלימות הן אופציונליות לגמרי — קראו למה כל כלי משמש.',
    rescanBtn: 'סרוק מחדש',
    scanning: 'סורק תוכנות ודרייברים מותקנים...',
    alreadyInstalled: 'מותקן כבר ✓',
    notFound: 'לא נמצא במחשב',
    optionalBadge: 'אופציונלי',
    requiredBadge: 'חובה לסדנה',
    selectAllRequired: 'סמן את כל רכיבי החובה שחסרים',
    clearSelection: 'נקה בחירה',
    installSelected: 'התחל התקנה של הרכיבים שנבחרו',
    installing: 'מתקין...',
    skipToDiagnostics: 'דלג לבדיקת תקינות המערכת',
    continueToDiagnostics: 'המשך לבדיקת המערכת ←',
    manualNeeded: 'נדרשת פעולה ידנית',
    detectedAt: 'זוהה ב:',
    liveLogTitle: 'יומן התקנה בזמן אמת',
    pythonVenvReady: 'סביבת הסדנה המבודדת (.venv) מוכנה במחשב ({ver}).',
    pythonReuseCompatible:
      'זוהה Python {ver} תואם במחשב — המתקין ישתמש בו ליצירת סביבה מבודדת בתיקיית הסדנה.',
    pythonIncompatibleFound:
      'זוהה Python {ver} במחשב (אינו תואם ל-pylsl/brainflow שדורשים 3.10–3.12). תותקן סביבת Python 3.11 מבודדת בתיקיית הסדנה מבלי לפגוע בהתקנה הקיימת שלך.',
    pythonNotFound: 'לא זוהה Python תואם — תותקן סביבת Python 3.11 מבודדת בתיקיית הסדנה.',
    arduinoIdeOnlyBanner:
      'זוהה Arduino IDE מותקן במחשב ✓ — השאירו מסומן רק כדי להתקין אוטומטית את ספריות הסדנה (arduino:avr, Servo, AccelStepper) מבלי להתקין מחדש את Arduino IDE.',
    preScanUploading: 'שולח דוח מצב ראשוני למרצה...',
    preScanUploadOk: 'דוח מצב ראשוני נשלח למרצה ✓',
    installFailedTitle: 'התקנת חלק מהרכיבים נכשלה:',
    installErrorAutoSent: 'דוח שגיאה אוטומטי עם יומן ההתקנה נשלח למרצה ✓',
    installErrorSendFailed: 'לא הצלחנו לשלוח אוטומטית את דוח השגיאה — תוכלו ללחוץ על "נתקעתי" בדף הבא.',
    installAllSuccess: 'כל הרכיבים שנבחרו הותקנו בהצלחה ✓',
  },
  components: {
    python_env: {
      title: 'סביבת Python ייעודית לסדנה (3.10–3.12)',
      subtitle: 'כולל pyserial, numpy, scipy, PyQt6, sounddevice, pylsl, mne, brainflow',
      whyNeeded:
        'הלב החישובי של הסדנה (ימים 1–5): קריאת נתונים מ-Arduino, עיבוד אותות אלקטרופיזיולוגיים (ECG/EDA/EEG), סינכרון בזמן אמת (LSL) וניסויים אינטראקטיביים. אם יש Python תואם (3.10–3.12) הוא ינוצל, ואחרת תותקן סביבה מבודדת ללא צורך בהרשאות מנהל.',
      recommendedTag: 'חובה לסדנה',
      approxSize: '~450 MB',
    },
    jupyterlab: {
      title: 'JupyterLab (סביבת עבודה אינטראקטיבית ב-Python)',
      subtitle: 'מחברות קוד אינטראקטיביות (.ipynb) לצפייה בגרפים ושלבי ניתוח אותות',
      whyNeeded:
        'מאפשר להריץ קוד תא-אחר-תא ולראות גרפים של גלי מוח, דופק ומוליכות עור מיד מתחת לקוד, ללא צורך בעבודה מתוך שורת פקודה.',
      recommendedTag: 'אופציונלי — נוח במיוחד',
      approxSize: '~120 MB',
    },
    thonny: {
      title: 'Thonny IDE (עורך Python פשוט למתחילים)',
      subtitle: 'תוכנה קלילה לכתיבת סקריפטים רגילים (.py) עם גרף טורי מובנה',
      whyNeeded:
        'אלטרנטיבה פשוטה במיוחד אם אינכם רגילים לעבוד במחברות או ב-VS Code — כוללת התקנת חבילות בכפתור ומנהל משתנים ברור.',
      approxSize: '~35 MB',
    },
    arduino_ide: {
      title: 'Arduino IDE 2.x + ספריות וכלי בנייה (arduino-cli)',
      subtitle: 'כולל arduino:avr, Servo, AccelStepper, Adafruit ADS1X15, NeoPixel',
      whyNeeded:
        'נדרש בימים 1–3 לתכנות לוחות ה-Arduino Uno, הפעלת מנועים (סרוו וצעד) וחיישנים ביולוגיים, וכן לצפייה בזמן אמת ב-Serial Plotter.',
      recommendedTag: 'חובה לסדנה',
      approxSize: '~220 MB',
    },
    drivers: {
      title: 'דרייברים לחומרה (CH340 + FTDI)',
      subtitle: 'מנהלי התקן לחיבור USB של לוחות ה-Arduino ודונגל ה-OpenBCI',
      whyNeeded:
        'בלי דרייברים אלו המחשב לא יזהה את יציאת ה-COM/Serial של לוחות ה-Arduino (שבב CH340) או את כרטיס התקשורת של מערכת ה-EEG של OpenBCI (שבב FTDI).',
      recommendedTag: 'חובה לסדנה',
      approxSize: '~10 MB',
    },
    openbci_gui: {
      title: 'OpenBCI GUI (גרסה עדכנית מוצמדת)',
      subtitle: 'ממשק ויזואליזציה ובדיקת אלקטרודות למערכת ה-EEG',
      whyNeeded:
        'תוכנת החובה של OpenBCI לימים 4–5: צפייה בגלי מוח בזמן אמת, בדיקת עכבת אלקטרודות (Impedance), והזרמת נתונים ל-LSL.',
      recommendedTag: 'חובה לסדנה',
      approxSize: '~250 MB',
    },
    lab_recorder: {
      title: 'LSL LabRecorder (מקליט זרמים מסונכרנים)',
      subtitle: 'הקלטת קבצי .xdf מרובי חיישנים בסינכרון זמנים מדויק',
      whyNeeded:
        'רכיב חובה החל מיום 2 להקלטת זרמי ECG, GSR, EEG וסמני אירועים יחד לקובץ .xdf אחיד בסינכרון זמנים מדויק.',
      recommendedTag: 'חובה לסדנה',
      approxSize: '~45 MB',
    },
    antigravity: {
      title: 'Antigravity (סביבת פיתוח מבוססת סוכן AI)',
      subtitle: 'עוזר קוד חכם לכתיבה, ניפוי שגיאות והבנת דפי נתונים',
      whyNeeded:
        'מומלץ לסטודנטים שרוצים להיעזר בסוכן AI (Vibe Coding) לכתיבת קוד ופתרון תקלות בזמן אמת אם אין ברשותם כלי AI מועדף אחר.',
      approxSize: '~180 MB',
    },
    github_desktop: {
      title: 'GitHub Desktop (ניהול גרסאות ויזואלי)',
      subtitle: 'שכפול ועדכון קבצי הקורס מ-GitHub ללא פקודות טרמינל',
      whyNeeded:
        'מתאים למי שרוצה להכיר את עולם ה-Git בצורה ויזואלית, או למשוך עדכונים שוטפים ישירות מהמאגר של הקורס.',
      approxSize: '~130 MB',
    },
  } as Record<ComponentId, ComponentCopy>,
  preAction: {
    titlePrefix: 'צעד נדרש מצידך:',
    whatHappensLabel: 'מה עומד לקרות עכשיו:',
    whatToClickLabel: 'מה עליך לעשות כדי להמשיך:',
    openLinkBtn: 'פתח קישור להורדה',
    verifyDoneBtn: 'סיימתי — בדוק והמשך',
    skipBtn: 'דלג בינתיים',
    actions: {
      windows_uac_driver: {
        title: 'התקנת דרייבר חומרה עם הרשאות מנהל (Windows UAC)',
        whatHappens:
          'מערכת Windows תקפיץ חלון אבטחה שמבקש אישור מנהל (UAC) כדי לרשום את דרייבר ה-USB במערכת.',
        whatToClick:
          '1. לחצו "כן" (Yes) בחלון האבטחה של Windows.\n2. בחלון התקנת הדרייבר שייפתח, לחצו "INSTALL".\n3. עם סיום ההודעה "Driver Install Success", חזרו לכאן ולחצו על כפתור האישור למטה.',
      },
      windows_installer_wizard: {
        title: 'אשף התקנה סטנדרטי (Windows)',
        whatHappens:
          'נפתח קובץ ההתקנה הרשמי של התוכנה. ייתכן שחלון Windows יבקש אישור מנהל.',
        whatToClick:
          '1. אשרו את חלון ההתקנה (Next → Install → Finish).\n2. העדיפו התקנה בנתיב ברירת המחדל.\n3. כשהאשף מסתיים, חזרו לכאן ולחצו "סיימתי — בדוק והמשך".',
      },
      macos_dmg_drag: {
        title: 'התקנת אפליקציה ב-macOS (קובץ DMG)',
        whatHappens:
          'קובץ התמונה (.dmg) של התוכנה נפתח בחלון Finder.',
        whatToClick:
          '1. גררו את אייקון האפליקציה אל תיקיית Applications.\n2. פתחו אותה פעם אחת כדי לאשר הפעלה ראשונה.\n3. חזרו לכאן ולחצו "סיימתי — בדוק והמשך".',
      },
      macos_pkg_wizard: {
        title: 'אשף התקנה ב-macOS (קובץ PKG)',
        whatHappens:
          'מתקין המערכת של macOS נפתח ועשוי לבקש את סיסמת המשתמש של המק.',
        whatToClick:
          '1. עקבו אחר שלבי האשף והזינו סיסמת Mac בעת הצורך.\n2. בסיום ההתקנה, חזרו לכאן ולחצו "סיימתי — בדוק והמשך".',
      },
      browser_download_page: {
        title: 'הורדה מדף הספק הרשמי בדפדפן',
        whatHappens:
          'דף ההורדה הרשמי נפתח בדפדפן שלכם מכיוון שהספק דורש בחירת גרסה או לחיצה ישירה באתר.',
        whatToClick:
          '1. הורידו והתקינו את הגרסה המתאימה למחשבכם (Windows 64-bit / macOS).\n2. בסיום ההתקנה, חזרו לכאן ולחצו "סיימתי — בדוק והמשך".',
      },
      macos_system_extension: {
        title: 'אישור הרחבת מערכת לדרייבר ב-macOS',
        whatHappens:
          'גרסאות macOS חדשות דורשות אישור ידני להפעלת מנהלי התקנים (System Extensions).',
        whatToClick:
          '1. פתחו System Settings → Privacy & Security.\n2. גללו מטה ולחצו "Allow" ליד הודעת הדרייבר אם מופיעה.\n3. חזרו לכאן ולחצו "סיימתי — בדוק והמשך".',
      },
    },
  },
  diagnostics: {
    heading: 'אימות סביבה ללא חיבור חומרה',
    subheading:
      'בדיקה אוטומטית של כל הרכיבים, הידור קוד Arduino ללא כרטיס מחובר, זרם LSL מדומה, BrainFlow והרשאות מיקרופון.',
    runBtn: 'הרץ בדיקות מערכת שוב',
    running: 'מריץ בדיקות אבחון...',
    uploadBtn: 'שלח דוח אבחון שוב',
    uploading: 'שולח דוח מאומת למרצה...',
    uploadSuccess: 'הדוח נשלח ונשמר אוטומטית במערכת הקורס ✓',
    uploadError: 'שגיאה בשליחת הדוח:',
    goDashboard: 'המשך ללוח הבקרה היומי ←',
    overallLabels: {
      pass: 'הכל תקין! המחשב מוכן לסדנה',
      warn: 'כמעט מוכן — יש אזהרות קלות שכדאי לבדוק',
      fail: 'נמצאו תקלות שדורשות טיפול לפני הסדנה',
    },
    statusLabels: {
      pass: 'תקין',
      warn: 'אזהרה',
      fail: 'נכשל',
      skipped: 'דולג',
    },
    checkNames: {
      system_path: '1. מערכת, דיסק פנוי ונתיב באנגלית (ASCII)',
      arduino_compile: '2. הידור Arduino Uno ללא חומרה (Servo + AccelStepper)',
      drivers: '3. בדיקת דרייברים (CH340 + FTDI)',
      python_gui: '4. בדיקת Python, חבילות מדעיות, tkinter ו-PyQt6',
      lsl_loopback: '5. זרם LSL מדומה (Loopback + חומת אש)',
      brainflow_synthetic: '6. סימולציית OpenBCI / BrainFlow סינתטית',
      mic_audio: '7. בדיקת מיקרופון והרשאת שמע (sounddevice)',
      optional_apps: '8. נוכחות תוכנות נבחרות במחשב',
    },
    remediations: {
      non_ascii_path:
        'ודאו שתיקיית הסדנה נמצאת תחת C:\\BCI_Workshop_2026 ולא בתוך תיקיית משתמש בעברית.',
      arduino_compile_fail:
        'ודאו שהרצתם התקנה של Arduino IDE / arduino-cli ושהספריות Servo ו-AccelStepper הורדו בהצלחה.',
      drivers_missing:
        'אם תחברו Arduino Uno והמחשב לא יזהה יציאת COM, התקינו את דרייבר CH340 מתוך מסך ההתקנה.',
      python_missing:
        'התקינו את סביבת ה-Python של הסדנה ממסך ההתקנה (או בדקו שלפייתון הקיים יש tkinter תקין).',
      lsl_fail:
        'אם קפצה בקשת Windows Defender Firewall, אשרו גישה לרשת פרטית/ציבורית ונסו להריץ שוב.',
      brainflow_fail:
        'ודאו שגרסת Python היא 3.10–3.12 (ולא 3.13+) ושהתקנת חבילת brainflow הושלמה.',
      mic_fail:
        'אשרו גישת מיקרופון בהגדרות הפרטיות של מערכת ההפעלה וודאו שמחובר מיקרופון פעיל.',
      apps_missing:
        'התוכנות שחסרות הן אופציונליות — תוכלו לחזור למסך ההתקנה בכל שלב או לעבוד בגיבוי הדפדפן.',
    },
  },
  dashboard: {
    heading: 'לוח בקרה יומי — BCI Workshop 2026',
    subheading: 'גישה מהירה לכל כלי הסדנה, חומרי הלימוד ובדיקות החומרה.',
    materialsSection: 'חומרי הסדנה והתיעוד',
    openGitbook: 'פתח את אתר הקורס',
    openGitbookDesc: 'מדריכים, דיאגרמות חיבורים, קישורים להורדה יומית ומצגות',
    openGithub: 'פתח מאגר קוד (GitHub)',
    createShortcut: 'צור קיצור דרך לאתר הקורס על שולחן העבודה',
    shortcutCreated: 'קיצור הדרך נוצר על שולחן העבודה ✓',
    appsSection: 'הפעלת סביבות ותוכנות',
    launchBtn: 'הפעל',
    installMissingBtn: 'התקן ממסך הפתיחה',
    toolsSection: 'כלי עזר לכיתה',
    findArduinoBtn: 'מצא את ה-Arduino שלי (בדיקת COM)',
    rerunDiagBtn: 'הרץ שוב בדיקת מערכת',
    reopenOnboardingBtn: 'פתח אשף התקנת תוכנות',
    stuckBtn: 'נתקעתי — שלח דוח תקלה למרצה',
    advancedTitle: 'הגדרות מתקדמות (אופציונלי)',
    advancedDesc:
      'בברירת מחדל מומלץ להוריד קבצים יומיים ישירות מאתר הקורס. לתלמידים מנוסים יותר: סנכרון מלא של מאגר Student_Facing לתיקייה מקומית.',
    syncMaterialsBtn: 'סנכרן את כל קבצי הקורס לתיקייה מקומית',
    syncing: 'מסנכרן קבצים...',
    appLabels: {
      jupyterlab: { name: 'JupyterLab', desc: 'מחברות Python וגרפים' },
      thonny: { name: 'Thonny IDE', desc: 'עורך Python למתחילים' },
      arduino_ide: { name: 'Arduino IDE', desc: 'קוד לבקר ו-Serial Plotter' },
      openbci_gui: { name: 'OpenBCI GUI', desc: 'צפייה בגלי מוח ובדיקת אלקטרודות' },
      lab_recorder: { name: 'LabRecorder', desc: 'הקלטת קבצי LSL (.xdf)' },
      antigravity: { name: 'Antigravity', desc: 'סביבת עבודה עם סוכן AI' },
      github_desktop: { name: 'GitHub Desktop', desc: 'ניהול קוד מ-GitHub' },
    },
  },
  findArduino: {
    title: 'זיהוי יציאת ה-Arduino שלך',
    subtitle: 'חברו את ה-Arduino Uno בכבל USB ולחצו על "סרוק יציאות".',
    scanBtn: 'סרוק יציאות USB / COM',
    scanning: 'סורק...',
    empty: 'לא זוהה אף בקר Arduino מחובר כרגע. בדקו את הכבל ואת חיבור ה-USB.',
    ch340Badge: 'זוהה שבב CH340 (Arduino Uno של הסדנה)',
    ftdiBadge: 'זוהה שבב FTDI (דונגל OpenBCI / ממיר טורי)',
    busyWarning:
      'היציאה תפוסה כרגע (סביר שה-Serial Monitor של Arduino IDE פתוח — סגרו אותו לפני הרצת קוד Python!).',
    freeBadge: 'פנויה לשימוש ✓',
    closeBtn: 'סגור',
  },
  helpModal: {
    title: 'נתקעתי — שליחת דוח תקלה למרצה',
    subtitle:
      'תארו בקצרה מה ניסיתם לעשות או איזו שגיאה הופיעה. המערכת תצרף אוטומטית אבחון טכני עדכני ותשלח למרצה.',
    placeholder: 'לדוגמה: הדרייבר של CH340 לא מזוהה אצלי ב-Mac / השגיאה הופיעה כשהרצתי Arduino...',
    sendBtn: 'שלח דוח עם יומן אבחון',
    sending: 'אוסף אבחון ושולח...',
    sentSuccess: 'הדוח התקבל אצל המרצה! תוכלו לציין את שמכם בכיתה.',
    cancelBtn: 'ביטול',
  },
  update: {
    pillLabel: 'עדכון זמין:',
    title: 'קיימת גרסה חדשה ל-BCI Workshop Hub',
    versionLabel: 'גרסה נוכחית ← חדשה:',
    body: 'שוחררה גרסה עדכנית הכוללת תיקונים ושיפורים להכנת המחשב לסדנה. לחצו להורדה והתקנה של הגרסה החדשה.',
    installBtn: 'הורד והתקן גרסה חדשה',
    downloadingBtn: 'מוריד ופותח את המתקין...',
    openedNote:
      'קובץ ההתקנה הורד ונפתח. ב-Windows: סגרו חלון זה אם המתקין מבקש והשלימו Next → Install. ב-Mac: גררו אל Applications ואשרו החלפה (Replace).',
    openBrowserBtn: 'פתח הורדה בדפדפן',
    laterBtn: 'הזכר לי מאוחר יותר',
    closeBtn: 'סגור',
    errorPrefix: 'לא הצלחנו להוריד אוטומטית:',
  },
};

export type Translations = typeof he;
