"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type View = "dashboard" | "projects" | "tasks" | "people" | "performance" | "content" | "sync" | "settings";
type IconName =
  | "grid"
  | "folder"
  | "check"
  | "chart"
  | "star"
  | "settings"
  | "search"
  | "bell"
  | "calendar"
  | "plus"
  | "users"
  | "alert"
  | "clock"
  | "arrow"
  | "filter"
  | "more"
  | "video"
  | "link"
  | "refresh"
  | "money"
  | "close"
  | "menu"
  | "spark";

type Project = {
  id?: number;
  name: string;
  client: string | null;
  progress: number;
  status: "good" | "warning" | "risk";
  statusLabel: string;
  deadline: string | null;
  owner: string;
  ownerName?: string | null;
  contractType?: string;
  channels: string | null;
  tasksLabel: string;
  doneTasks?: number;
  totalTasks?: number;
  isDemo?: boolean;
};

type Task = {
  id: number;
  title: string;
  project: string;
  department: string;
  assignee: string;
  dueDate: string;
  priority: string;
  weight: number;
  status: string;
  sourceType?: string;
  sourceId?: string | null;
  sourceSheet?: string | null;
  sourceRow?: number | null;
  contentType?: string | null;
  contentPillar?: string | null;
  assetType?: string | null;
  sheetStatus?: string | null;
  sheetBrief?: string | null;
  channelStatus?: string | null;
  postUrl?: string | null;
  deliverableUrl?: string | null;
  deliverableType?: string | null;
  deliverableNote?: string | null;
  submittedBy?: string | null;
  submittedAt?: string | null;
  syncState?: string | null;
};

const DELIVERABLE_TYPES = ["Video Drive", "Kịch bản", "Plan", "Thiết kế", "Bài viết", "Khác"];

function suggestDeliverableType(department: string) {
  const value = department.toLowerCase();
  if (value.includes("video")) return "Video Drive";
  if (value.includes("design")) return "Thiết kế";
  if (value.includes("content")) return "Kịch bản";
  return "Khác";
}

function parseDueDate(value?: string | null): Date | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const low = raw.toLowerCase();
  if (low === "hôm nay") return today;
  if (low === "hôm qua") { const d = new Date(today); d.setDate(d.getDate() - 1); return d; }
  if (low === "ngày mai" || low === "mai") { const d = new Date(today); d.setDate(d.getDate() + 1); return d; }
  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = match[3] ? Number(match[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type Urgency = "overdue" | "today" | "soon" | "later" | "none";
const URGENCY_RANK: Record<Urgency, number> = { overdue: 0, today: 1, soon: 2, later: 3, none: 4 };

function taskUrgency(task: Task): { level: Urgency; days: number | null } {
  if (task.status === "done") return { level: "none", days: null };
  const due = parseDueDate(task.dueDate);
  if (!due) return { level: "none", days: null };
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { level: "overdue", days };
  if (days === 0) return { level: "today", days };
  if (days <= 3) return { level: "soon", days };
  return { level: "later", days };
}

function taskDayOffset(task: Task): number | null {
  const due = parseDueDate(task.dueDate);
  if (!due) return null;
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

type DateBucket = "all" | "today" | "tomorrow" | "after";
function matchesDateBucket(task: Task, bucket: DateBucket): boolean {
  if (bucket === "all") return true;
  const offset = taskDayOffset(task);
  if (offset === null) return false;
  if (bucket === "today") return offset === 0;
  if (bucket === "tomorrow") return offset === 1;
  return offset === 2;
}

function dueLabel(task: Task): string {
  const { level, days } = taskUrgency(task);
  if (level === "overdue" && days !== null) return `Trễ ${Math.abs(days)} ngày`;
  if (level === "today") return "Hôm nay";
  if (level === "soon" && days !== null) return `Còn ${days} ngày`;
  return task.dueDate || "—";
}

type SyncRow = Task;
type ColumnMap = { sourceId: number; title: number; dueDate?: number; pillar?: number; contentType?: number; assetType?: number; brief?: number; sheetStatus: number };
type SheetMapping = { startRow: number; statusCol: number; idCol: number; columns: ColumnMap; statusMap: Record<string, string>; project: string; deliverableCol?: number; postUrlCol?: number; owner?: string; gid?: string };
type SheetIntegration = {
  id: number;
  name: string;
  status: string;
  sourceUrl?: string | null;
  sourceFileId?: string | null;
  sourceTab: string;
  sourceFormat?: string;
  rowsImported: number;
  lastSyncedAt?: string | null;
  bridgeConfigured: boolean;
  mapping: SheetMapping;
};
type SyncData = {
  integrations: SheetIntegration[];
  integration: null | { name: string; status: string; rowsImported: number; lastSyncedAt?: string | null; bridgeConfigured?: boolean; sourceUrl?: string; sourceFormat?: string };
  summary: { total: number; appDone: number; sheetDone: number; channelMatched: number; mismatches: number; sheetCount?: number };
  rows: SyncRow[];
  source: { name: string; format: string; tab: string; availableRows: number; url: string };
};
type ConnectPayload = { mode: "link" | "bridge"; bridgeUrl: string; bridgeToken: string; linkUrl: string; tab: string; name: string; mapping: SheetMapping };
type ChannelIntegration = { id: number; platform: string; name: string; accountId?: string | null; status: string; rowsImported: number; lastSyncedAt?: string | null; project?: string | null };
type ChannelPost = { id: number; platform: string; title: string; project: string; permalink?: string | null; views: string; rawViews: number; retention: number; engagement: number; score: number; avgWatch?: number | null; publishedAt?: string | null; fetchedAt?: string | null };
type SocialData = { channels: ChannelIntegration[]; posts: ChannelPost[]; summary: { channelCount: number; facebook: number; tiktok: number; posts: number; topScore: number | null; lastSyncedAt: string | null } };
type ChannelPayload = { platform: "facebook" | "tiktok"; accessToken: string; accountId: string; name: string; project: string; discoverAll?: boolean };
const DEFAULT_MAPPING: SheetMapping = {
  startRow: 5,
  statusCol: 12,
  idCol: 1,
  columns: { sourceId: 1, dueDate: 2, pillar: 3, contentType: 4, title: 5, assetType: 7, brief: 6, sheetStatus: 12 },
  statusMap: { "Chưa viết": "todo", "Đang viết": "doing", "Đang thực hiện": "doing", "Chờ duyệt": "review", "Đã duyệt": "review", "Đã đăng bài": "done", Done: "done" },
  project: "Dược sĩ Giang",
  deliverableCol: 0,
  postUrlCol: 0,
  owner: "",
};

type Employee = {
  id: number;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  department: string;
  role: string;
  manager?: string | null;
  startDate?: string | null;
  status: string;
  capacityPercent: number;
  kpiTarget: number;
  isDemo?: boolean;
};

type Performance = {
  id?: number;
  rank: number;
  name: string;
  role: string;
  department?: string;
  doneTasks: number;
  totalTasks: number;
  doneWeight: number;
  activeWeight: number;
  volumeScore: number;
  deadlineScore: number | null;
  kpi: number;
  capacityPercent: number;
  kpiTarget?: number;
  quality: number | null;
  outcome: number | null;
};

type PerformanceSummary = {
  companyKpi: number;
  doneThisPeriod: number;
  overloadedCount: number;
  headcount: number;
  qualityReady: boolean;
  outcomeReady: boolean;
};

const seedPerformanceSummary: PerformanceSummary = { companyKpi: 84, doneThisPeriod: 69, overloadedCount: 2, headcount: 5, qualityReady: false, outcomeReady: false };

type Period = { month: string; bonusPool: number; locked: boolean; lockedAt: string | null };
type Reward = { name: string; kpi: number; reward: number };
const seedPeriod: Period = { month: "2026-08", bonusPool: 0, locked: false, lockedAt: null };

type Role = "director" | "staff";
type AuthUser = { id: number; email: string; fullName: string; role: Role; employeeName: string | null };
type ManagedUser = { id: number; email: string; fullName: string; role: Role; employeeName: string | null; status: string };
const roleLabel = (role: Role) => (role === "director" ? "Giám đốc" : "Nhân viên");

const navItems: { id: View; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Tổng quan", icon: "grid" },
  { id: "projects", label: "Dự án", icon: "folder" },
  { id: "tasks", label: "Công việc", icon: "check" },
  { id: "people", label: "Nhân sự", icon: "users" },
  { id: "performance", label: "Hiệu suất", icon: "chart" },
  { id: "content", label: "Content WIN", icon: "star" },
  { id: "sync", label: "Đồng bộ Sheet", icon: "refresh" },
];

const seedProjects: Project[] = [
  { name: "Dược sĩ Giang", client: "Kênh sức khỏe Đông y", progress: 85, status: "good", statusLabel: "Đúng tiến độ", deadline: "2026-08-31", owner: "Thu Hà", channels: "Facebook · TikTok", tasksLabel: "38/44 task", isDemo: true },
  { name: "ĐINH Cúng phẩm", client: "Chiến dịch tháng 7 âm", progress: 60, status: "warning", statusLabel: "Cần chú ý", deadline: "2026-08-18", owner: "Minh Anh", channels: "Facebook · Landing page", tasksLabel: "24/40 task", isDemo: true },
  { name: "ĐINH Scent", client: "Ra mắt bộ quà tặng", progress: 30, status: "risk", statusLabel: "Có nguy cơ", deadline: "2026-08-12", owner: "Quang Huy", channels: "TikTok · Facebook", tasksLabel: "11/36 task", isDemo: true },
  { name: "Minh Trí Kinh Doanh", client: "Chiến dịch khóa học AI", progress: 72, status: "good", statusLabel: "Đúng tiến độ", deadline: "2026-08-25", owner: "Tuấn Nam", channels: "Facebook · Website", tasksLabel: "29/40 task", isDemo: true },
  { name: "Agency Internal", client: "Chuẩn hóa quy trình tháng 8", progress: 48, status: "warning", statusLabel: "Cần chú ý", deadline: "2026-08-29", owner: "Lan Phương", channels: "Nội bộ", tasksLabel: "14/29 task", isDemo: true },
  { name: "BIDV Gift", client: "Bộ quà tặng khách hàng", progress: 92, status: "good", statusLabel: "Sắp hoàn thành", deadline: "2026-08-06", owner: "Hải Yến", channels: "Landing page · POSM", tasksLabel: "34/37 task", isDemo: true },
];

const seedTasks: Task[] = [
  { id: 101, title: "Viết 10 hook video huyệt đạo", project: "Dược sĩ Giang", department: "Content", assignee: "Minh Anh", dueDate: "04/08", priority: "high", weight: 3, status: "pending" },
  { id: 102, title: "Dựng storyboard pháp phục", project: "ĐINH Cúng phẩm", department: "Video", assignee: "Tuấn Nam", dueDate: "05/08", priority: "normal", weight: 5, status: "todo" },
  { id: 103, title: "Thiết kế banner sale 6 ô", project: "ĐINH Scent", department: "Design", assignee: "Thu Hà", dueDate: "Hôm nay", priority: "urgent", weight: 5, status: "doing" },
  { id: 104, title: "Kiểm tra dữ liệu Organic tuần 1", project: "Dược sĩ Giang", department: "Ads", assignee: "Quang Huy", dueDate: "Hôm nay", priority: "high", weight: 3, status: "review" },
  { id: 105, title: "Duyệt lịch đăng tháng 8", project: "Minh Trí Kinh Doanh", department: "Account", assignee: "Lan Phương", dueDate: "03/08", priority: "normal", weight: 2, status: "done" },
  { id: 106, title: "Sửa video theo feedback khách", project: "ĐINH Cúng phẩm", department: "Video", assignee: "Tuấn Nam", dueDate: "Hôm nay", priority: "urgent", weight: 3, status: "blocked" },
];

const seedPerformance: Performance[] = [
  { rank: 1, name: "Minh Anh", role: "Content Creator", doneTasks: 18, totalTasks: 22, doneWeight: 42, activeWeight: 9, volumeScore: 100, deadlineScore: 94, kpi: 97, capacityPercent: 96, quality: null, outcome: null },
  { rank: 2, name: "Tuấn Nam", role: "Video Editor", doneTasks: 15, totalTasks: 20, doneWeight: 38, activeWeight: 14, volumeScore: 90, deadlineScore: 86, kpi: 88, capacityPercent: 118, quality: null, outcome: null },
  { rank: 3, name: "Thu Hà", role: "Graphic Designer", doneTasks: 14, totalTasks: 18, doneWeight: 33, activeWeight: 8, volumeScore: 79, deadlineScore: 91, kpi: 85, capacityPercent: 88, quality: null, outcome: null },
  { rank: 4, name: "Quang Huy", role: "Performance Executive", doneTasks: 12, totalTasks: 17, doneWeight: 29, activeWeight: 11, volumeScore: 69, deadlineScore: 84, kpi: 77, capacityPercent: 112, quality: null, outcome: null },
  { rank: 5, name: "Lan Phương", role: "Account Executive", doneTasks: 10, totalTasks: 14, doneWeight: 22, activeWeight: 5, volumeScore: 52, deadlineScore: 89, kpi: 71, capacityPercent: 74, quality: null, outcome: null },
];

const seedEmployees: Employee[] = [
  { id: 1, fullName: "Minh Anh", department: "Content", role: "Content Creator", manager: "Đức Anh", status: "active", capacityPercent: 96, kpiTarget: 85, isDemo: true },
  { id: 2, fullName: "Tuấn Nam", department: "Video", role: "Video Editor", manager: "Đức Anh", status: "active", capacityPercent: 118, kpiTarget: 85, isDemo: true },
  { id: 3, fullName: "Thu Hà", department: "Design", role: "Graphic Designer", manager: "Đức Anh", status: "active", capacityPercent: 88, kpiTarget: 85, isDemo: true },
  { id: 4, fullName: "Quang Huy", department: "Ads/Performance", role: "Performance Executive", manager: "Đức Anh", status: "active", capacityPercent: 112, kpiTarget: 85, isDemo: true },
  { id: 5, fullName: "Lan Phương", department: "Account", role: "Account Executive", manager: "Đức Anh", status: "active", capacityPercent: 74, kpiTarget: 85, isDemo: true },
  { id: 6, fullName: "Hải Yến", department: "Content", role: "Content Creator", manager: "Minh Anh", status: "on_leave", capacityPercent: 0, kpiTarget: 80, isDemo: true },
];

const contentItems = [
  { title: "Nếu các bộ phận cơ thể biết nói", project: "Dược sĩ Giang", platform: "Facebook", views: "1,2M", retention: 47, engagement: 8.9, score: 94, hook: "Nghịch lý", format: "Talking head", duration: "38s", talent: "DS Giang" },
  { title: "6 huyệt quan trọng trong lòng bàn tay", project: "Dược sĩ Giang", platform: "TikTok", views: "846K", retention: 52, engagement: 10.4, score: 92, hook: "Danh sách", format: "Infographic", duration: "31s", talent: "Voice over" },
  { title: "Check-in sông nước miền Tây", project: "ĐINH Cúng phẩm", platform: "Facebook", views: "318K", retention: 39, engagement: 7.1, score: 88, hook: "Desire", format: "Fashion reel", duration: "24s", talent: "Người mẫu A" },
  { title: "Ba đời giữ nghề, một lòng giữ lễ", project: "ĐINH Cúng phẩm", platform: "TikTok", views: "276K", retention: 44, engagement: 9.6, score: 90, hook: "Storytelling", format: "Behind scenes", duration: "42s", talent: "Nghệ nhân" },
  { title: "Sale nến thơm mùa Vu Lan", project: "ĐINH Scent", platform: "Facebook", views: "96K", retention: 28, engagement: 5.2, score: 78, hook: "Ưu đãi", format: "Product reel", duration: "19s", talent: "Không nhân vật" },
  { title: "30 video Ads trong 7 ngày", project: "Minh Trí Kinh Doanh", platform: "TikTok", views: "624K", retention: 49, engagement: 11.2, score: 93, hook: "Con số", format: "Screen demo", duration: "34s", talent: "Mentor" },
];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    folder: <path d="M3 7.5h6l2-2h10v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>,
    check: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 2.5 2.5L16 9"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9z"/>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 4.5a3 3 0 0 1 0 7M17 14a5 5 0 0 1 4 5"/></>,
    alert: <><path d="M12 3 2.8 20h18.4z"/><path d="M12 9v4M12 17h.01"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    filter: <path d="M4 5h16M7 12h10M10 19h4"/>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    video: <><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2z"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/></>,
    refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.7-2.6L20 11M4 13l2.2 4.6A7 7 0 0 0 18 15"/></>,
    money: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 9H6M18 15h-1"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Progress({ value, tone = "indigo" }: { value: number; tone?: "indigo" | "sage" | "coral" | "amber" }) {
  return <div className="progress" aria-label={`${value}%`}><span className={`progress__bar progress__bar--${tone}`} style={{ width: `${Math.min(100, value)}%` }} /></div>;
}

function StatusTag({ status, label }: { status: Project["status"]; label: string }) {
  return <span className={`status status--${status}`}><i />{label}</span>;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return <span className={`avatar avatar--${size}`}>{name.split(" ").slice(-2).map((x) => x[0]).join("")}</span>;
}

function TrendChart() {
  return (
    <div className="chart-wrap" role="img" aria-label="Hiệu suất tăng từ 68 lên 86 điểm trong bốn tuần">
      <div className="chart-legend"><span><i className="legend-line legend-line--main"/>Hiệu suất hiện tại</span><span><i className="legend-line legend-line--compare"/>Tháng trước</span></div>
      <svg className="trend-chart" viewBox="0 0 620 220" preserveAspectRatio="none">
        {[20, 70, 120, 170].map((y) => <line key={y} x1="48" x2="600" y1={y} y2={y} className="chart-grid" />)}
        <polyline points="58,150 225,122 392,92 565,66" className="chart-compare" />
        <polyline points="58,128 225,102 392,69 565,45" className="chart-main" />
        {[{x:58,y:128,v:68},{x:225,y:102,v:74},{x:392,y:69,v:81},{x:565,y:45,v:86}].map((p) => <g key={p.v}><circle cx={p.x} cy={p.y} r="5" className="chart-dot"/><text x={p.x} y={p.y-13} textAnchor="middle" className="chart-value">{p.v}</text></g>)}
        {[{x:58,v:"Tuần 1"},{x:225,v:"Tuần 2"},{x:392,v:"Tuần 3"},{x:565,v:"Tuần 4"}].map((p) => <text key={p.v} x={p.x} y="208" textAnchor="middle" className="chart-label">{p.v}</text>)}
      </svg>
    </div>
  );
}

function KpiCard({ icon, label, value, suffix, delta, tone, progress }: { icon: IconName; label: string; value: string; suffix?: string; delta: string; tone: "indigo" | "sage" | "coral" | "amber"; progress?: number }) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__top"><span className="icon-tile"><Icon name={icon} size={23}/></span><span className="kpi-card__label">{label}</span></div>
      <div className="kpi-card__body"><strong>{value}</strong>{suffix && <span>{suffix}</span>}{progress !== undefined && <div className="mini-ring" style={{ "--value": `${progress * 3.6}deg` } as CSSProperties}><b>{progress}%</b></div>}</div>
      <p className="kpi-card__delta">↑ {delta}</p>
    </article>
  );
}

