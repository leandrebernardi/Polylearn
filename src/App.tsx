import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  generateCurriculum, 
  generateLesson, 
  askTutor, 
  generatePlacementTest, 
  evaluatePlacementTest,
  generateTrendingSubjects,
  type Subject, 
  type Lesson, 
  type Curriculum,
  type PlacementTest as PlacementTestData
} from './services/geminiService';
import { cn } from './lib/utils';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, increment, serverTimestamp,
  handleFirestoreError, OperationType, type User
} from './firebase';

// Components
import { Mascot } from './components/Mascot';
import { LeagueBoard, type League } from './components/LeagueBoard';
import { PremiumModal } from './components/PremiumModal';
import { PlacementTest } from './components/PlacementTest';
import { 
  BookOpen, 
  Languages, 
  Code2, 
  ChevronRight, 
  GraduationCap, 
  MessageSquare, 
  CheckCircle2, 
  XCircle,
  Loader2,
  ArrowLeft,
  Send,
  Flame,
  Trophy,
  User as UserIcon,
  Plus,
  Search,
  Lock,
  Star,
  Shield,
  Video,
  LayoutDashboard,
  Compass,
  Settings,
  Sparkles
} from 'lucide-react';

const CATEGORIES = ["Language", "Programming", "Science", "History", "Other"];

