import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { Shield, User, Lock, Mail, Loader2, ArrowRight, Briefcase } from 'lucide-react';
import axios from 'axios';

interface Department {
  id: number;
  name: string;
}

export const Signup: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepts = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await axios.get<Department[]>('/departments');
          setDepartments(response.data);
          setLoadingDepts(false);
          return;
        } catch (error) {
          console.error(`Attempt ${attempt}/${retries} - Error fetching departments:`, error);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
      showToast('Failed to load departments. Please check if the server is running.', 'error');
      setLoadingDepts(false);
    };
    fetchDepts();
  }, [showToast]);

  const retryDepts = async () => {
    setLoadingDepts(true);
    try {
      const response = await axios.get<Department[]>('/departments');
      setDepartments(response.data);
      showToast('Departments loaded successfully!', 'success');
    } catch (error) {
      console.error('Retry failed:', error);
      showToast('Still unable to load departments. Is the backend running?', 'error');
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword || !departmentId) {
      showToast('All fields are required', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'warning');
      return;
    }

    setLoading(true);
    try {
      // API payload matches UserCreate
      await axios.post('/auth/signup', {
        email,
        full_name: fullName,
        password,
        department_id: parseInt(departmentId, 10),
      });

      showToast('Account created successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Registration failed. Try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[420px] space-y-6"
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-zinc-900 dark:bg-zinc-100 p-2.5 rounded-xl text-white dark:text-zinc-900 shadow-sm border border-zinc-800 dark:border-zinc-200">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-2">
            AssetFlow ERP
          </h1>
          <p className="text-xs text-zinc-555">
            Register as an Employee to request and reserve assets
          </p>
        </div>

        {/* Card wrapper */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs rounded-xl p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 premium-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 premium-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Department
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Briefcase className="h-4 w-4 text-zinc-400" />
                </div>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full pl-9 pr-8 premium-input appearance-none"
                  required
                  disabled={loadingDepts || departments.length === 0}
                >
                  <option value="" disabled>
                    {loadingDepts ? 'Loading departments...' : departments.length === 0 ? 'No departments available' : 'Select Department'}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              {!loadingDepts && departments.length === 0 && (
                <button
                  type="button"
                  onClick={retryDepts}
                  className="mt-1 text-[11px] font-medium text-indigo-650 hover:underline"
                >
                  ⟳ Failed to load departments — retry
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 premium-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 premium-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 premium-button-primary flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