function DashboardView({ onGo, projects, performance, summary }: { onGo: (view: View) => void; projects: Project[]; performance: Performance[]; summary: PerformanceSummary }) {
  const [period, setPeriod] = useState("Theo tuần");
  const projectsOnTrack = projects.filter((project) => project.status === "good").length;
  const projectsAtRisk = projects.filter((project) => project.status === "risk").length;
  const projectProgress = projects.length ? Math.round((projectsOnTrack / projects.length) * 100) : 0;
  return (
    <div className="view-stack">
      <section className="kpi-grid">
        <KpiCard icon="chart" label="KPI công ty (tạm tính)" value={String(summary.companyKpi)} suffix="/ 100" delta="Từ khối lượng và đúng hạn thực tế" tone="indigo" progress={summary.companyKpi}/>
        <KpiCard icon="calendar" label="Dự án đúng tiến độ" value={String(projectsOnTrack)} suffix={`/ ${projects.length}`} delta="Tính theo tiến độ task thực tế" tone="indigo" progress={projectProgress}/>
        <KpiCard icon="users" label="Nhân sự quá tải" value={String(summary.overloadedCount)} delta="Tải cấu hình vượt 105%" tone="coral"/>
        <KpiCard icon="check" label="Task hoàn thành" value={String(summary.doneThisPeriod)} delta="Tổng task đã nghiệm thu" tone="sage"/>
      </section>

      <section className="dashboard-grid">
        <article className="panel panel--chart"><div className="panel__heading"><div><h2>Xu hướng hiệu suất</h2><p>Theo dõi điểm thực tế so với kỳ trước</p></div><button className="select-btn" onClick={() => setPeriod(period === "Theo tuần" ? "Theo tháng" : "Theo tuần")}>{period} <span>⌄</span></button></div><TrendChart/></article>
        <article className="panel"><div className="panel__heading"><div><h2>Sức khỏe dự án</h2><p>Ưu tiên xử lý theo mức độ rủi ro</p></div><button className="icon-btn" aria-label="Xem dự án" onClick={() => onGo("projects")}><Icon name="arrow"/></button></div><div className="project-health">{projects.slice(0,3).map((p) => <div className="health-row" key={p.name}><span className={`health-icon health-icon--${p.status}`}><Icon name={p.status === "good" ? "check" : "alert"}/></span><div className="health-row__main"><b>{p.name}</b><div><Progress value={p.progress} tone={p.status === "good" ? "sage" : p.status === "warning" ? "amber" : "coral"}/><strong>{p.progress}%</strong></div></div><StatusTag status={p.status} label={p.statusLabel}/></div>)}</div></article>
        <aside className="panel insight-panel"><div className="panel__heading"><div><h2>Insight & Cảnh báo</h2><p>Hệ thống tự động phát hiện</p></div></div><div className="alert-card alert-card--risk"><Icon name="users"/><div><b>{summary.overloadedCount} nhân sự đang quá tải</b><p>Tải cấu hình vượt ngưỡng khuyến nghị 105%.</p></div></div><div className="alert-card alert-card--warning"><Icon name="clock"/><div><b>{projectsAtRisk} dự án có nguy cơ chậm</b><p>Tiến độ thực tế thấp hơn kế hoạch theo deadline.</p></div></div><div className="alert-card alert-card--good"><Icon name="star"/><div><b>Content WIN chờ dữ liệu kênh</b><p>Cần cấp OAuth Facebook/TikTok để chấm nội dung thắng.</p></div></div><button className="text-btn" onClick={() => onGo("content")}>Xem phân tích chi tiết <Icon name="arrow" size={17}/></button></aside>
      </section>

      <section className="panel leaderboard"><div className="panel__heading"><div><h2>Hiệu suất nhân sự</h2><p>Công khai theo vai trò, độ khó và tải công việc</p></div><button className="text-btn" onClick={() => onGo("performance")}>Xem toàn bộ <Icon name="arrow" size={17}/></button></div><div className="leader-list">{performance.slice(0,4).map((person) => <div className="leader-row" key={person.name}><span className="rank">{person.rank}</span><Avatar name={person.name}/><div className="leader-name"><b>{person.name}</b><span>{person.role}</span></div><div className="leader-score"><Progress value={person.kpi} tone="indigo"/><strong>{person.kpi}</strong></div><span className={person.capacityPercent > 105 ? "capacity capacity--high" : "capacity"}>{person.capacityPercent}% tải</span></div>)}</div></section>
    </div>
  );
}

