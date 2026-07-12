import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Building2, Users, Layers, Loader2, Info } from 'lucide-react';
import axios from 'axios';

interface Department {
  id: number;
  name: string;
  description: string;
}

interface AssetCategory {
  id: number;
  name: string;
  description: string;
}

interface Employee {
  id: number;
  email: string;
  full_name: string;
  department_id: number;
  department?: Department;
}

export const Organization: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Navigation tabs: 'departments' | 'employees' | 'categories'
  const [activeTab, setActiveTab] = useState<'departments' | 'employees' | 'categories'>('departments');
  const [searchQuery, setSearchQuery] = useState('');

  // Data lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Loading flags
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Modals visibility
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [empForm, setEmpForm] = useState({ email: '', full_name: '', department_id: '' });

  const isEditable = user?.role === 'Admin' || user?.role === 'Asset Manager';

  // Fetch all lists
  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptsRes, catsRes, empsRes] = await Promise.all([
        axios.get<Department[]>('/departments'),
        axios.get<AssetCategory[]>('/categories'),
        axios.get<Employee[]>('/users/employees'),
      ]);
      setDepartments(deptsRes.data);
      setCategories(catsRes.data);
      setEmployees(empsRes.data);
    } catch (error) {
      console.error('Error loading setup data:', error);
      showToast('Failed to load organization records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name) {
      showToast('Department name is required', 'warning');
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post('/departments/', deptForm);
      showToast('Department registered successfully', 'success');
      setDeptForm({ name: '', description: '' });
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to create department';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) {
      showToast('Category name is required', 'warning');
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post('/categories/', catForm);
      showToast('Asset category created successfully', 'success');
      setCatForm({ name: '', description: '' });
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to create asset category';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.email || !empForm.full_name || !empForm.department_id) {
      showToast('All employee fields are required', 'warning');
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post('/users/employees', {
        email: empForm.email,
        full_name: empForm.full_name,
        department_id: parseInt(empForm.department_id, 10),
      });
      showToast('Employee profile added successfully', 'success');
      setEmpForm({ email: '', full_name: '', department_id: '' });
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to register employee';
      showToast(msg, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filters
  const filteredDepartments = departments.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.department?.name && e.department.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
            Organization Setup
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            Configure internal departments, asset category tags, and registered employee structures.
          </p>
        </div>
        {isEditable && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === 'departments' ? 'Department' : activeTab === 'categories' ? 'Category' : 'Employee'}
          </button>
        )}
      </div>

      {/* Tabs list & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex gap-2 bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-2xl">
          <button
            onClick={() => { setActiveTab('departments'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'departments'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-550 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Departments
          </button>
          <button
            onClick={() => { setActiveTab('categories'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-550 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'
            }`}
          >
            <Layers className="h-4 w-4" />
            Asset Categories
          </button>
          <button
            onClick={() => { setActiveTab('employees'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'employees'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-550 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'
            }`}
          >
            <Users className="h-4 w-4" />
            Employees
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Main content table area */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl overflow-hidden">
        {loading ? (
          /* Table Loader skeleton */
          <div className="p-8 space-y-4">
            <div className="h-10 bg-slate-50 dark:bg-zinc-850 rounded-2xl animate-pulse" />
            <div className="h-14 bg-slate-100 dark:bg-zinc-850 rounded-2xl animate-pulse" />
            <div className="h-14 bg-slate-50 dark:bg-zinc-850 rounded-2xl animate-pulse" />
            <div className="h-14 bg-slate-100 dark:bg-zinc-850 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'departments' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-850 text-slate-550 dark:text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Department Name</th>
                    <th className="px-6 py-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
                  {filteredDepartments.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-850/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-500 dark:text-zinc-555">#{d.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-100">{d.name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">{d.description || 'No description provided'}</td>
                    </tr>
                  ))}
                  {filteredDepartments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-slate-400">
                        No departments found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'categories' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-850 text-slate-550 dark:text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Category Name</th>
                    <th className="px-6 py-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
                  {filteredCategories.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-850/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-500 dark:text-zinc-555">#{c.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-100">{c.name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">{c.description || 'No description provided'}</td>
                    </tr>
                  ))}
                  {filteredCategories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-slate-400">
                        No categories found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'employees' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-850 text-slate-550 dark:text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Work Email</th>
                    <th className="px-6 py-4">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-slate-700 dark:text-zinc-300">
                  {filteredEmployees.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-850/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-500 dark:text-zinc-555">#{e.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase border border-indigo-100 dark:border-indigo-900/20">
                          {e.full_name.charAt(0)}
                        </div>
                        {e.full_name}
                      </td>
                      <td className="px-6 py-4 text-slate-550 dark:text-zinc-400">{e.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-350">
                          {e.department?.name || `Dept #${e.department_id}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400">
                        No employees registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Slide-in dialog / Drawer modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-2xl relative z-50 flex flex-col justify-between p-8 border-l border-zinc-200 dark:border-zinc-800 rounded-l-3xl"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">
                  Register New{' '}
                  {activeTab === 'departments' ? 'Department' : activeTab === 'categories' ? 'Asset Category' : 'Employee'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Provide credentials for our {activeTab} directory records.
                </p>

                {/* Form Elements */}
                {activeTab === 'departments' && (
                  <form id="org-form" onSubmit={handleCreateDepartment} className="mt-8 space-y-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Department Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Research & Development"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Description
                      </label>
                      <textarea
                        placeholder="Detail functional duties of this sector..."
                        value={deptForm.description}
                        onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 h-28 resize-none"
                      />
                    </div>
                  </form>
                )}

                {activeTab === 'categories' && (
                  <form id="org-form" onSubmit={handleCreateCategory} className="mt-8 space-y-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Category Tag
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Smart Monitors"
                        value={catForm.name}
                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Category Scope Description
                      </label>
                      <textarea
                        placeholder="Outline types of hardware matching this category..."
                        value={catForm.description}
                        onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 h-28 resize-none"
                      />
                    </div>
                  </form>
                )}

                {activeTab === 'employees' && (
                  <form id="org-form" onSubmit={handleCreateEmployee} className="mt-8 space-y-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={empForm.full_name}
                        onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Work Email
                      </label>
                      <input
                        type="email"
                        placeholder="jane.doe@company.com"
                        value={empForm.email}
                        onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                        Allocated Sector (Department)
                      </label>
                      <select
                        value={empForm.department_id}
                        onChange={(e) => setEmpForm({ ...empForm, department_id: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                        required
                      >
                        <option value="" disabled>Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </form>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-650 dark:text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="org-form"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Confirm Submit'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