const DEFAULT_COURSES = [
  { id: 'english', title: 'English', icon: '🇬🇧', color: 'bg-blue-500', category: 'Language' },
  { id: 'french', title: 'French', icon: '🇫🇷', color: 'bg-indigo-500', category: 'Language' },
  { id: 'html', title: 'HTML', icon: '🌐', color: 'bg-orange-500', category: 'Programming' },
  { id: 'css', title: 'CSS', icon: '🎨', color: 'bg-cyan-500', category: 'Programming' },
  { id: 'javascript', title: 'JavaScript', icon: '⚡', color: 'bg-yellow-500', category: 'Programming' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'dashboard' | 'explore' | 'leagues' | 'path' | 'lesson' | 'placement' | 'video-call'>('landing');
  
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorAnswer, setTutorAnswer] = useState('');
  const [askingTutor, setAskingTutor] = useState(false);

  // New Features State
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [placementTest, setPlacementTest] = useState<PlacementTestData | null>(null);
  const [leagueParticipants, setLeagueParticipants] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suggestedCourses, setSuggestedCourses] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'users', currentUser.uid);
        try {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data());
          } else {
            const newProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              streak: 0,
              totalXP: 0,
              league: 'Bronze',
              leaguePoints: 0,
              enrolledCourses: [],
              isPremium: false,
              lastActive: new Date().toISOString()
            };
            await setDoc(profileRef, newProfile);
            setUserProfile(newProfile);
          }
          
          // Load progress
          const progressRef = collection(db, 'users', currentUser.uid, 'progress');
          const progressSnap = await getDocs(progressRef);
          setCompletedLessons(progressSnap.docs.map(d => d.id));
          
          setView('dashboard');
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setView('landing');
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Global Courses and Leagues
  useEffect(() => {
    if (!user) return;

    // Listen to all courses
    const coursesQuery = query(collection(db, 'courses'));
    const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
      const courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllCourses(courses);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'courses'));

    // Listen to league participants
    if (userProfile?.league) {
      const leagueQuery = query(
        collection(db, 'users'), 
        where('league', '==', userProfile.league)
      );
      const unsubscribeLeague = onSnapshot(leagueQuery, (snapshot) => {
        const humans = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
        
        // Add bots if not enough people
        const bots = Array.from({ length: Math.max(0, 30 - humans.length) }).map((_, i) => ({
          uid: `bot_${i}`,
          displayName: `Learner_${Math.floor(Math.random() * 1000)}`,
          leaguePoints: Math.floor(Math.random() * (userProfile.leaguePoints + 50)),
          isBot: true
        }));

        setLeagueParticipants([...humans, ...bots]);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

      return () => {
        unsubscribeCourses();
        unsubscribeLeague();
      };
    }

    return () => unsubscribeCourses();
  }, [user, userProfile?.league]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSelectCourse = async (course: any) => {
    setSelectedCourse(course);
    setLoading(true);
    setView('path');
    try {
      const curr = await generateCurriculum(course.title);
      setCurriculum(curr);
    } catch (error) {
      console.error("Failed to load curriculum:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollCourse = async (course: any) => {
    if (!user || !userProfile) return;
    const enrolled = userProfile.enrolledCourses || [];
    if (enrolled.includes(course.id)) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        enrolledCourses: [...enrolled, course.id]
      });
      // Also update enrolledCount in course
      await updateDoc(doc(db, 'courses', course.id), {
        enrolledCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleStartPlacementTest = async (subject: string) => {
    setLoading(true);
    setView('placement');
    try {
      const test = await generatePlacementTest(subject);
      setPlacementTest(test);
    } catch (error) {
      console.error("Placement test error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlacementTestComplete = async (answers: Record<number, number>) => {
    if (!placementTest || !selectedCourse || !user) return;
    setLoading(true);
    try {
      const result = await evaluatePlacementTest(selectedCourse.title, answers, placementTest);
      // Update starting unit logic
      // For now we just show feedback and set view to path
      alert(`Placement Result: ${result.feedback}. You can start at Unit ${result.startingUnit + 1}!`);
      setView('path');
    } catch (error) {
      console.error("Evaluation error:", error);
    } finally {
      setLoading(false);
      setPlacementTest(null);
    }
  };

  const handleStartLesson = async (lessonTitle: string) => {
    setLoading(true);
    setView('lesson');
    setQuizAnswers({});
    setShowResults(false);
    try {
      const lessonData = await generateLesson(selectedCourse.title, lessonTitle);
      setActiveLesson(lessonData);
    } catch (error) {
      console.error("Failed to load lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = async () => {
    setShowResults(true);
    const isPerfect = Object.values(quizAnswers).every((ans, idx) => ans === activeLesson?.quiz[idx].correctAnswer);
    
    if (user && activeLesson) {
      const xpGain = isPerfect ? 20 : 10;
      const lessonId = activeLesson.title.replace(/\s+/g, '_').toLowerCase();
      
      try {
        await setDoc(doc(db, 'users', user.uid, 'progress', lessonId), {
          userId: user.uid,
          lessonId,
          completedAt: new Date().toISOString(),
          score: isPerfect ? 100 : 70
        });
        
        await updateDoc(doc(db, 'users', user.uid), {
          totalXP: increment(xpGain),
          leaguePoints: increment(xpGain),
          lastActive: new Date().toISOString()
        });
        
        setCompletedLessons(prev => [...prev, lessonId]);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/progress/${lessonId}`);
      }
    }
  };

  useEffect(() => {
    if (view === 'explore' && suggestedCourses.length === 0) {
      const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
          const suggestions = await generateTrendingSubjects();
          setSuggestedCourses(suggestions);
          
          // Automatically add these suggestions to the global courses list if they don't exist
          for (const suggestion of suggestions) {
            const exists = allCourses.some(c => c.title.toLowerCase() === suggestion.title.toLowerCase());
            if (!exists) {
              await createCourse(suggestion.title, suggestion.category, suggestion.description, suggestion.icon, false);
            }
          }
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        } finally {
          setLoadingSuggestions(false);
        }
      };
      fetchSuggestions();
    }
  }, [view, allCourses]);

  const handleSurpriseMe = async () => {
    setLoadingSuggestions(true);
    try {
      const suggestions = await generateTrendingSubjects();
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        // Just add it to the global list and stay on the explore page
        await createCourse(suggestion.title, suggestion.category, suggestion.description, suggestion.icon, false);
        alert(`AI has created a new course: ${suggestion.title}! You can find it in the list below.`);
      }
    } catch (error) {
      console.error("Error with surprise me:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const createCourse = async (subject: string, category: string = 'Other', description?: string, icon: string = '✨', autoEnroll: boolean = true) => {
    if (!user) return;
    const courseId = subject.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
    const newCourse = {
      id: courseId,
      title: subject,
      category: category,
      description: description || `A custom course about ${subject}`,
      icon: icon,
      isCustom: true,
      createdBy: user.uid,
      enrolledCount: autoEnroll ? 1 : 0
    };

    try {
      await setDoc(doc(db, 'courses', courseId), newCourse);
      if (autoEnroll) {
        await handleEnrollCourse(newCourse);
        handleSelectCourse(newCourse);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `courses/${courseId}`);
    }
  };

  const handleCreateCustomCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSubject.trim()) return;
    await createCourse(customSubject);
  };

  const handleAskTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorQuestion.trim() || !selectedCourse) return;
    setAskingTutor(true);
    try {
      const answer = await askTutor(selectedCourse.title, tutorQuestion);
      setTutorAnswer(answer);
    } catch (error) {
      console.error("Tutor error:", error);
    } finally {
      setAskingTutor(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const userRank = leagueParticipants
    .sort((a, b) => b.leaguePoints - a.leaguePoints)
    .findIndex(p => p.uid === user?.uid) + 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => {
              if (user) setView('dashboard');
              else setView('landing');
              setSelectedCourse(null);
              setCurriculum(null);
              setActiveLesson(null);
            }}
          >
            <Mascot size="sm" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">PolyLearn</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <nav className="hidden md:flex items-center gap-1 mr-4">
                  <button 
                    onClick={() => setView('dashboard')}
                    className={cn("px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors", view === 'dashboard' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Home</span>
                  </button>
                  <button 
                    onClick={() => setView('explore')}
                    className={cn("px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors", view === 'explore' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                  >
                    <Compass className="w-5 h-5" />
                    <span>Explore</span>
                  </button>
                  <button 
                    onClick={() => setView('leagues')}
                    className={cn("px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors", view === 'leagues' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}
                  >
                    <Trophy className="w-5 h-5" />
                    <span>Leagues</span>
                  </button>
                  {userProfile?.isPremium && (
                    <button 
                      onClick={() => setView('video-call')}
                      className={cn("px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors", view === 'video-call' ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50")}
                    >
                      <Video className="w-5 h-5" />
                      <span>Video Call</span>
                    </button>
                  )}
                </nav>

                <div className="hidden sm:flex items-center gap-4 px-4 py-1 bg-slate-100 rounded-full">
                  <div className="flex items-center gap-1 text-orange-500 font-bold">
                    <Flame className="w-4 h-4" />
                    <span>{userProfile?.streak || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-indigo-600 font-bold">
                    <Trophy className="w-4 h-4" />
                    <span>{userProfile?.totalXP || 0} XP</span>
                  </div>
                  {userRank > 0 && (
                    <div className="flex items-center gap-1 text-emerald-600 font-bold border-l border-slate-200 pl-4">
                      <Shield className="w-4 h-4" />
                      <span>#{userRank}</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setIsPremiumModalOpen(true)}
                  className={cn("p-2 rounded-full transition-colors", userProfile?.isPremium ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:bg-slate-100")}
                >
                  <Star className={cn("w-5 h-5", userProfile?.isPremium && "fill-current")} />
                </button>

                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  title="Logout"
                >
                  <UserIcon className="w-5 h-5 text-slate-600" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center space-y-8"
            >
              <Mascot size="lg" mood="excited" />
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  The fun, free, and effective way to learn anything!
                </h2>
                <p className="text-xl text-slate-500">
                  Master languages, programming, and more with AI-powered lessons.
                </p>
              </div>
              <button 
                onClick={handleLogin}
                className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-1"
              >
                Get Started
              </button>
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-indigo-600" />
                      My Courses
                    </h2>
                    <button 
                      onClick={() => setView('leagues')}
                      className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                      View Full League
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {userProfile?.enrolledCourses?.length > 0 ? (
                      allCourses.filter(c => userProfile.enrolledCourses.includes(c.id)).map(course => (
                        <button
                          key={course.id}
                          onClick={() => handleSelectCourse(course)}
                          className="flex items-center gap-4 p-6 bg-white rounded-3xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group text-left"
                        >
                          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm", course.color || 'bg-slate-100')}>
                            {course.icon}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800">{course.title}</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{course.category}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 ml-auto text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        </button>
                      ))
                    ) : (
                      <div className="col-span-full p-12 bg-white rounded-[40px] border-2 border-dashed border-slate-200 text-center space-y-4">
                        <Mascot size="md" mood="thinking" className="mx-auto" />
                        <h3 className="text-xl font-bold text-slate-400">No courses yet!</h3>
                        <button 
                          onClick={() => setView('explore')}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                        >
                          Explore Courses
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-[40px] p-8 text-white flex flex-col md:flex-row items-center gap-8 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 flex-1 space-y-4 text-center md:text-left">
                    <h3 className="text-3xl font-black tracking-tight">AI Course Generator</h3>
                    <p className="text-indigo-100 font-bold opacity-80">
                      Can't find what you're looking for? Tell me any subject!
                    </p>
                    <form onSubmit={handleCreateCustomCourse} className="flex gap-2 max-w-md mx-auto md:mx-0">
                      <input 
                        type="text" 
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="e.g. Quantum Physics, Cooking..."
                        className="flex-1 px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-indigo-200 outline-none focus:bg-white/30 transition-all font-bold"
                      />
                      <button 
                        type="submit"
                        className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black hover:bg-indigo-50 transition-colors shadow-lg"
                      >
                        GO
                      </button>
                    </form>
                  </div>
                  <Mascot size="md" mood="excited" />
                </div>
              </div>

              <div className="space-y-8">
                <LeagueBoard 
                  currentLeague={userProfile?.league || 'Bronze'} 
                  participants={leagueParticipants}
                  currentUserUid={user?.uid}
                />
                
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 space-y-4">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-600" />
                    Premium Features
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Unlock video calls and advanced AI tutoring with PolyLearn Premium.
                  </p>
                  {userProfile?.isPremium ? (
                    <button 
                      onClick={() => setView('video-call')}
                      className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black shadow-[0_4px_0_0_rgba(5,150,105,1)] hover:translate-y-1 hover:shadow-[0_0_0_0_rgba(5,150,105,1)] transition-all flex items-center justify-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      START VIDEO CALL
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsPremiumModalOpen(true)}
                      className="w-full py-3 bg-amber-400 text-white rounded-xl font-black shadow-[0_4px_0_0_rgba(217,119,6,1)] hover:translate-y-1 hover:shadow-[0_0_0_0_rgba(217,119,6,1)] transition-all"
                    >
                      UPGRADE NOW
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'explore' && (
            <motion.div 
              key="explore"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-black text-slate-900">Explore Courses</h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <button 
                    onClick={handleSurpriseMe}
                    disabled={loadingSuggestions}
                    className="px-6 py-3 bg-indigo-100 text-indigo-600 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-200 transition-all disabled:opacity-50"
                  >
                    {loadingSuggestions ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    SURPRISE ME
                  </button>
                  <div className="relative max-w-md w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search courses..."
                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              {suggestedCourses.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-black text-lg uppercase tracking-wider">AI Suggested for You</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {suggestedCourses.map((course, idx) => (
                      <div 
                        key={`suggested-${idx}`}
                        className="bg-indigo-600 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all"
                        onClick={() => createCourse(course.title)}
                      >
                        <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 group-hover:scale-110 transition-transform">
                          {course.icon}
                        </div>
                        <div className="text-3xl mb-4">{course.icon}</div>
                        <h4 className="text-xl font-black mb-1">{course.title}</h4>
                        <p className="text-indigo-100 text-xs font-bold line-clamp-2">{course.description}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/20 w-fit px-2 py-1 rounded-lg">
                          New Topic
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={cn("px-6 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all", !selectedCategory ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border-2 border-slate-200")}
                >
                  ALL
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn("px-6 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all", selectedCategory === cat ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border-2 border-slate-200")}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...DEFAULT_COURSES, ...allCourses]
                  .filter(c => !selectedCategory || c.category === selectedCategory)
                  .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(course => {
                    const isEnrolled = userProfile?.enrolledCourses?.includes(course.id);
                    return (
                      <div 
                        key={course.id}
                        className="bg-white p-6 rounded-[32px] border-2 border-slate-200 hover:border-indigo-400 transition-all group relative overflow-hidden flex flex-col"
                      >
                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm", course.color || 'bg-slate-100')}>
                          {course.icon}
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">{course.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">
                          {course.description || `Learn ${course.title} with AI-powered lessons.`}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <UserIcon className="w-3 h-3" />
                            <span>{course.enrolledCount || 0} Learners</span>
                          </div>
                          {isEnrolled ? (
                            <button 
                              onClick={() => handleSelectCourse(course)}
                              className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-sm"
                            >
                              CONTINUE
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleEnrollCourse(course)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-[0_4px_0_0_rgba(67,56,202,1)] hover:translate-y-1 hover:shadow-[0_0_0_0_rgba(67,56,202,1)] transition-all"
                            >
                              ENROLL
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {view === 'leagues' && (
            <motion.div 
              key="leagues"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">League Standings</h2>
                <p className="text-slate-500 font-bold">Compete with others in the {userProfile?.league || 'Bronze'} League!</p>
              </div>
              
              <LeagueBoard 
                currentLeague={userProfile?.league || 'Bronze'} 
                participants={leagueParticipants}
                currentUserUid={user?.uid}
              />

              <div className="bg-indigo-50 p-8 rounded-[40px] border-2 border-indigo-100 flex items-center gap-6">
                <Mascot size="md" mood="excited" />
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-indigo-900 tracking-tight">Keep it up!</h3>
                  <p className="text-indigo-700 font-bold leading-relaxed">
                    Complete lessons to earn XP and climb the leaderboard. Top 10 users are promoted to the next league every week!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'path' && (
            <motion.div 
              key="path"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl mx-auto space-y-12"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-200 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-3xl font-black text-slate-900">{selectedCourse?.title}</h2>
                </div>
                <button 
                  onClick={() => handleStartPlacementTest(selectedCourse.title)}
                  className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-black text-xs text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  TEST MY LEVEL
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center py-20 space-y-4">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-slate-500 font-bold">Building your learning path...</p>
                </div>
              ) : curriculum?.units.map((unit, uIdx) => (
                <div key={uIdx} className="space-y-8">
                  <div className={cn("p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden", uIdx % 2 === 0 ? "bg-emerald-500" : "bg-indigo-500")}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-80">Unit {uIdx + 1}</h3>
                    <h4 className="text-2xl font-black mb-2">{unit.title}</h4>
                    <p className="font-bold opacity-90 text-sm">{unit.description}</p>
                  </div>

                  <div className="flex flex-col items-center gap-6 relative py-4">
                    {/* Path Line */}
                    <div className="absolute top-0 bottom-0 w-3 bg-slate-200 -z-10 rounded-full" />
                    
                    {unit.lessons.map((lesson, lIdx) => {
                      const lessonId = lesson.title.replace(/\s+/g, '_').toLowerCase();
                      const isCompleted = completedLessons.includes(lessonId);
                      const isLocked = uIdx > 0 && !isCompleted && !completedLessons.some(id => id.includes(unit.lessons[0].title.toLowerCase())); // Simple lock logic
                      
                      return (
                        <div key={lIdx} className="relative group">
                          <motion.button
                            whileHover={!isLocked ? { scale: 1.1, y: -5 } : {}}
                            onClick={() => !isLocked && handleStartLesson(lesson.title)}
                            className={cn(
                              "w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-b-8 transition-all",
                              isCompleted ? "bg-yellow-400 border-yellow-600 text-white" : 
                              isLocked ? "bg-slate-200 border-slate-300 text-slate-400" :
                              "bg-indigo-500 border-indigo-700 text-white"
                            )}
                            style={{ marginLeft: `${Math.sin(lIdx + uIdx) * 80}px` }}
                          >
                            {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : 
                             isLocked ? <Lock className="w-6 h-6" /> : 
                             <Star className="w-8 h-8 fill-current" />}
                          </motion.button>
                          
                          <div 
                            className={cn(
                              "absolute left-full ml-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-white px-4 py-2 rounded-2xl border-2 border-slate-200 text-sm font-black text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20",
                              isLocked && "hidden"
                            )}
                            style={{ marginLeft: `${Math.sin(lIdx + uIdx) * 80 + 40}px` }}
                          >
                            {lesson.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {view === 'video-call' && (
            <motion.div 
              key="video-call"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto h-[70vh] bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col"
            >
              {/* Header */}
              <div className="p-6 bg-slate-800/50 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Mascot size="sm" mood="excited" />
                  </div>
                  <div>
                    <h3 className="text-white font-black">AI Tutor Call</h3>
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      Live Connection
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setView('dashboard')}
                  className="px-6 py-2 bg-rose-500 text-white rounded-xl font-black text-sm shadow-[0_4px_0_0_rgba(225,29,72,1)] hover:translate-y-1 hover:shadow-none transition-all"
                >
                  END CALL
                </button>
              </div>

              {/* Video Area */}
              <div className="flex-1 relative grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {/* AI Tutor Video */}
                <div className="bg-slate-800 rounded-3xl relative overflow-hidden flex items-center justify-center border-2 border-slate-700">
                  <div className="absolute top-4 left-4 bg-slate-900/50 px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">AI Tutor</div>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  >
                    <Mascot size="lg" mood="excited" />
                  </motion.div>
                </div>

                {/* User Video (Simulated) */}
                <div className="bg-slate-800 rounded-3xl relative overflow-hidden flex items-center justify-center border-2 border-slate-700">
                  <div className="absolute top-4 left-4 bg-slate-900/50 px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">You</div>
                  <div className="text-slate-600 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
                      <UserIcon className="w-10 h-10" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest">Camera Off</p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-8 bg-slate-800/50 border-t border-slate-700/50 flex items-center justify-center gap-6">
                <button className="w-14 h-14 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-colors">
                  <Video className="w-6 h-6" />
                </button>
                <button className="w-14 h-14 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-colors">
                  <MessageSquare className="w-6 h-6" />
                </button>
                <button className="w-14 h-14 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-colors">
                  <Settings className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}

          {view === 'placement' && (
            <motion.div 
              key="placement"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-slate-500 font-bold">Generating your placement test...</p>
                </div>
              ) : placementTest && (
                <PlacementTest 
                  subject={selectedCourse.title}
                  test={placementTest}
                  onComplete={handlePlacementTestComplete}
                  onCancel={() => setView('path')}
                />
              )}
            </motion.div>
          )}

          {view === 'lesson' && (
            <motion.div 
              key="lesson"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-8">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-bold">Preparing lesson content...</p>
                  </div>
                ) : activeLesson ? (
                  <>
                    <div className="bg-white p-8 rounded-[40px] border-2 border-slate-200 shadow-sm space-y-8">
                      <div className="flex items-center justify-between">
                        <button onClick={() => setView('path')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <XCircle className="w-8 h-8 text-slate-300" />
                        </button>
                        <div className="h-4 flex-1 mx-8 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: showResults ? '100%' : '50%' }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h2 className="text-4xl font-black text-slate-900 leading-tight">{activeLesson.title}</h2>
                        <div className="prose prose-slate max-w-none">
                          {activeLesson.content.split('\n').map((line, i) => (
                            <p key={i} className="text-lg text-slate-600 leading-relaxed font-medium">{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] border-2 border-slate-200 shadow-sm space-y-10">
                      <h3 className="text-2xl font-black text-slate-900">Practice Quiz</h3>
                      <div className="space-y-12">
                        {activeLesson.quiz.map((q, qIdx) => (
                          <div key={qIdx} className="space-y-6">
                            <p className="text-xl font-black text-slate-800">{q.question}</p>
                            <div className="grid gap-4">
                              {q.options.map((option, oIdx) => {
                                const isSelected = quizAnswers[qIdx] === oIdx;
                                const isCorrect = q.correctAnswer === oIdx;
                                return (
                                  <button
                                    key={oIdx}
                                    disabled={showResults}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                    className={cn(
                                      "p-6 rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between text-lg",
                                      isSelected 
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_4px_0_0_rgba(99,102,241,1)]" 
                                        : "border-slate-200 hover:border-slate-300 text-slate-600 shadow-[0_4px_0_0_rgba(226,232,240,1)]",
                                      showResults && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_4px_0_0_rgba(16,185,129,1)]",
                                      showResults && isSelected && !isCorrect && "border-rose-500 bg-rose-50 text-rose-700 shadow-[0_4px_0_0_rgba(244,63,94,1)]"
                                    )}
                                  >
                                    <span>{option}</span>
                                    {showResults && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                                    {showResults && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-500" />}
                                  </button>
                                );
                              })}
                            </div>
                            {showResults && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm text-slate-500 font-bold"
                              >
                                {q.explanation}
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>

                      {!showResults ? (
                        <button
                          onClick={handleQuizSubmit}
                          disabled={Object.keys(quizAnswers).length < activeLesson.quiz.length}
                          className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-[0_8px_0_0_rgba(67,56,202,1)] hover:translate-y-1 hover:shadow-[0_4px_0_0_rgba(67,56,202,1)] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none transition-all"
                        >
                          CHECK ANSWERS
                        </button>
                      ) : (
                        <button
                          onClick={() => setView('path')}
                          className="w-full py-6 bg-emerald-500 text-white rounded-2xl font-black text-xl shadow-[0_8px_0_0_rgba(5,150,105,1)] hover:translate-y-1 hover:shadow-[0_4px_0_0_rgba(5,150,105,1)] transition-all"
                        >
                          CONTINUE
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-xl sticky top-24 border-b-8 border-slate-950">
                  <div className="flex items-center gap-4 mb-8">
                    <Mascot size="sm" mood="thinking" />
                    <div>
                      <h3 className="font-black text-xl tracking-tight">AI Tutor</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Always here to help!</p>
                    </div>
                  </div>

                  <form onSubmit={handleAskTutor} className="space-y-4">
                    <textarea
                      value={tutorQuestion}
                      onChange={(e) => setTutorQuestion(e.target.value)}
                      placeholder="Ask me anything about this lesson..."
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none resize-none h-40 transition-colors placeholder:text-slate-600"
                    />
                    <button
                      type="submit"
                      disabled={askingTutor || !tutorQuestion.trim()}
                      className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-[0_4px_0_0_rgba(67,56,202,1)]"
                    >
                      {askingTutor ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                      ASK TUTOR
                    </button>
                  </form>

                  <AnimatePresence>
                    {tutorAnswer && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="mt-8 p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 text-sm font-bold text-slate-300 relative leading-relaxed"
                      >
                        <div className="absolute -top-3 left-6 bg-indigo-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Response</div>
                        {tutorAnswer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <PremiumModal 
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        onSuccess={async () => {
          if (user) {
            await updateDoc(doc(db, 'users', user.uid), { isPremium: true });
            setUserProfile((prev: any) => ({ ...prev, isPremium: true }));
            alert("Premium Activated! Enjoy unlimited video calls and more.");
          }
        }}
      />
    </div>
  );
}