function ProjectsView({ projects, employees, onCreate, onShowTasks, canManage }: { projects: Project[]; employees: Employee[]; onCreate: (payload: { name: string; client: string; deadline: string; owner: string; channels: string }) => Promise<boolean>; onShowTasks: (project: string) => void; canManage: boolean }) {
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const visible = filter === "all" ? projects : projects.filter((project) => project.status === filter);
  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    const ok = await onCreate({ name: String(data.get("name")), client: String(data.get("client")), deadline: String(data.get("deadline")), owner: String(data.get("owner")), channels: String(data.get("channels")) });
    setSaving(false);
    if (ok) setCreating(false);
  };
  return (
    <div className="view-stack">
      <div className="view-toolbar"><div className="segmented" role="group" aria-label="Lọc trạng thái dự án">{[["all","Tất cả"],["good","Đúng tiến độ"],["warning","Cần chú ý"],["risk","Nguy cơ"]].map(([id,label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}</div>{canManage && <button className="primary-btn" onClick={() => setCreating(true)}><Icon name="plus"/> Tạo dự án</button>}</div>
      <section className="project-grid">{visible.map((project) => <article className="project-card" key={project.name}><div className="project-card__top"><span className={`project-logo project-logo--${project.status}`}>{project.name[0]}</span><div><h3>{project.name}</h3><p>{project.client}</p></div><button className="icon-btn" aria-label={`Tùy chọn ${project.name}`} onClick={() => setSelected(project)}><Icon name="more"/></button></div><div className="project-card__progress"><div><span>Tiến độ</span><strong>{project.progress}%</strong></div><Progress value={project.progress} tone={project.status === "good" ? "sage" : project.status === "warning" ? "amber" : "coral"}/></div><dl><div><dt>Deadline</dt><dd>{project.deadline}</dd></div><div><dt>Account</dt><dd>{project.owner}</dd></div><div><dt>Kênh</dt><dd>{project.channels}</dd></div><div><dt>Hoàn thành</dt><dd>{project.tasksLabel}</dd></div></dl><div className="project-card__footer"><StatusTag status={project.status} label={project.statusLabel}/><button className="text-btn" onClick={() => onShowTasks(project.name)}>Xem task <Icon name="arrow" size={15}/></button></div></article>)}</section>
      {creating && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title"><div className="modal__head"><div><span className="eyebrow">Dự án agency</span><h2 id="project-modal-title">Tạo dự án mới</h2></div><button className="icon-btn" onClick={() => setCreating(false)} aria-label="Đóng"><Icon name="close"/></button></div><form onSubmit={createProject}><div className="form-grid"><label className="form-field form-field--full"><span>Tên dự án</span><input name="name" required autoFocus/></label><label className="form-field"><span>Khách hàng</span><input name="client" required/></label><label className="form-field"><span>Account</span><select name="owner">{employees.filter((employee) => employee.status === "active").map((employee) => <option key={employee.id}>{employee.fullName}</option>)}</select></label><label className="form-field"><span>Deadline</span><input name="deadline" type="date" required/></label><label className="form-field"><span>Kênh</span><input name="channels" placeholder="Facebook · TikTok" required/></label></div><div className="modal__actions"><button type="button" className="outline-btn" onClick={() => setCreating(false)}>Hủy</button><button className="primary-btn" type="submit" disabled={saving}>{saving ? "Đang tạo..." : "Tạo dự án"}</button></div></form></div></div>}
      {selected && <div className="modal-backdrop"><div className="modal modal--compact" role="dialog" aria-modal="true"><div className="modal__head"><div><span className="eyebrow">Chi tiết dự án</span><h2>{selected.name}</h2></div><button className="icon-btn" onClick={() => setSelected(null)} aria-label="Đóng"><Icon name="close"/></button></div><div className="detail-list"><p><span>Khách hàng</span><b>{selected.client}</b></p><p><span>Account</span><b>{selected.owner}</b></p><p><span>Kênh</span><b>{selected.channels}</b></p><p><span>Tiến độ</span><b>{selected.progress}%</b></p></div><div className="modal__actions"><button className="outline-btn" onClick={() => setSelected(null)}>Đóng</button><button className="primary-btn" onClick={() => { onShowTasks(selected.name); setSelected(null); }}>Xem công việc</button></div></div></div>}
    </div>
  );
}

function TaskCard({ task, onMove, onInspect }: { task: Task; onMove: (id: number, status: string) => void; onInspect: (task: Task) => void }) {
  return <article className={`task-card ${task.status === "blocked" ? "task-card--blocked" : ""}`}><div className="task-card__head"><span className={`priority priority--${task.priority}`}>{task.priority === "urgent" ? "Gấp" : task.priority === "high" ? "Ưu tiên" : "Bình thường"}</span><button className="icon-btn" aria-label={`Chi tiết ${task.title}`} onClick={() => onInspect(task)}><Icon name="more"/></button></div><h3>{task.title}</h3><p className="task-project">{task.project}{task.sourceId ? ` · ${task.sourceId.split("::").pop()}` : ""}</p><div className="task-meta"><span>{task.department}</span><span>{task.weight} điểm</span>{task.sourceType === "google_sheet" && <span className="source-chip">{task.sourceSheet ? (task.sourceSheet.split("·").pop() || "Sheet").trim() : "Sheet"}</span>}{task.deliverableUrl && <a className="deliver-chip" href={task.deliverableUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><Icon name="link" size={12}/> {task.deliverableType || "Bàn giao"}</a>}</div><div className="task-card__footer"><div><Avatar name={task.assignee} size="sm"/><span>{task.assignee}</span></div><span className={`due due--${taskUrgency(task).level}`}><Icon name="clock" size={14}/>{dueLabel(task)}</span></div>{task.status === "pending" && <div className="task-actions"><button onClick={() => onMove(task.id,"todo")}>Duyệt task</button><button className="ghost" onClick={() => onInspect(task)}>Điều chỉnh</button></div>}{task.status === "todo" && <button className="task-quick" onClick={() => onMove(task.id,"doing")}><Icon name="arrow" size={15}/> Bắt đầu làm</button>}{task.status === "doing" && <button className="task-quick" onClick={() => task.deliverableUrl ? onMove(task.id,"review") : onInspect(task)}><Icon name={task.deliverableUrl ? "check" : "link"} size={15}/> {task.deliverableUrl ? "Gửi duyệt" : "Nộp sản phẩm & gửi duyệt"}</button>}{task.status === "review" && <button className="task-quick" onClick={() => onMove(task.id,"done")}><Icon name="check" size={15}/> Duyệt hoàn thành</button>}{task.status === "done" && <button className="task-quick" onClick={() => onInspect(task)}><Icon name="link" size={15}/> Đối soát Sheet & kênh</button>}</article>;
}

function TasksView({ tasks, onMove, onOpen, onInspect, search, projectFilter }: { tasks: Task[]; onMove: (id: number, status: string) => void; onOpen: () => void; onInspect: (task: Task) => void; search: string; projectFilter: string }) {
  const [sourceFilter, setSourceFilter] = useState<"all" | "sheet">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | Urgency>("all");
  const [dateBucket, setDateBucket] = useState<DateBucket>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("Tất cả");
  const columns = [
    { id: "pending", label: "Cần duyệt", tone: "amber" },
    { id: "todo", label: "Cần làm", tone: "indigo" },
    { id: "doing", label: "Đang thực hiện", tone: "coral" },
    { id: "review", label: "Chờ duyệt đầu ra", tone: "sage" },
    { id: "done", label: "Hoàn thành", tone: "sage" },
  ];
  const normalized = search.trim().toLowerCase();
  const base = tasks.filter((task) => (sourceFilter === "all" || task.sourceType === "google_sheet") && (!projectFilter || task.project === projectFilter) && (assigneeFilter === "Tất cả" || task.assignee === assigneeFilter) && (!normalized || `${task.title} ${task.project} ${task.assignee} ${task.sourceId || ""}`.toLowerCase().includes(normalized)));
  const counts = { overdue: 0, today: 0, soon: 0 };
  base.forEach((task) => { const level = taskUrgency(task).level; if (level === "overdue") counts.overdue += 1; else if (level === "today") counts.today += 1; else if (level === "soon") counts.soon += 1; });
  const pendingCount = base.filter((task) => task.status === "pending").length;
  const reviewCount = base.filter((task) => task.status === "review").length;
  const assignees = Array.from(new Set(tasks.map((task) => task.assignee))).filter(Boolean);
  const dateCounts = { today: 0, tomorrow: 0, after: 0 };
  base.forEach((task) => { const offset = taskDayOffset(task); if (offset === 0) dateCounts.today += 1; else if (offset === 1) dateCounts.tomorrow += 1; else if (offset === 2) dateCounts.after += 1; });
  const filtered = base.filter((task) => (urgencyFilter === "all" || taskUrgency(task).level === urgencyFilter) && matchesDateBucket(task, dateBucket));
  const sortByUrgency = (a: Task, b: Task) => { const ua = taskUrgency(a); const ub = taskUrgency(b); return URGENCY_RANK[ua.level] - URGENCY_RANK[ub.level] || (ua.days ?? 9999) - (ub.days ?? 9999); };
  const toggleUrgency = (level: Urgency) => setUrgencyFilter((current) => current === level ? "all" : level);
  return <div className="view-stack">
    <div className="urgency-bar">
      <button className={`urgency-pill urgency-pill--coral ${urgencyFilter === "overdue" ? "active" : ""}`} onClick={() => toggleUrgency("overdue")}><b>{counts.overdue}</b><span>Quá hạn</span></button>
      <button className={`urgency-pill urgency-pill--amber ${urgencyFilter === "today" ? "active" : ""}`} onClick={() => toggleUrgency("today")}><b>{counts.today}</b><span>Hôm nay</span></button>
      <button className={`urgency-pill urgency-pill--indigo ${urgencyFilter === "soon" ? "active" : ""}`} onClick={() => toggleUrgency("soon")}><b>{counts.soon}</b><span>Sắp tới · ≤3 ngày</span></button>
      <div className="urgency-pill urgency-pill--ghost"><b>{pendingCount}</b><span>Cần duyệt</span></div>
      <div className="urgency-pill urgency-pill--ghost"><b>{reviewCount}</b><span>Chờ nghiệm thu</span></div>
      {urgencyFilter !== "all" && <button className="text-btn" onClick={() => setUrgencyFilter("all")}>Bỏ lọc độ khẩn</button>}
    </div>
    <div className="date-bar">{([["all","Tất cả",null],["today","Hôm nay",dateCounts.today],["tomorrow","Ngày mai",dateCounts.tomorrow],["after","Ngày kia",dateCounts.after]] as const).map(([key, label, count]) => <button key={key} className={`date-pill ${dateBucket === key ? "active" : ""}`} onClick={() => setDateBucket(key as DateBucket)}><span>{label}</span>{count !== null && <b>{count}</b>}</button>)}</div>
    <div className="view-toolbar"><div className="toolbar-left"><button className={`outline-btn ${sourceFilter === "sheet" ? "active-filter" : ""}`} onClick={() => setSourceFilter(sourceFilter === "all" ? "sheet" : "all")}><Icon name="filter"/> {sourceFilter === "sheet" ? "Chỉ task từ Sheet" : "Tất cả nguồn"}</button><label className="compact-select"><Icon name="users"/><select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} aria-label="Lọc người phụ trách"><option>Tất cả</option>{assignees.map((name) => <option key={name}>{name}</option>)}</select></label><span className="sync-note"><i/> {filtered.filter((task) => task.sourceType === "google_sheet").length} task đang đối soát</span></div><button className="primary-btn" onClick={onOpen}><Icon name="plus"/> Thêm công việc</button></div><section className="kanban">{columns.map((column) => { const columnTasks = filtered.filter((task) => task.status === column.id || (column.id === "doing" && task.status === "blocked")).sort(sortByUrgency); const batchable = column.id === "pending" || column.id === "review"; return <div className="kanban-col" key={column.id}><div className={`kanban-col__head kanban-col__head--${column.tone}`}><h2>{column.label}</h2><span>{columnTasks.length}</span>{batchable && columnTasks.length > 0 && <button className="col-batch" onClick={() => { if (window.confirm(`${column.id === "pending" ? "Duyệt" : "Nghiệm thu"} ${columnTasks.length} task trong cột “${column.label}”?`)) columnTasks.forEach((task) => onMove(task.id, column.id === "pending" ? "todo" : "done")); }}><Icon name="check" size={13}/> {column.id === "pending" ? "Duyệt tất cả" : "Nghiệm thu tất cả"}</button>}</div><div className="kanban-col__body">{columnTasks.map((task) => <TaskCard key={task.id} task={task} onMove={onMove} onInspect={onInspect}/>)}{columnTasks.length === 0 && <div className="empty-state"><Icon name="check"/><span>Chưa có công việc</span></div>}</div></div>})}</section></div>;
}

function PeopleView({ employees, tasks, onAdd, onEdit, onStatus, canManage }: { employees: Employee[]; tasks: Task[]; onAdd: () => void; onEdit: (employee: Employee) => void; onStatus: (employee: Employee) => void; canManage: boolean }) {
  const [department, setDepartment] = useState("Tất cả");
  const departments = Array.from(new Set(employees.map((employee) => employee.department)));
  const visible = department === "Tất cả" ? employees : employees.filter((employee) => employee.department === department);
  const active = employees.filter((employee) => employee.status === "active").length;
  const overloaded = employees.filter((employee) => employee.status === "active" && employee.capacityPercent > 110).length;
  return <div className="view-stack">
    {employees.some((employee) => employee.isDemo) && <div className="demo-banner"><Icon name="alert"/><div><b>Danh sách đang có dữ liệu mẫu</b><span>Sếp có thể sửa trực tiếp từng người hoặc thêm nhân sự thật. Sau khi lưu, nhãn “Mẫu” sẽ tự mất.</span></div></div>}
    <section className="people-kpis"><article><span>Tổng nhân sự</span><strong>{employees.length}</strong><small>{active} đang hoạt động</small></article><article><span>Bộ phận</span><strong>{departments.length}</strong><small>Content · Video · Ads · Account · Design</small></article><article className={overloaded ? "risk" : ""}><span>Đang quá tải</span><strong>{overloaded}</strong><small>Vượt 110% công suất</small></article><article><span>Chưa phân công</span><strong>{tasks.filter((task) => task.assignee === "Chưa phân công").length}</strong><small>Task cần giao người phụ trách</small></article></section>
    <div className="view-toolbar"><label className="compact-select"><Icon name="filter"/><select value={department} onChange={(event) => setDepartment(event.target.value)}><option>Tất cả</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>{canManage && <button className="primary-btn" onClick={onAdd}><Icon name="plus"/> Thêm nhân sự</button>}</div>
    <section className="panel"><div className="panel__heading"><div><h2>Danh sách nhân sự</h2><p>Quản lý vị trí, cấp quản lý, KPI, công suất và trạng thái làm việc</p></div></div><div className="data-table-wrap"><table className="data-table people-table"><thead><tr><th>Nhân sự</th><th>Bộ phận / vị trí</th><th>Quản lý</th><th>Task đang mở</th><th>Công suất</th><th>KPI mục tiêu</th><th>Trạng thái</th><th></th></tr></thead><tbody>{visible.map((employee) => { const openTasks = tasks.filter((task) => task.assignee === employee.fullName && task.status !== "done").length; return <tr key={employee.id}><td><div className="person-cell"><Avatar name={employee.fullName}/><span><b>{employee.fullName} {employee.isDemo && <em className="demo-chip">Mẫu</em>}</b><small>{employee.email || employee.phone || "Chưa có thông tin liên hệ"}</small></span></div></td><td><b>{employee.department}</b><small className="table-subtext">{employee.role}</small></td><td>{employee.manager || "—"}</td><td><strong>{openTasks}</strong></td><td><span className={employee.capacityPercent > 110 ? "capacity capacity--high" : "capacity"}>{employee.capacityPercent}%</span></td><td>{employee.kpiTarget}/100</td><td><span className={`status status--${employee.status === "active" ? "good" : employee.status === "on_leave" ? "warning" : "risk"}`}><i/>{employee.status === "active" ? "Đang làm" : employee.status === "on_leave" ? "Tạm nghỉ" : "Ngưng hoạt động"}</span></td><td>{canManage ? <div className="row-actions"><button className="outline-btn" onClick={() => onEdit(employee)}>Chỉnh sửa</button><button className="text-btn" onClick={() => onStatus(employee)}>{employee.status === "active" ? "Tạm ngưng" : "Kích hoạt"}</button></div> : <span className="muted">—</span>}</td></tr>; })}{!visible.length && <tr><td colSpan={8}><div className="table-empty">Chưa có nhân sự trong bộ phận này.</div></td></tr>}</tbody></table></div></section>
  </div>;
}

function EmployeeModal({ employee, employees, loading, onClose, onSave }: { employee: Employee | null; employees: Employee[]; loading: boolean; onClose: () => void; onSave: (payload: Omit<Employee, "id"> & { id?: number }) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      ...(employee ? { id: employee.id } : {}),
      fullName: String(data.get("fullName")), email: String(data.get("email")), phone: String(data.get("phone")),
      department: String(data.get("department")), role: String(data.get("role")), manager: String(data.get("manager")),
      startDate: String(data.get("startDate")), status: String(data.get("status")), capacityPercent: Number(data.get("capacityPercent")),
      kpiTarget: Number(data.get("kpiTarget")), isDemo: false,
    });
  };
  return <div className="modal-backdrop"><div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="employee-modal-title"><div className="modal__head"><div><span className="eyebrow">Hồ sơ nhân sự</span><h2 id="employee-modal-title">{employee ? `Chỉnh sửa ${employee.fullName}` : "Thêm nhân sự mới"}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="close"/></button></div><form onSubmit={submit}><div className="form-grid"><label className="form-field form-field--full"><span>Họ và tên</span><input name="fullName" defaultValue={employee?.fullName || ""} required autoFocus/></label><label className="form-field"><span>Email</span><input name="email" type="email" defaultValue={employee?.email || ""}/></label><label className="form-field"><span>Số điện thoại</span><input name="phone" defaultValue={employee?.phone || ""}/></label><label className="form-field"><span>Bộ phận</span><select name="department" defaultValue={employee?.department || "Content"}><option>Content</option><option>Video</option><option>Design</option><option>Ads/Performance</option><option>Account</option><option>Ban giám đốc</option></select></label><label className="form-field"><span>Vị trí</span><input name="role" defaultValue={employee?.role || "Content Creator"} required/></label><label className="form-field"><span>Quản lý trực tiếp</span><select name="manager" defaultValue={employee?.manager || ""}><option value="">Không có</option>{employees.filter((item) => item.id !== employee?.id && item.status === "active").map((item) => <option key={item.id}>{item.fullName}</option>)}</select></label><label className="form-field"><span>Ngày bắt đầu</span><input name="startDate" type="date" defaultValue={employee?.startDate || "2026-08-03"}/></label><label className="form-field"><span>Trạng thái</span><select name="status" defaultValue={employee?.status || "active"}><option value="active">Đang làm việc</option><option value="on_leave">Tạm nghỉ</option><option value="inactive">Ngưng hoạt động</option></select></label><label className="form-field"><span>Công suất hiện tại (%)</span><input name="capacityPercent" type="number" min="0" max="200" defaultValue={employee?.capacityPercent ?? 100}/></label><label className="form-field"><span>KPI mục tiêu</span><input name="kpiTarget" type="number" min="0" max="100" defaultValue={employee?.kpiTarget ?? 85}/></label></div><div className="modal__actions"><button type="button" className="outline-btn" onClick={onClose}>Hủy</button><button className="primary-btn" type="submit" disabled={loading}>{loading ? "Đang lưu..." : employee ? "Lưu thay đổi" : "Thêm nhân sự"}</button></div></form></div></div>;
}

function PerformanceView({ performance, summary, period, rewards, busy, onSetPool, onLock, onUnlock, onAction, canManage }: { performance: Performance[]; summary: PerformanceSummary; period: Period; rewards: Reward[]; busy: boolean; onSetPool: (pool: number) => void; onLock: () => void; onUnlock: () => void; onAction: (message: string) => void; canManage: boolean }) {
  const [role, setRole] = useState("Tất cả");
  const [poolDraft, setPoolDraft] = useState(String(period.bonusPool));
  const [poolSync, setPoolSync] = useState(period.bonusPool);
  if (poolSync !== period.bonusPool) { setPoolSync(period.bonusPool); setPoolDraft(String(period.bonusPool)); }
  const visiblePeople = role === "Tất cả" ? performance : performance.filter((person) => person.role === role);
  const grade = summary.companyKpi >= 90 ? "Xuất sắc" : summary.companyKpi >= 80 ? "Tốt" : summary.companyKpi >= 65 ? "Khá" : "Cần cải thiện";
  const componentCount = 2 + (summary.qualityReady ? 1 : 0);
  const weight = Math.round(100 / componentCount);
  const rewardByName = new Map(rewards.map((item) => [item.name, item.reward]));
  const totalReward = rewards.reduce((sum, item) => sum + item.reward, 0);
  const savePool = () => { const pool = Math.max(0, Math.round(Number(poolDraft) || 0)); onSetPool(pool); };
  return <div className="view-stack"><section className="performance-summary"><div className="score-hero"><div className="score-hero__ring"><strong>{summary.companyKpi}</strong><span>/100</span></div><div><p>KPI công ty · tạm tính</p><h2>Xếp loại {grade}</h2><span>Tính từ khối lượng và tỷ lệ đúng hạn thực tế</span></div></div><div className="formula-card"><p>Công thức KPI (đang áp dụng phần có dữ liệu)</p><div><span><b>{weight}%</b> Khối lượng</span><span><b>{weight}%</b> Đúng hạn</span>{summary.qualityReady ? <span><b>{weight}%</b> Chất lượng</span> : <span className="muted"><b>—</b> Chất lượng (chờ duyệt)</span>}<span className="muted"><b>—</b> Kết quả kênh (chờ OAuth)</span></div></div><div className="reward-card"><span className="icon-tile"><Icon name="money"/></span><div><p>Quỹ thưởng tháng {period.month}{period.locked ? " · đã khóa" : ""}</p><h2>{period.bonusPool.toLocaleString("vi-VN")}đ</h2>{!canManage ? <span className="status status--good"><i/>{period.locked ? "Đã chốt" : "Tạm tính"}</span> : period.locked ? <button onClick={onUnlock} disabled={busy}>{busy ? "Đang xử lý..." : "Mở lại kỳ"}</button> : <div className="pool-input"><input type="number" min="0" step="100000" value={poolDraft} onChange={(event) => setPoolDraft(event.target.value)} aria-label="Quỹ thưởng"/><button onClick={savePool} disabled={busy}>{busy ? "..." : "Lưu quỹ"}</button></div>}</div></div></section><section className="panel"><div className="panel__heading"><div><h2>Bảng xếp hạng công khai</h2><p>KPI tạm tính từ khối lượng điểm và tỷ lệ đúng hạn</p></div><label className="compact-select"><Icon name="filter"/><select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Lọc bộ phận"><option>Tất cả</option>{Array.from(new Set(performance.map((person) => person.role))).map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Hạng</th><th>Nhân sự</th><th>Vai trò</th><th>Khối lượng</th><th>Đúng hạn</th><th>Chất lượng</th><th>Kết quả kênh</th><th>KPI</th><th>Tải</th></tr></thead><tbody>{visiblePeople.map((person) => <tr key={person.name}><td><span className="rank">{person.rank}</span></td><td><div className="person-cell"><Avatar name={person.name} size="sm"/><b>{person.name}</b></div></td><td><span className="role-chip">{person.role}</span></td><td>{person.volumeScore} <small>({person.doneWeight}đ)</small></td><td>{person.deadlineScore === null ? "—" : `${person.deadlineScore}%`}</td><td className={person.quality === null ? "muted" : ""}>{person.quality === null ? "—" : `${person.quality}/100`}</td><td className="muted">—</td><td><strong className="score-cell">{person.kpi}</strong></td><td><span className={person.capacityPercent > 105 ? "capacity capacity--high" : "capacity"}>{person.capacityPercent}%</span></td></tr>)}{!visiblePeople.length && <tr><td colSpan={9}><div className="table-empty">Chưa có nhân sự hoạt động phù hợp.</div></td></tr>}</tbody></table></div></section><section className="performance-lower"><article className="panel"><div className="panel__heading"><div><h2>Bản đồ tải công việc</h2><p>Không dùng chỉ số quá tải để trừ KPI</p></div></div><div className="capacity-list">{performance.map((person) => <div key={person.name}><span>{person.name}</span><Progress value={Math.min(100,person.capacityPercent)} tone={person.capacityPercent > 105 ? "coral" : person.capacityPercent > 90 ? "amber" : "sage"}/><strong>{person.capacityPercent}%</strong></div>)}</div></article><article className="panel"><div className="panel__heading"><div><h2>Chốt thưởng</h2><p>{period.locked ? `Đã khóa · chia theo KPI · tổng ${totalReward.toLocaleString("vi-VN")}đ` : period.bonusPool > 0 ? "Số tiền tạm tính theo KPI, khóa kỳ để chốt" : "Đặt quỹ thưởng ở trên để chia theo KPI"}</p></div></div><div className="reward-list">{performance.map((person) => { const amount = rewardByName.get(person.name); return <div key={person.name}><div><Avatar name={person.name} size="sm"/><span><b>{person.name}</b><small>KPI {person.kpi}/100 · {person.doneTasks}/{person.totalTasks} task</small></span></div>{amount === undefined || period.bonusPool === 0 ? <><strong className="muted">—</strong><span className="status status--warning"><i/>Chờ quỹ</span></> : <><strong>{amount.toLocaleString("vi-VN")}đ</strong><span className={period.locked ? "status status--good" : "status status--warning"}><i/>{period.locked ? "Đã chốt" : "Tạm tính"}</span></>}</div>; })}{!performance.length && <div className="table-empty">Chưa có nhân sự để chia thưởng.</div>}</div>{canManage ? (period.locked ? <button className="outline-btn outline-btn--wide" disabled={busy} onClick={onUnlock}>{busy ? "Đang xử lý..." : "Mở lại kỳ thưởng"}</button> : <button className="primary-btn primary-btn--wide" disabled={busy || period.bonusPool === 0} onClick={() => { if (period.bonusPool === 0) { onAction("Hãy đặt quỹ thưởng trước khi khóa kỳ."); return; } onLock(); }}>{busy ? "Đang xử lý..." : "Khóa kỳ & chốt thưởng"}</button>) : <p className="muted" style={{ textAlign: "center", margin: 0 }}>{period.locked ? "Kỳ thưởng đã được Giám đốc chốt." : "Chỉ Giám đốc mới chốt kỳ thưởng."}</p>}</article></section></div>;
}

type ContentDisplay = { title: string; project: string; platform: string; views: string; retention: number; engagement: number; score: number; permalink?: string | null; hook?: string; format?: string; duration?: string; talent?: string; real: boolean };

function ContentView({ tasks, onReplicate, canManage, social, onConnectChannel, onSyncChannels, onRemoveChannel, channelBusy }: { tasks: Task[]; onReplicate: (title: string) => void; canManage: boolean; social: SocialData | null; onConnectChannel: () => void; onSyncChannels: () => void; onRemoveChannel: (id: number, name: string) => void; channelBusy: boolean }) {
  const published = tasks.filter((task) => task.channelStatus === "published" || (task.postUrl || "").startsWith("http")).length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const replicated = tasks.filter((task) => task.title.startsWith("Nhân bản:")).length;
  const channels = social?.channels || [];
  const realPosts: ContentDisplay[] = (social?.posts || []).map((post) => ({ title: post.title, project: post.project, platform: post.platform, views: post.views, retention: post.retention, engagement: post.engagement, score: post.score, permalink: post.permalink, real: true }));
  const usingReal = realPosts.length > 0;
  const items: ContentDisplay[] = usingReal ? realPosts : contentItems.map((item) => ({ ...item, real: false }));
  const [platform, setPlatform] = useState("Tất cả");
  const [selectedTitle, setSelectedTitle] = useState("");
  const visible = platform === "Tất cả" ? items : items.filter((item) => item.platform === platform);
  const selected = visible.find((item) => item.title === selectedTitle) || visible[0] || items[0];
  const topScore = usingReal ? social?.summary.topScore ?? null : null;
  return <div className="view-stack">
    <section className="content-summary">
      <div><span className="icon-tile"><Icon name="link"/></span><p>Kênh đã kết nối</p><h2>{channels.length ? `${channels.length} kênh` : "Chưa kết nối"}</h2><small>{channels.length ? `${social?.summary.facebook || 0} Facebook · ${social?.summary.tiktok || 0} TikTok` : "Dán access token để lấy số liệu thật"}</small></div>
      <div><span className="icon-tile"><Icon name="check"/></span><p>Bài đã đăng (có link)</p><h2>{published}/{doneCount}</h2><small>Số task done đã gắn link kênh</small></div>
      <div><span className="icon-tile"><Icon name="star"/></span><p>Content WIN cao nhất</p><h2>{topScore !== null ? topScore : "Chờ dữ liệu"}</h2><small>{usingReal ? `Chấm từ ${social?.summary.posts || 0} bài thật` : "Cần view/retention thật để chấm"}</small></div>
      <div><span className="icon-tile"><Icon name="refresh"/></span><p>Đã được nhân bản</p><h2>{replicated} task</h2><small>Task nhân bản tạo trên app</small></div>
    </section>
    <section className="panel channel-panel"><div className="panel__heading"><div><h2>Kênh Facebook · TikTok</h2><p>Dán access token từ app developer của bạn — app tự gọi API lấy view, tương tác, retention thật.</p></div>{canManage && <div className="channel-panel__actions"><button className="primary-btn" onClick={onConnectChannel}><Icon name="plus"/> Kết nối kênh</button>{channels.length > 0 && <button className="outline-btn" onClick={onSyncChannels} disabled={channelBusy}><Icon name="refresh"/> {channelBusy ? "Đang lấy..." : "Đồng bộ tất cả"}</button>}</div>}</div>
      {channels.length ? <div className="sheet-conn-list">{channels.map((channel) => <div className="integration sheet-conn" key={channel.id}><span className={`platform-mark platform-mark--${channel.platform}`}>{channel.platform === "facebook" ? "f" : "t"}</span><div><b>{channel.name}</b><p>{channel.platform === "facebook" ? "Facebook Page" : "TikTok Business"} · {channel.rowsImported} bài{channel.lastSyncedAt ? ` · cập nhật ${new Date(channel.lastSyncedAt).toLocaleString("vi-VN")}` : ""}</p></div><span className="status status--good"><i/>Dữ liệu thật</span>{canManage && <div className="sheet-conn__actions"><button className="outline-btn danger" onClick={() => onRemoveChannel(channel.id, channel.name)}>Gỡ</button></div>}</div>)}</div>
        : <div className="table-empty">Chưa kết nối kênh nào. Bấm “Kết nối kênh”, dán Page ID (hoặc business_id TikTok) + access token để lấy số liệu thật.</div>}
    </section>
    {!usingReal && <div className="content-pending"><Icon name="star"/><span>Chưa có kênh nào trả về dữ liệu. Số liệu bên dưới là <b>dữ liệu mô phỏng</b> để minh hoạ. Kết nối Facebook/TikTok để chấm Content WIN từ số thật.</span></div>}
    <div className="view-toolbar"><div className="segmented">{["Tất cả","Facebook","TikTok"].map((item) => <button className={platform === item ? "active" : ""} onClick={() => setPlatform(item)} key={item}>{item}</button>)}</div></div>
    <section className="content-layout"><article className="panel content-table-panel"><div className="panel__heading"><div><h2>Kho Content WIN {usingReal ? <span className="demo-chip demo-chip--live">Dữ liệu thật</span> : <span className="demo-chip">Mô phỏng</span>}</h2><p>Xếp hạng theo view, retention và tương tác</p></div></div><div className="content-list">{visible.map((item,index) => <button className={`content-row ${selected && selected.title === item.title ? "active" : ""}`} key={`${item.title}-${index}`} onClick={() => setSelectedTitle(item.title)}><span className="content-rank">{index+1}</span><span className={`platform-mark platform-mark--${item.platform.toLowerCase()}`}>{item.platform === "Facebook" ? "f" : "t"}</span><span className="content-main"><b>{item.title}</b><small>{item.project}{item.format ? ` · ${item.format}` : ""}{item.duration ? ` · ${item.duration}` : ""}</small></span><span><b>{item.views}</b><small>lượt xem</small></span><span><b>{item.retention}%</b><small>retention</small></span><strong className="win-score">{item.score}</strong></button>)}{!visible.length && <div className="table-empty">Chưa có bài nào cho nền tảng này.</div>}</div></article>
    {selected && <aside className="panel content-detail"><div className="content-detail__head"><span className="eyebrow">{selected.real ? "Số liệu thật từ kênh" : "Phân tích mô phỏng"}</span><h2>{selected.title}</h2><p>{selected.project} · {selected.platform}</p></div><div className="content-score"><div className="big-score"><strong>{selected.score}</strong><span>/100</span></div><span className="win-badge"><Icon name="star" size={17}/> Nội dung WIN</span></div><div className="metric-grid"><div><span>View</span><b>{selected.views}</b></div><div><span>Retention</span><b>{selected.retention}%</b></div><div><span>Tương tác</span><b>{selected.engagement}%</b></div>{selected.duration && <div><span>Độ dài</span><b>{selected.duration}</b></div>}</div>{(selected.hook || selected.format || selected.talent) && <div className="factor-list">{selected.hook && <p><span>Hook</span><b>{selected.hook}</b></p>}{selected.format && <p><span>Format</span><b>{selected.format}</b></p>}{selected.talent && <p><span>Nhân vật</span><b>{selected.talent}</b></p>}</div>}{selected.permalink && <a className="outline-btn" href={selected.permalink} target="_blank" rel="noreferrer"><Icon name="link" size={15}/> Mở bài gốc</a>}<div className="ai-insight"><span><Icon name="spark"/></span><div><b>Gợi ý nhân bản</b><p>Giữ cấu trúc hook và nhịp 3 giây đầu. Tạo 3 biến thể chủ đề, đổi bối cảnh nhưng giữ nguyên CTA lưu bài.</p></div></div><button className="primary-btn primary-btn--wide" onClick={() => onReplicate(selected.title)}><Icon name="plus"/> Tạo task nhân bản video</button></aside>}</section></div>;
}

// Cầu nối vạn năng: KHÔNG khóa cứng cột nào. Script chỉ trả về nguyên vùng dữ liệu,
// việc ánh xạ cột (STT, tiêu đề, trạng thái...) do app cấu hình. Một đoạn mã này dùng
// được cho MỌI sheet và MỌI tab có cấu trúc khác nhau.
const APPS_SCRIPT_TEMPLATE = `const TOKEN = '__SYNC_TOKEN__';

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function cell(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return value === null || value === undefined ? '' : String(value);
}

function pickTab(ss, name) {
  return name ? ss.getSheetByName(name) : ss.getSheets()[0];
}

function doGet(e) {
  if (TOKEN && e.parameter.token !== TOKEN) return json({error: 'invalid token'});
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tab = e.parameter.tab || ss.getSheets()[0].getName();
  const sh = pickTab(ss, tab);
  if (!sh) return json({error: 'missing tab: ' + tab});
  const startRow = Number(e.parameter.startRow || 2);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const count = Math.max(lastRow - startRow + 1, 0);
  const headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(cell) : [];
  const values = count && lastCol ? sh.getRange(startRow, 1, count, lastCol).getValues() : [];
  return json({
    meta: {
      spreadsheetId: ss.getId(), spreadsheetUrl: ss.getUrl(), spreadsheetName: ss.getName(),
      tab: tab, startRow: startRow, lastColumn: lastCol,
      tabs: ss.getSheets().map(function (s) { return s.getName(); })
    },
    headers: headers,
    rows: values.map(function (r, i) { return {rowNumber: startRow + i, cells: r.map(cell)}; })
  });
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  if (TOKEN && body.token !== TOKEN) return json({error: 'invalid token'});
  const ss = SpreadsheetApp.getActive();
  const tab = body.tab || ss.getSheets()[0].getName();
  const sh = pickTab(ss, tab);
  if (!sh) return json({error: 'missing tab: ' + tab});
  const startRow = Number(body.startRow || 2);
  const idCol = Number(body.idCol || 1);
  let row = Number(body.rowNumber || body.sourceRow || 0);
  if (!row && body.sourceId) {
    const ids = sh.getRange(startRow, idCol, Math.max(sh.getLastRow() - startRow + 1, 0), 1).getValues().flat();
    const idx = ids.findIndex(function (v) { return String(v) === String(body.sourceId); });
    if (idx >= 0) row = startRow + idx;
  }
  if (row < 1) return json({ok: false, row: row});
  // Ghi nhiều ô cùng lúc: trạng thái + link sản phẩm + link bài đăng.
  var writes = Array.isArray(body.writes) ? body.writes : [];
  if (!writes.length && Number(body.statusCol) >= 1) {
    writes = [{col: Number(body.statusCol), value: body.status}];
  }
  var written = 0;
  writes.forEach(function (w) {
    var col = Number(w.col);
    if (col >= 1 && w.value !== undefined && w.value !== null) { sh.getRange(row, col).setValue(w.value); written++; }
  });
  return json({ok: written > 0, row: row, written: written});
}`;

function SyncState({ value }: { value?: string | null }) {
  const label = value === "synced" ? "Khớp" : value === "app_newer" ? "App mới hơn" : value === "sheet_newer" ? "Sheet mới hơn" : "Chưa đối soát";
  const tone = value === "synced" ? "good" : value === "app_newer" || value === "sheet_newer" ? "warning" : "risk";
  return <span className={`status status--${tone}`}><i/>{label}</span>;
}

function syncRowIssue(row: SyncRow) {
  return row.syncState === "app_newer" || row.syncState === "sheet_newer" || (row.status === "done" && !(row.postUrl || "").startsWith("http"));
}

function SyncGroup({ name, rows, onInspect }: { name: string; rows: SyncRow[]; onInspect: (task: Task) => void }) {
  const PAGE_SIZE = 12;
  const [open, setOpen] = useState(true);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [page, setPage] = useState(0);
  const issues = rows.filter(syncRowIssue).length;
  const visibleRows = onlyIssues ? rows.filter(syncRowIssue) : rows;
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = visibleRows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);
  return <div className={`sync-group ${open ? "sync-group--open" : ""}`}>
    <button className="sync-group__head" onClick={() => setOpen(!open)}>
      <span className="sync-group__title"><Icon name="arrow" size={15}/><b>{name}</b><small>{rows.length} task</small></span>
      {issues > 0 ? <em className="issue-chip">{issues} cần xử lý</em> : <em className="ok-chip">Đã khớp</em>}
    </button>
    {open && <>
      <div className="sync-group__tools"><button className={`chip-toggle ${onlyIssues ? "active" : ""}`} onClick={() => { setOnlyIssues(!onlyIssues); setPage(0); }}><Icon name="filter" size={14}/> Chỉ hiện cần xử lý</button>{pageCount > 1 && <div className="pager"><button disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)} aria-label="Trang trước">‹</button><span>{clampedPage + 1}/{pageCount}</span><button disabled={clampedPage >= pageCount - 1} onClick={() => setPage(clampedPage + 1)} aria-label="Trang sau">›</button></div>}</div>
      <div className="data-table-wrap"><table className="data-table sync-table"><thead><tr><th>Mã</th><th>Nội dung</th><th>Phụ trách</th><th>Deadline</th><th>App</th><th>Sheet</th><th>Bàn giao</th><th>Page/kênh</th><th>Đối soát</th></tr></thead><tbody>{pageRows.map((row) => <tr key={row.id} className={syncRowIssue(row) ? "row-issue" : ""} onClick={() => onInspect(row)}><td><b>{row.sourceId}</b></td><td><div className="sync-title"><b>{row.title}</b><small>{row.contentType} · {row.contentPillar?.split("|")[0]}</small></div></td><td>{row.assignee}</td><td>{row.dueDate}</td><td><span className="role-chip">{row.status}</span></td><td>{row.sheetStatus || "—"}</td><td>{row.deliverableUrl ? <a href={row.deliverableUrl} target="_blank" rel="noreferrer" className="mini-link" onClick={(event) => event.stopPropagation()}>{row.deliverableType || "Xem"}</a> : "—"}</td><td>{row.channelStatus === "published" ? "Đã tìm thấy" : row.postUrl ? "Có link" : row.status === "done" ? <span className="warn-text">Thiếu link</span> : "Chưa có link"}</td><td><SyncState value={row.syncState}/></td></tr>)}{!pageRows.length && <tr><td colSpan={9}><div className="table-empty">Không có task phù hợp bộ lọc.</div></td></tr>}</tbody></table></div>
    </>}
  </div>;
}

