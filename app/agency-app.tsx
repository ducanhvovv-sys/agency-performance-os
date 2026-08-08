'use client';

import React, { useState } from 'react';

export default function AgencyApp() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedRole, setSelectedRole] = useState<string>('Giám đốc');
  const [ownerFilter, setOwnerFilter] = useState<string>('Tất cả');
  const [projectFilter, setProjectFilter] = useState<string>('Tất cả');
  const [resourceCategory, setResourceCategory] = useState<string>('Tất cả');
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [showNewResourceModal, setShowNewResourceModal] = useState<boolean>(false);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Form States
  const [taskCode, setTaskCode] = useState<string>('CV-001');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('BIDV Gift');
  const [assignee, setAssignee] = useState<string>('Nguyễn Văn A');
  const [weight, setWeight] = useState<number>(8);
  const [deadlineHour, setDeadlineHour] = useState<string>('18:00');

  const roles = ['Nhân viên', 'Leader', 'Giám đốc', 'Admin'];
  const owners = ['Tất cả', 'Của tôi', 'Team Content', 'Team Ads'];
  const projects = ['Tất cả', 'BIDV Gift', 'Dược sĩ Giang', 'ĐINH Scent'];

  const sidebarNav = [
    { id: 'overview', label: 'Tổng quan Console', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'tasks', label: 'Công việc (Kanban Pro)', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'calendar', label: 'Lịch công việc (Calendar)', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'resources', label: 'Quản lý Tài nguyên (Assets)', icon: 'M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2m-14 0v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
    { id: 'channels', label: 'Sản lượng Kênh & Output', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { id: 'employees', label: 'Nhân sự & Tải Trọng số', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'sheet-sync', label: 'Đồng bộ Sheet Pro', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'settings', label: 'Cài đặt', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between shrink-0 min-h-screen">
        <div>
          <div className="flex h-14 items-center gap-2.5 px-5 border-b border-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white text-sm">AOS</span>
            <div className="font-bold text-slate-900 text-sm tracking-tight">AgencyOS Pro</div>
          </div>
          <nav className="p-3 space-y-1">
            {sidebarNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === item.id ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-900">Trương Quốc Hùng</p>
          <p className="text-[10px] text-slate-400">Giám đốc (Director)</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white px-6">
          <span className="text-xs font-bold text-slate-500">Agency Performance Console</span>
          <div className="flex items-center gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`rounded-md px-3 py-1 text-xs transition-all ${
                  selectedRole === role ? 'bg-blue-600 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </header>

        <main className="p-6 space-y-6 overflow-y-auto">
          
          {/* TAB OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-slate-900">Tổng quan Điều hành Agency</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">KPI TOÀN AGENCY</span>
                  <div className="text-3xl font-black font-mono text-slate-900 mt-1">92.5%</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">TỔNG TASK ĐANG CHẠY</span>
                  <div className="text-3xl font-black font-mono text-slate-900 mt-1">148</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CALENDAR (LỊCH CÔNG VIỆC) */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">CALENDAR VIEW</span>
                  <h1 className="text-2xl font-black text-slate-900">Lịch Deadline & Chiến dịch Tháng 8, 2026</h1>
                </div>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm">+ Thêm Sự kiện/Lịch họp</button>
              </div>

              {/* Lưới Lịch Tháng */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 border-b pb-2">
                  <div>Thứ 2</div><div>Thứ 3</div><div>Thứ 4</div><div>Thứ 5</div><div>Thứ 6</div><div>Thứ 7</div><div>Chủ Nhật</div>
                </div>
                <div className="grid grid-cols-7 gap-2 text-xs font-medium min-h-[300px]">
                  <div className="p-2 border rounded-lg bg-slate-50 opacity-40">28</div>
                  <div className="p-2 border rounded-lg bg-slate-50 opacity-40">29</div>
                  <div className="p-2 border rounded-lg bg-slate-50 opacity-40">30</div>
                  <div className="p-2 border rounded-lg bg-slate-50 opacity-40">31</div>
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">1</span>
                    <div className="p-1 rounded bg-emerald-50 text-[10px] text-emerald-700 font-bold border border-emerald-200">Launch BIDV</div>
                  </div>
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">2</span>
                  </div>
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">3</span>
                  </div>

                  {/* Tuần hiện tại */}
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">4</span>
                  </div>
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">5</span>
                    <div className="p-1 rounded bg-amber-50 text-[10px] text-amber-700 font-bold border border-amber-200">Duyệt Kịch bản Giang</div>
                  </div>
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">6</span>
                  </div>
                  <div className="p-2 border rounded-lg bg-blue-50/60 border-blue-200 space-y-1 ring-2 ring-blue-500">
                    <span className="font-bold text-blue-700">7 (Hôm nay)</span>
                    <div className="p-1 rounded bg-rose-50 text-[10px] text-rose-700 font-bold border border-rose-200">Deadline Banner ĐINH</div>
                  </div>
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">8</span>
                  </div>
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">9</span>
                  </div>
                  <div className="p-2 border rounded-lg bg-white space-y-1">
                    <span className="font-bold text-slate-800">10</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB RESOURCES (QUẢN LÝ TÀI NGUYÊN) */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">RESOURCE & ASSET MANAGEMENT</span>
                  <h1 className="text-2xl font-black text-slate-900">Quản lý Tài nguyên & Tài sản Số Agency</h1>
                </div>
                <button onClick={() => setShowNewResourceModal(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm">+ Thêm Tài nguyên Mới</button>
              </div>

              {/* Lọc loại tài nguyên */}
              <div className="flex gap-2 border-b pb-3 text-xs font-bold">
                {['Tất cả', 'Thư mục Drive', 'Tài khoản Ads/BM', 'Brand Guidelines', 'Template Kịch bản'].map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setResourceCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg border transition ${resourceCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Danh sách Thẻ Tài nguyên */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">Google Drive</span>
                    <span className="text-xs font-mono text-slate-400">Dự án BIDV Gift</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Thư mục Thiết kế Master & Key Visual Q3</h4>
                  <p className="text-xs text-slate-500">Chứa toàn bộ file PSD, AI, Video Final cho chiến dịch BIDV Gift.</p>
                  <a href="#" className="inline-block text-xs font-bold text-blue-600 hover:underline">Mở thư mục Drive →</a>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Meta Business Manager</span>
                    <span className="text-xs font-mono text-slate-400">BM ID: 88291...</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Tài khoản Quảng cáo Meta Ads - Dược sĩ Giang</h4>
                  <p className="text-xs text-slate-500">Tài khoản Ads chính chạy Conversions CAPI cho sản phẩm Venus.</p>
                  <a href="#" className="inline-block text-xs font-bold text-blue-600 hover:underline">Mở Meta BM →</a>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">Brand Kit</span>
                    <span className="text-xs font-mono text-slate-400">ĐINH Scent</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Bộ nhận diện Thương hiệu & Logo Vector ĐINH Scent</h4>
                  <p className="text-xs text-slate-500">Bao gồm Font chữ thương hiệu, Mã màu Hex, Logo PNG/SVG.</p>
                  <a href="#" className="inline-block text-xs font-bold text-blue-600 hover:underline">Tải Brand Kit →</a>
                </div>
              </div>
            </div>
          )}

          {/* TAB TASKS KANBAN */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-900">Bảng Công việc chuẩn Excel Pro</h1>
                <button onClick={() => setShowNewTaskModal(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm">+ Tạo Task Mới</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-slate-100/80 p-3 space-y-3">
                  <span className="font-bold text-xs text-slate-600 uppercase">CẦN LÀM (CV-001)</span>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">CV-001</span>
                    <h4 className="text-xs font-bold text-slate-900">Kịch bản video TikTok #04</h4>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB SHEET SYNC */}
          {activeTab === 'sheet-sync' && (
            <div className="max-w-xl mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-black text-slate-900">Trung tâm Đồng bộ Google Sheet</h2>
              <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="Dán Web App URL..." className="w-full rounded-lg border p-2.5 text-xs" />
              <button onClick={() => setSyncStatus('Đã kết nối!')} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm">Đồng bộ</button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
