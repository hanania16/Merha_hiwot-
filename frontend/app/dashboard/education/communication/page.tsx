'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import {
  MessageSquare,
  Pin,
  Send,
  Plus,
  Filter,
  Trash2,
  Calendar,
  AlertCircle,
  Users,
  CheckCircle,
} from 'lucide-react';

interface DepartmentMessage {
  id: string;
  senderId: string;
  title: string;
  content: string;
  category: 'GENERAL' | 'CURRICULUM' | 'EXAM_SCHEDULE' | 'STUDENT_AFFAIR' | 'MEETING' | 'URGENT';
  targetAudience: string;
  isPinned: boolean;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export default function CommunicationPage() {
  const { t, lang } = useLang();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  const [messages, setMessages] = useState<DepartmentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');

  // Compose modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('GENERAL');
  const [targetAudience, setTargetAudience] = useState<string>('ALL');
  const [isPinned, setIsPinned] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, [selectedCategory, selectedTarget]);

  async function loadMessages() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedTarget !== 'ALL') params.append('target', selectedTarget);

      const res = await api.get<DepartmentMessage[]>(
        `/education/communications${params.toString() ? '?' + params.toString() : ''}`,
      );
      setMessages(res);
    } catch (err) {
      console.error('Failed to load department messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      await api.post('/education/communications', {
        title,
        content,
        category,
        targetAudience,
        isPinned,
      });
      setModalOpen(false);
      setTitle('');
      setContent('');
      setIsPinned(false);
      setNotification(lang === 'am' ? 'መልእክቱ በተሳካ ሁኔታ ተላልፏል!' : 'Message posted successfully!');
      setTimeout(() => setNotification(null), 4000);
      await loadMessages();
    } catch (err: any) {
      alert(err?.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePin(id: string) {
    try {
      await api.patch(`/education/communications/${id}/pin`);
      await loadMessages();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(lang === 'am' ? 'ይህ መልእክት ይሰረዝ?' : 'Delete this announcement?')) return;
    try {
      await api.delete(`/education/communications/${id}`);
      await loadMessages();
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }

  const categoryMeta: Record<string, { am: string; en: string; color: string }> = {
    GENERAL: { am: 'አጠቃላይ', en: 'General', color: 'bg-gray-100 text-slate border-gray-200' },
    CURRICULUM: { am: 'ስርዓተ ትምህርት', en: 'Curriculum', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    EXAM_SCHEDULE: { am: 'የፈተና ሰሌዳ', en: 'Exam Schedule', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    STUDENT_AFFAIR: { am: 'የተማሪዎች ጉዳይ', en: 'Student Affairs', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    MEETING: { am: 'ስብሰባ', en: 'Meeting', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    URGENT: { am: 'አስቸኳይ', en: 'Urgent', color: 'bg-red-50 text-red-700 border-red-200' },
  };

  const audienceLabels: Record<string, { am: string; en: string }> = {
    ALL: { am: 'ለሁሉም', en: 'All Staff' },
    TEACHERS: { am: 'ለመምህራን ብቻ', en: 'Teachers Only' },
    ADMINISTRATION: { am: 'ለአስተዳደር ብቻ', en: 'Administration Only' },
    CLASS_1_3: { am: 'የክፍል 1-3 መምህራን', en: 'Class 1-3 Teachers' },
    CLASS_4_6: { am: 'የክፍል 4-6 መምህራን', en: 'Class 4-6 Teachers' },
    CLASS_7_12: { am: 'የክፍል 7-12 መምህራን', en: 'Class 7-12 Teachers' },
  };

  return (
    <div className="space-y-6">
      <Topbar title={lang === 'am' ? 'የመምህራን እና የአስተዳደር መገናኛ' : 'Teachers & Administration Communication'}>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-gold flex items-center gap-1.5 text-xs sm:text-sm font-semibold"
        >
          <Plus size={16} />
          {lang === 'am' ? 'አዲስ መልእክት / ማስታወቂያ ጻፍ' : 'Post Announcement'}
        </button>
      </Topbar>

      {/* Header Info Banner */}
      <div className="card p-4 bg-gradient-to-r from-zinc-900 to-black text-white border-gold/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 text-gold flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'am' ? 'የትምህርት ክፍል የውስጥ መገናኛ ቦርድ' : 'Education Internal Notice & Circular Board'}
            </h3>
            <p className="text-xs text-white/60">
              {lang === 'am'
                ? 'በመምህራን፣ በትምህርት ክፍል ኃላፊዎችና በአስተዳደሩ መካከል የተደረጉ ውይይቶችና ማስታወቂያዎች'
                : 'Direct communication channel between teachers, education heads, and Sunday school administration.'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-gold font-semibold bg-gold/10 px-3 py-1 rounded-full border border-gold/30">
            {messages.length} {lang === 'am' ? 'መልእክቶች' : 'notices posted'}
          </span>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-green-50 text-green-800 border border-green-200 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} /> {notification}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate font-medium flex items-center gap-1 mr-1">
            <Filter size={14} /> {lang === 'am' ? 'ምድብ' : 'Category'}:
          </span>
          {['ALL', 'EXAM_SCHEDULE', 'CURRICULUM', 'MEETING', 'URGENT', 'GENERAL'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-gold text-ink font-bold shadow-xs'
                  : 'bg-mist text-slate hover:text-ink'
              }`}
            >
              {cat === 'ALL'
                ? lang === 'am' ? 'ሁሉም' : 'All'
                : lang === 'am'
                ? categoryMeta[cat]?.am || cat
                : categoryMeta[cat]?.en || cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-gray-100">
          <span className="text-slate font-medium flex items-center gap-1 mr-1">
            <Users size={14} /> {lang === 'am' ? 'ተደራሽ' : 'Audience'}:
          </span>
          {['ALL', 'TEACHERS', 'ADMINISTRATION'].map((aud) => (
            <button
              key={aud}
              onClick={() => setSelectedTarget(aud)}
              className={`px-3 py-1 rounded-md text-xs transition-all ${
                selectedTarget === aud
                  ? 'bg-ink text-white font-semibold'
                  : 'bg-white border border-gray-200 text-slate hover:bg-mist'
              }`}
            >
              {lang === 'am' ? audienceLabels[aud]?.am || aud : audienceLabels[aud]?.en || aud}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Feed */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate">{t('loading')}</div>
      ) : messages.length === 0 ? (
        <div className="card p-12 text-center text-xs text-slate">
          {lang === 'am' ? 'ምንም ማስታወቂያ ወይም መልእክት አልተገኘም' : 'No announcements found in this category'}
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => {
            const meta = categoryMeta[msg.category] || categoryMeta.GENERAL;
            return (
              <div
                key={msg.id}
                className={`card p-5 transition-all ${
                  msg.isPinned
                    ? 'border-gold/50 bg-gradient-to-r from-amber-50/40 via-white to-white shadow-sm ring-1 ring-gold/30'
                    : 'hover:border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {msg.isPinned && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-gold/20 px-2.5 py-0.5 rounded border border-gold/40">
                        <Pin size={12} className="rotate-45" /> {lang === 'am' ? 'የተሰካ ማስታወቂያ' : 'Pinned'}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${meta.color}`}
                    >
                      {lang === 'am' ? meta.am : meta.en}
                    </span>
                    <span className="text-xs bg-gray-100 text-slate px-2 py-0.5 rounded font-medium">
                      {lang === 'am' ? audienceLabels[msg.targetAudience]?.am || msg.targetAudience : audienceLabels[msg.targetAudience]?.en || msg.targetAudience}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} /> {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                        <button
                          onClick={() => handleTogglePin(msg.id)}
                          className="p-1 text-slate hover:text-gold"
                          title={msg.isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin size={14} className={msg.isPinned ? 'fill-gold text-gold' : ''} />
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="p-1 text-slate hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="text-base font-bold text-ink">{msg.title}</h3>
                  <p className="text-sm text-slate mt-2 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-slate">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs">
                      {msg.sender.fullName.charAt(0)}
                    </div>
                    <span>
                      {lang === 'am' ? 'የላከው' : 'Posted by'}: <strong className="text-ink">{msg.sender.fullName}</strong> ({t(msg.sender.role)})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose Message Modal */}
      <Modal
        open={modalOpen}
        title={lang === 'am' ? 'አዲስ መልእክት ወይም ማስታወቂያ ላክ' : 'Post New Announcement / Message'}
        onClose={() => setModalOpen(false)}
      >
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <label className="label">{lang === 'am' ? 'አርእስት' : 'Subject / Title'}</label>
              <input
                type="text"
                required
                className="input"
                placeholder={lang === 'am' ? 'የመልእክቱ አርእስት…' : 'Enter title…'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">{lang === 'am' ? 'የመልእክት ምድብ' : 'Category'}</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="GENERAL">{lang === 'am' ? 'አጠቃላይ (General)' : 'General'}</option>
                  <option value="EXAM_SCHEDULE">{lang === 'am' ? 'የፈተና ሰሌዳ (Exam Schedule)' : 'Exam Schedule'}</option>
                  <option value="CURRICULUM">{lang === 'am' ? 'ስርዓተ ትምህርት (Curriculum)' : 'Curriculum'}</option>
                  <option value="MEETING">{lang === 'am' ? 'ስብሰባ (Staff Meeting)' : 'Staff Meeting'}</option>
                  <option value="STUDENT_AFFAIR">{lang === 'am' ? 'የተማሪዎች ጉዳይ (Student Affairs)' : 'Student Affairs'}</option>
                  <option value="URGENT">{lang === 'am' ? 'አስቸኳይ (Urgent)' : 'Urgent'}</option>
                </select>
              </div>

              <div>
                <label className="label">{lang === 'am' ? 'የሚላክለት ክፍል (Target Audience)' : 'Target Audience'}</label>
                <select
                  className="input"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                >
                  <option value="ALL">{lang === 'am' ? 'ለሁሉም (All Staff)' : 'All Staff'}</option>
                  <option value="TEACHERS">{lang === 'am' ? 'ለመምህራን ብቻ (Teachers Only)' : 'Teachers Only'}</option>
                  <option value="ADMINISTRATION">{lang === 'am' ? 'ለአስተዳደር ብቻ (Administration Only)' : 'Administration Only'}</option>
                  <option value="CLASS_1_3">{lang === 'am' ? 'የክፍል 1-3 መምህራን' : 'Class 1-3 Teachers'}</option>
                  <option value="CLASS_4_6">{lang === 'am' ? 'የክፍል 4-6 መምህራን' : 'Class 4-6 Teachers'}</option>
                  <option value="CLASS_7_12">{lang === 'am' ? 'የክፍል 7-12 መምህራን' : 'Class 7-12 Teachers'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">{lang === 'am' ? 'ዝርዝር መልእክት' : 'Message Content'}</label>
              <textarea
                required
                rows={5}
                className="input"
                placeholder={lang === 'am' ? 'የመልእክቱ ዝርዝር ጽሑፍ እዚህ ይፃፉ…' : 'Write message content here…'}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {isAdmin && (
              <label className="flex items-center gap-2 text-xs text-ink cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                />
                <span className="font-semibold flex items-center gap-1 text-amber-700">
                  <Pin size={12} className="rotate-45" /> {lang === 'am' ? 'ይህንን ማስታወቂያ ከላይ ሰካ (Pin Announcement)' : 'Pin this announcement at the top'}
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn-outline text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="btn-gold flex items-center gap-1.5 text-xs font-semibold"
              >
                <Send size={14} />
                {submitting ? t('saving') : lang === 'am' ? 'መልእክት ላክ' : 'Post Message'}
              </button>
            </div>
          </form>
        </Modal>
    </div>
  );
}
