import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Building2, Users, Layers, Loader2 } from 'lucide-react';
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

interface UserAccount {
  id: number;
  email: string;
  full_name: string;
  role: string;
  department_id?: number | null;
}

export const Organization: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Navigation tabs: 'departments' | 'employees' | 'categories' | 'users'
  const [activeTab, setActiveTab] = useState<'departments' | 'employees' | 'categories' | 'users'>('departments');
  const [searchQuery, setSearchQuery] = useState('');

  // Data lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);

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

      if (user?.role === 'Admin') {
        const usersRes = await axios.get<UserAccount[]>('/users');
        setUsersList(usersRes.data);
      }
    } catch (error) {
      console.error('Error loading setup data:', error);
      showToast('Failed to load organization records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await axios.put(`/users/${userId}/role`, { role: newRole });
      showToast(`User role updated to ${newRole}`, 'success');
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to update user role';
      showToast(msg, 'error');
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Organization Setup
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Configure internal departments, asset groups, and track employee listings.
          </p>
        </div>
        {isEditable && (
          <button
            onClick={() => setShowModal(true)}
            className="premium-button-primary flex items-center gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === 'departments' ? 'Department' : activeTab === 'categories' ? 'Category' : 'Employee'}
          </button>
        )}
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab('departments'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === 'departments'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Departments
          </button>
          <button
            onClick={() => { setActiveTab('categories'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Asset Categories
          </button>
          <button
            onClick={() => { setActiveTab('employees'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === 'employees'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Employee Directory
          </button>
          {user?.role === 'Admin' && (
            <button
              onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              User Accounts
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 premium-input text-xs"
          />
        </div>
      </div>

      {/* Lists & Data Views */}
      <div className="premium-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-10 bg-zinc-50 dark:bg-zinc-900 rounded-lg animate-pulse" />
            <div className="h-14 bg-zinc-100 dark:bg-zinc-900 rounded-lg animate-pulse" />
          </div>
        ) : activeTab === 'departments' ? (
          /* DEPARTMENTS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 font-semibold">ID</th>
                  <th className="px-6 py-3 font-semibold">Department Name</th>
                  <th className="px-6 py-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                {filteredDepartments.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-3 font-semibold text-zinc-400">#{d.id}</td>
                    <td className="px-6 py-3 font-bold text-zinc-900 dark:text-zinc-100">{d.name}</td>
                    <td className="px-6 py-3 text-zinc-555">{d.description || 'No description logged'}</td>
                  </tr>
                ))}
                {filteredDepartments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-zinc-400">No departments matching search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'categories' ? (
          /* CATEGORIES TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 font-semibold">ID</th>
                  <th className="px-6 py-3 font-semibold">Category Name</th>
                  <th className="px-6 py-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                {filteredCategories.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-3 font-semibold text-zinc-400">#{c.id}</td>
                    <td className="px-6 py-3 font-bold text-zinc-900 dark:text-zinc-100">{c.name}</td>
                    <td className="px-6 py-3 text-zinc-555">{c.description || 'No description logged'}</td>
                  </tr>
                ))}
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-zinc-400">No categories matching search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'employees' ? (
          /* EMPLOYEES TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 font-semibold">Employee ID</th>
                  <th className="px-6 py-3 font-semibold">Full Name</th>
                  <th className="px-6 py-3 font-semibold">Work Email</th>
                  <th className="px-6 py-3 font-semibold">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                {filteredEmployees.map(e => (
                  <tr key={e.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-3 font-semibold text-zinc-400">#{e.id}</td>
                    <td className="px-6 py-3 font-bold text-zinc-900 dark:text-zinc-100">{e.full_name}</td>
                    <td className="px-6 py-3 font-medium text-zinc-500">{e.email}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200 dark:border-zinc-700/60 text-[10px]">
                        {e.department?.name || 'Unassigned'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-zinc-400">No employees matching search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* USER ACCOUNTS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3 font-semibold">User ID</th>
                  <th className="px-6 py-3 font-semibold">Full Name</th>
                  <th className="px-6 py-3 font-semibold">Work Email</th>
                  <th className="px-6 py-3 font-semibold">System Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                {usersList
                  .filter(u => 
                    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(u => (
                    <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-3 font-semibold text-zinc-400">#{u.id}</td>
                      <td className="px-6 py-3 font-bold text-zinc-900 dark:text-zinc-100">{u.full_name}</td>
                      <td className="px-6 py-3 font-medium text-zinc-500">{u.email}</td>
                      <td className="px-6 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          disabled={u.id === user?.id}
                          className="premium-input text-xs py-1 min-w-[130px] font-medium"
                        >
                          <option value="Employee">Employee</option>
                          <option value="Department Head">Department Head</option>
                          <option value="Asset Manager">Asset Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-zinc-400">No user accounts loaded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODALS PANEL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-950/20 dark:bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-full shadow-xl relative z-50 flex flex-col justify-between p-6 border-l border-zinc-200 dark:border-zinc-800 rounded-l-2xl overflow-y-auto"
            >
              <div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Add {activeTab === 'departments' ? 'Department' : activeTab === 'categories' ? 'Category' : 'Employee'}
                  </h2>
                  <p className="text-[11px] text-zinc-555 mt-0.5">
                    Setup initial organization configuration logs.
                  </p>
                </div>

                {activeTab === 'departments' && (
                  <form id="org-form" onSubmit={handleCreateDepartment} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Department Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Engineering, Sales, HR"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        className="w-full premium-input"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Department Scope Description
                      </label>
                      <textarea
                        placeholder="Outline responsibility of this sector..."
                        value={deptForm.description}
                        onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                        className="w-full premium-input h-24 resize-none"
                      />
                    </div>
                  </form>
                )}

                {activeTab === 'categories' && (
                  <form id="org-form" onSubmit={handleCreateCategory} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Category Tag
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Smart Monitors"
                        value={catForm.name}
                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                        className="w-full premium-input"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Category Scope Description
                      </label>
                      <textarea
                        placeholder="Outline types of hardware matching this category..."
                        value={catForm.description}
                        onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                        className="w-full premium-input h-24 resize-none"
                      />
                    </div>
                  </form>
                )}

                {activeTab === 'employees' && (
                  <form id="org-form" onSubmit={handleCreateEmployee} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={empForm.full_name}
                        onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                        className="w-full premium-input"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Work Email
                      </label>
                      <input
                        type="email"
                        placeholder="jane.doe@company.com"
                        value={empForm.email}
                        onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                        className="w-full premium-input"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase text-zinc-500">
                        Allocated Sector (Department)
                      </label>
                      <select
                        value={empForm.department_id}
                        onChange={(e) => setEmpForm({ ...empForm, department_id: e.target.value })}
                        className="w-full premium-input"
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
              <div className="flex gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-grow premium-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="org-form"
                  disabled={submitLoading}
                  className="flex-grow premium-button-primary"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
