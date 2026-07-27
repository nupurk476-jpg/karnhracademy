import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";

// Route-level code splitting: everything except the homepage loads on demand,
// so a first-time visitor to "/" doesn't have to download the admin panel,
// the quiz engine, and every topic page up front.
const HRTopicPage = lazy(() => import("./pages/HRTopicPage"));
const POMTopicPage = lazy(() => import("./pages/POMTopicPage"));
const OBTopicPage = lazy(() => import("./pages/OBTopicPage"));
const SMTopicPage = lazy(() => import("./pages/SMTopicPage"));
const BCTopicPage = lazy(() => import("./pages/BCTopicPage"));
const ODCMTopicPage = lazy(() => import("./pages/ODCMTopicPage"));
const GHRTopicPage = lazy(() => import("./pages/GHRTopicPage"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotesPage = lazy(() => import("./pages/NotesPage"));
const LabourWelfarePage = lazy(() => import("./pages/LabourWelfarePage"));
const MBABBAPage = lazy(() => import("./pages/MBABBAPage"));
const LabourWelfareUnitPage = lazy(() => import("./pages/LabourWelfareUnitPage"));
const LabourWelfareTopicPage = lazy(() => import("./pages/LabourWelfareTopicPage"));
const PYQsPage = lazy(() => import("./pages/PYQsPage"));
const PYQViewerPage = lazy(() => import("./pages/PYQViewerPage"));
const PYQPaperPage = lazy(() => import("./pages/PYQPaperPage"));
const LecturesPage = lazy(() => import("./pages/LecturesPage"));
const LiveLecturesPage = lazy(() => import("./pages/LiveLecturesPage"));
const QuizList = lazy(() => import("./pages/QuizList"));
const QuizTake = lazy(() => import("./pages/QuizTake"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const NewspaperPage = lazy(() => import("./pages/NewspaperPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBlogs = lazy(() => import("./pages/admin/AdminBlogs"));
const AdminNotes = lazy(() => import("./pages/admin/AdminNotes"));
const AdminQuizzes = lazy(() => import("./pages/admin/AdminQuizzes"));
const AdminPYQs = lazy(() => import("./pages/admin/AdminPYQs"));
const AdminExamInfo = lazy(() => import("./pages/admin/AdminExamInfo"));
const AdminBooks = lazy(() => import("./pages/admin/AdminBooks"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers"));
const AdminContactMessages = lazy(() => import("./pages/admin/AdminContactMessages"));
const AdminNewspaperHighlights = lazy(() => import("./pages/admin/AdminNewspaperHighlights"));
const AdminLectures = lazy(() => import("./pages/admin/AdminLectures"));
const AdminLiveLectures = lazy(() => import("./pages/admin/AdminLiveLectures"));
const AdminErrorLogs = lazy(() => import("./pages/admin/AdminErrorLogs"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/blogs" element={<BlogList />} />
            <Route path="/blogs/:slug" element={<BlogPost />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/ugc-net-labour-welfare" element={<LabourWelfarePage />} />
            <Route path="/mba-bba" element={<MBABBAPage />} />
            <Route path="/ugc-net-labour-welfare/unit-:unitNumber" element={<LabourWelfareUnitPage />} />
            <Route path="/ugc-net-labour-welfare/topic/:topicSlug" element={<LabourWelfareTopicPage />} />
            <Route path="/lectures" element={<LecturesPage />} />
            <Route path="/live-lectures" element={<LiveLecturesPage />} />
            <Route path="/quizzes" element={<QuizList />} />
            <Route path="/quizzes/:id" element={<QuizTake />} />
            <Route path="/pyqs" element={<PYQsPage />} />
            <Route path="/pyqs/paper/:id" element={<PYQPaperPage />} />
            <Route path="/pyqs/view/:id" element={<ProtectedRoute><PYQViewerPage /></ProtectedRoute>} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/newspaper" element={<NewspaperPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/hr/:slug" element={<HRTopicPage />} />
            <Route path="/pom/:slug" element={<POMTopicPage />} />
            <Route path="/ob/:slug" element={<OBTopicPage />} />
            <Route path="/sm/:slug" element={<SMTopicPage />} />
            <Route path="/bc/:slug" element={<BCTopicPage />} />
            <Route path="/odcm/:slug" element={<ODCMTopicPage />} />
            <Route path="/ghr/:slug" element={<GHRTopicPage />} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="blogs" element={<AdminBlogs />} />
              <Route path="notes" element={<AdminNotes />} />
              <Route path="quizzes" element={<AdminQuizzes />} />
              <Route path="pyq" element={<AdminPYQs />} />
              <Route path="exam-info" element={<AdminExamInfo />} />
              <Route path="books" element={<AdminBooks />} />
              <Route path="comments" element={<AdminComments />} />
              <Route path="subscribers" element={<AdminSubscribers />} />
              <Route path="contact-messages" element={<AdminContactMessages />} />
              <Route path="newspaper" element={<AdminNewspaperHighlights />} />
              <Route path="lectures" element={<AdminLectures />} />
              <Route path="live-lectures" element={<AdminLiveLectures />} />
              <Route path="error-logs" element={<AdminErrorLogs />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
