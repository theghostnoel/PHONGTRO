/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function AdminLogin({ isOpen, onClose, onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        // Lưu token xác thực vào localStorage để giữ phiên đăng nhập
        localStorage.setItem('admin_session_token', data.token);
        setTimeout(() => {
          onLoginSuccess();
          onClose();
          // Reset form
          setUsername('');
          setPassword('');
          setSuccess(false);
          setIsSubmitting(false);
        }, 1200);
      } else {
        setError(data.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Lỗi kết nối server đăng nhập:', err);
      setError('Không thể kết nối tới máy chủ. Vui lòng thử lại sau!');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Cổng Đăng Nhập</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hệ thống Admin UniStay</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <CheckCircle2 size={48} className="text-emerald-500 animate-bounce" />
              <h3 className="text-base font-extrabold text-slate-900">Đăng nhập thành công!</h3>
              <p className="text-xs text-slate-500">Đang tải bảng điều khiển quản trị...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tên đăng nhập</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Mật khẩu</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Đăng nhập ngay'
                )}
              </button>

              {/* Demo Account info card */}
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px] text-indigo-700 leading-relaxed flex items-center gap-2">
                <span className="shrink-0 text-indigo-500">🔒</span>
                <span>Đây là cổng bảo mật dành riêng cho Quản trị viên UniStay Hà Nội. Vui lòng sử dụng tài khoản được cung cấp.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
