import React from 'react';
import { useSelector } from 'react-redux';
import Card from '../../components/Common/Card';
import { User, Mail, Shield, UserCheck, Key, Landmark } from 'lucide-react';

export default function Profile() {
  const { user } = useSelector((state) => state.auth);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-primary to-slate-800 text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-20 -translate-y-20 blur-2xl" />
        
        <div className="flex flex-col sm:flex-row items-center gap-6 z-10 relative">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center font-extrabold text-3xl border border-white/20 uppercase">
            {user.fullName.charAt(0)}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl md:text-2xl font-bold">{user.fullName}</h2>
            <p className="text-sm text-slate-300 font-mono mt-1">
              Mã tài khoản: {user.code}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider">
                {user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-semibold">
                OAuth2 Keycloak Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column: Profile card */}
        <div className="md:col-span-7">
          <Card title="Hồ sơ tài khoản" subtitle="Chi tiết định danh trên cơ sở dữ liệu chung">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-600">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Tên đăng nhập</span>
                </div>
                <span className="text-sm font-bold text-slate-800 font-mono">{user.username}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Địa chỉ Email</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{user.email}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-600">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Mã số cá nhân</span>
                </div>
                <span className="text-sm font-bold text-slate-800 font-mono">{user.code}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-600">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Quyền hạn hệ thống</span>
                </div>
                <span className="text-sm font-bold text-slate-800 capitalize">{user.role}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: Single Sign-On stats */}
        <div className="md:col-span-5">
          <Card title="Trạng thái Keycloak SSO" subtitle="Thông tin tích hợp phiên đăng nhập">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase">Access Token (JWT)</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 break-all leading-tight bg-white p-2 rounded-lg border border-slate-200">
                  eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJmR2ZzM...2026_thesis_attendance_token_keycloak_sub_{user.code}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase">Realm Server</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Realm ID:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">bkhn-realm</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mt-2">
                  <span>Client ID:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">attendance-web-app</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
