'use client';

import React, { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [selectedRole, setSelectedRole] = useState<string>('Giám đốc');
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Form State cho Task mở rộng
  const [taskCode, setTaskCode] = useState<string>('CV-001');
  const [taskTitle, setTaskCodeTitle] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('BIDV Gift');
  const [assignee, setAssignee] = useState<string>('Nguyễn Văn A');
  const [coAssignee, setCoAssignee] = useState<string>('');
  const [weight, setWeight] = useState<number>(8);
  const [priority, setPriority] = useState<string>('Cao');
  const [deadlineHour, setDeadlineHour] = useState<string>('18:00');
  const [channel, setChannel] = useState<string>('TikTok');
  const [outputGroup, setOutputGroup] = useState<string font-bold>('Video');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  const roles = ['Nhân viên', 'Leader', 'Giám đốc', 'Admin'];

  const sidebarNav = [
    { id: 'overview', label: 'Tổng quan Console', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'tasks', label: 'Công việc (Kanban Pro)', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'recurring', label: 'Việc Định kỳ (Meetings)', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { id: 'channels', label: 'Sản lượng Kênh & Output', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { id: 'employees', label: 'Nhân sự & Tải Trọng số', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'sheet-sync', label: 'Đồng bộ Sheet Pro', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'settings', label: 'Cài đặt', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
      
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between shrink-0 min-h-screen">
        <div>
          <div className="flex h-14 items-center gap-2.5 px-5 border-b border-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white text-sm">AOS</span>
            <div>
              <div className="font-bold text-slate-900 text-sm tracking-tight">AgencyOS Pro</div>
              <span className="text-[10px] text-slate-400 font-medium">Task & Workload Engine</span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {sidebarNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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

      {/* 2. MAIN BODY CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-4 w-96">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Tìm mã task (CV-001), dự án, nhân sự... (Cmd + K)" 
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

        {/* Dynamic Page Content */}
        <main className="p-6 space-y-6 overflow-y-auto">
          
          {/* TAB 1: KANBAN PRO WITH ENHANCED TASK FIELDS */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">TASK MANAGEMENT PRO</span>
                  <h1 className="text-2xl font-black text-slate-900">Bảng Công việc & Kỷ luật Thực thi</h1>
                </div>
                <button 
                  onClick={() => setShowNewTaskModal(true)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  + Tạo Task Mới (Đầy đủ Trường)
                </button>
              </div>

              {/* Kanban Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                
                {/* Column 1: Chưa làm */}
                <div className="rounded-xl bg-slate-100/80 p-3 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase">
                    <span>CẦN LÀM (2)</span>
                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-mono">Tải: 18pt</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">CV-001</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">🟢 Đúng hạn</span>
                    </div>
                    
                    <h4 className="text-xs font-bold text-slate-900">Kịch bản chi tiết Video TikTok Dược sĩ Giang #04</h4>
                    
                    <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                      <div className="flex justify-between">
                        <span>Dự án: <strong className="text-slate-700">Dược sĩ Giang</strong></span>
                        <span>Trọng số: <strong className="font-mono text-slate-900">10pt</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kênh: <strong className="text-slate-700">TikTok</strong></span>
                        <span>Đầu ra: <strong className="text-slate-700">Video</strong></span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Phụ trách: Hoàng Yến</span>
                        <span>Giờ chót: <strong className="text-slate-700">18:00</strong></span>
                      </div>
                    </div>

                    {/* Tiến độ % */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Tiến độ</span>
                        <span className="text-blue-600">35%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '35%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Đang làm */}
                <div className="rounded-xl bg-blue-50/60 p-3 space-y-3 border border-blue-100">
                  <div className="flex justify-between items-center text-xs font-bold text-blue-700 uppercase">
                    <span>ĐANG THỰC HIỆN (3)</span>
                    <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded font-mono">Tải: 25pt</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">CV-003</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">🟡 Có rủi ro</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">Design Banner Launching ĐINH Scent Combo Q3</h4>

                    <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                      <div className="flex justify-between">
                        <span>Dự án: <strong className="text-slate-700">ĐINH Scent</strong></span>
                        <span>Trọng số: <strong className="font-mono text-slate-900">8pt</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kênh: <strong className="text-slate-700">Meta Ads</strong></span>
                        <span>Đầu ra: <strong className="text-slate-700">Hình ảnh</strong></span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Phụ trách: Thu Hà</span>
                        <span>Giờ chót: <strong className="text-rose-600 font-bold">16:59 Hôm nay</strong></span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Tiến độ</span>
                        <span className="text-amber-600">70%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '70%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Chờ duyệt */}
                <div className="rounded-xl bg-amber-50/60 p-3 space-y-3 border border-amber-100">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-700 uppercase">
                    <span>CHỜ DUYỆT OUTPUT (2)</span>
                    <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded font-mono">Tải: 16pt</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">CV-005</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">🟢 Đúng hạn</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">Báo cáo Mảng Meta Ads BIDV Gift Tuần 1</h4>

                    <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                      <div className="flex justify-between">
                        <span>Dự án: <strong className="text-slate-700">BIDV Gift</strong></span>
                        <span>Trọng số: <strong className="font-mono text-slate-900">8pt</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phụ trách: Quang Huy</span>
                        <span>Phối hợp: Tuấn Nam</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Tiến độ</span>
                        <span className="text-emerald-600">95%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '95%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 4: Đã xong */}
                <div className="rounded-xl bg-emerald-50/60 p-3 space-y-3 border border-emerald-100">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-700 uppercase">
                    <span>ĐÃ XONG (12)</span>
                    <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded font-mono">Thắng: 84pt</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">CV-009</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">🟢 Đúng hạn</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">Bài viết Content Facebook BIDV #1</h4>

                    <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                      <div className="flex justify-between">
                        <span>Dự án: <strong className="text-slate-700">BIDV Gift</strong></span>
                        <span>Trọng số: <strong className="font-mono text-slate-900">7pt</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>SL đăng: <strong className="text-emerald-600">1/1 Bài</strong></span>
                        <span>Kỷ luật: <strong className="text-emerald-600 font-bold">Đã nghiệm thu</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CÔNG VIỆC ĐỊNH KỲ (RECURRING TASKS) */}
          {activeTab === 'recurring' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">RECURRING TASK ENGINE</span>
                  <h1 className="text-2xl font-black text-slate-900">Quản lý Việc Định kỳ & Họp Giao ban</h1>
                </div>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm">+ Thêm Lịch Định kỳ</button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="divide-y divide-slate-100">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900">Họp Giao ban Vận hành Tuần (Team Lead & Director)</span>
                      <p className="text-xs text-slate-500">Tần suất: Hàng tuần (Thứ Hai, 09:00) | Trọng số: 8pt</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                      Tự động tạo Task
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900">Báo cáo Đối soát Ngân sách Meta Ads Tháng</span>
                      <p className="text-xs text-slate-500">Tần suất: Hàng tháng (Ngày 30) | Trọng số: 10pt</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                      Tự động gia hạn Deadline
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ĐỒNG BỘ GOOGLE SHEET PRO */}
          {activeTab === 'sheet-sync' && (
            <div className="max-w-2xl mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-black text-slate-900">Trung tâm Đồng bộ Google Sheet Pro</h2>
              <p className="text-xs text-slate-500">Nạp dữ liệu Task tự động từ file Google Sheet chuẩn cấu hình của bạn.</p>
              
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
                onClick={() => setSyncStatus('Đã kết nối thành công! Toàn bộ danh sách Task & Trọng số đã được nạp về D1 Database.')}
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

          {/* OTHER TABS */}
          {['overview', 'channels', 'employees', 'settings'].includes(activeTab) && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
              <h2 className="text-lg font-bold text-slate-800 uppercase">Phân hệ {activeTab.toUpperCase()}</h2>
              <p className="text-xs text-slate-500">Tự động tính toán theo chỉ số D1 Database cá nhân của bạn.</p>
            </div>
          )}

        </main>
      </div>

      {/* POPUP MODAL TẠO TASK NÂNG CAO */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Tạo Task Mới (Đầy đủ Trường chuẩn Excel)</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Mã Task:</label>
                <input type="text" value={taskCode} onChange={(e) => setTaskCode(e.target.value)} className="w-full border rounded p-2 mt-1" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Tên Dự án:</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full border rounded p-2 mt-1" />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-700">Tên Nhiệm vụ Cụ thể:</label>
                <input type="text" value={taskTitle} onChange={(e) => setTaskCodeTitle(e.target.value)} placeholder="Nhập tên công việc..." className="w-full border rounded p-2 mt-1" />
              </div>

              <div>
                <label className="font-bold text-slate-700">Người Phụ trách Chính:</label>
                <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full border rounded p-2 mt-1" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Người Phối hợp:</label>
                <input type="text" value={coAssignee} onChange={(e) => setCoAssignee(e.target.value)} placeholder="Ví dụ: Tuấn Nam, Thu Hà" className="w-full border rounded p-2 mt-1" />
              </div>

              <div>
                <label className="font-bold text-slate-700">Trọng số Task (1 - 10 pt):</label>
                <input type="number" min="1" max="10" value={weight} onChange={(e) => setWeight(parseInt(e.target.value))} className="w-full border rounded p-2 mt-1 font-mono font-bold" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Giờ Chót (Deadline Hour):</label>
                <input type="text" value={deadlineHour} onChange={(e) => setDeadlineHour(e.target.value)} className="w-full border rounded p-2 mt-1" />
              </div>

              <div>
                <label className="font-bold text-slate-700">Kênh Đăng:</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full border rounded p-2 mt-1 bg-white">
                  <option value="Facebook/Fanpage">Facebook/Fanpage</option>
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Website">Website</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Nhóm Đầu ra:</label>
                <select value={outputGroup} onChange={(e) => setOutputGroup(e.target.value)} className="w-full border rounded p-2 mt-1 bg-white">
                  <option value="Video">Video</option>
                  <option value="Bài viết">Bài viết</option>
                  <option value="Hình ảnh">Hình ảnh</option>
                  <option value="Kịch bản">Kịch bản</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setShowNewTaskModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg">Hủy</button>
              <button onClick={() => setShowNewTaskModal(false)} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg shadow">Lưu Task Mới</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
