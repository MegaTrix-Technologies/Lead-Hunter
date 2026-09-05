import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLead } from './context/LeadContext';
import LoginPage from './components/auth/LoginPage';
import ForcePasswordChangeModal from './components/auth/ForcePasswordChangeModal';
import Navbar from './components/layout/Navbar';
import ScraperControls from './components/scraper/ScraperControls';
import DatasetList from './components/dataset/DatasetList';
import CallingWorkstation from './components/calling/CallingWorkstation';
import EmailTemplateEditor from './components/email/EmailTemplateEditor';
import LeadsDatabase from './components/crm/LeadsDatabase';
import KanbanPipeline from './components/crm/KanbanPipeline';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import SettingsView from './components/settings/SettingsView';
import ProductCatalogView from './components/products/ProductCatalogView';
import AccountsManagerView from './components/accounts/AccountsManagerView';
import DashboardView from './components/dashboard/DashboardView';
import CloserQueueView from './components/closer/CloserQueueView';
import ProjectsView from './components/projects/ProjectsView';
import SalesListView from './components/sales/SalesListView';
import EmailCampaignModal from './components/email/EmailCampaignModal';
import DeliveryReportModal from './components/email/DeliveryReportModal';
import AppendSearchModal from './components/dataset/AppendSearchModal';

function App() {
  const { isAuthenticated, isSuperAdmin, isSalesAgent, isCloser, isDeveloper, user } = useAuth();
  const { activeView, setActiveView, setActiveDatasetId, fetchLeads, appendModalDataset, setAppendModalDataset } = useLead();
  const location = useLocation();
  const navigate = useNavigate();

  // Enforce URL sync with Auth state: unauthenticated users always get /login URL
  useEffect(() => {
    if (!isAuthenticated) {
      if (location.pathname.toLowerCase() !== '/login') {
        navigate('/login', { replace: true });
      }
    } else {
      // Role-based restrictions check
      const pathLower = location.pathname.toLowerCase();
      const isRestrictedAccounts = (pathLower === '/accounts-manager' || pathLower === '/accounts' || activeView === 'accounts') && !isSuperAdmin;
      const isRestrictedEmail = (pathLower === '/email-proposals' || activeView === 'email') && !isSuperAdmin;
      const isRestrictedCloser = (pathLower === '/closer-queue' || pathLower === '/closer' || activeView === 'closer') && (!isCloser && !isSuperAdmin);
      const isRestrictedProjects = (pathLower === '/projects' || pathLower === '/project-delivery' || activeView === 'projects') && (!isDeveloper && !isSuperAdmin);

      if (isRestrictedAccounts || isRestrictedEmail || isRestrictedCloser || isRestrictedProjects) {
        setActiveView('dashboard');
        navigate('/Dashboard', { replace: true });
        return;
      }

      if (location.pathname.toLowerCase() === '/login' || location.pathname === '/') {
        navigate('/Dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isSuperAdmin, isSalesAgent, isCloser, isDeveloper, location.pathname, activeView, navigate, setActiveView]);

  const handleViewLeads = (dataset) => {
    setActiveDatasetId(dataset._id);
    setActiveView('crm');
    fetchLeads(1, { datasetId: dataset._id });
  };

  // If not logged in, display the secure login gateway
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Force first-time login password change
  if (user?.mustChangePassword) {
    return <ForcePasswordChangeModal />;
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col font-sans selection:bg-white selection:text-black">
      
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeView === 'dashboard' && (
          <DashboardView />
        )}

        {activeView === 'closer' && (
          <CloserQueueView />
        )}

        {activeView === 'sales' && (
          <SalesListView />
        )}

        {activeView === 'projects' && (
          <ProjectsView />
        )}

        {activeView === 'scraper' && (
          <div className="space-y-6">
            <ScraperControls />
            <DatasetList onViewLeads={handleViewLeads} />
          </div>
        )}

        {activeView === 'workstation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E1E1E]">
              <div>
                <h1 className="text-lg font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 inline-block" />
                  Outbound Lead Management &amp; Workstation CRM
                </h1>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Split-Screen Workstation with isolated Dataset queue &amp; instant status persistence.
                </p>
              </div>
            </div>
            <CallingWorkstation />
          </div>
        )}

        {activeView === 'products' && (
          <ProductCatalogView />
        )}

        {activeView === 'accounts' && isSuperAdmin && (
          <AccountsManagerView />
        )}

        {activeView === 'email' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E1E1E]">
              <div>
                <h1 className="text-lg font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-400 inline-block" />
                  Email Proposal Routing &amp; Visual Template Builder
                </h1>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Merge tag dynamic interpolation, custom HTML branding, and rate-limited bulk dispatch.
                </p>
              </div>
            </div>
            <EmailTemplateEditor />
          </div>
        )}

        {activeView === 'crm' && (
          <LeadsDatabase />
        )}

        {activeView === 'kanban' && (
          <KanbanPipeline />
        )}

        {activeView === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {activeView === 'settings' && (
          <SettingsView />
        )}
      </main>

      {/* Global Modals */}
      {isSuperAdmin && (
        <>
          <EmailCampaignModal />
          <DeliveryReportModal />
        </>
      )}
      <AppendSearchModal
        dataset={appendModalDataset}
        isOpen={Boolean(appendModalDataset)}
        onClose={() => setAppendModalDataset(null)}
      />

      {/* Minimal Clean Footer */}
      <footer className="w-full border-t border-[#1C1C1C] bg-[#050505] py-4 px-6 text-center text-xs font-mono text-zinc-500 flex items-center justify-center max-w-[1600px] mx-auto">
        <span>MegaTrix LeadEngine — a Product of MegaTrix Technologies © 2026</span>
      </footer>

    </div>
  );
}

export default App;
