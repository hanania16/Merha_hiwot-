'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import {
  Scroll,
  Printer,
  Award,
  Sparkles,
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  FileCheck2,
  Sliders,
  Palette,
  Layers,
} from 'lucide-react';

interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic: string | null;
  class: { id: string; name: string; level: string };
}

interface CertificateRecord {
  id: string;
  certificateNumber: string;
  studentId: string;
  templateType: 'STANDARD_COMPLETION' | 'HONOR_EXCELLENCE' | 'DISTINGUISHED_SERVICE' | 'PARTICIPATION';
  titleAmharic: string;
  titleEnglish: string;
  recipientNameAmharic: string;
  recipientNameEnglish: string;
  courseOrClass: string;
  academicYear: number;
  issueDateEthiopian: string;
  customMessageAmharic: string | null;
  bibleVerseAmharic: string | null;
  overallGrade: string | null;
  rankText: string | null;
  signatory1Title: string;
  signatory1Name: string;
  signatory2Title: string;
  signatory2Name: string;
  signatory3Title: string;
  signatory3Name: string;
  borderStyle: string;
  themeColor: string;
  createdAt: string;
  student: {
    studentCode: string;
    fullName: string;
    fullNameAmharic: string | null;
  };
}

const BIBLE_VERSES = [
  '«በሃይማኖት ጸንታችሁ ቁሙ፣ ጎልምሱ፣ በረቱም፤ ሁሉ በእናንተ በፍቅር ይሁን።» (1ኛ ቆሮ. 16:13)',
  '«ሕፃኑን በሚሄድበት መንገድ ምራው፤ በሸመገለም ጊዜ ከእርሱ ፈቀቅ አይልም።» (ምሳሌ 22:6)',
  '«በቃልና በኑሮ በፍቅርም በእምነትም በንጽሕናም ለምእመናን አርዓያ ሁን እንጂ፥ ማንም ታናሽነትህን አይናቀው።» (1ኛ ጢሞ. 4:12)',
  '«የእግዚአብሔር ቃል በሙላት ይኑርባችሁ፤ በመንፈሳዊ ቅኔና ዝማሬ እግዚአብሔርን በልባችሁ አመስግኑ።» (ቆላ. 3:16)',
];

