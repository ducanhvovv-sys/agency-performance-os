import React, { useState } from 'react';
import { 
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  Users, BarChart3, Filter, Search, Bell, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';

export default function AgencyApp() {
  const [selectedRole, setSelectedRole] = useState('Giám đốc');
  const [ownerFilter, setOwnerFilter] = useState('Tất cả');
  const [projectFilter, setProjectFilter] = useState('Tất cả');
  const [timeFilter, setTimeFilter] = useState('Tháng này');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* 1. TOP NAVBAR & ROLE SWITCHER */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-lg tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">AOS</span>
            AgencyOS
          </div>
          
          <div className="relative hidden md:block w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm dự án, task, nhân sự... (Cmd + K)" 
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
            {['Nhân viên', 'Leader', 'Giám đốc', 'Admin'].map((role) => (
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
          
          <button className="relative p-2 text-slate-500 hover:text-slate-700">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>
          
          <div className="h-8 w-8 rounded-full bg-blue-100 font-bold text-blue-700 flex items-center justify-center text-xs border border-blue-200">
            ĐA
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl p-6 space-y-6">

        {/* 2. PAGE HEADER & PILL FILTERS BAR */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">AGENCY PERFORMANCE CONSOLE</span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Tổng quan Hiệu suất Vận hành</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60">
                ● D1 Database Live
              </span>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition">
                + Thêm dự án mới
              </button>
            </div>
          </div>

          {/* Pill Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-2">
              <Filter className="h-3.5 w-3.5" /> LỌC NHANH:
            </div>

            <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">NHÂN SỰ:</span>
              {['Tất cả', 'Của tôi', 'Team Content', 'Team Ads'].map((item) => (
                <button
                  key={item}
                  onClick={() => setOwnerFilter(item)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    ownerFilter === item 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">DỰ ÁN:</span>
              {['Tất cả', 'BIDV Gift', 'Dược sĩ Giang', 'ĐINH Scent'].map((item) => (
                <button
                  key={item}
                  onClick={() => setProjectFilter(item)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    projectFilter === item 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {['Tháng này', 'Quý này', 'Tất cả'].map((item) => (
                <button
                  key={item}
                  onClick={() => setTimeFilter(item)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    timeFilter === item 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. TOP METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow transition">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">KPI TOÀN AGENCY</span>
            <div className="mt-1 text-3xl font-black font-mono text-slate-900">92.5%</div>
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" /> +4.2% <span className="font-normal text-slate-400">vs tuần trước</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow transition">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TỔNG TASK ĐANG CHẠY</span>
            <div className="mt-1 text-3xl font-black font-mono text-slate-900">148</div>
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600">
              <span>32 task chờ duyệt</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow transition">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TỈ LỆ ĐÚNG HẠN</span>
            <div className="mt-1 text-3xl font-black font-mono text-slate-900">88%</div>
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-rose-600">
              <ArrowDownRight className="h-3.5 w-3.5" /> -2.0% <span className="font-normal text-slate-400">mức mục tiêu 95%</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow transition">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CẢNH BÁO QUÁ TẢI</span>
            <div className="mt-1 text-3xl font-black font-mono text-amber-600">3 NS</div>
            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700">
              <span>Công suất &gt; 110%</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow transition">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CONTENT WIN RATE</span>
            <div className="mt-1 text-3xl font-black font-mono text-slate-900">64%</div>
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" /> +8.1% <span className="font-normal text-slate-400">vượt trung bình</span>
            </div>
          </div>
        </div>

        {/* 4. MAIN 2-COLUMN DASHBOARD GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Tiến độ Hoàn thành Task Hôm nay</h3>
                <span className="text-xs font-semibold text-blue-600">24 / 30 Task đã xong</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: '80%' }} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Sức khỏe Các Dự án Trọng điểm</h3>
              <div className="divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 text-sm">BIDV Gift - Chiến dịch Quà tặng Q3</span>
                    <p className="text-xs text-slate-500">Account: Nguyễn Văn A | Kênh: Facebook & TikTok</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    Đúng tiến độ (92%)
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 text-sm">Dược sĩ Giang - Branding & Performance</span>
                    <p className="text-xs text-slate-500">Account: Trần Thị B | Kênh: TikTok Shop</p>
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
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Cảnh báo & Diễn biến Mới</h3>
                <span className="text-[10px] font-bold uppercase text-slate-400">HÔM NAY</span>
              </div>
              <div className="relative pl-5 border-l-2 border-amber-400 space-y-1 py-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Quá tải nhân sự Content</span>
                  <span className="text-[10px] text-slate-400">10:15</span>
                </div>
                <p className="text-xs text-slate-600">Nhân sự Hoàng Yến đang gánh 125% công suất.</p>
                <span className="inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  Cần phân bổ lại
                </span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