function statusLabelForIntegration(status: string) {
  if (status === "live_synced") return { text: "Realtime hai chiều", tone: "good" };
  if (status === "snapshot_synced" || status === "snapshot_ready") return { text: "Snapshot một chiều", tone: "warning" };
  if (status === "link_readonly") return { text: "Đọc 1 chiều (link)", tone: "warning" };
  return { text: status, tone: "warning" };
}

function SheetSyncView({ data, loading, onImport, onSync, onSyncOne, onRemove, onConnect, onInspect, canManage }: { data: SyncData | null; loading: boolean; onImport: () => void; onSync: () => void; onSyncOne: (id: number) => void; onRemove: (id: number, name: string) => void; onConnect: () => void; onInspect: (task: Task) => void; canManage: boolean }) {
  const groupMap = new Map<string, SyncRow[]>();
  (data?.rows || []).forEach((row) => {
    const key = row.sourceSheet || row.project || "Khác";
    const list = groupMap.get(key) || [];
    list.push(row);
    groupMap.set(key, list);
  });
  const groups = Array.from(groupMap.entries()).map(([groupName, groupRows]) => ({ name: groupName, rows: groupRows, issues: groupRows.filter(syncRowIssue).length }));
  groups.sort((a, b) => b.issues - a.issues || b.rows.length - a.rows.length);
  const summary = data?.summary || { total: 0, appDone: 0, sheetDone: 0, channelMatched: 0, mismatches: 0, sheetCount: 0 };
  const sheets = data?.integrations || [];
  const realtimeCount = sheets.filter((sheet) => sheet.bridgeConfigured).length;
  return <div className="view-stack">
    <section className="sync-hero"><div><span className="eyebrow">Trung tâm kết nối Google Sheet</span><h2>{sheets.length ? `${sheets.length} sheet đang kết nối` : "Chưa kết nối sheet nào"}</h2><p>Mỗi sheet khai báo cấu trúc cột riêng. App đọc task về Kanban và ghi ngược trạng thái khi bật realtime — không sửa dữ liệu gốc ngoài cột trạng thái.</p><div className="sync-hero__actions">{canManage && <button className="primary-btn" onClick={onConnect}><Icon name="plus"/> Kết nối sheet mới</button>}{canManage && sheets.length > 0 && <button className="outline-btn" onClick={onSync} disabled={loading}><Icon name="refresh"/> {loading ? "Đang xử lý..." : "Đồng bộ tất cả"}</button>}{canManage && sheets.length === 0 && <button className="outline-btn" onClick={onImport} disabled={loading}><Icon name="refresh"/> Nạp plan mẫu</button>}</div></div><div className="source-card"><span className="file-badge">{realtimeCount ? "GS" : "—"}</span><div><b>{realtimeCount} sheet realtime · {sheets.length - realtimeCount} snapshot</b><p>{realtimeCount ? "Đọc và ghi ngược trạng thái hai chiều" : "Kết nối cầu nối Apps Script để bật ghi ngược"}</p></div><span className={`status status--${realtimeCount ? "good" : "warning"}`}><i/>{realtimeCount ? "Hai chiều sẵn sàng" : "Một chiều"}</span></div></section>
    <section className="sync-kpis"><article><span>Task từ sheet</span><strong>{summary.total}</strong><small>{summary.sheetCount || sheets.length} nguồn</small></article><article><span>Done trên app</span><strong>{summary.appDone}</strong><small>Nhân sự đã hoàn thành</small></article><article><span>Done trên Sheet</span><strong>{summary.sheetDone}</strong><small>Cột trạng thái</small></article><article><span>Khớp với kênh</span><strong>{summary.channelMatched}</strong><small>Có link bài đăng hợp lệ</small></article><article className={summary.mismatches ? "risk" : ""}><span>Cần xử lý</span><strong>{summary.mismatches}</strong><small>App và Sheet lệch trạng thái</small></article></section>
    <section className="panel"><div className="panel__heading"><div><h2>Sheet đã kết nối</h2><p>Nhiều sheet · nhiều cấu trúc · quản lý riêng từng nguồn</p></div>{canManage && <button className="primary-btn" onClick={onConnect}><Icon name="link"/> Thêm sheet</button>}</div>
      {sheets.length ? <div className="sheet-conn-list">{sheets.map((sheet) => { const badge = statusLabelForIntegration(sheet.status); return <div className="integration sheet-conn" key={sheet.id}><span className="platform-mark">S</span><div><b>{sheet.name}</b><p>Tab <b>{sheet.sourceTab}</b> · {sheet.rowsImported} task · {sheet.mapping?.project || "—"}{sheet.mapping?.owner ? ` · phụ trách ${sheet.mapping.owner}` : ""} · cột trạng thái {sheet.mapping?.statusCol || "?"}{sheet.mapping?.deliverableCol ? ` · ghi link cột ${sheet.mapping.deliverableCol}` : ""}{sheet.lastSyncedAt ? ` · đồng bộ ${new Date(sheet.lastSyncedAt).toLocaleString("vi-VN")}` : ""}</p></div><span className={`status status--${badge.tone}`}><i/>{badge.text}</span>{canManage && <div className="sheet-conn__actions">{(sheet.bridgeConfigured || sheet.sourceFormat === "google_link") && <button className="outline-btn" onClick={() => onSyncOne(sheet.id)} disabled={loading}><Icon name="refresh" size={15}/> Đồng bộ</button>}{sheet.sourceUrl && <a className="outline-btn" href={sheet.sourceUrl} target="_blank" rel="noreferrer">Mở</a>}<button className="outline-btn danger" onClick={() => onRemove(sheet.id, sheet.name)}>Gỡ</button></div>}</div>; })}</div>
        : <div className="table-empty">Chưa có sheet nào. Bấm “Kết nối sheet mới” để bắt đầu — bạn sẽ khai báo tab và vị trí các cột.</div>}
    </section>
    <section className="panel"><div className="panel__heading"><div><h2>Đối soát theo từng Sheet</h2><p>Gộp theo nguồn · lọc việc cần xử lý · thu gọn để dễ theo dõi</p></div>{canManage && sheets.length > 0 && <button className="outline-btn" onClick={onSync} disabled={loading}><Icon name="refresh"/> Làm mới</button>}</div>{groups.length ? <div className="sync-groups">{groups.map((group) => <SyncGroup key={group.name} name={group.name} rows={group.rows} onInspect={onInspect}/>)}</div> : <div className="data-table-wrap"><table className="data-table sync-table"><tbody><tr><td><div className="table-empty">Chưa có task nào để đối soát.</div></td></tr></tbody></table></div>}</section>
  </div>;
}