export default function CertificatesPage() {
  const { t, lang } = useLang();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [notification, setNotification] = useState<string | null>(null);

  // Certificate Builder State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [templateType, setTemplateType] = useState<'STANDARD_COMPLETION' | 'HONOR_EXCELLENCE' | 'DISTINGUISHED_SERVICE' | 'PARTICIPATION'>('HONOR_EXCELLENCE');
  const [titleAmharic, setTitleAmharic] = useState('የክብርና የላቀ ውጤት ምስክር ወረቀት');
  const [titleEnglish, setTitleEnglish] = useState('Certificate of Academic Excellence & High Honor');
  const [recipientNameAmharic, setRecipientNameAmharic] = useState('');
  const [recipientNameEnglish, setRecipientNameEnglish] = useState('');
  const [courseOrClass, setCourseOrClass] = useState('ክፍል 7-12 (ሰንበት ትምህርት)');
  const [academicYear, setAcademicYear] = useState(2018);
  const [issueDateEthiopian, setIssueDateEthiopian] = useState('ሰኔ 30 ቀን 2018 ዓ.ም');
  const [overallGrade, setOverallGrade] = useState('A+ (95.0%)');
  const [rankText, setRankText] = useState('1ኛ ደረጃ (የክፍሉ ከፍተኛ ውጤት)');
  const [customMessageAmharic, setCustomMessageAmharic] = useState(
    'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት በ2018 ዓ.ም የትምህርት ዘመን በነገረ ሃይማኖትና መንፈሳዊ ትምህርቶች ከፍተኛ ትጋትና የላቀ ክርስቲያናዊ ሥነ ምግባር በማሳየት 1ኛ ደረጃ ይዞ ላጠናቀቀው ተማሪ የተሰጠ የክብር ምስክር ወረቀት።',
  );
  const [bibleVerseAmharic, setBibleVerseAmharic] = useState(BIBLE_VERSES[0]);

  // Signatories
  const [signatory1Title, setSignatory1Title] = useState('የክፍሉ መምህር');
  const [signatory1Name, setSignatory1Name] = useState('መምህር ተክለ ማርያም');
  const [signatory2Title, setSignatory2Title] = useState('የትምህርት ክፍል ኃላፊ');
  const [signatory2Name, setSignatory2Name] = useState('ዲ/ን ዮሐንስ ወ/ሥላሴ');
  const [signatory3Title, setSignatory3Title] = useState('የሰንበት ት/ቤቱ ሰብሳቢ');
  const [signatory3Name, setSignatory3Name] = useState('መጋቤ ሐዲስ ኃይለ ሚካኤል');

  // Print Format Customizations
  const [borderStyle, setBorderStyle] = useState<'ETHIOPIC_GOLD_DOUBLE' | 'ROYAL_BURGUNDY' | 'PARCHMENT_CLASSIC'>('ETHIOPIC_GOLD_DOUBLE');
  const [themeColor, setThemeColor] = useState('#D4AF37'); // Gold

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      const [certsRes, studentsRes] = await Promise.all([
        api.get<CertificateRecord[]>('/education/certificates'),
        api.get<{ data: Student[] }>('/students?limit=100'),
      ]);
      setCertificates(certsRes);
      setStudents(studentsRes.data || []);

      if (studentsRes.data && studentsRes.data.length > 0) {
        handleStudentSelect(studentsRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to load certificates data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleStudentSelect(s: Student) {
    setSelectedStudentId(s.id);
    setRecipientNameAmharic(s.fullNameAmharic || s.fullName);
    setRecipientNameEnglish(s.fullName);
    setCourseOrClass(`${s.class?.name || 'ክፍል 7-12'} (ሰንበት ትምህርት)`);
  }

  function applyTemplatePreset(type: 'STANDARD_COMPLETION' | 'HONOR_EXCELLENCE' | 'DISTINGUISHED_SERVICE' | 'PARTICIPATION') {
    setTemplateType(type);
    if (type === 'HONOR_EXCELLENCE') {
      setTitleAmharic('የክብርና የላቀ ውጤት ምስክር ወረቀት');
      setTitleEnglish('Certificate of Academic Excellence & High Honor');
      setThemeColor('#D4AF37');
      setBorderStyle('ETHIOPIC_GOLD_DOUBLE');
      setRankText('1ኛ ደረጃ (የክፍሉ ከፍተኛ ውጤት)');
      setOverallGrade('A+ (95.0%)');
      setCustomMessageAmharic(
        'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት በመንፈሳዊ ትምህርቶች ከፍተኛ ትጋትና የላቀ ክርስቲያናዊ ሥነ ምግባር በማሳየት 1ኛ ደረጃ ይዞ ላጠናቀቀው ተማሪ የተሰጠ የክብር ምስክር ወረቀት።',
      );
    } else if (type === 'STANDARD_COMPLETION') {
      setTitleAmharic('የምርቃት ምስክር ወረቀት');
      setTitleEnglish('Certificate of Sunday School Graduation');
      setThemeColor('#800020');
      setBorderStyle('ROYAL_BURGUNDY');
      setRankText('ተመራቂ');
      setOverallGrade('ተጠናቋል');
      setCustomMessageAmharic(
        'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት የተዘጋጀውን መንፈሳዊ የትምህርት መርሃ ግብር በተሳካ ሁኔታ ላጠናቀቀው ተማሪ የተሰጠ የምርቃት ምስክር ወረቀት።',
      );
    } else if (type === 'DISTINGUISHED_SERVICE') {
      setTitleAmharic('የላቀ አገልግሎት ምስክር ወረቀት');
      setTitleEnglish('Certificate of Distinguished Church Service');
      setThemeColor('#0F52BA');
      setBorderStyle('ETHIOPIC_GOLD_DOUBLE');
      setRankText('የላቀ አገልጋይ');
      setOverallGrade('አርአያ');
      setCustomMessageAmharic(
        'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት በታማኝነት፣ በትጋትና በቅንነት ላበረከተው የላቀ መንፈሳዊ አገልግሎት የተሰጠ የክብር ምስክር ወረቀት።',
      );
    } else if (type === 'PARTICIPATION') {
      setTitleAmharic('የተሳትፎ ምስክር ወረቀት');
      setTitleEnglish('Certificate of Active Participation');
      setThemeColor('#2E7D32');
      setBorderStyle('PARCHMENT_CLASSIC');
      setRankText('ንቁ ተሳታፊ');
      setOverallGrade('ተሳትፏል');
      setCustomMessageAmharic(
        'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት በተዘጋጀው መንፈሳዊ ጉባኤ እና የሥልጠና መርሃ ግብር ላይ በንቃት ለተሳተፈ ተማሪ የተሰጠ።',
      );
    }
  }

  async function handleSaveCertificate() {
    if (!selectedStudentId) {
      alert('Please select a student');
      return;
    }
    try {
      setSaving(true);
      const res = await api.post<CertificateRecord>('/education/certificates/generate', {
        studentId: selectedStudentId,
        templateType,
        titleAmharic,
        titleEnglish,
        recipientNameAmharic,
        recipientNameEnglish,
        courseOrClass,
        academicYear,
        issueDateEthiopian,
        overallGrade,
        rankText,
        customMessageAmharic,
        bibleVerseAmharic,
        signatory1Title,
        signatory1Name,
        signatory2Title,
        signatory2Name,
        signatory3Title,
        signatory3Name,
        borderStyle,
        themeColor,
      });

      setCertificates([res, ...certificates]);
      setNotification(
        lang === 'am'
          ? `ሰርተፊኬት ቁጥር ${res.certificateNumber} በተሳካ ሁኔታ ተመዝግቧል!`
          : `Certificate ${res.certificateNumber} successfully generated and saved!`,
      );
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to save certificate');
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDeleteCertificate(id: string) {
    if (!confirm(lang === 'am' ? 'ይህ ሰርተፊኬት ይሰረዝ?' : 'Delete this certificate?')) return;
    try {
      await api.delete(`/education/certificates/${id}`);
      setCertificates(certificates.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete certificate:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Print Stylesheet injection for A4 Landscape custom print formatting */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, aside, main > div:not(.print-certificate-target), .no-print {
            display: none !important;
          }
          .print-certificate-target {
            display: block !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      {/* Screen Header */}
      <div className="no-print">
        <Topbar title={lang === 'am' ? 'የምስክር ወረቀት ማዘጋጃ እና ማተሚያ' : 'Certificate Generator & Custom Print Format'}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'create' ? 'history' : 'create')}
              className="btn-outline flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <Layers size={16} />
              {activeTab === 'create'
                ? lang === 'am' ? `የተሰጡ ሰርተፊኬቶች (${certificates.length})` : `Issued Certificates (${certificates.length})`
                : lang === 'am' ? 'ወደ ማዘጋጃ ተመለስ' : 'Back to Designer'}
            </button>
            <button
              onClick={handlePrint}
              className="btn-gold flex items-center gap-1.5 text-xs sm:text-sm font-bold"
            >
              <Printer size={16} />
              {lang === 'am' ? 'ሰርተፊኬት አትም (Print)' : 'Print Certificate'}
            </button>
            {isAdmin && (
              <button
                onClick={handleSaveCertificate}
                disabled={saving}
                className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <FileCheck2 size={16} className="text-gold" />
                {saving ? t('saving') : lang === 'am' ? 'ሰነዱን መዝግብ (Save)' : 'Save Record'}
              </button>
            )}
          </div>
        </Topbar>
      </div>

      {notification && (
        <div className="no-print p-3.5 bg-green-50 text-green-800 border border-green-200 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} /> {notification}
        </div>
      )}

      {/* Mode Switcher */}
      {activeTab === 'history' ? (
        /* Certificates History Table */
        <div className="card overflow-hidden no-print">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-mist/30">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Scroll size={18} className="text-gold" />
              <span>{lang === 'am' ? 'የተሰጡ የምስክር ወረቀቶች ታሪክ' : 'Issued Certificate History'}</span>
            </h3>
            <span className="text-xs text-slate">{certificates.length} {lang === 'am' ? 'ሰርተፊኬቶች' : 'certificates'}</span>
          </div>

          {certificates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate">
              {lang === 'am' ? 'ምንም የተሰጠ ሰርተፊኬት የለም' : 'No certificates issued yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr className="bg-mist/40">
                    <th>{lang === 'am' ? 'ቁጥር' : 'Cert No'}</th>
                    <th>{lang === 'am' ? 'የተማሪው ስም' : 'Student Name'}</th>
                    <th>{lang === 'am' ? 'የሰርተፊኬቱ ዓይነት' : 'Certificate Type'}</th>
                    <th>{lang === 'am' ? 'ክፍል' : 'Class'}</th>
                    <th>{lang === 'am' ? 'ውጤት / ደረጃ' : 'Grade / Rank'}</th>
                    <th>{lang === 'am' ? 'የተሰጠበት ቀን' : 'Issue Date'}</th>
                    <th className="text-center">{lang === 'am' ? 'እርምጃ' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/20">
                      <td className="font-mono text-xs font-bold text-gold">{c.certificateNumber}</td>
                      <td>
                        <p className="font-semibold text-xs text-ink">{c.recipientNameAmharic || c.recipientNameEnglish}</p>
                        <p className="text-[10px] text-slate">{c.recipientNameEnglish}</p>
                      </td>
                      <td className="text-xs text-slate">{c.titleAmharic}</td>
                      <td className="text-xs text-slate">{c.courseOrClass}</td>
                      <td>
                        <span className="font-bold text-xs text-ink">{c.overallGrade || '-'}</span>
                        {c.rankText && <span className="text-[10px] text-slate block">{c.rankText}</span>}
                      </td>
                      <td className="text-xs text-slate">{c.issueDateEthiopian}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedStudentId(c.studentId);
                              setTemplateType(c.templateType);
                              setTitleAmharic(c.titleAmharic);
                              setTitleEnglish(c.titleEnglish);
                              setRecipientNameAmharic(c.recipientNameAmharic);
                              setRecipientNameEnglish(c.recipientNameEnglish);
                              setCourseOrClass(c.courseOrClass);
                              setAcademicYear(c.academicYear);
                              setIssueDateEthiopian(c.issueDateEthiopian);
                              setOverallGrade(c.overallGrade || '');
                              setRankText(c.rankText || '');
                              setCustomMessageAmharic(c.customMessageAmharic || '');
                              setBibleVerseAmharic(c.bibleVerseAmharic || '');
                              setSignatory1Title(c.signatory1Title);
                              setSignatory1Name(c.signatory1Name);
                              setSignatory2Title(c.signatory2Title);
                              setSignatory2Name(c.signatory2Name);
                              setSignatory3Title(c.signatory3Title);
                              setSignatory3Name(c.signatory3Name);
                              setThemeColor(c.themeColor);
                              setActiveTab('create');
                            }}
                            className="p-1 text-slate hover:text-gold"
                            title="Load & Print"
                          >
                            <Printer size={15} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteCertificate(c.id)}
                              className="p-1 text-slate hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Certificate Designer & Live Preview */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Customizer Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4 no-print">
            {/* Student Picker */}
            <div className="card p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate flex items-center gap-1.5">
                <Award size={14} className="text-gold" />
                <span>1. {lang === 'am' ? 'ተማሪ ምረጥ' : 'Select Student'}</span>
              </h4>
              <select
                className="input font-semibold"
                value={selectedStudentId}
                onChange={(e) => {
                  const s = students.find((st) => st.id === e.target.value);
                  if (s) handleStudentSelect(s);
                }}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentCode} - {s.fullNameAmharic || s.fullName} ({s.class?.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Template Presets */}
            <div className="card p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate flex items-center gap-1.5">
                <Sparkles size={14} className="text-gold" />
                <span>2. {lang === 'am' ? 'የሰርተፊኬት ቅርጸት ምረጥ' : 'Certificate Template'}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => applyTemplatePreset('HONOR_EXCELLENCE')}
                  className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                    templateType === 'HONOR_EXCELLENCE'
                      ? 'border-gold bg-amber-50 text-amber-900 font-bold ring-1 ring-gold'
                      : 'border-gray-200 hover:bg-mist'
                  }`}
                >
                  <span className="block text-gold font-bold">★ {lang === 'am' ? 'የክብር / የላቀ ውጤት' : 'Honor / Excellence'}</span>
                  <span className="text-[10px] text-slate block">{lang === 'am' ? 'ከፍተኛ ውጤት ላመጡ' : 'High ranking students'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplatePreset('STANDARD_COMPLETION')}
                  className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                    templateType === 'STANDARD_COMPLETION'
                      ? 'border-red-900 bg-red-50 text-red-900 font-bold ring-1 ring-red-900'
                      : 'border-gray-200 hover:bg-mist'
                  }`}
                >
                  <span className="block text-red-800 font-bold">🎓 {lang === 'am' ? 'የምረቃ ሰርተፊኬት' : 'Graduation'}</span>
                  <span className="text-[10px] text-slate block">{lang === 'am' ? 'ትምህርት ላጠናቀቁ' : 'Class completion'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplatePreset('DISTINGUISHED_SERVICE')}
                  className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                    templateType === 'DISTINGUISHED_SERVICE'
                      ? 'border-blue-900 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-900'
                      : 'border-gray-200 hover:bg-mist'
                  }`}
                >
                  <span className="block text-blue-800 font-bold">✝ {lang === 'am' ? 'የላቀ አገልግሎት' : 'Distinguished Service'}</span>
                  <span className="text-[10px] text-slate block">{lang === 'am' ? 'ለመዘምራንና አገልጋዮች' : 'Choir & Sunday school'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplatePreset('PARTICIPATION')}
                  className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                    templateType === 'PARTICIPATION'
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-800'
                      : 'border-gray-200 hover:bg-mist'
                  }`}
                >
                  <span className="block text-emerald-800 font-bold">📜 {lang === 'am' ? 'የተሳትፎ ምስክር' : 'Participation'}</span>
                  <span className="text-[10px] text-slate block">{lang === 'am' ? 'ጉባኤና ስልጠና' : 'Seminar / Workshop'}</span>
                </button>
              </div>
            </div>

            {/* Custom Content & Fields */}
            <div className="card p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate flex items-center gap-1.5">
                <Sliders size={14} className="text-gold" />
                <span>3. {lang === 'am' ? 'ጽሑፎችንና መረጃዎችን አስተካክል' : 'Custom Certificate Texts'}</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="label">{lang === 'am' ? 'የተማሪው ስም (በአማርኛ)' : 'Student Name (Amharic)'}</label>
                  <input
                    type="text"
                    className="input font-bold"
                    value={recipientNameAmharic}
                    onChange={(e) => setRecipientNameAmharic(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">{lang === 'am' ? 'የተማሪው ስም (በእንግሊዝኛ)' : 'Student Name (English)'}</label>
                  <input
                    type="text"
                    className="input font-semibold"
                    value={recipientNameEnglish}
                    onChange={(e) => setRecipientNameEnglish(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">{lang === 'am' ? 'ክፍል' : 'Class / Level'}</label>
                    <input
                      type="text"
                      className="input"
                      value={courseOrClass}
                      onChange={(e) => setCourseOrClass(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? 'የተሰጠበት ቀን' : 'Issue Date'}</label>
                    <input
                      type="text"
                      className="input"
                      value={issueDateEthiopian}
                      onChange={(e) => setIssueDateEthiopian(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">{lang === 'am' ? 'አጠቃላይ ውጤት' : 'Overall Grade'}</label>
                    <input
                      type="text"
                      className="input font-bold text-gold"
                      value={overallGrade}
                      onChange={(e) => setOverallGrade(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? 'ደረጃ / ማዕረግ' : 'Rank / Title'}</label>
                    <input
                      type="text"
                      className="input font-semibold"
                      value={rankText}
                      onChange={(e) => setRankText(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{lang === 'am' ? 'የእንኳን ደስ አላችሁ ዝርዝር መግለጫ' : 'Congratulatory Body Text'}</label>
                  <textarea
                    rows={3}
                    className="input leading-relaxed"
                    value={customMessageAmharic}
                    onChange={(e) => setCustomMessageAmharic(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">{lang === 'am' ? 'የመጽሐፍ ቅዱስ ጥቅስ (Verse)' : 'Bible Verse'}</label>
                  <select
                    className="input mb-1 text-[11px]"
                    onChange={(e) => setBibleVerseAmharic(e.target.value)}
                    value={bibleVerseAmharic}
                  >
                    {BIBLE_VERSES.map((v, i) => (
                      <option key={i} value={v}>
                        {v.substring(0, 45)}…
                      </option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    className="input text-[11px]"
                    value={bibleVerseAmharic}
                    onChange={(e) => setBibleVerseAmharic(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Signatories & Style Panel */}
            <div className="card p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate flex items-center gap-1.5">
                <Palette size={14} className="text-gold" />
                <span>4. {lang === 'am' ? 'የማተሚያ ቅርጸትና ፊርማዎች' : 'Print Format & Signatures'}</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">{lang === 'am' ? '1ኛ ፊርማ' : 'Signatory 1'}</label>
                    <input
                      type="text"
                      className="input text-[11px] mb-1"
                      value={signatory1Title}
                      onChange={(e) => setSignatory1Title(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input text-[11px]"
                      value={signatory1Name}
                      onChange={(e) => setSignatory1Name(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? '2ኛ ፊርማ' : 'Signatory 2'}</label>
                    <input
                      type="text"
                      className="input text-[11px] mb-1"
                      value={signatory2Title}
                      onChange={(e) => setSignatory2Title(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input text-[11px]"
                      value={signatory2Name}
                      onChange={(e) => setSignatory2Name(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? '3ኛ ፊርማ' : 'Signatory 3'}</label>
                    <input
                      type="text"
                      className="input text-[11px] mb-1"
                      value={signatory3Title}
                      onChange={(e) => setSignatory3Title(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input text-[11px]"
                      value={signatory3Name}
                      onChange={(e) => setSignatory3Name(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate font-medium">{lang === 'am' ? 'የቀለም ቅንብር' : 'Theme Accent'}:</span>
                  <div className="flex items-center gap-2">
                    {[
                      { color: '#D4AF37', label: 'Gold' },
                      { color: '#800020', label: 'Burgundy' },
                      { color: '#0F52BA', label: 'Navy' },
                      { color: '#2E7D32', label: 'Emerald' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setThemeColor(c.color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          themeColor === c.color ? 'scale-110 border-ink shadow-sm' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Certificate Preview & Print Target (7 cols) */}
          <div className="lg:col-span-7">
            <div className="sticky top-6 space-y-3">
              <div className="no-print flex items-center justify-between">
                <span className="text-xs font-bold text-slate flex items-center gap-1.5 uppercase tracking-wider">
                  <Eye size={14} className="text-gold" />
                  <span>{lang === 'am' ? 'የሰርተፊኬቱ የቀጥታ እይታ (Live Preview & Print)' : 'Live Certificate Preview (A4 Landscape)'}</span>
                </span>
                <button
                  onClick={handlePrint}
                  className="btn-gold flex items-center gap-1.5 text-xs py-1.5 px-3 font-bold"
                >
                  <Printer size={14} />
                  {lang === 'am' ? 'አትም (Print)' : 'Print'}
                </button>
              </div>

              {/* The Actual Printable Certificate Frame (A4 Landscape aspect ratio) */}
              <div
                className="print-certificate-target w-full bg-[#FCFBF7] text-[#111111] rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative select-none"
                style={{
                  aspectRatio: '1.414 / 1', // A4 Landscape ratio
                  minHeight: '480px',
                }}
              >
                {/* Outer Ethiopian Border with Rosettes */}
                <div
                  className="absolute inset-3 border-4 rounded-xl pointer-events-none"
                  style={{ borderColor: themeColor }}
                >
                  {/* Inner Fillet Line */}
                  <div
                    className="absolute inset-1.5 border border-dashed rounded-lg"
                    style={{ borderColor: themeColor }}
                  />

                  {/* Corner Ethiopian Cross Ornaments */}
                  <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: themeColor }}>
                    ☩
                  </div>
                  <div className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: themeColor }}>
                    ☩
                  </div>
                  <div className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: themeColor }}>
                    ☩
                  </div>
                  <div className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: themeColor }}>
                    ☩
                  </div>
                </div>

                {/* Certificate Core Content */}
                <div className="relative h-full flex flex-col justify-between p-7 sm:p-9 text-center">
                  {/* Top Header */}
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-bold tracking-widest text-[#555] uppercase">
                        በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-amber-300 bg-white/50 shrink-0">
                        <Image src="/logo.jpg" alt="Logo" width={48} height={48} className="object-cover w-full h-full" />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-bold tracking-wide text-ink">
                          በኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን
                        </h2>
                        <h1 className="text-sm sm:text-base font-extrabold tracking-wider" style={{ color: themeColor }}>
                          ደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት
                        </h1>
                        <p className="text-[10px] sm:text-xs text-slate font-medium">
                          የመንፈሳዊ ትምህርትና ሥልጠና ክፍል • Debre Mewee Merha Hiwot Sunday School
                        </p>
                      </div>
                    </div>

                    {/* Certificate Title Badge */}
                    <div className="mt-3 inline-block">
                      <div
                        className="px-6 py-1.5 rounded-full border-2 inline-flex flex-col items-center shadow-xs"
                        style={{
                          borderColor: themeColor,
                          backgroundColor: `${themeColor}15`,
                        }}
                      >
                        <span className="text-sm sm:text-base font-black tracking-wide" style={{ color: themeColor }}>
                          {titleAmharic}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-semibold text-slate uppercase tracking-wider">
                          {titleEnglish}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Body: Recipient & Citation */}
                  <div className="my-auto py-2 space-y-2">
                    <p className="text-[11px] sm:text-xs text-slate tracking-wide">
                      ይህ የምስክር ወረቀት በትምህርት ዘመኑ ለላቀ ትጋቱ ለተማሪ
                    </p>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-ink tracking-wide font-serif">
                        {recipientNameAmharic || 'ተማሪ ስም'}
                      </h3>
                      {recipientNameEnglish && (
                        <p className="text-xs font-semibold text-slate font-sans mt-0.5 tracking-wider uppercase">
                          {recipientNameEnglish}
                        </p>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate">
                      {courseOrClass}
                    </p>

                    {/* Citation text */}
                    <p className="max-w-xl mx-auto text-[11px] sm:text-xs text-ink/80 leading-relaxed px-4">
                      {customMessageAmharic}
                    </p>

                    {/* Grade and Rank Ribbons */}
                    {(overallGrade || rankText) && (
                      <div className="flex items-center justify-center gap-3 pt-1">
                        {rankText && (
                          <span
                            className="text-xs font-bold px-3 py-0.5 rounded-full border shadow-2xs"
                            style={{
                              borderColor: themeColor,
                              color: themeColor,
                              backgroundColor: `${themeColor}10`,
                            }}
                          >
                            ★ {rankText}
                          </span>
                        )}
                        {overallGrade && (
                          <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-ink text-white">
                            ውጤት: {overallGrade}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bible Verse Box */}
                    {bibleVerseAmharic && (
                      <div className="max-w-lg mx-auto pt-1">
                        <p className="text-[10px] sm:text-[11px] italic font-serif text-slate border-t border-b border-gray-200 py-1 px-4">
                          {bibleVerseAmharic}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Date, Gold Stamp & 3 Signatories */}
                  <div className="pt-2">
                    <div className="grid grid-cols-4 items-end text-center gap-2">
                      {/* Signatory 1 */}
                      <div>
                        <div className="w-24 sm:w-28 mx-auto border-b border-dashed border-gray-400 mb-1" />
                        <p className="text-[10px] sm:text-[11px] font-bold text-ink">{signatory1Name}</p>
                        <p className="text-[9px] text-slate">{signatory1Title}</p>
                      </div>

                      {/* Official Gold Seal Stamp */}
                      <div className="flex flex-col items-center justify-center">
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-double flex flex-col items-center justify-center text-center shadow-xs"
                          style={{
                            borderColor: themeColor,
                            color: themeColor,
                            backgroundColor: `${themeColor}15`,
                          }}
                        >
                          <span className="text-sm font-bold">☩</span>
                          <span className="text-[7px] font-bold tracking-tighter uppercase leading-tight">
                            ደብረ መዊዕ<br />ማኅተም
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-slate mt-0.5">{issueDateEthiopian}</span>
                      </div>

                      {/* Signatory 2 */}
                      <div>
                        <div className="w-24 sm:w-28 mx-auto border-b border-dashed border-gray-400 mb-1" />
                        <p className="text-[10px] sm:text-[11px] font-bold text-ink">{signatory2Name}</p>
                        <p className="text-[9px] text-slate">{signatory2Title}</p>
                      </div>

                      {/* Signatory 3 */}
                      <div>
                        <div className="w-24 sm:w-28 mx-auto border-b border-dashed border-gray-400 mb-1" />
                        <p className="text-[10px] sm:text-[11px] font-bold text-ink">{signatory3Name}</p>
                        <p className="text-[9px] text-slate">{signatory3Title}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
