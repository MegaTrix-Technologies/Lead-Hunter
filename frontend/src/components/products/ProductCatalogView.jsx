import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  Tag, 
  Percent, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  ShieldAlert, 
  Info, 
  X, 
  Check, 
  Loader2,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ProductService } from '../../services/api';

const CATEGORIES = [
  'ALL',
  'Web Development',
  'E-Commerce',
  'Digital Marketing',
  'SEO',
  'Design & Branding',
  'Mobile App',
  'Maintenance & Hosting',
  'Other'
];

const ProductCatalogView = () => {
  const { isSuperAdmin } = useAuth();
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal states for Super Admin CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Web Development',
    basePrice: '',
    maxDiscountPercent: 15,
    currency: 'PKR',
    description: '',
    deliverablesText: '',
    isActive: true
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await ProductService.getProducts();
      if (res.data?.success) {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      addToast({
        title: 'Catalog Error',
        message: 'Could not load product catalog. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Web Development',
      basePrice: '',
      maxDiscountPercent: 15,
      currency: 'PKR',
      description: '',
      deliverablesText: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      category: prod.category || 'Web Development',
      basePrice: prod.basePrice !== undefined ? prod.basePrice : '',
      maxDiscountPercent: prod.maxDiscountPercent !== undefined ? prod.maxDiscountPercent : 0,
      currency: prod.currency || 'PKR',
      description: prod.description || '',
      deliverablesText: Array.isArray(prod.deliverables) ? prod.deliverables.join('\n') : '',
      isActive: prod.isActive !== undefined ? prod.isActive : true
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.basePrice === '') {
      addToast({ title: 'Validation Error', message: 'Name and base price are required.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const deliverables = formData.deliverablesText
        .split('\n')
        .map(d => d.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        basePrice: parseFloat(formData.basePrice),
        maxDiscountPercent: parseFloat(formData.maxDiscountPercent) || 0,
        currency: formData.currency || 'PKR',
        description: formData.description.trim(),
        deliverables,
        isActive: formData.isActive
      };

      if (editingProduct) {
        await ProductService.updateProduct(editingProduct._id, payload);
        addToast({ title: 'Product Updated', message: `Updated "${payload.name}" successfully.`, type: 'success' });
      } else {
        await ProductService.createProduct(payload);
        addToast({ title: 'Product Added', message: `Added "${payload.name}" to catalog.`, type: 'success' });
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      addToast({ title: 'Save Failed', message: err.response?.data?.message || err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    try {
      await ProductService.deleteProduct(id);
      addToast({ title: 'Product Deleted', message: `Removed "${name}" from catalog.`, type: 'info' });
      setDeleteConfirmId(null);
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      addToast({ title: 'Delete Failed', message: err.message, type: 'error' });
    }
  };

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Web Development':
        return 'border-blue-500/40 bg-blue-950/40 text-blue-300';
      case 'E-Commerce':
        return 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300';
      case 'SEO':
        return 'border-purple-500/40 bg-purple-950/40 text-purple-300';
      case 'Digital Marketing':
        return 'border-amber-500/40 bg-amber-950/40 text-amber-300';
      case 'Design & Branding':
        return 'border-rose-500/40 bg-rose-950/40 text-rose-300';
      default:
        return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-zinc-300 pb-12">
      
      {/* ─── HEADER & CONTROLS ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E1E1E] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-950/50 border border-blue-500/40 text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-wider text-white uppercase">Product &amp; Service Catalog</h1>
                <span className="text-[10px] px-2 py-0.5 border border-zinc-700 bg-[#141414] text-zinc-400 font-bold">
                  {filteredProducts.length} OFFERINGS
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Standardized pricing, deliverables, and permitted outreach discount thresholds.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Offering</span>
            </button>
          )}
        </div>
      </div>

      {/* Role-Specific Banner */}
      <div className={`p-3.5 border flex items-start sm:items-center justify-between gap-3 text-xs ${
        isSuperAdmin 
          ? 'bg-[#090D1A] border-blue-900/60 text-blue-300' 
          : 'bg-[#0F0D07] border-amber-900/60 text-amber-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            {isSuperAdmin ? (
              <>
                <strong className="text-white">Super Admin Catalog Authority:</strong> You can create products and configure the <strong className="text-white">Maximum Discount %</strong>. Agents are bounded by this ceiling when dispositioning deals in the Cold Calling CRM.
              </>
            ) : (
              <>
                <strong className="text-white">Agent Pitch Guide:</strong> You can pitch any offering below during cold calls and offer discounts up to the permitted <strong className="text-white">Max Discount %</strong>.
              </>
            )}
          </span>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0A0A0A] p-3 border border-[#1E1E1E]">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offerings by name, category, or deliverables..."
            className="w-full pl-9 pr-3 py-2 bg-black border border-[#2B2B2B] text-white text-xs focus:border-white focus:outline-none placeholder:text-zinc-600"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[10px] px-2.5 py-1 border transition-colors cursor-pointer shrink-0 uppercase font-bold ${
                selectedCategory === cat
                  ? 'border-white bg-white text-black'
                  : 'border-[#222222] bg-[#111111] text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ─── PRODUCT GRID ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
          <span className="text-xs uppercase tracking-wider">Loading Product Catalog...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center border border-[#1E1E1E] bg-[#070707] p-8 space-y-3">
          <Package className="w-8 h-8 text-zinc-600 mx-auto" />
          <div className="text-sm font-bold text-white uppercase">No Offerings Found</div>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'ALL' 
              ? 'No products match your current search or category filter.' 
              : 'The product catalog is currently empty.'}
          </p>
          {isSuperAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-3 px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] border border-zinc-700 text-white text-xs uppercase cursor-pointer"
            >
              + Create First Offering
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(prod => {
            const minAllowedPrice = Math.round(prod.basePrice * (1 - (prod.maxDiscountPercent || 0) / 100));

            return (
              <div 
                key={prod._id}
                className="bg-[#0A0A0A] border border-[#1F1F1F] hover:border-zinc-700 transition-all flex flex-col justify-between relative group"
              >
                {/* Header info */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase ${getCategoryColor(prod.category)}`}>
                      {prod.category}
                    </span>
                    {!prod.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 border border-red-800/60 bg-red-950/40 text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">{prod.name}</h3>
                    {prod.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {/* Pricing Box with Permitted Discount Variation */}
                  <div className="p-3.5 bg-black border border-[#1B1B1B] space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Standard Base:</span>
                      <span className="text-base font-bold text-white font-mono">
                        {prod.currency} {prod.basePrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#181818] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-950/60 border border-purple-800/60 text-purple-300 font-bold flex items-center gap-1">
                          <Percent className="w-2.5 h-2.5" />
                          Up to {prod.maxDiscountPercent}% Off
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 block leading-none mb-0.5">Permitted Floor:</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          {prod.currency} {minAllowedPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deliverables Checklist */}
                  {prod.deliverables && prod.deliverables.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                        Core Deliverables:
                      </div>
                      <ul className="space-y-1">
                        {prod.deliverables.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-zinc-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card Footer / Super Admin Actions */}
                {isSuperAdmin && (
                  <div className="p-3 bg-[#070707] border-t border-[#1C1C1C] flex items-center justify-between text-xs">
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Admin Controls
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="px-2.5 py-1 bg-[#141414] hover:bg-[#1E1E1E] border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {deleteConfirmId === prod._id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteProduct(prod._id, prod.name)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(prod._id)}
                          className="p-1.5 bg-[#141414] hover:bg-red-950/40 border border-zinc-800 hover:border-red-700 text-zinc-400 hover:text-red-400 cursor-pointer transition-colors"
                          title="Delete Offering"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE / EDIT MODAL (SUPER ADMIN ONLY) ────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0A0A0A] border border-[#2B2B2B] w-full max-w-3xl lg:max-w-4xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingProduct ? 'Edit Product Offering' : 'Create New Product Offering'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-mono">
              
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase text-[11px] mb-1">
                    Offering Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Custom Business Website"
                    className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase text-[11px] mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:border-white focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Max Discount Permitted */}
              <div className="p-4 bg-black border border-[#222222] space-y-3">
                <div className="text-[11px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Pricing &amp; Outreach Discount Settings
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 uppercase text-[10px] mb-1">
                      Base Standard Price ({formData.currency}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      placeholder="e.g. 15000"
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2B2B2B] text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 uppercase text-[10px] mb-1 flex items-center justify-between">
                      <span>Max Discount Permitted (%)</span>
                      <span className="text-purple-400 font-bold">{formData.maxDiscountPercent}%</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.maxDiscountPercent}
                      onChange={(e) => setFormData({ ...formData, maxDiscountPercent: Math.min(100, Math.max(0, e.target.value)) })}
                      placeholder="e.g. 15"
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2B2B2B] text-white text-sm font-bold focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Negotiation Preview */}
                {formData.basePrice && (
                  <div className="p-2.5 bg-[#121212] border border-zinc-800 text-[11px] flex items-center justify-between text-zinc-300">
                    <span>
                      Formula: <strong className="text-white">{formData.currency} {Number(formData.basePrice).toLocaleString()}</strong> with up to <strong className="text-purple-300">{formData.maxDiscountPercent}%</strong> discount
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Floor: {formData.currency} {Math.round(Number(formData.basePrice) * (1 - (Number(formData.maxDiscountPercent) || 0) / 100)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Description / Pitch Notes */}
              <div>
                <label className="block text-zinc-400 uppercase text-[11px] mb-1">
                  Sales Pitch &amp; Summary (Visible to Agents)
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Key selling points, typical customer pain points, and pitch angles..."
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:border-white focus:outline-none"
                />
              </div>

              {/* Deliverables */}
              <div>
                <label className="block text-zinc-400 uppercase text-[11px] mb-1">
                  Deliverables Checklist (1 item per line)
                </label>
                <textarea
                  rows="4"
                  value={formData.deliverablesText}
                  onChange={(e) => setFormData({ ...formData, deliverablesText: e.target.value })}
                  placeholder="5 Custom Responsive Pages&#10;WhatsApp Quick Connect Button&#10;Google Maps Location Embed&#10;On-Page SEO Setup"
                  className="w-full px-3 py-2 bg-black border border-[#2B2B2B] text-white focus:border-white focus:outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 bg-black border-zinc-700 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-xs text-zinc-300 cursor-pointer">
                  Offering is Active (visible in Calling CRM deal selector)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E1E1E]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingProduct ? 'Update Offering' : 'Create Offering'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default ProductCatalogView;
