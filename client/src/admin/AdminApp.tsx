import { Navigate, Route, Routes } from 'react-router-dom';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ErrorState, Spinner } from '@/components/ui/States';
import { AuthProvider, useAuth } from './auth';
import { FeedbackProvider } from './components/Feedback';
import { AdminLayout } from './AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectFormPage } from './pages/ProjectFormPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { CertificateFormPage } from './pages/CertificateFormPage';
import { JourneyPage } from './pages/JourneyPage';
import { JourneyFormPage } from './pages/JourneyFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { SkillsPage } from './pages/SkillsPage';
import { ResumePage } from './pages/ResumePage';
import { MessagesPage } from './pages/MessagesPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountPage } from './pages/AccountPage';

function Gate() {
  useDocumentMeta({ title: 'Admin · Namita Giri', noindex: true });
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center text-muted">
        <Spinner label="Checking your session…" />
      </div>
    );
  }
  if (auth.status === 'unavailable') {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <ErrorState title="The server could not be reached" error={new Error('If the server was asleep it can take about a minute to wake up.')} onRetry={auth.retry} className="max-w-md" />
      </div>
    );
  }
  // Not signed in: show the login screen on whatever admin URL was requested; after signing in the same page renders.
  if (auth.status === 'anon') return <LoginPage />;

  return (
    <AdminLayout>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<ProjectFormPage />} />
        <Route path="projects/:id" element={<ProjectFormPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="certificates/new" element={<CertificateFormPage />} />
        <Route path="certificates/:id" element={<CertificateFormPage />} />
        <Route path="journey" element={<JourneyPage />} />
        <Route path="journey/new" element={<JourneyFormPage />} />
        <Route path="journey/:id" element={<JourneyFormPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="resume" element={<ResumePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <Gate />
      </FeedbackProvider>
    </AuthProvider>
  );
}
