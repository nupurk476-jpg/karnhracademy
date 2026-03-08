import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import HRTopicPage from "./pages/HRTopicPage";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import NotesPage from "./pages/NotesPage";
import QuizList from "./pages/QuizList";
import QuizTake from "./pages/QuizTake";
import BooksPage from "./pages/BooksPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBlogs from "./pages/admin/AdminBlogs";
import AdminNotes from "./pages/admin/AdminNotes";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import AdminBooks from "./pages/admin/AdminBooks";
import AdminComments from "./pages/admin/AdminComments";
import AdminSubscribers from "./pages/admin/AdminSubscribers";
import AdminNewspaperHighlights from "./pages/admin/AdminNewspaperHighlights";
import NewspaperPage from "./pages/NewspaperPage";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/blogs" element={<BlogList />} />
          <Route path="/blogs/:slug" element={<BlogPost />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/quizzes" element={<QuizList />} />
          <Route path="/quizzes/:id" element={<QuizTake />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/auth" element={<AuthPage />} />
            <Route path="/newspaper" element={<NewspaperPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/hr/:slug" element={<HRTopicPage />} />
          <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="blogs" element={<AdminBlogs />} />
            <Route path="notes" element={<AdminNotes />} />
            <Route path="quizzes" element={<AdminQuizzes />} />
            <Route path="books" element={<AdminBooks />} />
            <Route path="comments" element={<AdminComments />} />
            <Route path="subscribers" element={<AdminSubscribers />} />
            <Route path="newspaper" element={<AdminNewspaperHighlights />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
