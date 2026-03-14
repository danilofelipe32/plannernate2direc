/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TextInputActions } from './components/TextInputActions';
import { TextEditorModal } from './components/TextEditorModal';
import { RichInput } from './components/RichInput';
import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  CheckSquare,
  FileText,
  Settings,
  Bell,
  Search,
  Plus,
  Clock,
  MoreVertical,
  Circle,
  CheckCircle2,
  User,
  ChevronLeft,
  ChevronRight,
  Pencil,
  GripVertical,
  MessageSquare,
  Target,
  Download,
  FileDown,
  Shield,
  Lock,
  Globe,
  Palette,
  Mail,
  Smartphone,
  Trash2,
  LogOut,
  UserCircle,
  Eye,
  Zap,
  ArrowRight,
  ListTodo,
  CalendarDays,
  Compass,
  StickyNote,
  FolderKanban,
  Sliders,
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Thermometer,
  Wind,
  Droplets,
  Fingerprint,
  Info,
  AlignLeft,
  Award,
  ClipboardCheck,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateAIContent } from './lib/ai';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './lib/supabase';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DraggableEvent = ({ event, children }: { event: Event, children: React.ReactNode, key?: string | number }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `event-${event.id}`,
    data: { event },
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
};

const DroppableDay: React.FC<{ dateStr: string, children: React.ReactNode, className?: string }> = ({ dateStr, children, className }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { dateStr },
  });
  
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'bg-[#e8dcc7] dark:bg-[#4a3f32]' : ''}`}>
      {children}
    </div>
  );
};

type Activity = {
  id: string;
  type: 'task' | 'event' | 'note';
  title: string;
  date: string;
  link: string;
};

const ActivityFeed = ({ 
  tasks, 
  events, 
  notes, 
  setActiveTab 
}: { 
  tasks: Task[], 
  events: Event[], 
  notes: Note[], 
  setActiveTab: (tab: string) => void 
}) => {
  const activities: Activity[] = [
    ...tasks.filter(t => t.completed).map(t => ({
      id: t.id,
      type: 'task' as const,
      title: `Tarefa concluída: ${t.title}`,
      date: new Date().toISOString(), // Fallback
      link: 'tasks'
    })),
    ...events.map(e => ({
      id: e.id,
      type: 'event' as const,
      title: `Evento: ${e.title}`,
      date: `${e.startDate}T${e.startTime}`,
      link: 'calendar'
    })),
    ...notes.map(n => ({
      id: n.id,
      type: 'note' as const,
      title: `Nota: ${n.title}`,
      date: n.date,
      link: 'notes'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-6 tracking-tight">Feed de Atividades</h2>
      <div className="space-y-3">
        {activities.map(activity => (
          <div 
            key={`${activity.type}-${activity.id}`}
            onClick={() => setActiveTab(activity.link)}
            className="group p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-white/80 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:border-amber-300 dark:hover:border-amber-700 cursor-pointer transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-500">
                {activity.type === 'task' ? 'Tarefa' : activity.type === 'event' ? 'Evento' : 'Nota'}
              </span>
              <span className="text-[10px] text-amber-700/60 dark:text-amber-300/60">
                {new Date(activity.date).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">{activity.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

type Task = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  category: 'work' | 'personal' | 'urgent';
  comments?: string[];
  planningActionId?: string;
  position?: number;
  reminder?: string;
};

type Event = {
  id: string;
  user_id: string;
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  attendees: number;
  color?: string;
  reminder?: string;
};

type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  date: string;
  color: string;
  position?: number;
  x?: number;
  y?: number;
  z_index?: number;
};

type PlanningAction = {
  id: string;
  user_id: string;
  goal: string;
  specificGoals: string;
  actions: string;
  methodology: string;
  startDate: string;
  endDate: string;
};

type Project = {
  id: string;
  user_id: string;
  school_name: string;
  municipality: string;
  project_name: string;
  teacher_name: string;
  contact: string;
  area: string;
  target_audience: string;
  student_count: number;
  objective: string;
  activities: string;
  start_date: string;
  end_date: string;
  result_learning: boolean;
  result_reading: boolean;
  result_tech: boolean;
  result_protagonism: boolean;
  result_other: string;
  has_photos: boolean;
  can_publish: boolean;
  submitter_name: string;
  submit_date: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'task' | 'event' | 'system';
};

const EVENT_COLORS: Record<string, { bg: string, border: string, text: string, textLight: string }> = {
  indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-700', textLight: 'text-indigo-600' },
  emerald: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-700', textLight: 'text-emerald-600' },
  rose: { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-700', textLight: 'text-rose-600' },
  amber: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-700', textLight: 'text-amber-600' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700', textLight: 'text-blue-600' },
};

const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentingTaskId, setCommentingTaskId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'work' | 'personal' | 'urgent'>('work');
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [newTaskStartTime, setNewTaskStartTime] = useState('');
  const [newTaskEndDate, setNewTaskEndDate] = useState('');
  const [newTaskEndTime, setNewTaskEndTime] = useState('');
  const [newTaskPlanningActionId, setNewTaskPlanningActionId] = useState('');
  const [newTaskReminder, setNewTaskReminder] = useState('');
  const [taskValidationError, setTaskValidationError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const [calendarView, setCalendarView] = useState<'day' | 'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStartDate, setNewEventStartDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventAttendees, setNewEventAttendees] = useState(1);
  const [newEventColor, setNewEventColor] = useState('indigo');
  const [newEventReminder, setNewEventReminder] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [editingPlanningId, setEditingPlanningId] = useState<string | null>(null);
  const [planningGoal, setPlanningGoal] = useState('');
  const [planningSpecificGoals, setPlanningSpecificGoals] = useState('');
  const [planningActions, setPlanningActions] = useState('');
  const [planningMethodology, setPlanningMethodology] = useState('');
  const [planningStartDate, setPlanningStartDate] = useState('');
  const [planningEndDate, setPlanningEndDate] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('bg-yellow-100');
  const [noteColorFilter, setNoteColorFilter] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState('identificacao');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorCallback, setEditorCallback] = useState<(text: string) => void>(() => (text: string) => {});
  
  // Project Form State
  const [projectSchoolName, setProjectSchoolName] = useState('');
  const [projectMunicipality, setProjectMunicipality] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectTeacherName, setProjectTeacherName] = useState('');
  const [projectContact, setProjectContact] = useState('');
  const [projectArea, setProjectArea] = useState('');
  const [projectTargetAudience, setProjectTargetAudience] = useState('');
  const [projectStudentCount, setProjectStudentCount] = useState(0);
  const [projectObjective, setProjectObjective] = useState('');
  const [projectActivities, setProjectActivities] = useState('');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [projectResultLearning, setProjectResultLearning] = useState(false);
  const [projectResultReading, setProjectResultReading] = useState(false);
  const [projectResultTech, setProjectResultTech] = useState(false);
  const [projectResultProtagonism, setProjectResultProtagonism] = useState(false);
  const [projectResultOther, setProjectResultOther] = useState('');
  const [projectHasPhotos, setProjectHasPhotos] = useState(false);
  const [projectCanPublish, setProjectCanPublish] = useState(false);
  const [projectSubmitterName, setProjectSubmitterName] = useState('');
  const [projectSubmitDate, setProjectSubmitDate] = useState('');

  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    emailUpdates: true,
    language: 'pt-BR',
    autoSave: true,
    compactView: false,
    profileName: 'Usuário Pro',
    profileEmail: 'usuario@exemplo.com',
    twoFactor: false,
    publicProfile: false,
    themeColor: 'indigo',
    profileImage: null as string | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.8 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          setSettings(prev => ({ ...prev, profileImage: dataUrl }));
          
          // Save immediately to Supabase
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { error } = await supabase
              .from('settings')
              .upsert({ 
                user_id: session.user.id, 
                notifications: settings.notifications,
                dark_mode: settings.darkMode,
                email_updates: settings.emailUpdates,
                language: settings.language,
                auto_save: settings.autoSave,
                compact_view: settings.compactView,
                profile_name: settings.profileName,
                profile_email: settings.profileEmail,
                two_factor: settings.twoFactor,
                public_profile: settings.publicProfile,
                theme_color: settings.themeColor,
                profile_image: dataUrl,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });
              
            if (error) {
              showToast('Erro ao salvar foto no banco de dados', 'error');
            } else {
              showToast('Foto de perfil atualizada e salva!');
            }
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const settingsData = {
      user_id: session.user.id,
      notifications: settings.notifications,
      dark_mode: settings.darkMode,
      email_updates: settings.emailUpdates,
      language: settings.language,
      auto_save: settings.autoSave,
      compact_view: settings.compactView,
      profile_name: settings.profileName,
      profile_email: settings.profileEmail,
      two_factor: settings.twoFactor,
      public_profile: settings.publicProfile,
      theme_color: settings.themeColor,
      profile_image: settings.profileImage,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('settings')
      .upsert(settingsData, { onConflict: 'user_id' });

    if (error) {
      showToast('Erro ao salvar configurações', 'error');
    } else {
      showToast('Configurações salvas com sucesso');
    }
  };

  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const fetchData = async () => {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsDataLoading(true);
    try {
      const [tasksRes, notesRes, eventsRes, planningRes, projectsRes, settingsRes] = await Promise.all([
        supabase.from('tasks').select('*').order('position', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('notes').select('*').order('position', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('start_date', { ascending: true }),
        supabase.from('planning_actions').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('user_id', session.user.id).maybeSingle()
      ]);

      if (tasksRes.data) setTasks(tasksRes.data.map(t => ({
        ...t, 
        startDate: t.start_date, 
        startTime: t.start_time, 
        endDate: t.end_date, 
        endTime: t.end_time, 
        planningActionId: t.planning_action_id,
        comments: Array.isArray(t.comments) ? t.comments : (typeof t.comments === 'string' ? JSON.parse(t.comments) : [])
      })));
      if (notesRes.data) setNotes(notesRes.data);
      if (eventsRes.data) setSchedule(eventsRes.data.map(e => ({...e, startDate: e.start_date, startTime: e.start_time, endDate: e.end_date, endTime: e.end_time})));
      if (planningRes.data) setPlanningActionsList(planningRes.data.map(p => ({...p, specificGoals: p.specific_goals, startDate: p.start_date, endDate: p.end_date})));
      if (projectsRes.data) setProjects(projectsRes.data);
      if (settingsRes.data) {
        setSettings({
          notifications: settingsRes.data.notifications,
          darkMode: settingsRes.data.dark_mode,
          emailUpdates: settingsRes.data.email_updates,
          language: settingsRes.data.language,
          autoSave: settingsRes.data.auto_save,
          compactView: settingsRes.data.compact_view,
          profileName: settingsRes.data.profile_name || session.user.user_metadata?.full_name || 'Usuário Pro',
          profileEmail: settingsRes.data.profile_email || session.user.email || 'usuario@exemplo.com',
          twoFactor: settingsRes.data.two_factor,
          publicProfile: settingsRes.data.public_profile,
          themeColor: settingsRes.data.theme_color,
          profileImage: settingsRes.data.profile_image
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsDataLoading(false);
    }
  };


  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    // Check for active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setSettings(prev => ({
          ...prev,
          profileEmail: session.user.email || prev.profileEmail,
          profileName: session.user.user_metadata?.full_name || prev.profileName
        }));
        fetchData();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setSettings(prev => ({
          ...prev,
          profileEmail: session.user.email || prev.profileEmail,
          profileName: session.user.user_metadata?.full_name || prev.profileName
        }));
        fetchData();
      } else {
        setIsAuthenticated(false);
        setTasks([]);
        setNotes([]);
        setSchedule([]);
        setPlanningActionsList([]);
        setProjects([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      showToast('Supabase não está configurado. Verifique as variáveis de ambiente.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        showToast('Bem-vindo de volta!');
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authName,
            },
          },
        });
        if (error) throw error;
        showToast('Verifique seu e-mail para confirmar a conta!');
      }
    } catch (error: any) {
      showToast(error.message || 'Ocorreu um erro na autenticação', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured()) {
      showToast('Supabase não está configurado.', 'error');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      showToast(error.message || 'Erro ao entrar com Google', 'error');
    }
  };

  const handleLogout = async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    showToast('Sessão encerrada');
  };

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'Reunião em 15 minutos', message: 'Daily Sync com a equipe de desenvolvimento.', time: 'Agora', read: false, type: 'event' },
    { id: '2', title: 'Tarefa atrasada', message: 'Revisar proposta comercial deveria ter sido entregue ontem.', time: '2h atrás', read: false, type: 'task' },
    { id: '3', title: 'Bem-vindo ao PlannerPro', message: 'Explore as novas funcionalidades do seu painel.', time: '1 dia atrás', read: true, type: 'system' },
  ]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<Event[]>([]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      
      // Check tasks
      tasks.forEach(task => {
        if (task.startDate && task.startTime && task.reminder) {
          const taskTime = new Date(`${task.startDate}T${task.startTime}`);
          const reminderTime = new Date(taskTime.getTime() - parseInt(task.reminder) * 60000);
          
          if (now >= reminderTime && now < new Date(reminderTime.getTime() + 60000)) {
            new Notification(`Lembrete: ${task.title}`, {
              body: `Sua tarefa começa em ${task.reminder} minutos.`
            });
          }
        }
      });

      // Check events
      schedule.forEach(event => {
        if (event.startDate && event.startTime && event.reminder) {
          const eventTime = new Date(`${event.startDate}T${event.startTime}`);
          const reminderTime = new Date(eventTime.getTime() - parseInt(event.reminder) * 60000);
          
          if (now >= reminderTime && now < new Date(reminderTime.getTime() + 60000)) {
            new Notification(`Lembrete: ${event.title}`, {
              body: `Seu evento começa em ${event.reminder} minutos.`
            });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [tasks, schedule]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesViewMode, setNotesViewMode] = useState<'grid' | 'canvas'>('grid');
  const [planningActionsList, setPlanningActionsList] = useState<PlanningAction[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes);
  const [filteredSchedule, setFilteredSchedule] = useState<Event[]>(schedule);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(projects);
  const [isSearching, setIsSearching] = useState(false);

  interface WeatherData {
    temp: number;
    condition: string;
    city: string;
    icon: 'sun' | 'cloud' | 'rain' | 'storm';
    humidity?: number;
    windSpeed?: number;
  }
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error', visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  useEffect(() => {
    let taskResult = tasks;
    if (taskFilter === 'pending') taskResult = taskResult.filter(t => !t.completed);
    if (taskFilter === 'completed') taskResult = taskResult.filter(t => t.completed);

    let noteResult = notes;
    if (noteColorFilter) noteResult = noteResult.filter(n => n.color === noteColorFilter);

    if (!searchQuery.trim()) {
      setFilteredTasks(taskResult);
      setFilteredNotes(noteResult);
      setFilteredSchedule(schedule);
      setFilteredProjects(projects);
      setIsSearching(false);
      return;
    }

    const performSearch = () => {
      setIsSearching(true);
      const query = searchQuery.toLowerCase();
      
      setFilteredTasks(taskResult.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.description && t.description.toLowerCase().includes(query))
      ));
      
      setFilteredNotes(noteResult.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.content.toLowerCase().includes(query)
      ));
      
      setFilteredSchedule(schedule.filter(e => 
        e.title.toLowerCase().includes(query) || 
        (e.description?.toLowerCase().includes(query))
      ));
      
      setFilteredProjects(projects.filter(p => 
        p.project_name.toLowerCase().includes(query) || 
        p.school_name.toLowerCase().includes(query) || 
        p.municipality.toLowerCase().includes(query) || 
        p.objective.toLowerCase().includes(query)
      ));
      
      setIsSearching(false);
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, tasks, taskFilter, notes, schedule, projects, noteColorFilter]);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsWeatherLoading(true);
      try {
        let locationContext = "São Paulo, Brasil";
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          locationContext = `latitude ${pos.coords.latitude}, longitude ${pos.coords.longitude}`;
        } catch (e) {
          console.log("Geolocation not available, using default city");
        }

        const prompt = `Qual é a previsão do tempo atual para ${locationContext}? Retorne APENAS um JSON válido com os campos: temp (número em Celsius), condition (string curta em português), city (nome da cidade), humidity (número %), windSpeed (número km/h) e icon (um dos seguintes: 'sun', 'cloud', 'rain', 'storm').`;
        
        const text = await generateAIContent(prompt);

        if (text) {
          try {
            // Extract JSON if it's wrapped in markdown code blocks or other text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              setWeather(data);
            } else {
              // If no JSON found, try parsing the whole text just in case
              const data = JSON.parse(text);
              setWeather(data);
            }
          } catch (parseError) {
            console.warn("AI returned non-JSON weather data, using default:", text);
            // Fallback to a default state if AI fails to return valid JSON
            setWeather({
              temp: 25,
              condition: "Ensolarado",
              city: "São Paulo",
              humidity: 60,
              windSpeed: 10,
              icon: 'sun'
            });
          }
        }
      } catch (error) {
        console.error("Erro ao buscar clima:", error);
      } finally {
        setIsWeatherLoading(false);
      }
    };

    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, []);

  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.notifications) return;

    const checkReminders = () => {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      const newNotifications: Notification[] = [];
      const updatedNotifiedIds = new Set(notifiedIds);
      let hasChanges = false;

      // Check tasks
      tasks.forEach(task => {
        if (task.completed || !task.startDate || !task.startTime) return;
        const taskKey = `task-${task.id}`;
        if (updatedNotifiedIds.has(taskKey)) return;

        try {
          const taskDate = new Date(`${task.startDate}T${task.startTime}`);
          if (taskDate > now && taskDate <= thirtyMinutesFromNow) {
            newNotifications.push({
              id: `reminder-task-${task.id}-${Date.now()}`,
              title: 'Lembrete de Tarefa',
              message: `A tarefa "${stripHtml(task.title)}" começa em breve (${task.startTime}).`,
              time: 'Agora',
              read: false,
              type: 'task'
            });
            updatedNotifiedIds.add(taskKey);
            hasChanges = true;
          }
        } catch (e) {
          console.error("Error parsing task date", e);
        }
      });

      // Check events
      schedule.forEach(event => {
        const eventKey = `event-${event.id}`;
        if (updatedNotifiedIds.has(eventKey)) return;

        try {
          const eventDate = new Date(`${event.startDate}T${event.startTime}`);
          if (eventDate > now && eventDate <= thirtyMinutesFromNow) {
            newNotifications.push({
              id: `reminder-event-${event.id}-${Date.now()}`,
              title: 'Lembrete de Evento',
              message: `O evento "${stripHtml(event.title)}" começa em breve (${event.startTime}).`,
              time: 'Agora',
              read: false,
              type: 'event'
            });
            updatedNotifiedIds.add(eventKey);
            hasChanges = true;
          }
        } catch (e) {
          console.error("Error parsing event date", e);
        }
      });

      if (hasChanges) {
        setNotifications(prev => [...newNotifications, ...prev]);
        setNotifiedIds(updatedNotifiedIds);
      }
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [tasks, schedule, settings.notifications, notifiedIds]);

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', id);

    if (error) {
      showToast('Erro ao atualizar tarefa', 'error');
      return;
    }

    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskValidationError(null);

    if (!newTaskTitle.trim()) return;

    // Validation for dates and times
    if (newTaskEndDate && !newTaskStartDate) {
      setTaskValidationError('A data de início é obrigatória se uma data de fim for fornecida.');
      return;
    }

    if (newTaskStartDate) {
      if (!newTaskEndDate) {
        setTaskValidationError('A data de fim é obrigatória se uma data de início for fornecida.');
        return;
      }

      const start = new Date(newTaskStartDate);
      const end = new Date(newTaskEndDate);

      if (end < start) {
        setTaskValidationError('A data de fim não pode ser anterior à data de início.');
        return;
      }

      if (newTaskStartDate === newTaskEndDate && newTaskStartTime && newTaskEndTime) {
        if (newTaskEndTime < newTaskStartTime) {
          setTaskValidationError('O horário de fim não pode ser anterior ao horário de início no mesmo dia.');
          return;
        }
      }

      if (newTaskStartTime && !newTaskEndTime) {
        setTaskValidationError('O horário de fim é obrigatório se um horário de início for fornecido.');
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (editingTaskId) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: newTaskTitle,
          description: newTaskDescription,
          category: newTaskCategory,
          start_date: newTaskStartDate || null,
          start_time: newTaskStartTime || null,
          end_date: newTaskEndDate || null,
          end_time: newTaskEndTime || null,
          planning_action_id: newTaskPlanningActionId || null,
          comments: newTaskReminder ? [...(editingTaskId ? tasks.find(t => t.id === editingTaskId)?.comments || [] : []), `reminder:${newTaskReminder}`] : (editingTaskId ? tasks.find(t => t.id === editingTaskId)?.comments || [] : [])
        })
        .eq('id', editingTaskId);

      if (error) {
        showToast('Erro ao atualizar tarefa', 'error');
        return;
      }

      setTasks(tasks.map(t => t.id === editingTaskId ? {
        ...t,
        title: newTaskTitle,
        description: newTaskDescription,
        category: newTaskCategory,
        startDate: newTaskStartDate || undefined,
        startTime: newTaskStartTime || undefined,
        endDate: newTaskEndDate || undefined,
        endTime: newTaskEndTime || undefined,
        planningActionId: newTaskPlanningActionId || undefined
      } : t));
      showToast('Tarefa atualizada com sucesso');
    } else {
      const newTaskData = {
        user_id: session.user.id,
        title: newTaskTitle,
        description: newTaskDescription,
        completed: false,
        category: newTaskCategory,
        start_date: newTaskStartDate || null,
        start_time: newTaskStartTime || null,
        end_date: newTaskEndDate || null,
        end_time: newTaskEndTime || null,
        planning_action_id: newTaskPlanningActionId || null,
        position: tasks.length,
        comments: newTaskReminder ? [`reminder:${newTaskReminder}`] : []
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTaskData])
        .select();

      if (error) {
        showToast('Erro ao adicionar tarefa', 'error');
        return;
      }

      if (data) {
        const newTask = {
          ...data[0], 
          startDate: data[0].start_date, 
          startTime: data[0].start_time, 
          endDate: data[0].end_date, 
          endTime: data[0].end_time, 
          planningActionId: data[0].planning_action_id,
          comments: Array.isArray(data[0].comments) ? data[0].comments : (typeof data[0].comments === 'string' ? JSON.parse(data[0].comments) : [])
        };
        setTasks([newTask, ...tasks]);
        showToast('Tarefa adicionada com sucesso');
      }
    }

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskStartDate('');
    setNewTaskStartTime('');
    setNewTaskEndDate('');
    setNewTaskEndTime('');
    setNewTaskPlanningActionId('');
    setNewTaskCategory('work');
    setNewTaskReminder('');
    setEditingTaskId(null);
    setIsTaskModalOpen(false);
  };

  const handleOpenCommentModal = (taskId: string) => {
    setCommentingTaskId(taskId);
    setNewCommentText('');
    setIsCommentModalOpen(true);
  };

  const handleAddComment = async () => {
    if (!commentingTaskId || !newCommentText.trim()) return;
    const task = tasks.find(t => t.id === commentingTaskId);
    if (!task) return;

    const newComments = [...(task.comments || []), newCommentText.trim()];

    const { error } = await supabase
      .from('tasks')
      .update({ comments: newComments })
      .eq('id', commentingTaskId);

    if (error) {
      showToast('Erro ao adicionar comentário', 'error');
      return;
    }

    setTasks(tasks.map(t => t.id === commentingTaskId ? {
      ...t,
      comments: newComments
    } : t));
    setNewCommentText('');
    setIsCommentModalOpen(false);
    setCommentingTaskId(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description || '');
    setNewTaskCategory(task.category);
    setNewTaskStartDate(task.startDate || '');
    setNewTaskStartTime(task.startTime || '');
    setNewTaskEndDate(task.endDate || '');
    setNewTaskEndTime(task.endTime || '');
    setTaskValidationError(null);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    setTaskToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskToDelete);

    if (error) {
      showToast('Erro ao excluir tarefa', 'error');
      setIsConfirmModalOpen(false);
      setTaskToDelete(null);
      return;
    }

    setTasks(tasks.filter(t => t.id !== taskToDelete));
    showToast('Tarefa excluída com sucesso');
    setIsConfirmModalOpen(false);
    setTaskToDelete(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);

      // Update positions in Supabase
      const updates = newTasks.map((task: Task, index: number) => ({
        id: task.id,
        position: index
      }));

      for (const update of updates) {
        await supabase.from('tasks').update({ position: update.position }).eq('id', update.id);
      }
    }
  };

  const handleNoteDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;

    if (notesViewMode === 'canvas') {
      const noteId = active.id as string;
      const noteIndex = notes.findIndex(n => n.id === noteId);
      if (noteIndex !== -1) {
        const note = notes[noteIndex];
        const newX = (note.x || 0) + delta.x;
        const newY = (note.y || 0) + delta.y;
        
        const newNotes = [...notes];
        newNotes[noteIndex] = { 
          ...note, 
          x: newX, 
          y: newY,
          z_index: Math.max(...notes.map(n => n.z_index || 0), 0) + 1
        };
        setNotes(newNotes);
        
        // Update in Supabase
        await supabase.from('notes').update({ 
          position: newNotes[noteIndex].position
        }).eq('id', noteId);
      }
      return;
    }

    const { over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = notes.findIndex(t => t.id === active.id);
      const newIndex = notes.findIndex(t => t.id === over.id);
      
      const newNotes = arrayMove(notes, oldIndex, newIndex);
      setNotes(newNotes);

      // Update positions in Supabase
      const updates = newNotes.map((note: Note, index: number) => ({
        id: note.id,
        position: index
      }));

      for (const update of updates) {
        await supabase.from('notes').update({ position: update.position }).eq('id', update.id);
      }
    }
  };

  const handleOpenNewTaskModal = () => {
    setEditingTaskId(null);
    setNewTaskTitle('');
    setNewTaskCategory('work');
    setNewTaskStartDate('');
    setNewTaskStartTime('');
    setNewTaskEndDate('');
    setNewTaskEndTime('');
    setNewTaskReminder('');
    setTaskValidationError(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenNewEventModal = (defaultStartDate?: string, defaultEndDate?: string, defaultStartTime?: string, defaultEndTime?: string) => {
    setEditingEventId(null);
    setNewEventTitle('');
    setNewEventStartDate(defaultStartDate || '');
    setNewEventStartTime(defaultStartTime || '');
    setNewEventEndDate(defaultEndDate || '');
    setNewEventEndTime(defaultEndTime || '');
    setNewEventAttendees(1);
    setNewEventColor('indigo');
    setNewEventReminder('');
    setIsEventModalOpen(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventStartDate || !newEventStartTime || !newEventEndDate || !newEventEndTime) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (editingEventId) {
      const { error } = await supabase
        .from('events')
        .update({
          title: newEventTitle,
          start_date: newEventStartDate,
          start_time: newEventStartTime,
          end_date: newEventEndDate,
          end_time: newEventEndTime,
          attendees: newEventAttendees,
          color: newEventColor
        })
        .eq('id', editingEventId);

      if (error) {
        showToast('Erro ao atualizar evento', 'error');
        return;
      }

      setSchedule(schedule.map(ev => ev.id === editingEventId ? {
        ...ev,
        title: newEventTitle,
        startDate: newEventStartDate,
        startTime: newEventStartTime,
        endDate: newEventEndDate,
        endTime: newEventEndTime,
        attendees: newEventAttendees,
        color: newEventColor
      } : ev).sort((a, b) => a.startTime.localeCompare(b.startTime)));
      showToast('Evento atualizado com sucesso');
    } else {
      const newEventData = {
        user_id: session.user.id,
        title: newEventTitle,
        start_date: newEventStartDate,
        start_time: newEventStartTime,
        end_date: newEventEndDate,
        end_time: newEventEndTime,
        attendees: newEventAttendees,
        color: newEventColor
      };

      const { data, error } = await supabase
        .from('events')
        .insert([newEventData])
        .select();

      if (error) {
        showToast('Erro ao adicionar evento', 'error');
        return;
      }

      if (data) {
        const newEvent = {...data[0], startDate: data[0].start_date, startTime: data[0].start_time, endDate: data[0].end_date, endTime: data[0].end_time};
        setSchedule([...schedule, newEvent].sort((a, b) => a.startTime.localeCompare(b.startTime)));
        showToast('Evento adicionado com sucesso');
      }
    }

    setNewEventTitle('');
    setNewEventStartDate('');
    setNewEventStartTime('');
    setNewEventEndDate('');
    setNewEventEndTime('');
    setNewEventAttendees(1);
    setNewEventColor('indigo');
    setEditingEventId(null);
    setIsEventModalOpen(false);
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tipo,Titulo,Status/Data,Categoria/Cor\n";
    
    tasks.forEach(task => {
      csvContent += `Tarefa,"${stripHtml(task.title)}",${task.completed ? 'Concluída' : 'Pendente'},"${task.category}"\n`;
    });
    
    schedule.forEach(event => {
      csvContent += `Evento,"${stripHtml(event.title)}","${event.startDate} ${event.startTime}","${event.color}"\n`;
    });
    
    notes.forEach(note => {
      csvContent += `Nota,"${stripHtml(note.title)}","${note.date}","${note.color}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "planner_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Dados exportados para CSV com sucesso');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("PlannerPro - Exportação de Dados", 14, 15);
    
    const taskData = tasks.map(t => [t.title, t.completed ? 'Concluída' : 'Pendente', t.category, t.startDate || '-']);
    autoTable(doc, {
      head: [['Tarefa', 'Status', 'Categoria', 'Data']],
      body: taskData,
      startY: 25,
    });
    
    const eventData = schedule.map(e => [e.title, `${e.startDate} ${e.startTime}`, e.color]);
    autoTable(doc, {
      head: [['Evento', 'Data/Hora', 'Cor']],
      body: eventData,
      startY: (doc as any).lastAutoTable.finalY + 10,
    });
    
    const noteData = notes.map(n => [n.title, n.date, n.content.substring(0, 50) + '...']);
    autoTable(doc, {
      head: [['Nota', 'Data', 'Conteúdo']],
      body: noteData,
      startY: (doc as any).lastAutoTable.finalY + 10,
    });
    
    doc.save("planner_data.pdf");
    showToast('Dados exportados para PDF com sucesso');
  };

  const handleEditEvent = (event: Event) => {
    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventStartDate(event.startDate);
    setNewEventStartTime(event.startTime);
    setNewEventEndDate(event.endDate);
    setNewEventEndTime(event.endTime);
    setNewEventAttendees(event.attendees);
    setNewEventColor(event.color || 'indigo');
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!editingEventId) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', editingEventId);

    if (error) {
      showToast('Erro ao excluir evento', 'error');
      return;
    }

    setSchedule(schedule.filter(ev => ev.id !== editingEventId));
    setIsEventModalOpen(false);
    setEditingEventId(null);
    showToast('Evento excluído com sucesso');
  };

  const handleAddPlanningAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planningGoal.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const planningData = {
      user_id: session.user.id,
      goal: planningGoal,
      specific_goals: planningSpecificGoals,
      actions: planningActions,
      methodology: planningMethodology,
      start_date: planningStartDate,
      end_date: planningEndDate
    };

    if (editingPlanningId) {
      const { data, error } = await supabase
        .from('planning_actions')
        .update(planningData)
        .eq('id', editingPlanningId)
        .select();

      if (error) {
        showToast('Erro ao atualizar planejamento', 'error');
        return;
      }

      if (data) {
        const updatedPlanning = {...data[0], specificGoals: data[0].specific_goals, startDate: data[0].start_date, endDate: data[0].end_date};
        setPlanningActionsList(planningActionsList.map(a => a.id === editingPlanningId ? updatedPlanning : a));
        showToast('Planejamento atualizado com sucesso');
      }
    } else {
      const { data, error } = await supabase
        .from('planning_actions')
        .insert([planningData])
        .select();

      if (error) {
        showToast('Erro ao adicionar planejamento', 'error');
        return;
      }

      if (data) {
        const newPlanning = {...data[0], specificGoals: data[0].specific_goals, startDate: data[0].start_date, endDate: data[0].end_date};
        setPlanningActionsList([...planningActionsList, newPlanning]);
        showToast('Planejamento adicionado com sucesso');
      }
    }

    setIsPlanningModalOpen(false);
    setEditingPlanningId(null);
    setPlanningGoal('');
    setPlanningSpecificGoals('');
    setPlanningActions('');
    setPlanningMethodology('');
    setPlanningStartDate('');
    setPlanningEndDate('');
  };

  const handleEditPlanningAction = (action: PlanningAction) => {
    setEditingPlanningId(action.id);
    setPlanningGoal(action.goal);
    setPlanningSpecificGoals(action.specificGoals);
    setPlanningActions(action.actions);
    setPlanningMethodology(action.methodology);
    setPlanningStartDate(action.startDate);
    setPlanningEndDate(action.endDate);
    setIsPlanningModalOpen(true);
  };

  const handleDeletePlanningAction = async (id: string) => {
    const { error } = await supabase
      .from('planning_actions')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Erro ao excluir planejamento', 'error');
      return;
    }

    setPlanningActionsList(planningActionsList.filter(a => a.id !== id));
    showToast('Planejamento excluído com sucesso');
  };

  const filteredPlanningActions = planningActionsList.filter(action => {
    if (!filterStartDate && !filterEndDate) return true;
    const actionStart = new Date(action.startDate);
    const actionEnd = new Date(action.endDate);
    const filterStart = filterStartDate ? new Date(filterStartDate) : null;
    const filterEnd = filterEndDate ? new Date(filterEndDate) : null;

    if (filterStart && actionStart < filterStart) return false;
    if (filterEnd && actionEnd > filterEnd) return false;
    return true;
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Planejamento', 14, 15);
    autoTable(doc, {
      head: [['Objetivo Geral', 'Objetivos Específicos', 'Ações', 'Metodologia', 'Período']],
      body: filteredPlanningActions.map(action => [
        stripHtml(action.goal),
        stripHtml(action.specificGoals),
        stripHtml(action.actions),
        stripHtml(action.methodology),
        `${action.startDate} a ${action.endDate}`
      ]),
      startY: 20,
    });
    doc.save('planejamento.pdf');
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (editingNoteId) {
      const { error } = await supabase
        .from('notes')
        .update({
          title: newNoteTitle || 'Sem título',
          content: newNoteContent,
          color: newNoteColor
        })
        .eq('id', editingNoteId);

      if (error) {
        showToast('Erro ao atualizar nota', 'error');
        return;
      }

      setNotes(notes.map(note => 
        note.id === editingNoteId 
          ? { ...note, title: newNoteTitle || 'Sem título', content: newNoteContent, color: newNoteColor } 
          : note
      ));
      showToast('Nota atualizada com sucesso');
    } else {
      const newNoteData = {
        user_id: session.user.id,
        title: newNoteTitle || 'Sem título',
        content: newNoteContent,
        date: new Date().toISOString().split('T')[0],
        color: newNoteColor,
        position: notes.length
      };

      const { data, error } = await supabase
        .from('notes')
        .insert([newNoteData])
        .select();

      if (error) {
        showToast('Erro ao adicionar nota', 'error');
        return;
      }

      if (data) {
        setNotes([data[0], ...notes]);
        showToast('Nota adicionada com sucesso');
      }
    }

    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteColor('bg-yellow-100');
    setEditingNoteId(null);
    setIsNoteModalOpen(false);
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setNewNoteTitle(note.title === 'Sem título' ? '' : note.title);
    setNewNoteContent(note.content);
    setNewNoteColor(note.color);
    setIsNoteModalOpen(true);
  };

  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Erro ao excluir nota', 'error');
      return;
    }

    setNotes(notes.filter(n => n.id !== id));
    showToast('Nota excluída com sucesso');
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const projectData = {
      user_id: session.user.id,
      school_name: projectSchoolName,
      municipality: projectMunicipality,
      project_name: projectName,
      teacher_name: projectTeacherName,
      contact: projectContact,
      area: projectArea,
      target_audience: projectTargetAudience,
      student_count: projectStudentCount,
      objective: projectObjective,
      activities: projectActivities,
      start_date: projectStartDate,
      end_date: projectEndDate,
      result_learning: projectResultLearning,
      result_reading: projectResultReading,
      result_tech: projectResultTech,
      result_protagonism: projectResultProtagonism,
      result_other: projectResultOther,
      has_photos: projectHasPhotos,
      can_publish: projectCanPublish,
      submitter_name: projectSubmitterName,
      submit_date: projectSubmitDate
    };

    if (editingProjectId) {
      const { error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editingProjectId);

      if (error) {
        showToast('Erro ao atualizar projeto', 'error');
        return;
      }

      setProjects(projects.map(p => p.id === editingProjectId ? { ...p, ...projectData } : p));
      showToast('Projeto atualizado com sucesso');
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select();

      if (error) {
        showToast('Erro ao adicionar projeto', 'error');
        return;
      }

      if (data) {
        setProjects([data[0], ...projects]);
        showToast('Projeto adicionado com sucesso');
      }
    }

    setIsProjectModalOpen(false);
    resetProjectForm();
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Erro ao excluir projeto', 'error');
      return;
    }

    setProjects(projects.filter(p => p.id !== id));
    showToast('Projeto excluído com sucesso');
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectSchoolName(project.school_name);
    setProjectMunicipality(project.municipality);
    setProjectName(project.project_name);
    setProjectTeacherName(project.teacher_name);
    setProjectContact(project.contact);
    setProjectArea(project.area);
    setProjectTargetAudience(project.target_audience);
    setProjectStudentCount(project.student_count);
    setProjectObjective(project.objective);
    setProjectActivities(project.activities);
    setProjectStartDate(project.start_date);
    setProjectEndDate(project.end_date);
    setProjectResultLearning(project.result_learning);
    setProjectResultReading(project.result_reading);
    setProjectResultTech(project.result_tech);
    setProjectResultProtagonism(project.result_protagonism);
    setProjectResultOther(project.result_other || '');
    setProjectHasPhotos(project.has_photos);
    setProjectCanPublish(project.can_publish);
    setProjectSubmitterName(project.submitter_name);
    setProjectSubmitDate(project.submit_date);
    setIsProjectModalOpen(true);
  };

  const resetProjectForm = () => {
    setProjectModalTab('identificacao');
    setEditingProjectId(null);
    setProjectSchoolName('');
    setProjectMunicipality('');
    setProjectName('');
    setProjectTeacherName('');
    setProjectContact('');
    setProjectArea('');
    setProjectTargetAudience('');
    setProjectStudentCount(0);
    setProjectObjective('');
    setProjectActivities('');
    setProjectStartDate('');
    setProjectEndDate('');
    setProjectResultLearning(false);
    setProjectResultReading(false);
    setProjectResultTech(false);
    setProjectResultProtagonism(false);
    setProjectResultOther('');
    setProjectHasPhotos(false);
    setProjectCanPublish(false);
    setProjectSubmitterName('');
    setProjectSubmitDate('');
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formattedToday = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(currentTime);

  const formattedTime = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(currentTime);

  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (calendarView === 'day') newDate.setDate(newDate.getDate() - 1);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() - 1);
    if (calendarView === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (calendarView === 'day') newDate.setDate(newDate.getDate() + 1);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() + 1);
    if (calendarView === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(new Date());

  const formatCalendarHeader = () => {
    if (calendarView === 'day') {
      return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(currentDate);
    }
    if (calendarView === 'month') {
      return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate);
    }
    return currentDate.getFullYear().toString();
  };

  const handleEventDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id.toString().startsWith('event-') && over.id.toString().startsWith('day-')) {
      const eventId = active.id.toString().replace('event-', '');
      const newDate = over.id.toString().replace('day-', '');
      
      const eventToUpdate = schedule.find(e => e.id === eventId);
      if (eventToUpdate) {
        const { error } = await supabase
          .from('events')
          .update({ start_date: newDate })
          .eq('id', eventId);
        
        if (error) {
          showToast('Erro ao atualizar evento', 'error');
          return;
        }
        
        setSchedule(schedule.map(e => e.id === eventId ? { ...e, startDate: newDate } : e));
        showToast('Evento atualizado com sucesso');
      }
    }
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[120px] border-r border-b border-[#eaddd0] dark:border-[#4a3f32] bg-[#f4ebd8]/50 dark:bg-[#3d362d]/50"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const dayEvents = filteredSchedule.filter(e => e.startDate === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

      days.push(
        <DroppableDay 
          key={`day-${i}`} 
          dateStr={dateStr}
          className="min-h-[120px] border-r border-b border-[#eaddd0] dark:border-[#4a3f32] p-2 hover:bg-[#f0e6d2] dark:hover:bg-[#4a3f32] transition-colors cursor-pointer"
        >
          <div 
            className="w-full h-full"
            onClick={() => {
              handleOpenNewEventModal(dateStr, dateStr);
            }}
          >
            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold font-serif mb-1 ${isToday ? 'bg-[#8b3a3a] text-white shadow-md' : 'text-[#5c4d3c] dark:text-[#d4c5b0]'}`}>
              {i}
            </div>
            <div className="space-y-1">
              {dayEvents.map(event => (
                <DraggableEvent key={event.id} event={event}>
                  <div 
                    className={`px-2 py-1 ${EVENT_COLORS[event.color || 'indigo'].bg} ${EVENT_COLORS[event.color || 'indigo'].text} text-xs rounded-md truncate font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEvent(event);
                    }}
                  >
                    {event.startTime} <span dangerouslySetInnerHTML={{ __html: event.title }} />
                  </div>
                </DraggableEvent>
              ))}
            </div>
          </div>
        </DroppableDay>
      );
    }
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = firstDay + daysInMonth; i < totalCells; i++) {
      days.push(<div key={`empty-end-${i}`} className="min-h-[120px] border-r border-b border-[#eaddd0] dark:border-[#4a3f32] bg-[#f4ebd8]/50 dark:bg-[#3d362d]/50"></div>);
    }

    return (
      <div className="bg-[#fdfbf7] dark:bg-[#2c2824] border-2 border-[#d4c5b0] dark:border-[#5c4d3c] rounded-xl overflow-hidden shadow-md relative">
        <div className="absolute top-0 left-0 right-0 h-3 bg-[#8b3a3a] dark:bg-[#5c2323] border-b-2 border-[#6b2a2a] dark:border-[#3d1515] z-10"></div>
        <div className="grid grid-cols-7 border-b-2 border-[#d4c5b0] dark:border-[#5c4d3c] bg-[#e8dcc7] dark:bg-[#3d362d] pt-3">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold font-serif text-[#8b7355] dark:text-[#a89f91] uppercase tracking-wider border-r border-[#d4c5b0] dark:border-[#5c4d3c] last:border-r-0">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayEvents = filteredSchedule.filter(e => e.startDate === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="bg-[#fdfbf7] dark:bg-[#2c2824] border-2 border-[#d4c5b0] dark:border-[#5c4d3c] rounded-xl shadow-md overflow-hidden flex flex-col h-[600px] relative">
        <div className="absolute top-0 left-0 right-0 h-3 bg-[#8b3a3a] dark:bg-[#5c2323] border-b-2 border-[#6b2a2a] dark:border-[#3d1515] z-10"></div>
        <div className="overflow-y-auto flex-1 relative pt-3">
          {Array.from({ length: 24 }).map((_, i) => {
            const hourStr = i.toString().padStart(2, '0');
            const hourEvents = dayEvents.filter(e => e.startTime.startsWith(`${hourStr}:`));

            return (
              <div 
                key={`hour-${i}`} 
                className="flex border-b border-[#eaddd0] dark:border-[#4a3f32] min-h-[64px] cursor-pointer hover:bg-[#f0e6d2] dark:hover:bg-[#4a3f32] transition-colors"
                onClick={() => {
                  handleOpenNewEventModal(dateStr, dateStr, `${hourStr}:00`, `${hourStr}:30`);
                }}
              >
                <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-xs text-[#8b7355] dark:text-[#a89f91] font-bold font-serif">
                  {hourStr}:00
                </div>
                <div className="flex-1 border-l-2 border-[#d4c5b0] dark:border-[#5c4d3c] p-1 flex flex-col gap-1">
                  {hourEvents.map(event => (
                    <div 
                      key={event.id} 
                      className={`${EVENT_COLORS[event.color || 'indigo'].bg} border-l-4 ${EVENT_COLORS[event.color || 'indigo'].border} rounded-md p-2 cursor-pointer hover:opacity-90 transition-opacity`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEvent(event);
                      }}
                    >
                      <p 
                        className={`text-xs font-bold ${EVENT_COLORS[event.color || 'indigo'].text}`}
                        dangerouslySetInnerHTML={{ __html: event.title }}
                      />
                      <p className={`text-xs ${EVENT_COLORS[event.color || 'indigo'].textLight}`}>{event.startTime} - {event.endTime}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const year = currentDate.getFullYear();
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {months.map((month, index) => {
          const firstDay = new Date(year, index, 1).getDay();
          const daysInMonth = new Date(year, index + 1, 0).getDate();
          
          return (
            <div key={month} className="bg-[#fdfbf7] dark:bg-[#2c2824] border-2 border-[#d4c5b0] dark:border-[#5c4d3c] rounded-xl p-4 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#8b3a3a] dark:bg-[#5c2323] border-b border-[#6b2a2a] dark:border-[#3d1515]"></div>
              <h3 className="font-bold font-serif text-[#5c4d3c] dark:text-[#d4c5b0] mb-3 mt-1">{month}</h3>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-[10px] font-bold font-serif text-[#8b7355] dark:text-[#a89f91]">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const isToday = (i + 1) === new Date().getDate() && index === new Date().getMonth() && year === new Date().getFullYear();
                  return (
                    <div key={i} className={`text-xs py-1 rounded-full cursor-pointer font-serif ${isToday ? 'bg-[#8b3a3a] text-white font-bold shadow-sm' : 'text-[#5c4d3c] dark:text-[#d4c5b0] hover:bg-[#f0e6d2] dark:hover:bg-[#4a3f32]'}`}>
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{getGreeting()}!</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 capitalize">{formattedToday}</p>
              </div>
              <div className="flex items-center space-x-6">
                {isWeatherLoading ? (
                  <div className="flex items-center space-x-2 animate-pulse">
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="space-y-1">
                      <div className="w-12 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="w-8 h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  </div>
                ) : weather && (
                  <div className="flex items-center bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mr-3">
                      {weather.icon === 'sun' && <Sun className="text-amber-500" size={28} />}
                      {weather.icon === 'cloud' && <Cloud className="text-slate-400" size={28} />}
                      {weather.icon === 'rain' && <CloudRain className="text-blue-500" size={28} />}
                      {weather.icon === 'storm' && <CloudLightning className="text-indigo-600" size={28} />}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center">
                        <span className="text-xl font-bold text-slate-800 dark:text-white">{weather.temp}°C</span>
                        <span className="mx-2 text-slate-300 dark:text-slate-600">|</span>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize">{weather.condition}</span>
                      </div>
                      <div className="flex items-center text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        <Globe size={10} className="mr-1" /> {weather.city}
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-6">
                  <p className="text-4xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(currentTime)}
                    <span className="animate-pulse opacity-50">:</span>
                    {new Intl.DateTimeFormat('pt-BR', { second: '2-digit' }).format(currentTime)}
                  </p>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">Horário Local</p>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard 
                title="Tarefas Concluídas" 
                value={tasks.filter(t => t.completed).length.toString()} 
                subtitle={`De ${tasks.length} tarefas hoje`} 
                trend="+2" 
                icon={<CheckCircle2 size={20} />}
                color="emerald"
              />
              <StatCard 
                title="Horas Focadas" 
                value="4.5h" 
                subtitle="Nesta semana" 
                trend="+1.2h" 
                icon={<Clock size={20} />}
                color="amber"
              />
              <StatCard 
                title="Próxima Reunião" 
                value="14:00" 
                subtitle="Apresentação para Cliente" 
                isAlert 
                icon={<Bell size={20} />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tasks Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Tarefas de Hoje</h2>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Buscar tarefas..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {isSearching && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setActiveTab('tasks')} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300">Ver todas</button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={filteredTasks.slice(0, 3).map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {filteredTasks.slice(0, 3).map(task => (
                          <SortableTaskItem key={task.id} task={task} onToggle={toggleTask} onEdit={handleEditTask} onDelete={handleDeleteTask} onComment={handleOpenCommentModal} planningActionsList={planningActionsList} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>

                {/* Planning Actions Column */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Ações de Planejamento</h2>
                    <button onClick={() => setActiveTab('planning')} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300">Ver todas</button>
                  </div>
                  <div className="space-y-3">
                    {planningActionsList.slice(0, 3).map(action => (
                      <div key={action.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <p 
                          className="text-sm font-medium text-slate-800 dark:text-slate-200"
                          dangerouslySetInnerHTML={{ __html: action.goal }}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{action.startDate} a {action.endDate}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Schedule Column */}
              <div className="space-y-6">
                <div className="bg-[#fdfbf7] dark:bg-[#2c2824] rounded-xl border-2 border-[#d4c5b0] dark:border-[#5c4d3c] shadow-md p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-4 bg-[#8b3a3a] dark:bg-[#5c2323] border-b-2 border-[#6b2a2a] dark:border-[#3d1515]"></div>
                  <div className="absolute top-0 left-4 right-4 flex justify-between px-2">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="w-3 h-6 bg-slate-200 dark:bg-slate-700 rounded-full border border-slate-300 dark:border-slate-600 shadow-inner -mt-2"></div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mb-6 mt-4">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-xl font-serif font-bold text-[#5c4d3c] dark:text-[#d4c5b0]">Agenda</h2>
                      <span className="text-4xl font-serif font-bold text-[#8b3a3a] dark:text-[#d4c5b0] leading-none">{new Date().getDate()}</span>
                    </div>
                    <button onClick={() => setActiveTab('calendar')} className="p-1 text-[#8b3a3a] dark:text-[#d4c5b0] hover:text-[#5c2323] dark:hover:text-white rounded-md hover:bg-[#f0e6d2] dark:hover:bg-[#3d362d] transition-colors">
                      <CalendarIcon size={20} />
                    </button>
                  </div>

                  <div className="relative border-l-2 border-[#d4c5b0] dark:border-[#5c4d3c] ml-3 space-y-6 pb-4">
                    {schedule.filter(e => e.startDate === new Date().toISOString().split('T')[0]).length > 0 ? (
                      schedule.filter(e => e.startDate === new Date().toISOString().split('T')[0]).map((event) => (
                        <div 
                          key={event.id} 
                          className="relative pl-6 cursor-pointer group"
                          onClick={() => handleEditEvent(event)}
                        >
                          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#fdfbf7] dark:bg-[#2c2824] border-4 ${EVENT_COLORS[event.color || 'indigo'].border} group-hover:scale-110 transition-transform`}></div>
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold ${EVENT_COLORS[event.color || 'indigo'].textLight} mb-1 font-serif`}>{event.startTime}</span>
                            <div className="bg-[#f4ebd8] dark:bg-[#3d362d] rounded-lg p-3 border border-[#eaddd0] dark:border-[#4a3f32] group-hover:bg-[#f0e6d2] dark:group-hover:bg-[#4a3f32] transition-colors shadow-sm">
                              <h3 
                                className="text-sm font-bold text-[#5c4d3c] dark:text-[#eaddd0] font-serif"
                                dangerouslySetInnerHTML={{ __html: event.title }}
                              />
                              <div className="flex items-center mt-2 text-xs text-[#8b7355] dark:text-[#a89f91] space-x-3">
                                <span className="flex items-center"><Clock size={12} className="mr-1"/> {event.startTime} - {event.endTime}</span>
                                <span className="flex items-center"><User size={12} className="mr-1"/> {event.attendees} pessoas</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="pl-6 text-sm text-[#8b7355] dark:text-[#a89f91] py-4 font-serif italic">Nenhum compromisso para hoje.</div>
                    )}
                  </div>
                  
                  <button onClick={() => handleOpenNewEventModal()} className="w-full mt-4 py-2 border-2 border-dashed border-[#d4c5b0] dark:border-[#5c4d3c] rounded-lg text-sm font-bold text-[#8b7355] dark:text-[#a89f91] hover:border-[#8b3a3a] dark:hover:border-[#d4c5b0] hover:text-[#8b3a3a] dark:hover:text-[#d4c5b0] transition-colors flex items-center justify-center font-serif">
                    <Plus size={16} className="mr-2" /> Adicionar Compromisso
                  </button>
                </div>
                <ActivityFeed tasks={tasks} events={schedule} notes={notes} setActiveTab={setActiveTab} />
              </div>
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Minhas Tarefas</h1>
                <p className="text-slate-500 mt-1">Gerencie suas atividades diárias</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Busca semântica..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 shadow-sm"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <button onClick={handleOpenNewTaskModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
                  <Plus size={16} className="mr-2" />
                  Nova Tarefa
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex space-x-4 mb-6 border-b border-slate-100 pb-4">
                <button 
                  onClick={() => setTaskFilter('all')}
                  className={`text-sm font-medium pb-4 -mb-4 ${taskFilter === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                >Todas</button>
                <button 
                  onClick={() => setTaskFilter('pending')}
                  className={`text-sm font-medium pb-4 -mb-4 ${taskFilter === 'pending' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                >Pendentes</button>
                <button 
                  onClick={() => setTaskFilter('completed')}
                  className={`text-sm font-medium pb-4 -mb-4 ${taskFilter === 'completed' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                >Concluídas</button>
              </div>
              
              <div className="space-y-3">
                {filteredTasks.length > 0 ? (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={filteredTasks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredTasks.map(task => (
                        <SortableTaskItem key={task.id} task={task} onToggle={toggleTask} onEdit={handleEditTask} onDelete={handleDeleteTask} onComment={handleOpenCommentModal} planningActionsList={planningActionsList} />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Nenhuma tarefa encontrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'calendar':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold font-serif text-[#5c4d3c] dark:text-[#d4c5b0] capitalize min-w-[200px]">
                  {formatCalendarHeader()}
                </h1>
                <div className="flex items-center space-x-2">
                  <button onClick={handlePrevDate} className="p-1.5 text-[#8b7355] dark:text-[#a89f91] hover:text-[#5c4d3c] dark:hover:text-[#d4c5b0] hover:bg-[#eaddd0] dark:hover:bg-[#4a3f32] rounded-full transition-colors"><ChevronLeft size={20}/></button>
                  <button onClick={handleNextDate} className="p-1.5 text-[#8b7355] dark:text-[#a89f91] hover:text-[#5c4d3c] dark:hover:text-[#d4c5b0] hover:bg-[#eaddd0] dark:hover:bg-[#4a3f32] rounded-full transition-colors"><ChevronRight size={20}/></button>
                  <button onClick={handleToday} className="px-3 py-1.5 text-sm font-bold font-serif text-[#5c4d3c] dark:text-[#d4c5b0] border-2 border-[#d4c5b0] dark:border-[#5c4d3c] rounded-md hover:bg-[#f0e6d2] dark:hover:bg-[#4a3f32] transition-colors ml-2">Hoje</button>
                </div>
              </div>
              
              <div className="flex bg-[#eaddd0]/50 dark:bg-[#3d362d]/50 p-1 rounded-lg border border-[#d4c5b0] dark:border-[#5c4d3c]">
                <button 
                  className={`px-4 py-1.5 text-sm font-bold font-serif rounded-md transition-all ${calendarView === 'day' ? 'bg-[#fdfbf7] dark:bg-[#2c2824] text-[#8b3a3a] dark:text-[#d4c5b0] shadow-sm border border-[#d4c5b0] dark:border-[#5c4d3c]' : 'text-[#8b7355] dark:text-[#a89f91] hover:text-[#5c4d3c] dark:hover:text-[#d4c5b0]'}`} 
                  onClick={() => setCalendarView('day')}
                >Dia</button>
                <button 
                  className={`px-4 py-1.5 text-sm font-bold font-serif rounded-md transition-all ${calendarView === 'month' ? 'bg-[#fdfbf7] dark:bg-[#2c2824] text-[#8b3a3a] dark:text-[#d4c5b0] shadow-sm border border-[#d4c5b0] dark:border-[#5c4d3c]' : 'text-[#8b7355] dark:text-[#a89f91] hover:text-[#5c4d3c] dark:hover:text-[#d4c5b0]'}`} 
                  onClick={() => setCalendarView('month')}
                >Mês</button>
                <button 
                  className={`px-4 py-1.5 text-sm font-bold font-serif rounded-md transition-all ${calendarView === 'year' ? 'bg-[#fdfbf7] dark:bg-[#2c2824] text-[#8b3a3a] dark:text-[#d4c5b0] shadow-sm border border-[#d4c5b0] dark:border-[#5c4d3c]' : 'text-[#8b7355] dark:text-[#a89f91] hover:text-[#5c4d3c] dark:hover:text-[#d4c5b0]'}`} 
                  onClick={() => setCalendarView('year')}
                >Ano</button>
              </div>
            </div>

            {calendarView === 'day' && renderDayView()}
            {calendarView === 'month' && (
              <DndContext onDragEnd={handleEventDragEnd}>
                {renderMonthView()}
              </DndContext>
            )}
            {calendarView === 'year' && renderYearView()}
          </div>
        );
      case 'planning':
          return (
            <div className="max-w-6xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Planejamento</h1>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-4">
                    <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Data Inicial" />
                    <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Data Final" />
                  </div>
                  <button 
                    onClick={handleExportPDF}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
                  >
                    <FileText size={16} className="mr-2" />
                    PDF
                  </button>
                  <button 
                    onClick={() => {
                      setEditingPlanningId(null);
                      setPlanningGoal('');
                      setPlanningSpecificGoals('');
                      setPlanningActions('');
                      setPlanningMethodology('');
                      setPlanningStartDate('');
                      setPlanningEndDate('');
                      setIsPlanningModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
                  >
                    <Plus size={16} className="mr-2" />
                    Nova ação
                  </button>
                </div>
              </div>
              
              {filteredPlanningActions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>Nenhuma ação de planejamento encontrada.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="px-6 py-3">Objetivo Geral</th>
                        <th className="px-6 py-3">Objetivos Específicos</th>
                        <th className="px-6 py-3">Ações</th>
                        <th className="px-6 py-3">Metodologia</th>
                        <th className="px-6 py-3">Período</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlanningActions.map(action => (
                        <tr key={action.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: action.goal }} />
                          <td className="px-6 py-4" dangerouslySetInnerHTML={{ __html: action.specificGoals }} />
                          <td className="px-6 py-4" dangerouslySetInnerHTML={{ __html: action.actions }} />
                          <td className="px-6 py-4" dangerouslySetInnerHTML={{ __html: action.methodology }} />
                          <td className="px-6 py-4 whitespace-nowrap">{action.startDate} a {action.endDate}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEditPlanningAction(action)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeletePlanningAction(action.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
      case 'projects':
        return (
          <div className="max-w-6xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Projetos</h1>
              <button 
                onClick={() => {
                  resetProjectForm();
                  setIsProjectModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
              >
                <Plus size={16} className="mr-2" />
                Novo Projeto
              </button>
            </div>
            
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-700 mb-2">Nenhum projeto encontrado</p>
                <p>Tente buscar por outro termo ou adicione um novo projeto.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProjects.map((project, index) => {
                  const colors = [
                    { border: 'border-l-indigo-500', accent: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10', shadow: 'hover:shadow-indigo-100 dark:hover:shadow-none' },
                    { border: 'border-l-emerald-500', accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', shadow: 'hover:shadow-emerald-100 dark:hover:shadow-none' },
                    { border: 'border-l-amber-500', accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-900/10', shadow: 'hover:shadow-amber-100 dark:hover:shadow-none' },
                    { border: 'border-l-rose-500', accent: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/50 dark:bg-rose-900/10', shadow: 'hover:shadow-rose-100 dark:hover:shadow-none' },
                    { border: 'border-l-cyan-500', accent: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50/50 dark:bg-cyan-900/10', shadow: 'hover:shadow-cyan-100 dark:hover:shadow-none' },
                    { border: 'border-l-violet-500', accent: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50/50 dark:bg-violet-900/10', shadow: 'hover:shadow-violet-100 dark:hover:shadow-none' },
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div key={project.id} className={`${color.bg} border-l-4 ${color.border} border-y border-r border-slate-200 dark:border-slate-700 rounded-xl p-6 relative group transition-all hover:shadow-lg ${color.shadow}`}>
                      <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditProject(project)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteProject(project.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <h3 
                        className={`text-xl font-bold ${color.accent} mb-2 pr-16`}
                        dangerouslySetInnerHTML={{ __html: project.project_name }}
                      />
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
                        <span dangerouslySetInnerHTML={{ __html: project.school_name }} /> • <span dangerouslySetInnerHTML={{ __html: project.municipality }} />
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                          <User size={16} className={`mr-2 ${color.accent}`} />
                          <span className="font-semibold mr-1">Responsável:</span> <span dangerouslySetInnerHTML={{ __html: project.teacher_name }} />
                        </div>
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                          <Target size={16} className={`mr-2 ${color.accent}`} />
                          <span className="font-semibold mr-1">Área:</span> {project.area}
                        </div>
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                          <CalendarIcon size={16} className={`mr-2 ${color.accent}`} />
                          <span className="font-semibold mr-1">Período:</span> {project.start_date} a {project.end_date}
                        </div>
                      </div>
                      
                      <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-white dark:border-slate-700 backdrop-blur-sm">
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 opacity-70 ${color.accent}`}>Objetivo</h4>
                        <div 
                          className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: project.objective }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'notes':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Minhas Anotações</h1>
                <p className="text-slate-500 mt-1">Ideias, rascunhos e lembretes</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center mr-2">
                  <button 
                    onClick={() => setNotesViewMode('grid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all ${notesViewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    <LayoutDashboard size={14} className="mr-1.5" />
                    Grade
                  </button>
                  <button 
                    onClick={() => {
                      setNotesViewMode('canvas');
                      // Initialize positions if they don't exist
                      if (notes.some(n => n.x === undefined)) {
                        const newNotes = notes.map((n, i) => ({
                          ...n,
                          x: n.x ?? (i % 3) * 320,
                          y: n.y ?? Math.floor(i / 3) * 350,
                          z_index: n.z_index ?? i
                        }));
                        setNotes(newNotes);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all ${notesViewMode === 'canvas' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    <Zap size={14} className="mr-1.5" />
                    Pilha (Amontoar)
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setEditingNoteId(null);
                    setNewNoteTitle('');
                    setNewNoteContent('');
                    setNewNoteColor('bg-yellow-100');
                    setIsNoteModalOpen(true);
                  }} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
                >
                  <Plus size={16} className="mr-2" />
                  Nova Nota
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <button onClick={() => setNoteColorFilter(null)} className={`px-3 py-1 rounded-full text-xs font-bold ${noteColorFilter === null ? 'bg-slate-800 text-white' : 'bg-slate-200'}`}>Todos</button>
              {['bg-yellow-100', 'bg-blue-100', 'bg-emerald-100', 'bg-purple-100', 'bg-rose-100'].map(color => (
                <button key={color} onClick={() => setNoteColorFilter(color)} className={`w-6 h-6 rounded-full ${color} ${noteColorFilter === color ? 'ring-2 ring-slate-800' : ''}`} />
              ))}
              {notesViewMode === 'canvas' && (
                <button 
                  onClick={() => {
                    const newNotes = notes.map((n, i) => ({
                      ...n,
                      x: 50 + Math.random() * 20,
                      y: 50 + Math.random() * 20,
                      z_index: i
                    }));
                    setNotes(newNotes);
                    showToast('Notas amontoadas!');
                  }}
                  className="ml-auto px-3 py-1 bg-slate-800 text-white rounded-full text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  Amontoar Tudo
                </button>
              )}
            </div>

            <div className={notesViewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "relative min-h-[600px] bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden"}>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleNoteDragEnd}
              >
                {notesViewMode === 'grid' ? (
                  <SortableContext 
                    items={filteredNotes.map(n => n.id)}
                    strategy={rectSortingStrategy}
                  >
                    {filteredNotes.map(note => (
                      <SortableNoteItem key={note.id} note={note} onEdit={handleEditNote} onDelete={handleDeleteNote} />
                    ))}
                  </SortableContext>
                ) : (
                  filteredNotes.map(note => (
                    <DraggableNoteItem key={note.id} note={note} onEdit={handleEditNote} onDelete={handleDeleteNote} />
                  ))
                )}
              </DndContext>
              {filteredNotes.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
                  <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium text-slate-700 mb-2">Nenhuma anotação</p>
                  <p>Clique em "Nova Nota" para começar a escrever.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-5xl mx-auto pb-12">
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Configurações</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Personalize sua experiência no PlannerPro</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sidebar Navigation for Settings */}
              <div className="lg:col-span-1 space-y-2">
                <button 
                  onClick={() => setActiveSettingsTab('profile')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSettingsTab === 'profile' ? 'bg-white dark:bg-slate-800 shadow-sm border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                >
                  <UserCircle size={20} />
                  <span>Perfil</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('notifications')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSettingsTab === 'notifications' ? 'bg-white dark:bg-slate-800 shadow-sm border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                >
                  <Bell size={20} />
                  <span>Notificações</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('appearance')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSettingsTab === 'appearance' ? 'bg-white dark:bg-slate-800 shadow-sm border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                >
                  <Palette size={20} />
                  <span>Aparência</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('security')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSettingsTab === 'security' ? 'bg-white dark:bg-slate-800 shadow-sm border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                >
                  <Shield size={20} />
                  <span>Privacidade & Segurança</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('advanced')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSettingsTab === 'advanced' ? 'bg-white dark:bg-slate-800 shadow-sm border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                >
                  <Zap size={20} />
                  <span>Avançado</span>
                </button>
              </div>

              {/* Settings Content */}
              <div className="lg:col-span-2 space-y-8">
                {activeSettingsTab === 'profile' && (
                  <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Perfil Público</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Como os outros verão você na plataforma.</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border-4 border-white dark:border-slate-800 shadow-md overflow-hidden">
                          {settings.profileImage ? (
                            <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User size={40} />
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          className="hidden" 
                          accept="image/*" 
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          Alterar Foto
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome de Exibição</label>
                          <input 
                            type="text" 
                            value={settings.profileName}
                            onChange={(e) => setSettings({...settings, profileName: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">E-mail</label>
                          <input 
                            type="email" 
                            value={settings.profileEmail}
                            onChange={(e) => setSettings({...settings, profileEmail: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {activeSettingsTab === 'notifications' && (
                  <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Notificações</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie como você recebe alertas.</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Bell size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">Notificações Push</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Alertas no navegador sobre tarefas e eventos.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={settings.notifications} onChange={(e) => setSettings({...settings, notifications: e.target.checked})} />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Mail size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">Atualizações por E-mail</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Resumo diário das suas atividades.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={settings.emailUpdates} onChange={(e) => setSettings({...settings, emailUpdates: e.target.checked})} />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </section>
                )}

                {activeSettingsTab === 'appearance' && (
                  <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Aparência</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Personalize o visual do PlannerPro.</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <Palette size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">Modo Escuro</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Reduz o cansaço visual à noite.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={settings.darkMode} onChange={(e) => setSettings({...settings, darkMode: e.target.checked})} />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Cor de Destaque</label>
                        <div className="flex items-center space-x-4">
                          {['indigo', 'rose', 'emerald', 'amber', 'blue'].map(color => (
                            <button
                              key={color}
                              onClick={() => setSettings({...settings, themeColor: color})}
                              className={`w-8 h-8 rounded-full border-4 ${settings.themeColor === color ? 'border-slate-300 dark:border-slate-500' : 'border-transparent'} transition-all`}
                              style={{ backgroundColor: color === 'indigo' ? '#4f46e5' : color === 'rose' ? '#e11d48' : color === 'emerald' ? '#059669' : color === 'amber' ? '#d97706' : '#2563eb' }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Idioma do Sistema</label>
                        <div className="flex items-center space-x-3">
                          <Globe size={18} className="text-slate-400" />
                          <select 
                            value={settings.language}
                            onChange={(e) => setSettings({...settings, language: e.target.value})}
                            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="pt-BR">Português (Brasil)</option>
                            <option value="en-US">English (US)</option>
                            <option value="es-ES">Español</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {activeSettingsTab === 'security' && (
                  <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Privacidade & Segurança</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Proteja sua conta e seus dados.</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                            <Lock size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">Autenticação em Duas Etapas</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Camada extra de proteção.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={settings.twoFactor} onChange={(e) => setSettings({...settings, twoFactor: e.target.checked})} />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Eye size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">Perfil Público</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Permitir que outros vejam seu perfil.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={settings.publicProfile} onChange={(e) => setSettings({...settings, publicProfile: e.target.checked})} />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </section>
                )}

                {activeSettingsTab === 'advanced' && (
                  <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Avançado</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configurações técnicas e exportação.</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Zap size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">Salvamento Automático</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sincroniza alterações instantaneamente.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={settings.autoSave} onChange={(e) => setSettings({...settings, autoSave: e.target.checked})} />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Gerenciamento de Dados</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button 
                            onClick={exportToCSV}
                            className="flex items-center justify-center space-x-2 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                          >
                            <Download size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-slate-700 dark:text-slate-200">Exportar CSV</span>
                          </button>
                          <button 
                            onClick={exportToPDF}
                            className="flex items-center justify-center space-x-2 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                          >
                            <FileDown size={20} className="text-rose-600 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-slate-700 dark:text-slate-200">Exportar PDF</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button className="flex items-center space-x-2 text-rose-600 font-semibold hover:text-rose-700 transition-colors">
                          <Trash2 size={18} />
                          <span>Excluir todos os dados permanentemente</span>
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex justify-end space-x-4">
                  <button className="px-6 py-2 text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Descartar
                  </button>
                  <button 
                    onClick={handleSaveSettings}
                    className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-0.5"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Configuração Necessária</h1>
          <p className="text-slate-600 mb-8">
            As variáveis de ambiente do Supabase (<code className="bg-slate-100 px-1 rounded text-red-600">VITE_SUPABASE_URL</code> e <code className="bg-slate-100 px-1 rounded text-red-600">VITE_SUPABASE_ANON_KEY</code>) não foram encontradas.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-8">
            <h3 className="text-amber-800 font-semibold text-sm mb-2 flex items-center">
              <Lock className="w-4 h-4 mr-2" /> Como configurar:
            </h3>
            <ol className="text-amber-700 text-xs space-y-2 list-decimal ml-4">
              <li>Abra o menu <strong>Settings</strong> no AI Studio.</li>
              <li>Vá para a aba <strong>Secrets</strong>.</li>
              <li>Adicione as chaves mencionadas acima com seus respectivos valores do painel do Supabase.</li>
              <li>Reinicie o servidor de desenvolvimento.</li>
            </ol>
          </div>
          <p className="text-xs text-slate-400">
            O aplicativo requer o Supabase para autenticação e persistência de dados.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
          <div className="p-8">
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-600 overflow-hidden">
                <img src="https://i.imgur.com/Ol3kCKd.png" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {authMode === 'login' ? 'Acesse sua conta para continuar' : 'Comece a organizar sua vida hoje'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center space-x-2 group"
              >
                <span>{authMode === 'login' ? 'Entrar' : 'Cadastrar'}</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">Ou continue com</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google</span>
            </button>
          </div>
          
          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {authMode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="ml-1 text-indigo-600 font-bold hover:underline"
              >
                {authMode === 'login' ? 'Cadastre-se' : 'Faça login'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 flex flex-col z-10">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none bg-white dark:bg-slate-800">
            <img 
              src="https://i.imgur.com/ON9PJTM.png" 
              alt="Logo" 
              className="w-full h-full object-contain p-1" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">PlannerPro</span>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-3">Menu Principal</div>
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} colorClass="indigo" />
          <NavItem icon={<ListTodo size={18} />} label="Tarefas" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} colorClass="emerald" />
          <NavItem icon={<CalendarDays size={18} />} label="Calendário" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} colorClass="amber" />
          <NavItem icon={<Compass size={18} />} label="Planejamento" active={activeTab === 'planning'} onClick={() => setActiveTab('planning')} colorClass="rose" />
          <NavItem icon={<StickyNote size={18} />} label="Anotações" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} colorClass="cyan" />
          <NavItem icon={<FolderKanban size={18} />} label="Projetos" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} colorClass="violet" />
        </nav>

        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <NavItem icon={<Sliders size={18} />} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} colorClass="slate" />
          <div className="mt-4 flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 overflow-hidden ring-2 ring-white dark:ring-slate-800">
                {settings.profileImage ? (
                  <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate w-28">{settings.profileName}</span>
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Plano Pro</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2 w-96 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
            <Search size={18} className="text-slate-400 dark:text-slate-300" />
            <input 
              type="text" 
              placeholder="Buscar tarefas, eventos ou notas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder:text-slate-400 dark:placeholder:text-slate-400 dark:text-slate-100"
            />
            {isSearching && (
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-2"></div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2 rounded-full transition-colors relative ${isNotificationsOpen ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">Notificações</h3>
                    {unreadNotificationsCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`p-4 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.read ? 'bg-indigo-50/30' : ''}`}
                          onClick={() => {
                            setNotifications(notifications.map(n => n.id === notification.id ? { ...n, read: true } : n));
                          }}
                        >
                          <div className="flex items-start">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              notification.type === 'event' ? 'bg-blue-100 text-blue-600' :
                              notification.type === 'task' ? 'bg-amber-100 text-amber-600' :
                              'bg-emerald-100 text-emerald-600'
                            }`}>
                              {notification.type === 'event' ? <CalendarIcon size={14} /> :
                               notification.type === 'task' ? <CheckSquare size={14} /> :
                               <Bell size={14} />}
                            </div>
                            <div className="ml-3 flex-1">
                              <p className={`text-sm font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                              <p className="text-[10px] font-medium text-slate-400 mt-1.5">{notification.time}</p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5 flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">Nenhuma notificação</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleOpenNewTaskModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
              <Plus size={16} className="mr-2" />
              Nova Tarefa
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {renderContent()}
          
          {/* Task Modal */}
          {isTaskModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-800">{editingTaskId ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                  <button type="button" onClick={() => { setIsTaskModalOpen(false); setEditingTaskId(null); setTaskValidationError(null); }} className="text-slate-400 hover:text-slate-600">
                    <Plus size={32} className="rotate-45" />
                  </button>
                </div>
                <form onSubmit={handleAddTask} className="p-8">
                  {taskValidationError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-base rounded-xl">
                      {taskValidationError}
                    </div>
                  )}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-base font-semibold text-slate-700 mb-2">Título da Tarefa</label>
                      <div className="relative">
                        <RichInput
                          value={newTaskTitle}
                          onChange={setNewTaskTitle}
                          className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          placeholder="Ex: Enviar relatório mensal"
                        />
                        <TextInputActions 
                          onGenerate={setNewTaskTitle} 
                          onEdit={() => {
                            setEditorContent(newTaskTitle);
                            setEditorCallback(() => setNewTaskTitle);
                            setIsEditorModalOpen(true);
                          }}
                          prompt={`Sugira um título profissional e conciso para uma tarefa sobre: ${newTaskTitle}.`} 
                         context={`Título: ${newTaskTitle}\nDescrição: ${newTaskDescription}\nCategoria: ${newTaskCategory}`}  currentValue={newTaskTitle} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-slate-700 mb-2">Descrição / Palavras-chave</label>
                      <div className="relative">
                        <RichInput
                          value={newTaskDescription}
                          onChange={setNewTaskDescription}
                          className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          placeholder="Adicione detalhes ou palavras-chave para busca..."
                        />
                        <TextInputActions 
                          onGenerate={setNewTaskDescription} 
                          onEdit={() => {
                            setEditorContent(newTaskDescription);
                            setEditorCallback(() => setNewTaskDescription);
                            setIsEditorModalOpen(true);
                          }}
                          prompt={`Sugira uma descrição detalhada e palavras-chave relevantes para uma tarefa com o título: ${newTaskTitle}.`} 
                         context={`Título: ${newTaskTitle}\nDescrição: ${newTaskDescription}\nCategoria: ${newTaskCategory}`}  currentValue={newTaskDescription} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Categoria</label>
                        <select 
                          value={newTaskCategory}
                          onChange={(e) => setNewTaskCategory(e.target.value as any)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                          <option value="work">Trabalho</option>
                          <option value="personal">Pessoal</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Ação de Planejamento (Opcional)</label>
                        <select 
                          value={newTaskPlanningActionId}
                          onChange={(e) => setNewTaskPlanningActionId(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                          <option value="">Nenhuma</option>
                          {planningActionsList.map(action => (
                            <option key={action.id} value={action.id}>{stripHtml(action.goal)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Data de Início (Opcional)</label>
                        <input 
                          type="date" 
                          value={newTaskStartDate}
                          onChange={(e) => setNewTaskStartDate(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Horário de Início (Opcional)</label>
                        <input 
                          type="time" 
                          value={newTaskStartTime}
                          onChange={(e) => setNewTaskStartTime(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Lembrete (Opcional)</label>
                        <select 
                          value={newTaskReminder}
                          onChange={(e) => setNewTaskReminder(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                          <option value="">Sem lembrete</option>
                          <option value="5">5 minutos antes</option>
                          <option value="15">15 minutos antes</option>
                          <option value="30">30 minutos antes</option>
                          <option value="60">1 hora antes</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Data de Fim (Opcional)</label>
                        <input 
                          type="date" 
                          value={newTaskEndDate}
                          onChange={(e) => setNewTaskEndDate(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Horário de Fim (Opcional)</label>
                        <input 
                          type="time" 
                          value={newTaskEndTime}
                          onChange={(e) => setNewTaskEndTime(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 flex space-x-4">
                    <button 
                      type="button" 
                      onClick={() => { setIsTaskModalOpen(false); setEditingTaskId(null); }}
                      className="flex-1 px-6 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold text-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                    >
                      {editingTaskId ? 'Salvar Alterações' : 'Adicionar Tarefa'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Comment Modal */}
          {isCommentModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-800">Comentários da Tarefa</h3>
                  <button type="button" onClick={() => { setIsCommentModalOpen(false); setCommentingTaskId(null); }} className="text-slate-400 hover:text-slate-600">
                    <Plus size={32} className="rotate-45" />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {tasks.find(t => t.id === commentingTaskId)?.comments?.map((comment, index) => (
                      <div 
                        key={index} 
                        className="text-base text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100"
                        dangerouslySetInnerHTML={{ __html: comment }}
                      />
                    ))}
                    {(!tasks.find(t => t.id === commentingTaskId)?.comments || tasks.find(t => t.id === commentingTaskId)?.comments?.length === 0) && (
                      <div className="py-10 text-center">
                        <MessageSquare className="mx-auto text-slate-300 mb-2" size={48} />
                        <p className="text-lg text-slate-500">Nenhum comentário ainda.</p>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3 pt-4 border-t border-slate-100">
                    <div className="relative flex-1">
                      <RichInput
                        value={newCommentText}
                        onChange={setNewCommentText}
                        className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        placeholder="Escreva um comentário..."
                      />
                      <TextInputActions 
                        onGenerate={setNewCommentText} 
                        onEdit={() => {
                          setEditorContent(newCommentText);
                          setEditorCallback(() => setNewCommentText);
                          setIsEditorModalOpen(true);
                        }}
                        prompt={`Sugira um comentário profissional e construtivo sobre: ${newCommentText}.`} 
                       context={`Comentário inicial: ${newCommentText}`}  currentValue={newCommentText} />
                    </div>
                    <button 
                      onClick={handleAddComment}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-100"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Event Modal */}
          {isEventModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-800">{editingEventId ? 'Editar Evento' : 'Novo Evento'}</h3>
                  <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={32} className="rotate-45" />
                  </button>
                </div>
                <form onSubmit={handleAddEvent} className="p-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-base font-semibold text-slate-700 mb-2">Título do Evento</label>
                      <div className="relative">
                        <RichInput
                          value={newEventTitle}
                          onChange={setNewEventTitle}
                          className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          placeholder="Ex: Reunião de Alinhamento"
                        />
                        <TextInputActions 
                          onGenerate={setNewEventTitle} 
                          onEdit={() => {
                            setEditorContent(newEventTitle);
                            setEditorCallback(() => setNewEventTitle);
                            setIsEditorModalOpen(true);
                          }}
                          prompt={`Sugira um título profissional e conciso para um evento sobre: ${newEventTitle}.`} 
                         context={`Título do Evento: ${newEventTitle}\nHorário Inicial: ${newEventStartDate}`}  currentValue={newEventTitle} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Data de Início</label>
                        <input 
                          type="date" 
                          required
                          value={newEventStartDate}
                          onChange={(e) => setNewEventStartDate(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Horário de Início</label>
                        <input 
                          type="time" 
                          required
                          value={newEventStartTime}
                          onChange={(e) => setNewEventStartTime(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Data de Fim</label>
                        <input 
                          type="date" 
                          required
                          value={newEventEndDate}
                          onChange={(e) => setNewEventEndDate(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Horário de Fim</label>
                        <input 
                          type="time" 
                          required
                          value={newEventEndTime}
                          onChange={(e) => setNewEventEndTime(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Número de Participantes</label>
                        <input 
                          type="number" 
                          min="1"
                          required
                          value={newEventAttendees}
                          onChange={(e) => setNewEventAttendees(parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Lembrete (Opcional)</label>
                        <select 
                          value={newEventReminder}
                          onChange={(e) => setNewEventReminder(e.target.value)}
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                          <option value="">Sem lembrete</option>
                          <option value="5">5 minutos antes</option>
                          <option value="15">15 minutos antes</option>
                          <option value="30">30 minutos antes</option>
                          <option value="60">1 hora antes</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-base font-semibold text-slate-700 mb-3">Cor do Evento</label>
                      <div className="flex space-x-4">
                        {[
                          { id: 'indigo', class: 'bg-indigo-500' },
                          { id: 'emerald', class: 'bg-emerald-500' },
                          { id: 'rose', class: 'bg-rose-500' },
                          { id: 'amber', class: 'bg-amber-500' },
                          { id: 'blue', class: 'bg-blue-500' },
                        ].map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setNewEventColor(c.id)}
                            className={`w-10 h-10 rounded-full ${c.class} transition-all ${newEventColor === c.id ? 'ring-4 ring-offset-2 ring-slate-300 scale-110' : 'hover:scale-105'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 flex space-x-4">
                    <button 
                      type="button" 
                      onClick={() => setIsEventModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold text-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                    >
                      {editingEventId ? 'Salvar Alterações' : 'Criar Evento'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Planning Modal */}
          {isPlanningModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-2xl font-bold text-slate-800">{editingPlanningId ? 'Editar Ação de Planejamento' : 'Nova Ação de Planejamento'}</h3>
                  <button onClick={() => {
                    setIsPlanningModalOpen(false);
                    setEditingPlanningId(null);
                    setPlanningGoal('');
                    setPlanningSpecificGoals('');
                    setPlanningActions('');
                    setPlanningMethodology('');
                    setPlanningStartDate('');
                    setPlanningEndDate('');
                  }} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <Plus size={32} className="rotate-45" />
                  </button>
                </div>
                <form onSubmit={handleAddPlanningAction} className="p-8 overflow-y-auto">
                  <div className="space-y-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Objetivo Geral</label>
                        <div className="relative">
                          <RichInput
                            value={planningGoal} 
                            onChange={setPlanningGoal} 
                            placeholder="Qual o objetivo principal desta ação?"
                            className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white" 
                          />
                          <TextInputActions 
                            onGenerate={setPlanningGoal} 
                            onEdit={() => {
                              setEditorContent(planningGoal);
                              setEditorCallback(() => setPlanningGoal);
                              setIsEditorModalOpen(true);
                            }}
                            prompt={`Como um especialista sênior em gestão educacional, elabore um objetivo geral robusto, claro e objetivo para um plano de ação focado em: ${planningGoal || 'um tema educacional relevante'}. O texto deve ser profissional, inspirador e direto.`} 
                           context={`Objetivo Geral: ${planningGoal}\nObjetivos Específicos: ${planningSpecificGoals}\nAções: ${planningActions}\nMetodologia: ${planningMethodology}`}  currentValue={planningGoal} />
                        </div>
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Objetivos Específicos</label>
                        <div className="relative">
                          <RichInput
                            isTextArea
                            value={planningSpecificGoals} 
                            onChange={setPlanningSpecificGoals} 
                            placeholder="Liste os objetivos detalhados..."
                            className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white" 
                          />
                          <TextInputActions 
                            isTextArea
                            onGenerate={setPlanningSpecificGoals} 
                            onEdit={() => {
                              setEditorContent(planningSpecificGoals);
                              setEditorCallback(() => setPlanningSpecificGoals);
                              setIsEditorModalOpen(true);
                            }}
                            prompt={`Com base no objetivo geral "${planningGoal || 'definido anteriormente'}", elabore objetivos específicos (SMART) claros, objetivos e tecnicamente precisos para: ${planningSpecificGoals || 'as metas do projeto'}. Use linguagem de especialista em educação.`} 
                           context={`Objetivo Geral: ${planningGoal}\nObjetivos Específicos: ${planningSpecificGoals}\nAções: ${planningActions}\nMetodologia: ${planningMethodology}`}  currentValue={planningSpecificGoals} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Ações</label>
                        <div className="relative">
                          <RichInput
                            isTextArea
                            value={planningActions} 
                            onChange={setPlanningActions} 
                            placeholder="Quais passos serão tomados?"
                            className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white" 
                          />
                          <TextInputActions 
                            isTextArea
                            onGenerate={setPlanningActions} 
                            onEdit={() => {
                              setEditorContent(planningActions);
                              setEditorCallback(() => setPlanningActions);
                              setIsEditorModalOpen(true);
                            }}
                            prompt={`Considerando o objetivo "${planningGoal || 'principal'}" e os objetivos específicos "${planningSpecificGoals || 'detalhados'}", detalhe ações práticas, estratégicas e objetivas para: ${planningActions || 'a execução do plano'}. Use terminologia pedagógica avançada.`} 
                           context={`Objetivo Geral: ${planningGoal}\nObjetivos Específicos: ${planningSpecificGoals}\nAções: ${planningActions}\nMetodologia: ${planningMethodology}`}  currentValue={planningActions} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-slate-700 mb-2">Metodologia</label>
                      <div className="relative">
                        <RichInput
                          isTextArea
                          value={planningMethodology} 
                          onChange={setPlanningMethodology} 
                          placeholder="Como as ações serão executadas?"
                          className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white" 
                        />
                        <TextInputActions 
                          isTextArea
                          onGenerate={setPlanningMethodology} 
                          onEdit={() => {
                            setEditorContent(planningMethodology);
                            setEditorCallback(() => setPlanningMethodology);
                            setIsEditorModalOpen(true);
                          }}
                          prompt={`Baseado no plano que visa "${planningGoal || 'o objetivo central'}" através das ações "${planningActions || 'estratégicas'}", descreva uma metodologia pedagógica robusta, profissional e clara para: ${planningMethodology || 'a implementação do projeto'}. Foque em eficácia e rigor técnico.`} 
                         context={`Objetivo Geral: ${planningGoal}\nObjetivos Específicos: ${planningSpecificGoals}\nAções: ${planningActions}\nMetodologia: ${planningMethodology}`}  currentValue={planningMethodology} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2 flex items-center">
                          <Clock size={18} className="mr-2 text-slate-400" />
                          Data Inicial
                        </label>
                        <input 
                          type="date" 
                          value={planningStartDate} 
                          onChange={(e) => setPlanningStartDate(e.target.value)} 
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2 flex items-center">
                          <Clock size={18} className="mr-2 text-slate-400" />
                          Data Final
                        </label>
                        <input 
                          type="date" 
                          value={planningEndDate} 
                          onChange={(e) => setPlanningEndDate(e.target.value)} 
                          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-6 border-t border-slate-100 mt-8 space-x-4">
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsPlanningModalOpen(false);
                          setEditingPlanningId(null);
                          setPlanningGoal('');
                          setPlanningSpecificGoals('');
                          setPlanningActions('');
                          setPlanningMethodology('');
                          setPlanningStartDate('');
                          setPlanningEndDate('');
                        }} 
                        className="px-6 py-3 text-base font-bold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-10 py-3 text-lg font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                      >
                        {editingPlanningId ? 'Atualizar Ação' : 'Salvar Ação'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Note Modal */}
          {isNoteModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-800">{editingNoteId ? 'Editar Anotação' : 'Nova Anotação'}</h3>
                  <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={32} className="rotate-45" />
                  </button>
                </div>
                <form onSubmit={handleAddNote} className="p-8">
                  <div className="space-y-6">
                    <div className="relative">
                      <RichInput
                        value={newNoteTitle}
                        onChange={setNewNoteTitle}
                        className="w-full px-4 py-3 pr-20 text-3xl font-bold border-none focus:outline-none placeholder:text-slate-300 bg-transparent"
                        placeholder="Título da anotação..."
                      />
                      <TextInputActions 
                        onGenerate={setNewNoteTitle} 
                        onEdit={() => {
                          setEditorContent(newNoteTitle);
                          setEditorCallback(() => setNewNoteTitle);
                          setIsEditorModalOpen(true);
                        }}
                        prompt={`Sugira um título criativo e inspirador para uma anotação sobre: ${newNoteTitle}.`} 
                       context={`Título: ${newNoteTitle}\nConteúdo atual: ${newNoteContent}`}  currentValue={newNoteTitle} />
                    </div>
                    <div className="relative">
                      <RichInput
                        isTextArea
                        value={newNoteContent}
                        onChange={setNewNoteContent}
                        className="w-full px-4 py-3 pr-20 text-xl border-none focus:outline-none placeholder:text-slate-300 bg-transparent"
                        placeholder="Comece a escrever suas ideias incríveis aqui..."
                      />
                      <TextInputActions 
                        isTextArea
                        onGenerate={setNewNoteContent} 
                        onEdit={() => {
                          setEditorContent(newNoteContent);
                          setEditorCallback(() => setNewNoteContent);
                          setIsEditorModalOpen(true);
                        }}
                        prompt={`Desenvolva o conteúdo desta anotação de forma criativa e detalhada, com base em: ${newNoteContent}.`} 
                       context={`Título: ${newNoteTitle}\nConteúdo atual: ${newNoteContent}`}  currentValue={newNoteContent} />
                    </div>
                    <div className="flex items-center space-x-4 pt-6 border-t border-slate-100">
                      <span className="text-base font-semibold text-slate-600 uppercase tracking-wider">Cor do Card:</span>
                      <div className="flex space-x-3">
                        {['bg-yellow-100', 'bg-blue-100', 'bg-emerald-100', 'bg-purple-100', 'bg-rose-100'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewNoteColor(color)}
                            className={`w-10 h-10 rounded-full ${color} border-2 transition-all ${newNoteColor === color ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 flex space-x-4">
                    <button 
                      type="button" 
                      onClick={() => setIsNoteModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold text-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    >
                      {editingNoteId ? 'Atualizar Nota' : 'Salvar Nota'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Project Modal */}
          {isProjectModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
              <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-200/50 dark:border-slate-700/50 w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-10">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{editingProjectId ? 'Editar Projeto' : 'Novo Projeto'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Preencha os detalhes do seu projeto educacional</p>
                  </div>
                  <button type="button" onClick={() => { setIsProjectModalOpen(false); resetProjectForm(); }} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 shrink-0">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                    style={{ 
                      width: `${((['identificacao', 'informacoes', 'descricao', 'periodo', 'resultados', 'registro'].indexOf(projectModalTab) + 1) / 6) * 100}%` 
                    }}
                  />
                </div>

                {/* Tab Navigation */}
                <div className="px-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 overflow-x-auto no-scrollbar">
                  <div className="flex space-x-8 min-w-max">
                    {[
                      { id: 'identificacao', label: 'Identificação', icon: Fingerprint },
                      { id: 'informacoes', label: 'Informações', icon: Info },
                      { id: 'descricao', label: 'Descrição', icon: AlignLeft },
                      { id: 'periodo', label: 'Período', icon: CalendarIcon },
                      { id: 'resultados', label: 'Resultados', icon: Award },
                      { id: 'registro', label: 'Registro', icon: ClipboardCheck }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProjectModalTab(tab.id)}
                        className={`py-4 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${
                          projectModalTab === tab.id 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-10 overflow-y-auto flex-1 custom-scrollbar">
                  <form id="project-form" onSubmit={handleSaveProject} className="space-y-0">
                  
                  {/* 1. Identificação */}
                  {projectModalTab === 'identificacao' && (
                    <section>
                      <div className="mb-8">
                        <h4 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                          <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                          Identificação da Unidade e Projeto
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome da Escola</label>
                          <div className="relative">
                            <RichInput required value={projectSchoolName || ''} onChange={setProjectSchoolName} className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            <TextInputActions 
                              onGenerate={setProjectSchoolName} 
                              onEdit={() => {
                                setEditorContent(projectSchoolName);
                                setEditorCallback(() => setProjectSchoolName);
                                setIsEditorModalOpen(true);
                              }}
                              prompt={`Sugira um nome de escola fictício ou profissional para um projeto educacional.`} 
                              currentValue={projectSchoolName} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Município</label>
                          <div className="relative">
                            <RichInput required value={projectMunicipality || ''} onChange={setProjectMunicipality} className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            <TextInputActions 
                              onGenerate={setProjectMunicipality} 
                              onEdit={() => {
                                setEditorContent(projectMunicipality);
                                setEditorCallback(() => setProjectMunicipality);
                                setIsEditorModalOpen(true);
                              }}
                              prompt={`Sugira um município brasileiro.`} 
                              currentValue={projectMunicipality} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome do Projeto</label>
                          <div className="relative">
                            <RichInput required value={projectName || ''} onChange={setProjectName} className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            <TextInputActions 
                              onGenerate={setProjectName} 
                              onEdit={() => {
                                setEditorContent(projectName);
                                setEditorCallback(() => setProjectName);
                                setIsEditorModalOpen(true);
                              }}
                              prompt={`Como um especialista em inovação educacional, sugira um nome de projeto impactante, criativo e profissional para um projeto na área de ${projectArea || 'Educação'} na escola ${projectSchoolName || 'da rede'}, focado em: ${projectName || 'um tema relevante'}.`} 
                              currentValue={projectName} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Professor(a) / Responsável</label>
                          <div className="relative">
                            <RichInput required value={projectTeacherName || ''} onChange={setProjectTeacherName} className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            <TextInputActions 
                              onGenerate={setProjectTeacherName} 
                              onEdit={() => {
                                setEditorContent(projectTeacherName);
                                setEditorCallback(() => setProjectTeacherName);
                                setIsEditorModalOpen(true);
                              }}
                              prompt={`Sugira um nome de professor.`} 
                              currentValue={projectTeacherName} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Contato (E-mail ou Telefone)</label>
                          <div className="relative">
                            <RichInput required value={projectContact || ''} onChange={setProjectContact} className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            <TextInputActions 
                              onGenerate={setProjectContact} 
                              onEdit={() => {
                                setEditorContent(projectContact);
                                setEditorCallback(() => setProjectContact);
                                setIsEditorModalOpen(true);
                              }}
                              prompt={`Sugira um formato de contato.`} 
                              currentValue={projectContact} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 2. Informações do Projeto */}
                  {projectModalTab === 'informacoes' && (
                    <section>
                      <div className="mb-8">
                        <h4 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                          <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                          Informações do Projeto
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">Área / Disciplina</label>
                          <div className="space-y-3">
                            {['Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia', 'Tecnologia / Inovação', 'Interdisciplinar'].map(area => (
                              <label key={area} className="flex items-center space-x-3 text-base text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600 transition-colors">
                                <input type="radio" name="projectArea" value={area} checked={projectArea === area} onChange={e => setProjectArea(e.target.value)} className="w-5 h-5 text-indigo-600 focus:ring-indigo-500" required />
                                <span>{area}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">Público atendido</label>
                          <div className="space-y-3 mb-6">
                            {['Ensino Fundamental Anos Iniciais', 'Ensino Fundamental Anos Finais', 'Ensino Médio', 'EJA'].map(audience => (
                              <label key={audience} className="flex items-center space-x-3 text-base text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600 transition-colors">
                                <input type="radio" name="projectTargetAudience" value={audience} checked={projectTargetAudience === audience} onChange={e => setProjectTargetAudience(e.target.value)} className="w-5 h-5 text-indigo-600 focus:ring-indigo-500" required />
                                <span>{audience}</span>
                              </label>
                            ))}
                          </div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Número de estudantes participantes</label>
                          <input type="number" min="0" required value={projectStudentCount} onChange={e => setProjectStudentCount(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 3. Descrição do Projeto */}
                  {projectModalTab === 'descricao' && (
                    <section>
                      <div className="mb-8">
                        <h4 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                          <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                          Descrição do Projeto
                        </h4>
                      </div>
                      <div className="space-y-8">
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Objetivo do Projeto</label>
                          <div className="relative">
                            <RichInput isTextArea required value={projectObjective || ''} onChange={setProjectObjective} className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Descreva em poucas linhas." />
                            <TextInputActions 
                              isTextArea
                              onGenerate={setProjectObjective} 
                              onEdit={() => {
                                setEditorContent(projectObjective);
                                setEditorCallback(() => setProjectObjective);
                                setIsEditorModalOpen(true);
                              }}
                              prompt={`Para o projeto "${projectName || 'Educacional'}" na área de ${projectArea || 'Educação'} voltado para ${projectTargetAudience || 'estudantes'}, redija um objetivo geral robusto, técnico e claro que descreva: ${projectObjective || 'o propósito do projeto'}.`}
                               currentValue={projectObjective} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Principais atividades desenvolvidas</label>
                          <div className="relative">
                            <RichInput isTextArea required value={projectActivities} onChange={setProjectActivities} className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            <TextInputActions 
                              isTextArea
                              onGenerate={setProjectActivities} 
                              onEdit={() => {
                                setEditorContent(projectActivities);
                                setEditorCallback(() => setProjectActivities);
                                setIsEditorModalOpen(true);
                              }}
                              prompt={`Com base no projeto "${projectName || 'Educacional'}" e seu objetivo de "${projectObjective || 'desenvolvimento'} ", detalhe as principais atividades pedagógicas de forma profissional, sequencial e objetiva para: ${projectActivities || 'a execução das tarefas'}.`}
                               currentValue={projectActivities} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 4. Período de Realização */}
                  {projectModalTab === 'periodo' && (
                    <section>
                      <div className="mb-8">
                        <h4 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                          <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                          Período de Realização
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Data de início</label>
                          <input type="date" required value={projectStartDate} onChange={e => setProjectStartDate(e.target.value)} className="w-full px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Data de término</label>
                          <input type="date" required value={projectEndDate} onChange={e => setProjectEndDate(e.target.value)} className="w-full px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 5. Resultados Esperados */}
                  {projectModalTab === 'resultados' && (
                    <section>
                      <div className="mb-8">
                        <h4 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                          <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">5</span>
                          Resultados Esperados
                        </h4>
                      </div>
                      <div className="space-y-4">
                        <label className="flex items-center p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                          <input type="checkbox" checked={projectResultLearning} onChange={e => setProjectResultLearning(e.target.checked)} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="ml-4 text-base text-slate-700 dark:text-slate-300">Melhorar a aprendizagem dos estudantes</span>
                        </label>
                        <label className="flex items-center p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                          <input type="checkbox" checked={projectResultReading} onChange={e => setProjectResultReading(e.target.checked)} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="ml-4 text-base text-slate-700 dark:text-slate-300">Incentivar leitura e escrita</span>
                        </label>
                        <label className="flex items-center p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                          <input type="checkbox" checked={projectResultTech} onChange={e => setProjectResultTech(e.target.checked)} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="ml-4 text-base text-slate-700 dark:text-slate-300">Desenvolver habilidades tecnológicas</span>
                        </label>
                        <label className="flex items-center p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                          <input type="checkbox" checked={projectResultProtagonism} onChange={e => setProjectResultProtagonism(e.target.checked)} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500" />
                          <span className="ml-4 text-base text-slate-700 dark:text-slate-300">Promover protagonismo estudantil</span>
                        </label>
                        <div>
                          <label className="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Outros resultados:</label>
                          <div className="relative">
                            <RichInput value={projectResultOther} onChange={setProjectResultOther} className="w-full px-4 py-3 pr-20 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Especifique outros resultados alcançados..." />
                            <TextInputActions 
                              onGenerate={setProjectResultOther} 
                              onEdit={() => {
                                setEditorContent(projectResultOther);
                                setEditorCallback(() => setProjectResultOther);
                                setIsEditorModalOpen(true);
                              }}
                              prompt={`Considerando o projeto "${projectName || 'Educacional'}" e os resultados já selecionados (Aprendizagem: ${projectResultLearning ? 'Sim' : 'Não'}, Leitura: ${projectResultReading ? 'Sim' : 'Não'}, Tecnologia: ${projectResultTech ? 'Sim' : 'Não'}, Protagonismo: ${projectResultProtagonism ? 'Sim' : 'Não'}), sugira outros resultados técnicos, mensuráveis e profissionais para: ${projectResultOther || 'o impacto do projeto'}.`}
                               currentValue={projectResultOther} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 6. Registro do Projeto */}
                  {projectModalTab === 'registro' && (
                    <section>
                      <div className="mb-8">
                        <h4 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                          <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">6</span>
                          Registro do Projeto
                        </h4>
                      </div>
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <label className="flex items-center p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                            <input type="checkbox" checked={projectHasPhotos} onChange={e => setProjectHasPhotos(e.target.checked)} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500" />
                            <span className="ml-4 text-base text-slate-700 dark:text-slate-300">O projeto possui fotos ou registros</span>
                          </label>
                          <label className="flex items-center p-5 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                            <input type="checkbox" checked={projectCanPublish} onChange={e => setProjectCanPublish(e.target.checked)} className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500" />
                            <span className="ml-4 text-base text-slate-700 dark:text-slate-300">Autorizo a divulgação pela Secretaria/DIREC</span>
                          </label>
                        </div>
                        
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 space-y-8">
                          <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center">
                            <CheckCircle2 size={28} className="mr-4 text-indigo-600 dark:text-indigo-400" />
                            Responsável pelo envio das informações
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">Nome Completo</label>
                              <div className="relative">
                                <RichInput required value={projectSubmitterName} onChange={setProjectSubmitterName} className="w-full px-4 py-3 pr-20 text-lg border border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                                <TextInputActions 
                                  onGenerate={setProjectSubmitterName} 
                                  onEdit={() => {
                                    setEditorContent(projectSubmitterName);
                                    setEditorCallback(() => setProjectSubmitterName);
                                    setIsEditorModalOpen(true);
                                  }}
                                  prompt={`Sugira um nome de responsável.`}
                               currentValue={projectSubmitterName} 
                              context={`Escola: ${projectSchoolName}\nMunicípio: ${projectMunicipality}\nProjeto: ${projectName}\nProfessor: ${projectTeacherName}\nContato: ${projectContact}\nÁrea: ${projectArea}\nPúblico: ${projectTargetAudience}\nObjetivo: ${projectObjective}\nAtividades: ${projectActivities}\nResultados adicionais: ${projectResultOther}`}
                            />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">Data de Envio</label>
                              <input type="date" required value={projectSubmitDate} onChange={e => setProjectSubmitDate(e.target.value)} className="w-full px-4 py-3 text-lg border border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                  </form>
                </div>

                <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-b-[24px]">
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => {
                        const tabs = ['identificacao', 'informacoes', 'descricao', 'periodo', 'resultados', 'registro'];
                        const currentIndex = tabs.indexOf(projectModalTab);
                        if (currentIndex > 0) setProjectModalTab(tabs[currentIndex - 1]);
                      }}
                      disabled={projectModalTab === 'identificacao'}
                      className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all flex items-center ${
                        projectModalTab === 'identificacao' 
                          ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <ChevronLeft size={18} className="mr-1.5" />
                      Anterior
                    </button>
                    
                    {projectModalTab !== 'registro' ? (
                      <button 
                        type="button"
                        onClick={() => {
                          const tabs = ['identificacao', 'informacoes', 'descricao', 'periodo', 'resultados', 'registro'];
                          const currentIndex = tabs.indexOf(projectModalTab);
                          if (currentIndex < tabs.length - 1) setProjectModalTab(tabs[currentIndex + 1]);
                        }}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-medium text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 flex items-center shadow-sm"
                      >
                        Próximo
                        <ChevronRight size={18} className="ml-1.5" />
                      </button>
                    ) : (
                      <button 
                        type="submit"
                        form="project-form"
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-medium text-sm hover:bg-indigo-700 transition-all active:scale-95 flex items-center shadow-sm shadow-indigo-200 dark:shadow-none"
                      >
                        <CheckCircle2 size={18} className="mr-1.5" />
                        {editingProjectId ? 'Salvar Alterações' : 'Finalizar e Salvar'}
                      </button>
                    )}
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => { setIsProjectModalOpen(false); resetProjectForm(); }}
                    className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-medium text-sm hover:text-rose-600 transition-colors rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Editor Modal */}
          <TextEditorModal 
            isOpen={isEditorModalOpen} 
            onClose={() => setIsEditorModalOpen(false)} 
            text={editorContent}
            onSave={(text) => {
              if (typeof editorCallback === 'function') {
                editorCallback(text);
              }
              setIsEditorModalOpen(false);
            }}
          />

        </main>
      </div>

      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] flex items-center space-x-3 px-6 py-3 bg-slate-800 text-white rounded-2xl shadow-2xl border border-slate-700"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={20} className="text-emerald-400" />
            ) : (
              <Bell size={20} className="text-rose-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, colorClass = 'indigo' }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, colorClass?: string }) {
  const colorStyles = {
    indigo: {
      activeBg: 'bg-indigo-50 dark:bg-indigo-900/30',
      activeText: 'text-indigo-700 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
      iconText: 'text-indigo-600 dark:text-indigo-400',
    },
    emerald: {
      activeBg: 'bg-emerald-50 dark:bg-emerald-900/30',
      activeText: 'text-emerald-700 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconText: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      activeBg: 'bg-amber-50 dark:bg-amber-900/30',
      activeText: 'text-amber-700 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconText: 'text-amber-600 dark:text-amber-400',
    },
    rose: {
      activeBg: 'bg-rose-50 dark:bg-rose-900/30',
      activeText: 'text-rose-700 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      iconText: 'text-rose-600 dark:text-rose-400',
    },
    cyan: {
      activeBg: 'bg-cyan-50 dark:bg-cyan-900/30',
      activeText: 'text-cyan-700 dark:text-cyan-400',
      iconBg: 'bg-cyan-100 dark:bg-cyan-900/50',
      iconText: 'text-cyan-600 dark:text-cyan-400',
    },
    violet: {
      activeBg: 'bg-violet-50 dark:bg-violet-900/30',
      activeText: 'text-violet-700 dark:text-violet-400',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      iconText: 'text-violet-600 dark:text-violet-400',
    },
    slate: {
      activeBg: 'bg-slate-100 dark:bg-slate-800',
      activeText: 'text-slate-900 dark:text-slate-100',
      iconBg: 'bg-slate-200 dark:bg-slate-700',
      iconText: 'text-slate-700 dark:text-slate-300',
    }
  };

  const currentStyle = colorStyles[colorClass as keyof typeof colorStyles] || colorStyles.indigo;

  return (
    <button 
      onClick={onClick}
      className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
        active 
          ? `${currentStyle.activeBg} ${currentStyle.activeText} shadow-sm` 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
        active 
          ? `${currentStyle.iconBg} ${currentStyle.iconText}` 
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
      }`}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, subtitle, trend, isAlert, icon, color = 'indigo' }: { title: string, value: string, subtitle: string, trend?: string, isAlert?: boolean, icon?: React.ReactNode, color?: string }) {
  const colorStyles = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
    violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  };

  const currentStyle = colorStyles[color as keyof typeof colorStyles] || colorStyles.indigo;

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${isAlert ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${isAlert ? 'bg-white/20 text-white' : currentStyle}`}>
          {icon || <Zap size={20} />}
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isAlert ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className={`text-sm font-semibold mb-1 ${isAlert ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h3>
      <div className="flex items-baseline space-x-2">
        <span className={`text-3xl font-extrabold tracking-tight ${isAlert ? '' : 'text-slate-800 dark:text-white'}`}>{value}</span>
      </div>
      <p className={`text-xs mt-3 font-medium ${isAlert ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>{subtitle}</p>
    </div>
  );
}

function NoteItem({ note, onEdit, onDelete, dragHandleProps }: { note: Note, onEdit: (note: Note) => void, onDelete: (id: string) => void, dragHandleProps?: any }) {
  return (
    <div className={`${note.color} rounded-3xl p-7 shadow-sm relative group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none h-full flex flex-col border border-white/20 dark:border-slate-700/50 backdrop-blur-sm`}>
      <div className="absolute top-5 right-5 flex items-center space-x-2 z-10">
        {dragHandleProps && (
          <button {...dragHandleProps} className="p-1.5 text-slate-400/40 hover:text-slate-600 cursor-grab transition-colors rounded-lg hover:bg-white/50">
            <GripVertical size={16} />
          </button>
        )}
        <button 
          onClick={() => onEdit(note)}
          className="p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-all rounded-lg hover:bg-white/50"
        >
          <Pencil size={16} />
        </button>
        <button 
          onClick={() => onDelete(note.id)}
          className="p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all rounded-lg hover:bg-white/50"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-slate-800/40 flex items-center justify-center mr-3">
          <StickyNote size={16} className="text-slate-600 dark:text-slate-300" />
        </div>
        <h3 
          className="text-lg font-bold text-slate-800 dark:text-slate-100 pr-20 line-clamp-1"
          dangerouslySetInnerHTML={{ __html: note.title }}
        />
      </div>
      
      <div 
        className="text-sm text-slate-700 dark:text-slate-300 flex-1 line-clamp-6 leading-relaxed whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />
      
      <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500/60 dark:text-slate-400/60">
          <CalendarIcon size={12} className="mr-1.5" />
          {new Intl.DateTimeFormat('pt-BR').format(new Date(note.date))}
        </div>
        <div className="w-2 h-2 rounded-full bg-white/50"></div>
      </div>
    </div>
  );
}

function SortableNoteItem(props: { key?: any, note: Note, onEdit: (note: Note) => void, onDelete: (id: string) => void | Promise<void> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <NoteItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function DraggableNoteItem(props: { key?: any, note: Note, onEdit: (note: Note) => void, onDelete: (id: string) => void | Promise<void> }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.note.id,
  });

  // Deterministic rotation based on ID
  const rotation = (props.note.id.charCodeAt(0) % 6) - 3;

  const style = {
    position: 'absolute' as const,
    left: props.note.x || 0,
    top: props.note.y || 0,
    zIndex: isDragging ? 999 : (props.note.z_index || 0),
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${rotation}deg)` : `rotate(${rotation}deg)`,
    width: '300px',
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'transform 0.2s ease, left 0.2s ease, top 0.2s ease',
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <NoteItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function SortableTaskItem(props: { key?: any, task: Task, onToggle: (id: string) => void, onEdit?: (task: Task) => void, onDelete?: (id: string) => void, onComment?: (taskId: string) => void, planningActionsList?: PlanningAction[] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem {...props} dragHandleProps={{ ...attributes, ...listeners }} planningActionsList={props.planningActionsList} />
    </div>
  );
}

function TaskItem({ task, onToggle, onEdit, onDelete, onComment, dragHandleProps, planningActionsList = [] }: { task: Task, onToggle: (id: string) => void, onEdit?: (task: Task) => void, onDelete?: (id: string) => void, onComment?: (taskId: string) => void, dragHandleProps?: any, planningActionsList?: PlanningAction[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const planningAction = planningActionsList.find(a => a.id === task.planningActionId);

  return (
    <div 
      className={`flex items-start p-4 rounded-2xl border transition-all duration-200 ${
        task.completed 
          ? 'bg-slate-50/50 dark:bg-slate-800/30 border-transparent' 
          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900/50 shadow-sm hover:shadow-md'
      }`}
    >
      {dragHandleProps && (
        <div {...dragHandleProps} className="mt-0.5 mr-3 cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400">
          <GripVertical size={18} />
        </div>
      )}
      <button 
        onClick={() => onToggle(task.id)} 
        className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
          task.completed 
            ? 'bg-emerald-500 border-emerald-500 text-white' 
            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400'
        }`}
      >
        {task.completed && <CheckCircle2 size={14} />}
      </button>
      <div className={`ml-4 flex-1 ${task.completed ? 'opacity-60' : ''}`}>
        <div 
          className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}
          dangerouslySetInnerHTML={{ __html: task.title }}
        />
        {task.description && (
          <div 
            className={`text-xs mt-1 ${task.completed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}
            dangerouslySetInnerHTML={{ __html: task.description }}
          />
        )}
        <div className="flex items-center mt-2 space-x-3">
          {planningAction && (
            <span 
              className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md"
              dangerouslySetInnerHTML={{ __html: planningAction.goal }}
            />
          )}
          {task.category && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              task.category === 'urgent' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' :
              task.category === 'personal' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' :
              'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30'
            }`}>
              {task.category === 'urgent' ? 'Urgente' : task.category === 'personal' ? 'Pessoal' : 'Trabalho'}
            </span>
          )}
          {(task.startDate || task.startTime) && (
            <div className="flex items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <Clock size={10} className="mr-1" />
              {task.startDate && `${task.startDate} `}
              {task.startTime && `${task.startTime}`}
            </div>
          )}
        </div>
        
        {task.comments && task.comments.length > 0 && (
          <div className="mt-3 space-y-1">
            {task.comments.map((comment, index) => (
              <div 
                key={index} 
                className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-600/50"
                dangerouslySetInnerHTML={{ __html: comment }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <MoreVertical size={16} />
        </button>
        <button 
          onClick={() => onComment && onComment(task.id)}
          className="flex items-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ml-1"
        >
          <MessageSquare size={16} />
          {task.comments && task.comments.length > 0 && (
            <span className="ml-1 text-xs">{task.comments.length}</span>
          )}
        </button>
        
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsMenuOpen(false)}
            ></div>
            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 py-1">
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onEdit) onEdit(task);
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Editar
              </button>
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onDelete) onDelete(task.id);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Excluir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
