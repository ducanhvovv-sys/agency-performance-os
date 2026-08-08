'use client';

import React, { useState } from 'react';

export default function AgencyApp() {
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [selectedRole, setSelectedRole] = useState<string>('Giám đốc');
  const [ownerFilter, setOwnerFilter] = useState<string>('Tất cả');
  const [projectFilter, setProjectFilter] = useState<string>('Tất cả');
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Form State cho Task mở rộng
  const [taskCode, setTaskCode] = useState<string>('CV-001');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('BIDV Gift');
  const [assignee, setAssignee] = useState<string>('Nguyễn Văn A');
  const [coAssignee, setCoAssignee] = useState<string>('');
  const [weight, setWeight] = useState<number>(8);
  const [deadlineHour, setDeadlineHour] = useState<string>('18:00');
  const [channel, setChannel] = useState<string>('TikTok');
  const [outputGroup, setOutputGroup] = useState<string>('Video');

  const roles = ['Nhân viên', 'Leader', 'Giám đốc', 'Admin'];
  const owners = ['Tất cả', 'Của tôi', 'Team Content', 'Team Ads'];
  const projects = ['Tất cả', 'BIDV Gift', 'Dược sĩ Giang', 'ĐINH Scent'];

  const sidebarNav = [
    { id: 'overview', label: 'Tổng quan Console', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'tasks', label: 'Công việc (Kanban Pro)', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'channels', label: 'Sản lượng Kênh & Output', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { id: 'sheet-sync', label: 'Đồng bộ Sheet Pro', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
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
          {/* TAB TASKS / KANBAN */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black text-slate-900">Bảng Công việc chuẩn Excel Pro</h1>
                <button onClick={() => setShowNewTaskModal(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
                  + Tạo Task Mới (Đầy đủ Trường)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-slate-100/80 p-3 space-y-3">
                  <span className="font-bold text-xs text-slate-600 uppercase">CẦN LÀM (CV-001)</span>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">CV-001</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">🟢 Đúng hạn</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">Kịch bản chi tiết Video TikTok #04</h4>
                    <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between"><span>Dự án: <strong>BIDV Gift</strong></span><span>Trọng số: <strong>10pt</strong></span></div>
                      <div className="flex justify-between"><span>Kênh: <strong>TikTok</strong></span><span>Đầu ra: <strong>Video</strong></span></div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50/60 p-3 space-y-3 border border-blue-100">
                  <span className="font-bold text-xs text-blue-700 uppercase">ĐANG THỰC HIỆN</span>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">CV-003</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">🟡 Có rủi ro</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">Design Banner ĐINH Scent</h4>
                    <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between"><span>Phụ trách: Thu Hà</span><span>Giờ chót: <strong className="text-rose-600 font-bold">16:59</strong></span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB SHEET SYNC */}
          {activeTab === 'sheet-sync' && (
            <div className="max-w-xl mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-black text-slate-900">Trung tâm Đồng bộ Google Sheet</h2>
              <input 
                type="text" 
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800"
              />
              <button onClick={() => setSyncStatus('Đã kết nối thành công!')} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm">
                Kiểm tra & Đồng bộ Dữ liệu
              </button>
              {syncStatus && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700">✓ {syncStatus}</div>}
            </div>
          )}
        </main>
      </div>

      {/* POPUP CREATION MODAL */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">Tạo Task Mới (Đầy đủ Trường Chuẩn)</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="font-bold text-slate-400">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="font-bold">Mã Task:</label><input type="text" value={taskCode} onChange={(e) => setTaskCode(e.target.value)} className="w-full border p-1.5 rounded mt-1" /></div>
              <div><label className="font-bold">Tên Dự án:</label><input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full border p-1.5 rounded mt-1" /></div>
              <div className="col-span-2"><label className="font-bold">Nhiệm vụ Cụ thể:</label><input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Nhập tên task..." className="w-full border p-1.5 rounded mt-1" /></div>
              <div><label className="font-bold">Người Phụ trách:</label><input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full border p-1.5 rounded mt-1" /></div>
              <div><label className="font-bold">Trọng số (1-10pt):</label><input type="number" value={weight} onChange={(e) => setWeight(parseInt(e.target.value))} className="w-full border p-1.5 rounded mt-1 font-bold" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setShowNewTaskModal(false)} className="px-3 py-1.5 bg-slate-100 rounded font-bold">Hủy</button>
              <button onClick={() => setShowNewTaskModal(false)} className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold">Lưu Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