function stripVN(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

function columnLabel(index: number): string {
  let result = "";
  let current = index;
  while (current > 0) { const rest = (current - 1) % 26; result = String.fromCharCode(65 + rest) + result; current = Math.floor((current - 1) / 26); }
  return result;
}

function matchHeader(normalized: string, keyword: string): boolean {
  if (keyword.includes(" ") || keyword.length > 3) return normalized.includes(keyword);
  return normalized.split(/[^a-z0-9]+/).includes(keyword);
}

// Tự nhận diện vai trò từng cột dựa trên tên tiêu đề (không cần đếm cột).
function autoDetectColumns(headers: string[]): { columns: Partial<ColumnMap>; deliverable: number; postUrl: number } {
  const norm = headers.map((header) => stripVN(String(header || "")));
  const used = new Set<number>();
  const pick = (keywords: string[]): number => {
    for (const keyword of keywords) {
      for (let index = 0; index < norm.length; index += 1) {
        if (used.has(index) || !norm[index]) continue;
        if (matchHeader(norm[index], keyword)) { used.add(index); return index + 1; }
      }
    }
    return 0;
  };
  const sourceId = pick(["stt", "so tt", "so thu tu", "thu tu", "ma noi dung", "ma so", "ma", "id"]);
  const sheetStatus = pick(["trang thai", "status", "tinh trang"]);
  const brief = pick(["kich ban", "brief", "script", "noi dung chi tiet", "outline", "content chi tiet"]);
  const deliverable = pick(["link video", "link san pham", "video drive", "link drive", "link video/anh", "drive"]);
  const postUrl = pick(["link bai dang", "link post", "permalink", "da dang", "link fb", "link bai", "url bai"]);
  const dueDate = pick(["deadline", "ngay dang", "han hoan thanh", "han", "ngay len song", "publish", "due", "ngay"]);
  const title = pick(["tieu de", "ten task", "noi dung", "chu de", "title", "topic", "ten"]);
  const pillar = pick(["tru noi dung", "content pillar", "pillar", "chuyen muc", "tuyen noi dung"]);
  const assetType = pick(["loai san pham", "san pham", "asset"]);
  const contentType = pick(["dinh dang", "loai content", "loai noi dung", "format", "kieu", "loai"]);
  return { columns: { sourceId, title, sheetStatus, dueDate, pillar, contentType, assetType, brief }, deliverable, postUrl };
}

const MAPPING_FIELDS: { key: keyof ColumnMap; label: string; required?: boolean }[] = [
  { key: "sourceId", label: "Mã/STT (khóa đối soát)", required: true },
  { key: "title", label: "Tiêu đề task", required: true },
  { key: "sheetStatus", label: "Trạng thái", required: true },
  { key: "dueDate", label: "Deadline" },
  { key: "pillar", label: "Trụ nội dung" },
  { key: "contentType", label: "Loại (Video/Ảnh)" },
  { key: "assetType", label: "Loại sản phẩm" },
  { key: "brief", label: "Kịch bản / Brief" },
];

function BridgeModal({ onClose, onSave, onPreview, onAction, loading, employees }: { onClose: () => void; onSave: (payload: ConnectPayload) => void; onPreview: (payload: ConnectPayload) => Promise<{ meta?: { tabs?: string[]; spreadsheetName?: string }; headers: string[]; sample: { rowNumber: number; cells: string[] }[]; mappedSample: { sourceId: string; title: string; sheetStatus: string }[] }>; onAction: (message: string) => void; loading: boolean; employees: Employee[] }) {
  const [mode, setMode] = useState<"link" | "bridge">("link");
  const [token, setToken] = useState("agency-os-2026");
  const [url, setUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [tab, setTab] = useState("5. CHECKLIST CONTENT");
  const [project, setProject] = useState(DEFAULT_MAPPING.project);
  const [startRow, setStartRow] = useState(DEFAULT_MAPPING.startRow);
  const [columns, setColumns] = useState<ColumnMap>({ ...DEFAULT_MAPPING.columns });
  const [writeCols, setWriteCols] = useState<{ deliverable: number; postUrl: number }>({ deliverable: 0, postUrl: 0 });
  const [owner, setOwner] = useState("");
  const [preview, setPreview] = useState<null | { meta?: { tabs?: string[]; spreadsheetName?: string }; headers: string[]; sample: { rowNumber: number; cells: string[] }[]; mappedSample: { sourceId: string; title: string; sheetStatus: string }[] }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mapping = (): SheetMapping => ({ startRow: Number(startRow) || 2, statusCol: Number(columns.sheetStatus) || 12, idCol: Number(columns.sourceId) || 1, columns, statusMap: DEFAULT_MAPPING.statusMap, project: project.trim() || "Chưa đặt tên dự án", deliverableCol: Number(writeCols.deliverable) || 0, postUrlCol: Number(writeCols.postUrl) || 0, owner: owner.trim() });
  const payload = (): ConnectPayload => ({ mode, bridgeUrl: url.trim(), bridgeToken: token, linkUrl: linkUrl.trim(), tab: tab.trim(), name: project.trim(), mapping: mapping() });
  const ready = mode === "link" ? Boolean(linkUrl.trim()) : Boolean(url.trim());
  const setCol = (key: keyof ColumnMap, value: string) => setColumns((current) => ({ ...current, [key]: Number(value) || 0 }));
  const headerOptions = (preview?.headers || []).map((header, index) => ({ value: index + 1, label: `${columnLabel(index + 1)} · ${header || "(trống)"}` }));
  const applyDetection = (headers: string[]) => { const detected = autoDetectColumns(headers); setColumns((current) => ({ ...current, ...detected.columns })); setWriteCols({ deliverable: detected.deliverable, postUrl: detected.postUrl }); };
  const autoFill = () => { applyDetection(preview?.headers || []); onAction("Đã tự nhận diện lại các cột theo tên tiêu đề."); };
  const copyCode = async () => { await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE.replace("__SYNC_TOKEN__", token)); onAction("Đã sao chép mã cầu nối vạn năng. Dán vào Apps Script rồi Deploy."); };
  const runPreview = async () => { setError(""); setBusy(true); try { const result = await onPreview(payload()); setPreview(result); if (result.meta?.spreadsheetName && project === DEFAULT_MAPPING.project) setProject(result.meta.spreadsheetName); applyDetection(result.headers || []); } catch (err) { setError(err instanceof Error ? err.message : "Không đọc được dữ liệu."); } finally { setBusy(false); } };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(payload()); };

  return <div className="modal-backdrop"><div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="bridge-title"><div className="modal__head"><div><span className="eyebrow">Kết nối một sheet</span><h2 id="bridge-title">Thêm Google Sheet</h2></div><button className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="close"/></button></div>
    <div className="segmented segmented--modal">{(["link","bridge"] as const).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} onClick={() => { setMode(item); setPreview(null); }}>{item === "link" ? "Chỉ dán link · nhanh" : "Cầu nối 2 chiều · Apps Script"}</button>)}</div>
    {mode === "link"
      ? <div className="setup-steps"><p><b>1</b><span>Mở sheet → <strong>Chia sẻ</strong> → đặt <strong>“Bất kỳ ai có liên kết · Người xem”</strong>.</span></p><p><b>2</b><span>Copy link trên trình duyệt (chọn đúng <strong>tab</strong> muốn nạp) rồi dán vào ô dưới.</span></p><p><b>3</b><span>Bấm <strong>Đọc dữ liệu</strong> — app tự nhận diện cột, gán nhân sự rồi Lưu. <em>Chế độ này chỉ đọc một chiều (không ghi ngược ra sheet).</em></span></p></div>
      : <div className="setup-steps"><p><b>1</b><span>Mở Google Sheets → <strong>Extensions → Apps Script</strong>, dán mã cầu nối (một mã dùng cho mọi sheet).</span><button type="button" className="outline-btn" onClick={copyCode}>Sao chép mã cầu nối</button></p><p><b>2</b><span><strong>Deploy → New deployment → Web app</strong> · Execute as: Me · Who has access: Anyone. Dán URL <strong>/exec</strong> vào ô dưới.</span></p><p><b>3</b><span>Nhập tên tab rồi bấm <strong>Đọc dữ liệu</strong> — app tự nhận diện cột theo tên tiêu đề. Chọn lại nếu cần, gán nhân sự rồi Lưu.</span></p></div>}
    <form onSubmit={submit}><div className="form-grid">
      {mode === "bridge" && <label className="form-field"><span>Token bảo mật (khớp trong mã)</span><input value={token} onChange={(event) => setToken(event.target.value)} required/></label>}
      <label className="form-field"><span>Tên dự án gắn cho task</span><input value={project} onChange={(event) => setProject(event.target.value)} placeholder="Ví dụ: Dược sĩ Giang" required/></label>
      {mode === "link"
        ? <label className="form-field form-field--full"><span>Link Google Sheets (đã chia sẻ công khai)</span><input type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} required placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"/></label>
        : <>
          <label className="form-field form-field--full"><span>Apps Script Web App URL</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://script.google.com/macros/s/.../exec"/></label>
          <label className="form-field"><span>Tên tab</span>{preview?.meta?.tabs?.length ? <select value={tab} onChange={(event) => setTab(event.target.value)}>{preview.meta.tabs.map((name) => <option key={name}>{name}</option>)}</select> : <input value={tab} onChange={(event) => setTab(event.target.value)} placeholder="5. CHECKLIST CONTENT" required/>}</label>
        </>}
      <label className="form-field"><span>Dòng bắt đầu dữ liệu</span><input type="number" min="1" value={startRow} onChange={(event) => setStartRow(Number(event.target.value))}/></label>
    </div>
    {!preview && <div className="mapping-empty"><Icon name="spark"/><span>Bấm <b>“Đọc dữ liệu”</b> phía dưới — app tự nhận diện cột theo tên tiêu đề trong sheet của bạn. Bạn chỉ chọn lại từ danh sách nếu sai, <b>không cần đếm cột hay gõ số</b>.</span></div>}
    {preview && <>
      <div className="mapping-section"><div className="mapping-section__head"><span className="mapping-tag mapping-tag--read">📥 Cột ĐỌC</span><small>Đã tự nhận diện từ tên cột — chọn lại nếu cần</small><button type="button" className="text-btn" onClick={autoFill}>↻ Nhận diện lại</button></div>
        <div className="mapping-grid">{MAPPING_FIELDS.map((field) => <label className="form-field" key={field.key}><span>{field.label}{field.required ? " *" : ""}</span><select value={columns[field.key] || 0} onChange={(event) => setCol(field.key, event.target.value)}><option value={0}>— Không dùng —</option>{headerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}</div>
      </div>
      {mode === "bridge"
        ? <div className="mapping-section"><div className="mapping-section__head"><span className="mapping-tag mapping-tag--write">📤 Cột GHI ngược</span><small>Khi làm xong, app fill link về đúng dòng STT (cột trạng thái dùng chung ở trên)</small></div>
        <div className="mapping-grid"><label className="form-field"><span>Link video / sản phẩm</span><select value={writeCols.deliverable} onChange={(event) => setWriteCols((current) => ({ ...current, deliverable: Number(event.target.value) || 0 }))}><option value={0}>— Không ghi —</option>{headerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="form-field"><span>Link bài đăng</span><select value={writeCols.postUrl} onChange={(event) => setWriteCols((current) => ({ ...current, postUrl: Number(event.target.value) || 0 }))}><option value={0}>— Không ghi —</option>{headerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
      </div>
        : <div className="modal-note"><Icon name="spark"/><span>Chế độ link chỉ <b>đọc một chiều</b>. Muốn app ghi ngược link/trạng thái ra sheet, chuyển sang <b>Cầu nối 2 chiều</b>.</span></div>}
      <label className="form-field form-field--full"><span>Nhân sự phụ trách sheet (task nhập về tự gán cho người này)</span><select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">Chưa phân công</option>{employees.filter((employee) => employee.status === "active").map((employee) => <option key={employee.id}>{employee.fullName}</option>)}</select></label>
    </>}
    <div className="modal__actions modal__actions--split"><button type="button" className="outline-btn" onClick={() => void runPreview()} disabled={busy || !ready}>{busy ? "Đang đọc..." : preview ? "Đọc lại dữ liệu" : "Đọc dữ liệu"}</button><div><button type="button" className="outline-btn" onClick={onClose}>Để sau</button><button className="primary-btn" type="submit" disabled={loading || !ready}>{loading ? "Đang lưu..." : "Lưu & đồng bộ"}</button></div></div>
    {error && <div className="modal-note modal-note--error"><Icon name="clock"/><span>{error}</span></div>}
    {preview && <div className="preview-box"><b>Xem trước {preview.mappedSample.length} dòng đầu</b><div className="preview-cols"><small>Cột đọc được: {preview.headers.map((header, index) => `${index + 1}·${header || "—"}`).join("  |  ")}</small></div><table className="data-table"><thead><tr><th>Mã</th><th>Tiêu đề</th><th>Trạng thái</th></tr></thead><tbody>{preview.mappedSample.map((row) => <tr key={row.sourceId}><td>{row.sourceId}</td><td>{row.title || <span className="warn-text">trống</span>}</td><td>{row.sheetStatus}</td></tr>)}{!preview.mappedSample.length && <tr><td colSpan={3}><div className="table-empty">Chưa đọc được dòng nào — kiểm tra lại số cột hoặc dòng bắt đầu.</div></td></tr>}</tbody></table></div>}
    </form></div></div>;
}

function ChannelModal({ onClose, onSave, loading }: { onClose: () => void; onSave: (payload: ChannelPayload) => void; loading: boolean }) {
  const [platform, setPlatform] = useState<"facebook" | "tiktok">("facebook");
  const [scope, setScope] = useState<"all" | "one">("all");
  const [accessToken, setAccessToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const discoverAll = platform === "facebook" && scope === "all";
  const needsId = !discoverAll;
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave({ platform, accessToken: accessToken.trim(), accountId: accountId.trim(), name: name.trim(), project: project.trim(), discoverAll }); };
  const idLabel = platform === "facebook" ? "Page ID Facebook" : "business_id TikTok";
  const idHint = platform === "facebook" ? "Số ID của Page (Meta Business → Cài đặt Page → giới thiệu)." : "business_id của tài khoản TikTok for Business.";
  return <div className="modal-backdrop"><div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="channel-title"><div className="modal__head"><div><span className="eyebrow">Kết nối kênh mạng xã hội</span><h2 id="channel-title">Facebook / TikTok — dán access token</h2></div><button className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="close"/></button></div>
    <div className="setup-steps"><p><b>1</b><span>Tạo app trong <strong>Meta for Developers</strong> (hoặc <strong>TikTok for Business</strong>), lấy <strong>access token</strong> có quyền đọc chỉ số bài đăng (Facebook cần <em>pages_show_list · read_insights</em>).</span></p><p><b>2</b><span>Với Facebook, dùng <strong>User/System token</strong> là <strong>một lần lấy hết mọi Page</strong> bạn quản lý. Muốn nối riêng 1 Page thì chọn “Một Page cụ thể”.</span></p><p><b>3</b><span>Token chỉ lưu ở máy chủ để đồng bộ định kỳ, không hiển thị lại. Gỡ kênh là ngừng lấy dữ liệu.</span></p></div>
    <form onSubmit={submit}>
      <div className="segmented segmented--modal">{(["facebook","tiktok"] as const).map((item) => <button type="button" key={item} className={platform === item ? "active" : ""} onClick={() => setPlatform(item)}>{item === "facebook" ? "Facebook" : "TikTok"}</button>)}</div>
      {platform === "facebook" && <div className="segmented segmented--modal">{(["all","one"] as const).map((item) => <button type="button" key={item} className={scope === item ? "active" : ""} onClick={() => setScope(item)}>{item === "all" ? "Tất cả Page tôi quản lý" : "Một Page cụ thể"}</button>)}</div>}
      <div className="form-grid">
        <label className="form-field"><span>Tên hiển thị (tùy chọn)</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={platform === "facebook" ? "Ví dụ: Page Dược sĩ Giang" : "Ví dụ: TikTok Dược sĩ Giang"} disabled={discoverAll}/></label>
        <label className="form-field"><span>Dự án gắn cho bài</span><input value={project} onChange={(event) => setProject(event.target.value)} placeholder="Ví dụ: Dược sĩ Giang"/></label>
        {needsId && <label className="form-field"><span>{idLabel} *</span><input value={accountId} onChange={(event) => setAccountId(event.target.value)} required placeholder={platform === "facebook" ? "1234567890" : "700000000000000"}/></label>}
        <label className="form-field form-field--full"><span>Access token *</span><input value={accessToken} onChange={(event) => setAccessToken(event.target.value)} required placeholder={discoverAll ? "User/System token có quyền quản lý các Page" : "EAAG... (Facebook) hoặc token TikTok Business"}/></label>
      </div>
      <p className="field-hint">{discoverAll ? "Dán 1 User/System token — app tự liệt kê và nối mọi Page bạn quản lý." : idHint}</p>
      <div className="modal__actions"><button type="button" className="outline-btn" onClick={onClose}>Để sau</button><button className="primary-btn" type="submit" disabled={loading || !accessToken.trim() || (needsId && !accountId.trim())}>{loading ? "Đang lấy dữ liệu..." : "Kết nối & lấy dữ liệu"}</button></div>
    </form></div></div>;
}

function TaskDetailModal({ task, employees, onClose, onSave, onGoSync }: { task: Task; employees: Employee[]; onClose: () => void; onSave: (id: number, status: string, postUrl: string, assignee: string, qualityScore?: number, deliverable?: { url: string; type: string; note: string }) => void; onGoSync: () => void }) {
  const [status, setStatus] = useState(task.status);
  const [postUrl, setPostUrl] = useState(task.postUrl || "");
  const [assignee, setAssignee] = useState(task.assignee);
  const [quality, setQuality] = useState("");
  const [deliverUrl, setDeliverUrl] = useState(task.deliverableUrl || "");
  const [deliverType, setDeliverType] = useState(task.deliverableType || suggestDeliverableType(task.department));
  const [deliverNote, setDeliverNote] = useState(task.deliverableNote || "");
  const scoringDone = status === "done" && task.status !== "done";
  const deliverChanged = deliverUrl.trim() !== (task.deliverableUrl || "").trim() || deliverType !== (task.deliverableType || suggestDeliverableType(task.department)) || deliverNote.trim() !== (task.deliverableNote || "").trim();
  return <div className="modal-backdrop"><div className="modal modal--compact" role="dialog" aria-modal="true"><div className="modal__head"><div><span className="eyebrow">{task.sourceId ? `Task ${task.sourceId}` : "Công việc"}</span><h2>{task.title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="close"/></button></div><div className="detail-list"><p><span>Dự án</span><b>{task.project}</b></p><p><span>Deadline</span><b>{task.dueDate}</b></p><p><span>Nguồn</span><b>{task.sourceType === "google_sheet" ? "Google Sheet" : "Tạo trên app"}</b></p>{task.sheetStatus && <p><span>Trạng thái Sheet</span><b>{task.sheetStatus}</b></p>}</div>{task.sheetBrief && <div className="brief-box"><div className="brief-box__head"><Icon name="link" size={15}/> <b>Kịch bản / Brief từ Sheet</b></div><p>{task.sheetBrief}</p></div>}<label className="form-field form-field--full"><span>Người phụ trách</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option>Chưa phân công</option>{employees.filter((employee) => employee.status === "active").map((employee) => <option key={employee.id}>{employee.fullName}</option>)}</select></label><label className="form-field form-field--full"><span>Trạng thái trên app</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="pending">Cần duyệt</option><option value="todo">Cần làm</option><option value="doing">Đang thực hiện</option><option value="review">Chờ duyệt</option><option value="done">Hoàn thành</option><option value="blocked">Đang vướng</option></select></label>{scoringDone && <label className="form-field form-field--full"><span>Chấm chất lượng khi nghiệm thu (1–100, tùy chọn)</span><input type="number" min="1" max="100" value={quality} onChange={(event) => setQuality(event.target.value)} placeholder="Ví dụ: 90 · để trống nếu chưa chấm"/></label>}<div className="deliver-box"><div className="deliver-box__head"><span><Icon name="link" size={15}/> Bàn giao sản phẩm</span>{task.submittedBy && <small>{task.submittedBy}{task.submittedAt ? ` · ${new Date(task.submittedAt).toLocaleDateString("vi-VN")}` : ""}</small>}</div><div className="form-grid"><label className="form-field"><span>Loại sản phẩm</span><select value={deliverType} onChange={(event) => setDeliverType(event.target.value)}>{DELIVERABLE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="form-field"><span>Ghi chú (tùy chọn)</span><input value={deliverNote} onChange={(event) => setDeliverNote(event.target.value)} placeholder="Ví dụ: bản final đã sửa feedback"/></label></div><label className="form-field form-field--full"><span>Link bàn giao (Drive · Docs · bài viết)</span><input type="url" value={deliverUrl} onChange={(event) => setDeliverUrl(event.target.value)} placeholder="https://drive.google.com/... hoặc https://docs.google.com/..."/></label></div><label className="form-field form-field--full"><span>Link bài đã đăng trên Page/kênh</span><input type="url" value={postUrl} onChange={(event) => setPostUrl(event.target.value)} placeholder="https://facebook.com/... hoặc https://tiktok.com/..."/></label><div className="modal__actions">{task.sourceType === "google_sheet" && <button className="outline-btn" onClick={onGoSync}>Mở đối soát</button>}<button className="primary-btn" onClick={() => { const score = scoringDone && quality.trim() ? Math.max(1, Math.min(100, Math.round(Number(quality) || 0))) : undefined; onSave(task.id, status, postUrl, assignee, score, deliverChanged ? { url: deliverUrl, type: deliverType, note: deliverNote } : undefined); onClose(); }}>Lưu thay đổi</button></div></div></div>;
}
function SettingsView({ onGo, onAction, currentUser, onLogout }: { onGo: (view: View) => void; onAction: (message: string) => void; currentUser: AuthUser | null; onLogout: () => void }) {
  const [resultHeavy, setResultHeavy] = useState<string[]>(["Ads/Performance"]);
  const [threshold, setThreshold] = useState(85);
  const isDirector = currentUser?.role === "director";
  const toggleRole = (role: string) => { setResultHeavy((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]); onAction(`Đã cập nhật công thức KPI cho ${role}.`); };
  return <div className="view-stack settings-grid">
    {currentUser && <section className="panel"><div className="panel__heading"><div><h2>Phiên đăng nhập</h2><p>Tài khoản đang sử dụng thiết bị này</p></div></div><div className="integration"><Avatar name={currentUser.fullName}/><div><b>{currentUser.fullName}</b><p>{currentUser.email} · {roleLabel(currentUser.role)}</p></div><button className="outline-btn" onClick={onLogout}>Đăng xuất</button></div></section>}
    {isDirector && currentUser && <AccountManager currentUser={currentUser} onAction={onAction}/>}
    {isDirector && <><section className="panel"><div className="panel__heading"><div><h2>Công thức KPI</h2><p>Thiết lập theo từng vị trí</p></div></div>{["Content","Video","Design","Ads/Performance","Account"].map((role) => <div className="setting-row" key={role}><div><span className="role-chip">{role}</span><p>{resultHeavy.includes(role) ? "20% Khối lượng · 20% Deadline · 20% Chất lượng · 40% Kết quả" : "25% Khối lượng · 25% Deadline · 25% Chất lượng · 25% Kết quả"}</p></div><button className="outline-btn" onClick={() => toggleRole(role)}>Điều chỉnh</button></div>)}</section><section className="panel"><div className="panel__heading"><div><h2>Kết nối dữ liệu</h2><p>Google Sheet, Facebook và TikTok</p></div></div><div className="integration"><span className="platform-mark">S</span><div><b>Google Sheet</b><p>Nhiều sheet · cấu trúc cột tùy biến · đọc/ghi qua cầu nối Apps Script</p></div><span className="status status--good"><i/>Đang hoạt động</span></div><div className="integration"><span className="platform-mark platform-mark--facebook">f</span><div><b>Facebook Business</b><p>Dán access token (Page ID + token có quyền read_insights) để lấy view/tương tác thật</p><p className="integration-hint">Mở tab Content → “Kết nối kênh”. Token lưu ở máy chủ, không hiển thị lại.</p></div><span className="status status--good"><i/>Sẵn sàng nhận token</span></div><div className="integration"><span className="platform-mark platform-mark--tiktok">t</span><div><b>TikTok Business</b><p>Dán business_id + access token TikTok for Business để lấy số liệu video thật</p><p className="integration-hint">Lược đồ TikTok tùy phiên bản API; nếu lệch app sẽ báo lỗi thật của nền tảng.</p></div><span className="status status--good"><i/>Sẵn sàng nhận token</span></div><button className="primary-btn primary-btn--wide" onClick={() => onGo("content")}><Icon name="link"/> Mở trung tâm kết nối kênh</button></section><section className="panel"><div className="panel__heading"><div><h2>Quy tắc Content WIN</h2><p>Áp dụng riêng cho từng dự án</p></div></div><div className="rule-box"><span>Điểm tổng hợp tối thiểu</span><strong>{threshold}/100</strong></div><div className="rule-box"><span>So với trung bình kênh</span><strong>≥ 1,5 lần</strong></div><div className="rule-box"><span>Top nội dung dự án</span><strong>Top 10%</strong></div><button className="outline-btn outline-btn--wide" onClick={() => { setThreshold(threshold === 85 ? 90 : 85); onAction(`Đã đổi ngưỡng Content WIN thành ${threshold === 85 ? 90 : 85} điểm.`); }}>Chỉnh quy tắc</button></section></>}
  </div>;
}

function AddTaskModal({ employees, projects, onClose, onAdd }: { employees: Employee[]; projects: Project[]; onClose: () => void; onAdd: (task: Omit<Task,"id">) => void }) {
  const [saving,setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    const data = new FormData(event.currentTarget);
    await onAdd({ title: String(data.get("title")), project: String(data.get("project")), department: String(data.get("department")), assignee: String(data.get("assignee")), dueDate: String(data.get("dueDate")), priority: String(data.get("priority")), weight: Number(data.get("weight")), status: "pending" });
    setSaving(false); onClose();
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if(event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal__head"><div><span className="eyebrow">Tạo nhanh trong 30 giây</span><h2 id="task-modal-title">Thêm công việc mới</h2></div><button className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="close"/></button></div><form onSubmit={submit}><label className="form-field form-field--full"><span>Tên công việc</span><input name="title" required placeholder="Ví dụ: Viết 10 hook video mới" autoFocus/></label><div className="form-grid"><label className="form-field"><span>Dự án</span><select name="project">{projects.map((project) => <option key={project.name}>{project.name}</option>)}</select></label><label className="form-field"><span>Người phụ trách</span><select name="assignee"><option>Chưa phân công</option>{employees.filter((employee) => employee.status === "active").map((employee) => <option key={employee.id}>{employee.fullName}</option>)}</select></label><label className="form-field"><span>Bộ phận</span><select name="department"><option>Content</option><option>Video</option><option>Design</option><option>Ads/Performance</option><option>Account</option></select></label><label className="form-field"><span>Loại task</span><select name="weight"><option value="1">Đơn giản · 1 điểm</option><option value="2">Tiêu chuẩn · 2 điểm</option><option value="3">Chuyên môn · 3 điểm</option><option value="5">Phức tạp · 5 điểm</option><option value="8">Dự án lớn · 8 điểm</option></select></label><label className="form-field"><span>Deadline</span><input name="dueDate" type="date" required defaultValue="2026-08-05"/></label><label className="form-field"><span>Mức ưu tiên</span><select name="priority"><option value="normal">Bình thường</option><option value="high">Ưu tiên</option><option value="urgent">Gấp · cần duyệt lý do</option></select></label></div><div className="modal-note"><Icon name="spark"/><span>Hệ thống tự gán trọng số theo loại task. Task sẽ vào hàng chờ trưởng bộ phận duyệt trước khi tính KPI.</span></div><div className="modal__actions"><button type="button" className="outline-btn" onClick={onClose}>Hủy</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Đang lưu..." : "Tạo và gửi duyệt"}</button></div></form></div></div>;
}

function AuthScreen({ needsBootstrap, onAuthed }: { needsBootstrap: boolean; onAuthed: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "bootstrap">(needsBootstrap ? "bootstrap" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const endpoint = mode === "bootstrap" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "bootstrap" ? { email, password, fullName } : { email, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể đăng nhập.");
      onAuthed(data.user as AuthUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand"><span>Agency</span><b>OS</b></div>
        <h1>{mode === "bootstrap" ? "Khởi tạo tài khoản Giám đốc" : "Đăng nhập hệ thống"}</h1>
        <p className="auth-sub">{mode === "bootstrap" ? "Đây là lần thiết lập đầu tiên. Tài khoản này sẽ có toàn quyền quản trị." : "Dùng email và mật khẩu được cấp để truy cập bảng điều hành."}</p>
        <form onSubmit={submit}>
          {mode === "bootstrap" && (
            <label className="form-field form-field--full"><span>Họ và tên</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} required autoFocus placeholder="Đức Anh"/></label>
          )}
          <label className="form-field form-field--full"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus={mode === "login"} placeholder="ban@agency.vn"/></label>
          <label className="form-field form-field--full"><span>Mật khẩu</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Tối thiểu 6 ký tự"/></label>
          {error && <div className="auth-error" role="alert"><Icon name="alert" size={16}/> {error}</div>}
          <button className="primary-btn primary-btn--wide" type="submit" disabled={busy}>{busy ? "Đang xử lý..." : mode === "bootstrap" ? "Tạo tài khoản & vào hệ thống" : "Đăng nhập"}</button>
        </form>
        {needsBootstrap && (
          <p className="auth-hint">{mode === "bootstrap" ? "Đã có tài khoản?" : "Cần tạo tài khoản quản trị đầu tiên?"} <button type="button" className="link-btn" onClick={() => { setError(""); setMode(mode === "bootstrap" ? "login" : "bootstrap"); }}>{mode === "bootstrap" ? "Đăng nhập" : "Khởi tạo"}</button></p>
        )}
        <p className="auth-note">Tài khoản nhân viên do Giám đốc tạo trong mục Cài đặt.</p>
      </div>
    </div>
  );
}

function AccountManager({ currentUser, onAction }: { currentUser: AuthUser; onAction: (message: string) => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/users");
      if (!response.ok) return;
      const data = await response.json();
      setUsers(data.users || []);
    } catch { /* keep current */ }
    finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await fetch("/api/auth/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: String(data.get("fullName")), email: String(data.get("email")), password: String(data.get("password")), role: String(data.get("role")), employeeName: String(data.get("employeeName")) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tạo tài khoản.");
      setCreating(false);
      await load();
      onAction(`Đã tạo tài khoản cho ${result.user.fullName}.`);
    } catch (err) { onAction(err instanceof Error ? err.message : "Không thể tạo tài khoản."); }
    finally { setSaving(false); }
  };

  const patchUser = async (id: number, body: Record<string, unknown>, message: string) => {
    try {
      const response = await fetch("/api/auth/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật.");
      await load();
      onAction(message);
    } catch (err) { onAction(err instanceof Error ? err.message : "Không thể cập nhật tài khoản."); }
  };

  const resetPassword = async (user: ManagedUser) => {
    const next = window.prompt(`Đặt mật khẩu mới cho ${user.fullName} (tối thiểu 6 ký tự):`);
    if (!next) return;
    await patchUser(user.id, { password: next }, `Đã đặt lại mật khẩu cho ${user.fullName}.`);
  };

  return (
    <section className="panel">
      <div className="panel__heading"><div><h2>Tài khoản & phân quyền</h2><p>Cấp quyền truy cập cho nhân viên. Giám đốc có toàn quyền, Nhân viên chỉ xem và cập nhật công việc.</p></div><button className="primary-btn" onClick={() => setCreating(true)}><Icon name="plus"/> Tạo tài khoản</button></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Người dùng</th><th>Email</th><th>Quyền</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        {loading && <tr><td colSpan={5}><div className="table-empty">Đang tải danh sách...</div></td></tr>}
        {!loading && users.map((user) => <tr key={user.id}><td><div className="person-cell"><Avatar name={user.fullName} size="sm"/><b>{user.fullName}{user.id === currentUser.id && <em className="demo-chip">Bạn</em>}</b></div></td><td>{user.email}</td><td><span className="role-chip">{roleLabel(user.role)}</span></td><td><span className={`status status--${user.status === "active" ? "good" : "risk"}`}><i/>{user.status === "active" ? "Hoạt động" : "Đã khóa"}</span></td><td><div className="row-actions">{user.id !== currentUser.id && <button className="outline-btn" onClick={() => void patchUser(user.id, { role: user.role === "director" ? "staff" : "director" }, `Đã đổi quyền của ${user.fullName}.`)}>{user.role === "director" ? "Hạ xuống NV" : "Nâng lên GĐ"}</button>}<button className="text-btn" onClick={() => void resetPassword(user)}>Đổi mật khẩu</button>{user.id !== currentUser.id && <button className="text-btn" onClick={() => void patchUser(user.id, { status: user.status === "active" ? "disabled" : "active" }, `Đã ${user.status === "active" ? "khóa" : "mở"} tài khoản ${user.fullName}.`)}>{user.status === "active" ? "Khóa" : "Mở khóa"}</button>}</div></td></tr>)}
        {!loading && !users.length && <tr><td colSpan={5}><div className="table-empty">Chưa có tài khoản nào.</div></td></tr>}
      </tbody></table></div>
      {creating && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title"><div className="modal__head"><div><span className="eyebrow">Tài khoản mới</span><h2 id="user-modal-title">Tạo tài khoản nhân viên</h2></div><button className="icon-btn" onClick={() => setCreating(false)} aria-label="Đóng"><Icon name="close"/></button></div><form onSubmit={createUser}><div className="form-grid"><label className="form-field form-field--full"><span>Họ và tên</span><input name="fullName" required autoFocus/></label><label className="form-field"><span>Email</span><input name="email" type="email" required/></label><label className="form-field"><span>Mật khẩu tạm</span><input name="password" required placeholder="Tối thiểu 6 ký tự"/></label><label className="form-field"><span>Quyền</span><select name="role" defaultValue="staff"><option value="staff">Nhân viên</option><option value="director">Giám đốc</option></select></label><label className="form-field"><span>Gắn với nhân sự (tùy chọn)</span><input name="employeeName" placeholder="Tên trong danh sách nhân sự"/></label></div><div className="modal-note"><Icon name="spark"/><span>Nhân viên chỉ xem và cập nhật công việc. Chỉ Giám đốc chỉnh quỹ thưởng, nhân sự, dự án và kết nối dữ liệu.</span></div><div className="modal__actions"><button type="button" className="outline-btn" onClick={() => setCreating(false)}>Hủy</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Đang tạo..." : "Tạo tài khoản"}</button></div></form></div></div>}
    </section>
  );
}

export default function AgencyApp() {
  const [view, setView] = useState<View>("dashboard");
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [employees, setEmployees] = useState<Employee[]>(seedEmployees);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [performance, setPerformance] = useState<Performance[]>(seedPerformance);
  const [perfSummary, setPerfSummary] = useState<PerformanceSummary>(seedPerformanceSummary);
  const [period, setPeriod] = useState<Period>(seedPeriod);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [periodBusy, setPeriodBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [socialData, setSocialData] = useState<SocialData | null>(null);
  const [channelBusy, setChannelBusy] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [month, setMonth] = useState("Tháng 8, 2026");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const isDirector = authUser?.role === "director";

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setAuthUser(data.user ?? null);
        setNeedsBootstrap(Boolean(data.needsBootstrap));
      }
    } catch { /* show login screen */ }
    finally { setAuthChecked(true); }
  };

  const logout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    setAuthUser(null);
    setView("dashboard");
  };

  const loadTasks = async () => {
    try { const response = await fetch("/api/tasks"); if (!response.ok) return; const data = await response.json(); setTasks(data.tasks?.length ? data.tasks : seedTasks); } catch { /* keep current data */ }
  };
  const loadSync = async () => {
    try { const response = await fetch("/api/integrations/sheets"); if (!response.ok) return; setSyncData(await response.json()); } catch { /* setup remains available */ }
  };
  const loadSocial = async () => {
    try { const response = await fetch("/api/integrations/social"); if (!response.ok) return; setSocialData(await response.json()); } catch { /* content view falls back to mock */ }
  };
  const loadEmployees = async () => {
    try { const response = await fetch("/api/employees"); if (!response.ok) return; const data = await response.json(); setEmployees(data.employees?.length ? data.employees : seedEmployees); } catch { /* keep current data */ }
  };
  const loadProjects = async () => {
    try { const response = await fetch("/api/projects"); if (!response.ok) return; const data = await response.json(); setProjects(data.projects?.length ? data.projects : seedProjects); } catch { /* keep current data */ }
  };
  const loadPerformance = async () => {
    try { const response = await fetch("/api/performance"); if (!response.ok) return; const data = await response.json(); if (data.people?.length) { setPerformance(data.people); setPerfSummary(data.summary); } } catch { /* keep current data */ }
  };
  const applyPeriod = (data: { period?: Period; rewards?: Reward[] }) => {
    if (data.period) setPeriod(data.period);
    if (Array.isArray(data.rewards)) setRewards(data.rewards);
  };
  const loadPeriod = async () => {
    try { const response = await fetch("/api/periods"); if (!response.ok) return; applyPeriod(await response.json()); } catch { /* keep current data */ }
  };
  const patchPeriod = async (body: { bonusPool?: number; action?: "lock" | "unlock" }, successMessage: string) => {
    setPeriodBusy(true);
    try {
      const response = await fetch("/api/periods", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật kỳ thưởng.");
      applyPeriod(data);
      setToast(successMessage);
    } catch (error) { setToast(error instanceof Error ? error.message : "Không thể cập nhật kỳ thưởng."); }
    finally { setPeriodBusy(false); }
  };
  const setBonusPool = (pool: number) => patchPeriod({ bonusPool: pool }, `Đã đặt quỹ thưởng ${pool.toLocaleString("vi-VN")}đ.`);
  const lockPeriod = () => patchPeriod({ action: "lock" }, "Đã khóa kỳ thưởng và chốt số tiền cho từng người.");
  const unlockPeriod = () => patchPeriod({ action: "unlock" }, "Đã mở lại kỳ thưởng để chỉnh sửa.");

  useEffect(() => {
    const timer = window.setTimeout(() => { void checkAuth(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const timer = window.setTimeout(() => { void loadTasks(); void loadSync(); void loadSocial(); void loadEmployees(); void loadProjects(); void loadPerformance(); void loadPeriod(); }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const viewTitle = useMemo(() => ({ dashboard: "Tổng quan điều hành", projects: "Dự án & tiến độ", tasks: "Công việc của agency", people: "Nhân sự & phân công", performance: "Hiệu suất & KPI", content: "Content Intelligence", sync: "Đồng bộ Sheet & kênh", settings: "Thiết lập hệ thống" }[view]), [view]);

  const addTask = async (newTask: Omit<Task,"id">) => {
    let created = { ...newTask, id: Date.now() };
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newTask) });
      if (response.ok) { const data = await response.json(); created = data.task; }
    } catch { /* UI remains useful if data service is temporarily unavailable. */ }
    setTasks((current) => [created, ...current]);
    setToast("Đã tạo task và gửi trưởng bộ phận duyệt.");
  };

  const createProject = async (payload: { name: string; client: string; deadline: string; owner: string; channels: string }) => {
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: payload.name, client: payload.client, deadline: payload.deadline, ownerName: payload.owner, channels: payload.channels }) });
      const data = await response.json();
      if (!response.ok) { setToast(data.error || "Không thể tạo dự án."); return false; }
      await loadProjects();
      setToast(`Đã tạo dự án ${payload.name}.`);
      return true;
    } catch { setToast("Không thể tạo dự án. Vui lòng thử lại."); return false; }
  };

  const moveTask = async (id: number, status: string, postUrl?: string, assignee?: string, qualityScore?: number, deliverable?: { url: string; type: string; note: string }) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status, ...(assignee !== undefined ? { assignee } : {}) } : task));
    try {
      const response = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, ...(postUrl !== undefined ? { postUrl } : {}), ...(assignee !== undefined ? { assignee } : {}), ...(qualityScore !== undefined ? { qualityScore } : {}), ...(deliverable !== undefined ? { deliverableUrl: deliverable.url, deliverableType: deliverable.type, deliverableNote: deliverable.note } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật task.");
      if (data.task) setTasks((current) => current.map((task) => task.id === id ? data.task : task));
      setToast(data.sheetWriteback === "synced" ? "Đã cập nhật đồng thời trên app và Google Sheet." : deliverable?.url ? "Đã lưu link bàn giao sản phẩm và gửi duyệt." : postUrl ? "Đã lưu link đăng bài và đánh dấu đã tìm thấy trên kênh." : status === "done" ? "Đã hoàn thành trên app; chờ cầu nối để ghi về Sheet." : "Đã cập nhật trạng thái công việc.");
      void loadSync(); void loadProjects(); void loadPerformance(); void loadPeriod();
    } catch (error) { setToast(error instanceof Error ? error.message : "Không thể cập nhật task."); }
  };

  const replicate = (title: string) => {
    void addTask({ title: `Nhân bản: ${title}`, project: contentItems.find((item) => item.title === title)?.project || "Dược sĩ Giang", department: "Content", assignee: "Minh Anh", dueDate: "2026-08-07", priority: "high", weight: 5, status: "pending" });
  };

  const runSync = async (action: "import_snapshot" | "sync_now" = "sync_now") => {
    setSyncing(true);
    try {
      const response = await fetch("/api/integrations/sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đồng bộ thất bại.");
      await Promise.all([loadTasks(), loadSync()]);
      setToast(data.mode === "live" ? `Đã đồng bộ realtime ${data.imported} task.` : `Đã nhập và đối soát ${data.imported} task từ plan.`);
    } catch (error) { setToast(error instanceof Error ? error.message : "Đồng bộ thất bại."); }
    finally { setSyncing(false); }
  };

  const saveBridge = async (payload: ConnectPayload) => {
    setSyncing(true);
    try {
      const body = payload.mode === "link"
        ? { action: "connect_link", linkUrl: payload.linkUrl, name: payload.name, mapping: payload.mapping }
        : { action: "connect_bridge", bridgeUrl: payload.bridgeUrl, bridgeToken: payload.bridgeToken, tab: payload.tab, name: payload.name, mapping: payload.mapping };
      const response = await fetch("/api/integrations/sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu cầu nối.");
      setBridgeOpen(false); await Promise.all([loadSync(), loadTasks()]); setToast(data.message || "Đã kết nối Google Sheet realtime.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Không thể lưu cầu nối."); }
    finally { setSyncing(false); }
  };

  const previewBridge = async (payload: ConnectPayload) => {
    const body = payload.mode === "link"
      ? { action: "preview", linkUrl: payload.linkUrl, mapping: payload.mapping }
      : { action: "preview", bridgeUrl: payload.bridgeUrl, bridgeToken: payload.bridgeToken, tab: payload.tab, mapping: payload.mapping };
    const response = await fetch("/api/integrations/sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không đọc thử được sheet.");
    return data as { meta?: { tabs?: string[]; spreadsheetName?: string }; headers: string[]; sample: { rowNumber: number; cells: string[] }[]; mappedSample: { sourceId: string; title: string; sheetStatus: string }[] };
  };

  const removeSheet = async (integrationId: number, name: string) => {
    if (!window.confirm(`Gỡ kết nối “${name}”? Task đã nạp vẫn giữ nguyên, chỉ ngừng đồng bộ.`)) return;
    setSyncing(true);
    try {
      const response = await fetch("/api/integrations/sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", integrationId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể gỡ kết nối.");
      await loadSync(); setToast(`Đã gỡ kết nối “${name}”.`);
    } catch (error) { setToast(error instanceof Error ? error.message : "Không thể gỡ kết nối."); }
    finally { setSyncing(false); }
  };

  const syncOneSheet = async (integrationId: number) => {
    setSyncing(true);
    try {
      const response = await fetch("/api/integrations/sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync_now", integrationId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đồng bộ thất bại.");
      await Promise.all([loadTasks(), loadSync()]);
      setToast(data.mode === "live" ? `Đã đồng bộ ${data.imported} task.` : `Đã nhập ${data.imported} task.`);
    } catch (error) { setToast(error instanceof Error ? error.message : "Đồng bộ thất bại."); }
    finally { setSyncing(false); }
  };

  const connectChannel = async (payload: ChannelPayload) => {
    setChannelBusy(true);
    try {
      const response = await fetch("/api/integrations/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", ...payload }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể kết nối kênh.");
      setChannelModalOpen(false); await loadSocial(); setToast(data.message || "Đã kết nối kênh và lấy dữ liệu thật.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Không thể kết nối kênh."); }
    finally { setChannelBusy(false); }
  };

  const syncChannels = async (integrationId?: number) => {
    setChannelBusy(true);
    try {
      const response = await fetch("/api/integrations/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync", ...(integrationId ? { integrationId } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đồng bộ kênh thất bại.");
      await loadSocial(); setToast(`Đã cập nhật ${data.imported} bài từ ${data.channels} kênh.`);
    } catch (error) { setToast(error instanceof Error ? error.message : "Đồng bộ kênh thất bại."); }
    finally { setChannelBusy(false); }
  };

  const removeChannel = async (integrationId: number, name: string) => {
    if (!window.confirm(`Gỡ kết nối kênh “${name}”? Số liệu đã lấy sẽ bị xóa và ngừng đồng bộ.`)) return;
    setChannelBusy(true);
    try {
      const response = await fetch("/api/integrations/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", integrationId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể gỡ kênh.");
      await loadSocial(); setToast(`Đã gỡ kết nối kênh “${name}”.`);
    } catch (error) { setToast(error instanceof Error ? error.message : "Không thể gỡ kênh."); }
    finally { setChannelBusy(false); }
  };

  const saveEmployee = async (payload: Omit<Employee, "id"> & { id?: number }) => {
    setEmployeeSaving(true);
    try {
      const response = await fetch("/api/employees", { method: payload.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu nhân sự.");
      await loadEmployees();
      setEmployeeModalOpen(false);
      setEditingEmployee(null);
      setToast(payload.id ? "Đã cập nhật hồ sơ nhân sự." : "Đã thêm nhân sự mới vào hệ thống.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Không thể lưu nhân sự."); }
    finally { setEmployeeSaving(false); }
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    const nextStatus = employee.status === "active" ? "inactive" : "active";
    setEmployeeSaving(true);
    try {
      const response = await fetch("/api/employees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: employee.id, status: nextStatus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể đổi trạng thái nhân sự.");
      setEmployees((current) => current.map((item) => item.id === employee.id ? data.employee : item));
      setToast(nextStatus === "active" ? "Đã kích hoạt nhân sự." : "Đã ngưng phân công task mới cho nhân sự này.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Không thể đổi trạng thái nhân sự."); }
    finally { setEmployeeSaving(false); }
  };

  const renderView = () => {
    if (view === "dashboard") return <DashboardView onGo={setView} projects={projects} performance={performance} summary={perfSummary}/>;
    if (view === "projects") return <ProjectsView projects={projects} employees={employees} onCreate={createProject} onShowTasks={(project) => { setProjectFilter(project); setView("tasks"); }} canManage={isDirector}/>;
    if (view === "tasks") return <TasksView tasks={tasks} onMove={moveTask} onOpen={() => setModalOpen(true)} onInspect={setSelectedTask} search={search} projectFilter={projectFilter}/>;
    if (view === "people") return <PeopleView employees={employees} tasks={tasks} onAdd={() => { setEditingEmployee(null); setEmployeeModalOpen(true); }} onEdit={(employee) => { setEditingEmployee(employee); setEmployeeModalOpen(true); }} onStatus={(employee) => void toggleEmployeeStatus(employee)} canManage={isDirector}/>;
    if (view === "performance") return <PerformanceView performance={performance} summary={perfSummary} period={period} rewards={rewards} busy={periodBusy} onSetPool={setBonusPool} onLock={lockPeriod} onUnlock={unlockPeriod} onAction={setToast} canManage={isDirector}/>;
    if (view === "content") return <ContentView tasks={tasks} onReplicate={replicate} canManage={isDirector} social={socialData} onConnectChannel={() => setChannelModalOpen(true)} onSyncChannels={() => void syncChannels()} onRemoveChannel={(id, name) => void removeChannel(id, name)} channelBusy={channelBusy}/>;
    if (view === "sync") return <SheetSyncView data={syncData} loading={syncing} onImport={() => void runSync("import_snapshot")} onSync={() => void runSync("sync_now")} onSyncOne={(id) => void syncOneSheet(id)} onRemove={(id, name) => void removeSheet(id, name)} onConnect={() => setBridgeOpen(true)} onInspect={setSelectedTask} canManage={isDirector}/>;
    return <SettingsView onGo={setView} onAction={setToast} currentUser={authUser} onLogout={() => void logout()}/>;
  };

  if (!authChecked) {
    return <div className="auth-screen"><div className="auth-splash"><div className="auth-brand"><span>Agency</span><b>OS</b></div><p>Đang kiểm tra phiên đăng nhập...</p></div></div>;
  }
  if (!authUser) {
    return <AuthScreen needsBootstrap={needsBootstrap} onAuthed={(user) => { setAuthUser(user); setNeedsBootstrap(false); }}/>;
  }

  return <div className="app-shell"><a href="#main-content" className="skip-link">Bỏ qua menu</a>{mobileMenu && <button className="nav-scrim" aria-label="Đóng menu" onClick={() => setMobileMenu(false)}/>}<aside className={`sidebar ${mobileMenu ? "sidebar--open" : ""}`}><button className="brand" onClick={() => { setView("dashboard"); setMobileMenu(false); }}><span>Agency</span><b>OS</b></button><nav aria-label="Điều hướng chính">{navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileMenu(false); if (item.id !== "tasks") setProjectFilter(""); }}><Icon name={item.icon}/><span>{item.label}</span>{item.id === "tasks" && <i className="nav-count">{tasks.filter((task) => task.status === "pending" || task.status === "review").length}</i>}</button>)}</nav><div className="sidebar__bottom"><button className={view === "settings" ? "active" : ""} onClick={() => { setView("settings"); setMobileMenu(false); }}><Icon name="settings"/><span>Cài đặt</span></button><div className="company"><Avatar name="Agency Marketing" size="sm"/><div><b>Đội ngũ Agency</b><span>{employees.filter((employee) => employee.status === "active").length} thành viên hoạt động</span></div></div></div></aside><main id="main-content" className="main"><header className="topbar"><div className="topbar__title"><button className="mobile-menu icon-btn" aria-label="Mở menu" onClick={() => setMobileMenu(true)}><Icon name="menu"/></button><div><h1>{viewTitle}</h1><p>{view === "content" ? "Phát hiện nội dung thắng và tạo vòng lặp nhân bản" : view === "sync" ? "Đối soát dữ liệu giữa plan, nhân sự và kênh" : view === "people" ? "Thiết lập đội ngũ và điều phối tải công việc" : "Dữ liệu được cập nhật tự động theo thời gian thực"}</p></div></div><div className="topbar__actions"><button className="date-btn" onClick={() => setMonth(month === "Tháng 8, 2026" ? "Tháng 7, 2026" : "Tháng 8, 2026")}><Icon name="calendar"/><span>{month}</span><b>⌄</b></button><label className="search-box"><Icon name="search"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm dự án, công việc..." aria-label="Tìm kiếm"/></label><button className="notification icon-btn" aria-label="Thông báo" onClick={() => { setView("tasks"); setProjectFilter(""); setToast("Đang hiển thị các task cần duyệt và chờ nghiệm thu."); }}><Icon name="bell"/><i>{tasks.filter((task) => task.status === "pending" || task.status === "review").length}</i></button><button className="user-menu" onClick={() => setView("settings")}><Avatar name={authUser.fullName}/><span><b>{authUser.fullName}</b><small>{roleLabel(authUser.role)}</small></span><b>⌄</b></button><button className="notification icon-btn" aria-label="Đăng xuất" title="Đăng xuất" onClick={() => void logout()}><Icon name="arrow"/></button></div></header><div className="page-content">{(search || projectFilter) && <div className="search-banner"><Icon name="search"/><span>Đang lọc: <b>{search || projectFilter}</b></span><button onClick={() => { setSearch(""); setProjectFilter(""); }}>Xóa</button></div>}{renderView()}</div></main><nav className="mobile-nav" aria-label="Điều hướng trên điện thoại">{navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><Icon name={item.icon}/><span>{item.label.replace("Content ","").replace("Đồng bộ ","")}</span></button>)}</nav>{!(view === "people" && !isDirector) && <button className="floating-add" onClick={() => view === "people" ? (setEditingEmployee(null), setEmployeeModalOpen(true)) : setModalOpen(true)} aria-label={view === "people" ? "Thêm nhân sự" : "Thêm công việc"}><Icon name="plus"/></button>}{modalOpen && <AddTaskModal employees={employees} projects={projects} onClose={() => setModalOpen(false)} onAdd={addTask}/>} {employeeModalOpen && <EmployeeModal employee={editingEmployee} employees={employees} loading={employeeSaving} onClose={() => { setEmployeeModalOpen(false); setEditingEmployee(null); }} onSave={(payload) => void saveEmployee(payload)}/>} {bridgeOpen && <BridgeModal loading={syncing} employees={employees} onClose={() => setBridgeOpen(false)} onSave={(payload) => void saveBridge(payload)} onPreview={previewBridge} onAction={setToast}/>} {channelModalOpen && <ChannelModal loading={channelBusy} onClose={() => setChannelModalOpen(false)} onSave={(payload) => void connectChannel(payload)}/>} {selectedTask && <TaskDetailModal task={selectedTask} employees={employees} onClose={() => setSelectedTask(null)} onSave={(id, status, postUrl, assignee, qualityScore, deliverable) => void moveTask(id, status, postUrl, assignee, qualityScore, deliverable)} onGoSync={() => { setSelectedTask(null); setView("sync"); }}/>} {toast && <div className="toast" role="status"><span><Icon name="check"/></span>{toast}</div>}</div>;
}
