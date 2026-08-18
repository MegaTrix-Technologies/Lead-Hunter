import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LeadService, DatasetService, ScraperService, EmailService, AnalyticsService } from '../services/api';
import { useToast } from './ToastContext';

const LeadContext = createContext(null);

export const LeadProvider = ({ children }) => {
  const { addToast } = useToast();
  
  // Navigation & View State
  const [activeView, setActiveView] = useState('scraper'); // 'scraper' | 'workstation' | 'email' | 'crm' | 'kanban' | 'analytics'
  
  // Datasets State
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [activeDataset, setActiveDataset] = useState(null);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

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
    Unreachable: 0,
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

  // Bulk Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Scraper State
  const [scraping, setScraping] = useState(false);
  const [lastScrapeStats, setLastScrapeStats] = useState(null);

  // Append Modal State
  const [appendModalDataset, setAppendModalDataset] = useState(null);

  // Email Campaign Modal & Live Report State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [activeDeliveryReport, setActiveDeliveryReport] = useState(null);
  const [isDeliveryReportOpen, setIsDeliveryReportOpen] = useState(false);

  /**
   * Fetch All Datasets
   */
  const fetchDatasets = useCallback(async () => {
    setLoadingDatasets(true);
    try {
      const res = await DatasetService.getDatasets();
      if (res.data.success) {
        setDatasets(res.data.data);
        if (!activeDatasetId && res.data.data.length > 0) {
          setActiveDatasetId(res.data.data[0]._id);
          setActiveDataset(res.data.data[0]);
        }
      }
    } catch (error) {
      console.error('[LeadContext] fetchDatasets error:', error);
    } finally {
      setLoadingDatasets(false);
    }
  }, [activeDatasetId]);

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
   * Update Dataset (Name & Description)
   */
  const updateDataset = async (datasetId, { name, description }) => {
    try {
      const res = await DatasetService.updateDataset(datasetId, { name, description });
      if (res.data.success) {
        setDatasets(prev => prev.map(d => d._id === datasetId ? { ...d, name: res.data.data.name, description: res.data.data.description } : d));
        if (activeDatasetId === datasetId) {
          setActiveDataset(prev => ({ ...prev, name: res.data.data.name, description: res.data.data.description }));
        }
        addToast({
          title: 'Dataset Updated',
          message: `Saved changes to "${res.data.data.name}".`,
          type: 'success',
          duration: 2000
        });
        return res.data.data;
      }
    } catch (error) {
      console.error('[LeadContext] updateDataset error:', error);
      addToast({
        title: 'Update Failed',
        message: error.response?.data?.message || error.message,
        type: 'error'
      });
      throw error;
    }
  };

  /**
   * Delete Dataset
   */
  const deleteDataset = async (datasetId) => {
    try {
      const res = await DatasetService.deleteDataset(datasetId);
      if (res.data.success) {
        setDatasets(prev => prev.filter(d => d._id !== datasetId));
        if (activeDatasetId === datasetId) {
          setActiveDatasetId(null);
          setActiveDataset(null);
          setCallingQueue([]);
        }
        addToast({
          title: 'Dataset Deleted',
          message: res.data.message,
          type: 'info'
        });
        await fetchLeads(1);
      }
    } catch (error) {
      console.error('[LeadContext] deleteDataset error:', error);
      addToast({
        title: 'Deletion Failed',
        message: error.response?.data?.message || error.message,
        type: 'error'
      });
    }
  };

  /**
   * Load a specific Dataset into the Cold Calling Workstation queue
   */
  const loadDatasetQueue = async (datasetId) => {
    setLoadingQueue(true);
    try {
      const res = await DatasetService.getDatasetQueue(datasetId);
      if (res.data.success) {
        setCallingQueue(res.data.data);
        setActiveQueueIndex(0);
        setActiveDatasetId(datasetId);
        setActiveDataset(res.data.dataset);
        setActiveView('workstation');

        addToast({
          title: 'Workstation Loaded',
          message: `Loaded ${res.data.data.length} profiles from "${res.data.dataset.name}" into Cold Calling CRM.`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('[LeadContext] loadDatasetQueue error:', error);
      addToast({
        title: 'Error loading queue',
        message: error.message,
        type: 'error'
      });
    } finally {
      setLoadingQueue(false);
    }
  };

  /**
   * Append newly extracted leads to an existing dataset
   */
  const appendLeadsToDataset = async (datasetId, searchParams) => {
    setScraping(true);
    try {
      const res = await DatasetService.appendLeads(datasetId, searchParams);
      if (res.data.success) {
        addToast({
          title: 'Leads Appended',
          message: `Added ${res.data.data.stats.totalQualified} new verified leads. Excluded ${res.data.data.stats.totalExcluded} duplicates.`,
          type: 'success',
          duration: 4000
        });
        await fetchDatasets();
        await fetchLeads(1);
        if (activeDatasetId === datasetId) {
          await loadDatasetQueue(datasetId);
        }
        return res.data.data;
      }
    } catch (error) {
      console.error('[LeadContext] appendLeadsToDataset error:', error);
      addToast({
        title: 'Append Failed',
        message: error.response?.data?.message || error.message,
        type: 'error'
      });
      throw error;
    } finally {
      setScraping(false);
    }
  };

  /**
   * Fetch Calling Queue from DB on manual initialize
   */
  const fetchCallingQueue = useCallback(async (customParams = {}) => {
    setLoadingQueue(true);
    try {
      const res = await LeadService.getCallingQueue(customParams);
      if (res.data.success) {
        setCallingQueue(res.data.data);
        setActiveQueueIndex(0);
        addToast({
          title: 'Queue Initialized',
          message: `Loaded ${res.data.data.length} uncontacted leads into Cold Calling CRM.`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('[LeadContext] fetchCallingQueue error:', error);
      addToast({
        title: 'Failed to load queue',
        message: error.message,
        type: 'error'
      });
    } finally {
      setLoadingQueue(false);
    }
  }, [addToast]);

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

        // Refresh counts & datasets
        fetchLeads(pagination.currentPage, filters);
        fetchDatasets();
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
   * Run GMB Scrape & Extraction (Creates a new Dataset)
   */
  const executeScrape = async (searchParams) => {
    setScraping(true);
    try {
      const res = await ScraperService.scrapeLeads(searchParams);
      if (res.data.success) {
        const extractedLeads = res.data.data.leads || [];
        const dataset = res.data.data.dataset;
        setLastScrapeStats(res.data.data.stats);
        
        if (dataset) {
          setActiveDatasetId(dataset._id);
          setActiveDataset(dataset);
        }

        if (extractedLeads.length > 0) {
          setCallingQueue(extractedLeads);
          setActiveQueueIndex(0);
        }

        addToast({
          title: 'Dataset Created',
          message: `Created "${dataset?.name || 'Dataset'}" with ${res.data.data.stats.totalQualified} qualified leads. Excluded ${res.data.data.stats.totalExcluded} terminal/duplicates.`,
          type: 'success',
          duration: 5000
        });

        await fetchDatasets();
        await fetchLeads(1);
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
    fetchDatasets();
    fetchLeads(1);
  }, []);

  return (
    <LeadContext.Provider value={{
      activeView,
      setActiveView,
      datasets,
      activeDatasetId,
      setActiveDatasetId,
      activeDataset,
      setActiveDataset,
      loadingDatasets,
      fetchDatasets,
      updateDataset,
      deleteDataset,
      loadDatasetQueue,
      appendLeadsToDataset,
      appendModalDataset,
      setAppendModalDataset,
      leads,
      loadingLeads,
      pagination,
      statusCounts,
      filters,
      setFilters,
      fetchLeads,
      callingQueue,
      setCallingQueue,
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
