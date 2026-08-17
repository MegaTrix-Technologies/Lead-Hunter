import React from 'react';
import { useLead } from './context/LeadContext';
import Navbar from './components/layout/Navbar';
import ScraperControls from './components/scraper/ScraperControls';
import ScraperResults from './components/scraper/ScraperResults';
import CallingWorkstation from './components/calling/CallingWorkstation';
import EmailTemplateEditor from './components/email/EmailTemplateEditor';
import LeadsDatabase from './components/crm/LeadsDatabase';
import KanbanPipeline from './components/crm/KanbanPipeline';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import EmailCampaignModal from './components/email/EmailCampaignModal';
import DeliveryReportModal from './components/email/DeliveryReportModal';

function App() {
  const { activeView } = useLead();

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col font-sans selection:bg-white selection:text-black">
      
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeView === 'scraper' && (
          <div className="space-y-6">
            <ScraperControls />
            <ScraperResults />
          </div>
        )}

        {activeView === 'workstation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E1E1E]">
              <div>
                <h1 className="text-lg font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 inline-block" />
                  Outbound Cold Calling Dialing Workstation
                </h1>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  GMB Split-Screen Workstation with instant call status persistence &amp; historical audit timeline.
                </p>
              </div>
            </div>
            <CallingWorkstation />
          </div>
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
      </main>

      {/* Global Modals */}
      <EmailCampaignModal />
      <DeliveryReportModal />

      {/* Minimal Pure Dark Footer */}
      <footer className="w-full border-t border-[#1C1C1C] bg-[#050505] py-4 px-6 text-center text-xs font-mono text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-2 text-zinc-500">
          <span className="font-bold text-zinc-400">MegaTrix LeadEngine &amp; CRM</span>
          <span>•</span>
          <span>Pure Dark Outbound Suite</span>
        </div>
        <div className="text-[11px] text-zinc-600">
          Global Deduplication &amp; Terminal Status Exclusions Enforced
        </div>
      </footer>

    </div>
  );
}

export default App;
