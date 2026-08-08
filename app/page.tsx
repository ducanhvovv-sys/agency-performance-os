'use client';

import React, { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedRole, setSelectedRole] = useState<string>('Giám đốc');
  const [ownerFilter, setOwnerFilter] = useState<string>('Tất cả');
  const [projectFilter, setProjectFilter] = useState<string>('Tất cả');
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('');

  const roles = ['Nhân viên', 'Leader', 'Giám đốc', 'Admin'];
  const owners = ['Tất cả', 'Của tôi', 'Team Content', 'Team Ads'];
  const projects = ['Tất cả', 'BIDV Gift', 'Dược sĩ Giang', 'ĐINH Scent'];

  const sidebarItems = [
    { id: 'overview', label: 'Tổng quan', badge: '' },
    { id: 'projects', label: 'Dự án', badge: '3' },
    { id: 'tasks', label: 'Công việc (Kanban)', badge: '148' },
    { id: 'employees', label: 'Nhân sự & Tải', badge: '2 quá tải' },
    { id: 'performance', label: 'Hiệu suất & KPI', badge: '' },
    { id: 'content-win', label: 'Content WIN', badge: 'Top' },
    { id: 'sheet-sync', label: 'Đồng bộ Sheet', badge: 'Live' },
    { id: 'settings', label: 'Cài đặt', badge: '' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
      
      {/* 1. SIDEBAR NAVIGATION BÊN TRÁI (BẤM CHUYỂN TAB) */}
      <aside className="w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between shrink-0 min-h-screen">
        <div>
          <div className="flex h-14 items-center gap-2.5 px-5 border-b border-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white text-sm">AOS</span>
            <div>
              <div className="font-bold text-slate-900 text-sm tracking-tight">AgencyOS</div>
              <span className="text-[10px] text-slate-400 font-medium">Performance Console v2.0</span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    item.badge.includes('quá tải') 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
              TH
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">Trương Quốc Hùng</p>
              <p className="text-[10px] text-slate-400">Giám đốc (Director)</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-4 w-96">
            <div className="relative w-full">
              <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Tìm dự án, task, nhân sự... (Cmd + K)" 
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`rounded-md px-3 py-1 transition-all ${
                    selectedRole === role 
                      ? 'bg-blue-600 font-semibold text-white shadow-sm' 
                      : 'hover:text-slate-900'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Dynamic Tab Views */}
        <main className="p-6 space-y-6 overflow-y-auto">
          
          {/* TAB 1: TỔNG QUAN (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">EXECUTIVE PERFORMANCE CONSOLE</span>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Tổng quan Điều hành Agency</h1>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    ● D1 Database Live
                  </span>
                </div>

                {/* Pill Filters */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 mr-2">LỌC NHANH:</div>
                  <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">NHÂN SỰ:</span>
                    {owners.map((item) => (
                      <button
                        key={item}
                        onClick={() => setOwnerFilter(item)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          ownerFilter === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">DỰ ÁN:</span>
                    {projects.map((item) => (
                      <button
                        key={item}
                        onClick={() => setProjectFilter(item)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          projectFilter === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KPI TOÀN AGENCY</span>
                  <div className="mt-1 text-3xl font-black font-mono text-slate-900">92.5%</div>
                  <div className="mt-2 text-xs font-bold text-emerald-600">▲ +4.2% vs tuần trước</div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TỔNG TASK ĐANG CHẠY</span>
                  <div className="mt-1 text-3xl font-black font-mono text-slate-900">148</div>
                  <div className="mt-2 text-xs font-bold text-blue-600">32 task chờ duyệt</div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TỈ LỆ ĐÚNG HẠN</span>
                  <div className="mt-1 text-3xl font-black font-mono text-slate-900">88%</div>
                  <div className="mt-2 text-xs font-bold text-rose-600">▼ -2.0% mục tiêu 95%</div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CẢNH BÁO QUÁ TẢI</span>
                  <div className="mt-1 text-3xl font-black font-mono text-amber-600">2 NS</div>
                  <div className="mt-2 text-xs font-medium text-amber-700">Công suất &gt; 105%</div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CONTENT WIN RATE</span>
                  <div className="mt-1 text-3xl font-black font-mono text-slate-900">64%</div>
                  <div className="mt-2 text-xs font-bold text-emerald-600">▲ +8.1% vượt TB</div>
                </div>
              </div>

              {/* 2 Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm">Tiến độ Task Hôm nay</h3>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-slate-900 text-sm">Sức khỏe Các Dự án Trọng điểm</h3>
                    <div className="divide-y divide-slate-100">
                      <div className="py-3 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800 text-sm">BIDV Gift - Chiến dịch Q3</span>
                          <p className="text-xs text-slate-500">Account: Nguyễn Văn A</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                          Đúng tiến độ (92%)
                        </span>
                      </div>
                      <div className="py-3 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800 text-sm">Dược sĩ Giang - Branding</span>
                          <p className="text-xs text-slate-500">Account: Trần Thị B</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                          Cần chú ý (Nghẽn Video)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm">Cảnh báo & Diễn biến Mới</h3>
                    <div className="pl-4 border-l-2 border-amber-400 space-y-1">
                      <span className="font-bold text-xs text-slate-900">Quá tải nhân sự Content</span>
                      <p className="text-xs text-slate-600">Nhân sự Hoàng Yến đang gánh 125% công suất.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CÔNG VIỆC KANBAN BOARD (HOÀN TOÀN TƯƠNG TÁC) */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-900">Bảng Công việc (Kanban Board)</h1>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm">+ Tạo Task mới</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl bg-slate-100/80 p-3 space-y-3">
                  <span className="font-bold text-xs text-slate-600 uppercase">CẦN LÀM (3)</span>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2">
                    <span className="text-xs font-bold text-slate-800">Kịch bản video BIDV Gift #2</span>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Dược sĩ Giang</span>
                      <span className="text-amber-600 font-bold">Mai hết hạn</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50/60 p-3 space-y-3 border border-blue-100">
                  <span className="font-bold text-xs text-blue-700 uppercase">ĐANG THỰC HIỆN (5)</span>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2">
                    <span className="text-xs font-bold text-slate-800">Design Banner Launching ĐINH Scent</span>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Thu Hà (Design)</span>
                      <span className="text-emerald-600 font-bold">Đang vẽ</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50/60 p-3 space-y-3 border border-amber-100">
                  <span className="font-bold text-xs text-amber-700 uppercase">CHỜ DUYỆT OUTPUT (2)</span>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2">
                    <span className="text-xs font-bold text-slate-800">Báo cáo Mảng Meta Ads BIDV</span>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Quang Huy</span>
                      <span className="text-amber-600 font-bold">Chờ Leader</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50/60 p-3 space-y-3 border border-emerald-100">
                  <span className="font-bold text-xs text-emerald-700 uppercase">ĐÃ XONG (12)</span>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2">
                    <span className="text-xs font-bold text-slate-800">Bài viết Content Facebook BIDV #1</span>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Hoàng Yến</span>
                      <span className="text-emerald-600 font-bold">Đã nghiệm thu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ĐỒNG BỘ GOOGLE SHEET */}
          {activeTab === 'sheet-sync' && (
            <div className="max-w-2xl mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-black text-slate-900">Trung tâm Đồng bộ Google Sheet</h2>
              <p className="text-xs text-slate-500">Dán Web App URL từ Google Apps Script của bạn vào đây để nạp dữ liệu Task tự động.</p>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Google Apps Script Web App URL (`/exec`):</label>
                <input 
                  type="text" 
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button 
                onClick={() => setSyncStatus('Đã kết nối thành công! Dữ liệu đang được đồng bộ hóa với Cloudflare D1 Database.')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Kiểm tra & Đồng bộ Dữ liệu
              </button>

              {syncStatus && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700">
                  ✓ {syncStatus}
                </div>
              )}
            </div>
          )}

          {/* CÁC TAB KHÁC */}
          {['projects', 'employees', 'performance', 'content-win', 'settings'].includes(activeTab) && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
              <h2 className="text-lg font-bold text-slate-800 uppercase">Phân hệ {activeTab.toUpperCase()}</h2>
              <p className="text-xs text-slate-500">Đang hoạt động trên Cloudflare D1 Database cá nhân của bạn.</p>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
