import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LeadService, ScraperService, EmailService, AnalyticsService } from '../services/api';
import { useToast } from './ToastContext';

const LeadContext = createContext(null);

export const LeadProvider = ({ children }) => {
  const { addToast } = useToast();
  
  // Navigation & View State
  const [activeView, setActiveView] = useState('scraper'); // 'scraper' | 'workstation' | 'email' | 'crm' | 'kanban' | 'analytics'
  
  // Leads & Pagination State (strictly 10 profiles per page)
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [pagination, setPagination] = useState({
    totalLeads: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [statusCounts, setStatusCounts] = useState({
    Uncontacted: 0,
    IVR: 0,
    Receptionist: 0,
    'Do Not Call': 0,
    'Shows Interest': 0,
    'Follow Up': 0,
    'Lead / Sale': 0
  });

  // Filter State
  const [filters, setFilters] = useState({
    status: 'ALL',
    search: '',
    area: '',
    category: '',
    noWebsiteOnly: false,
    maxRating: 5.0,
    sortBy: 'updated_desc'
  });

  // Calling Workstation State
  const [callingQueue, setCallingQueue] = useState([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Bulk Selection State for Campaigns
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Scraper State
  const [scraping, setScraping] = useState(false);
  const [lastScrapeStats, setLastScrapeStats] = useState(null);

  // Email Campaign Modal & Live Report State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [activeDeliveryReport, setActiveDeliveryReport] = useState(null);
  const [isDeliveryReportOpen, setIsDeliveryReportOpen] = useState(false);

  /**
   * Fetch leads with current filters and pagination
   */
  const fetchLeads = useCallback(async (page = pagination.currentPage, customFilters = filters) => {
    setLoadingLeads(true);
    try {
      const res = await LeadService.getLeads({
        page,
        limit: 10,
        ...customFilters
      });

      if (res.data.success) {
        setLeads(res.data.data);
        setPagination(res.data.pagination);
        if (res.data.statusCounts) {
          setStatusCounts(res.data.statusCounts);
        }
      }
    } catch (error) {
      console.error('[LeadContext] fetchLeads failed:', error);
      addToast({
        title: 'Error loading leads',
        message: error.response?.data?.message || error.message,
        type: 'error'
      });
    } finally {
      setLoadingLeads(false);
    }
  }, [pagination.currentPage, filters, addToast]);

  /**
   * Fetch Calling Queue
   */
  const fetchCallingQueue = useCallback(async (customParams = {}) => {
    setLoadingQueue(true);
    try {
      const res = await LeadService.getCallingQueue(customParams);
      if (res.data.success) {
        setCallingQueue(res.data.data);
        setActiveQueueIndex(0);
      }
    } catch (error) {
      console.error('[LeadContext] fetchCallingQueue error:', error);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  /**
   * Update Call Status & Sync
   */
  const updateCallStatus = async (leadId, callStatus, note = '', followUpDate = null) => {
    try {
      const res = await LeadService.updateCallStatus(leadId, {
        callStatus,
        note,
        followUpDate
      });

      if (res.data.success) {
        const updatedLead = res.data.data;

        // Update in callingQueue
        setCallingQueue(prev => prev.map(l => l._id === leadId ? updatedLead : l));

        // Update in leads list
        setLeads(prev => prev.map(l => l._id === leadId ? updatedLead : l));

        addToast({
          title: 'Status Saved',
          message: `Updated "${updatedLead.businessName}" to ${callStatus}`,
          type: 'success',
          duration: 2500
        });

        // Refresh counts
        fetchLeads(pagination.currentPage, filters);
        return updatedLead;
      }
    } catch (error) {
      console.error('[LeadContext] updateCallStatus error:', error);
      addToast({
        title: 'Failed to update status',
        message: error.response?.data?.message || error.message,
        type: 'error'
      });
      throw error;
    }
  };

  /**
   * Add Call Note
   */
  const addCallNote = async (leadId, noteText) => {
    try {
      const res = await LeadService.addCallNote(leadId, { note: noteText });
      if (res.data.success) {
        const updatedLead = res.data.data;
        setCallingQueue(prev => prev.map(l => l._id === leadId ? updatedLead : l));
        setLeads(prev => prev.map(l => l._id === leadId ? updatedLead : l));
        addToast({
          title: 'Note Recorded',
          message: 'Historical log updated successfully.',
          type: 'success',
          duration: 2000
        });
        return updatedLead;
      }
    } catch (error) {
      addToast({
        title: 'Error adding note',
        message: error.message,
        type: 'error'
      });
    }
  };

  /**
   * Run GMB Scrape & Extraction
   */
  const executeScrape = async (searchParams) => {
    setScraping(true);
    try {
      const res = await ScraperService.scrapeLeads(searchParams);
      if (res.data.success) {
        setLastScrapeStats(res.data.data.stats);
        addToast({
          title: 'Extraction Complete',
          message: `Discovered ${res.data.data.stats.totalQualified} qualified leads. Excluded ${res.data.data.stats.totalExcluded} terminal/duplicate profiles.`,
          type: 'success',
          duration: 5000
        });
        // Refresh leads list to page 1
        await fetchLeads(1);
        await fetchCallingQueue();
        return res.data.data;
      }
    } catch (error) {
      console.error('[LeadContext] executeScrape error:', error);
      addToast({
        title: 'Extraction Failed',
        message: error.response?.data?.message || error.message,
        type: 'error'
      });
      throw error;
    } finally {
      setScraping(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLeads(1);
    fetchCallingQueue();
  }, []);

  return (
    <LeadContext.Provider value={{
      activeView,
      setActiveView,
      leads,
      loadingLeads,
      pagination,
      statusCounts,
      filters,
      setFilters,
      fetchLeads,
      callingQueue,
      activeQueueIndex,
      setActiveQueueIndex,
      loadingQueue,
      fetchCallingQueue,
      updateCallStatus,
      addCallNote,
      selectedLeadIds,
      setSelectedLeadIds,
      scraping,
      lastScrapeStats,
      executeScrape,
      isCampaignModalOpen,
      setIsCampaignModalOpen,
      activeDeliveryReport,
      setActiveDeliveryReport,
      isDeliveryReportOpen,
      setIsDeliveryReportOpen
    }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLead = () => {
  const context = useContext(LeadContext);
  if (!context) throw new Error('useLead must be used within a LeadProvider');
  return context;
};
