import { Injectable, signal, computed } from '@angular/core';

export type SupportedLang = 'en' | 'hi';

const TRANSLATIONS: Record<SupportedLang, Record<string, string>> = {
  en: {
    nav_explore: 'Explore Opportunities',
    nav_jobs: 'Job Marketplace',
    nav_companies: 'Top Companies',
    nav_dashboard: 'Career Dashboard',
    nav_applications: 'My Applications',
    nav_saved_jobs: 'Saved Jobs',
    nav_resume_builder: 'Resume Builder',
    nav_resume_analyzer: 'ATS Analyzer',
    nav_skill_gap: 'Skill Gap Roadmap',
    nav_interview_prep: 'Interview Prep',
    nav_assessments: 'Skill Assessments',
    nav_roadmaps: 'Learning Roadmaps',
    nav_projects: 'Project Blueprints',
    nav_notifications: 'Notifications',
    nav_settings: 'Account Settings',
    nav_login: 'Sign In',
    nav_register: 'Get Started',
    nav_logout: 'Sign Out',
    btn_search: 'Search Opportunities',
    btn_apply: 'Direct Apply',
    btn_view_details: 'View Details',
    btn_save: 'Save Changes',
    btn_cancel: 'Cancel',
    btn_share: 'Share Profile',
    btn_download_pdf: 'Download PDF',
    btn_generate_ai: 'Generate with AI',
    btn_tailor_resume: 'Tailor to Target Job',
    lbl_verified: 'Verified Partner',
    lbl_active: 'Active Posting',
    lbl_closed: 'Closed / Expired',
    lbl_streak: 'Day Learning Streak',
    lbl_readiness: 'Career Readiness',
    lbl_quick_actions: 'Quick Navigation',
    lbl_command_palette: 'Universal Search & Commands',
  },
  hi: {
    nav_explore: 'अवसर खोजें',
    nav_jobs: 'नौकरी बाज़ार',
    nav_companies: 'शीर्ष कंपनियां',
    nav_dashboard: 'करियर डैशबोर्ड',
    nav_applications: 'मेरे आवेदन',
    nav_saved_jobs: 'सहेजी गई नौकरियां',
    nav_resume_builder: 'रिज्यूमे बिल्डर',
    nav_resume_analyzer: 'एटीएस विश्लेषक',
    nav_skill_gap: 'कौशल रोडमैप',
    nav_interview_prep: 'साक्षात्कार तैयारी',
    nav_assessments: 'कौशल मूल्यांकन',
    nav_roadmaps: 'सीखने का रोडमैप',
    nav_projects: 'प्रोजेक्ट गाइड',
    nav_notifications: 'सूचनाएं',
    nav_settings: 'खाता सेटिंग्स',
    nav_login: 'लॉग इन करें',
    nav_register: 'शुरू करें',
    nav_logout: 'लॉग आउट',
    btn_search: 'अवसर खोजें',
    btn_apply: 'सीधा आवेदन',
    btn_view_details: 'विवरण देखें',
    btn_save: 'सुरक्षित करें',
    btn_cancel: 'रद्द करें',
    btn_share: 'प्रोफ़ाइल साझा करें',
    btn_download_pdf: 'पीडीएफ डाउनलोड करें',
    btn_generate_ai: 'एआई से बनाएं',
    btn_tailor_resume: 'नौकरी के अनुसार ढालें',
    lbl_verified: 'सत्यापित भागीदार',
    lbl_active: 'सक्रिय पद',
    lbl_closed: 'समाप्त / बंद',
    lbl_streak: 'दिन का अभ्यास स्ट्रीक',
    lbl_readiness: 'करियर तत्परता',
    lbl_quick_actions: 'त्वरित नेविगेशन',
    lbl_command_palette: 'सार्वभौमिक खोज और कमांड',
  },
};

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly STORAGE_KEY = 'skillbridge_lang';
  
  // Reactive Signal for current language
  readonly currentLang = signal<SupportedLang>(this.loadInitialLang());

  // Helper compute for translated dictionary
  readonly t = computed(() => TRANSLATIONS[this.currentLang()]);

  constructor() {}

  private loadInitialLang(): SupportedLang {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) as SupportedLang | null;
      if (stored === 'hi' || stored === 'en') return stored;
    } catch {}
    return 'en';
  }

  setLanguage(lang: SupportedLang): void {
    this.currentLang.set(lang);
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch {}
  }

  toggleLanguage(): void {
    const next: SupportedLang = this.currentLang() === 'en' ? 'hi' : 'en';
    this.setLanguage(next);
  }

  translate(key: string, fallback?: string): string {
    const dict = this.t();
    return dict[key] || fallback || key;
  }
}

