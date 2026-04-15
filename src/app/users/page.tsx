"use client";

import { useEffect, useMemo, useState, useRef, FormEvent, ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { Pencil, Trash2, RotateCcw, XCircle, Lock, BarChart2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = ["#2563eb", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a16207"];

type User = {
  UserID: number;
  UserName: string;
  Name: string;
  Surname: string;
  Email: string;
  Address: string;
  Active: boolean;
  UserAccess: number;
  department: number;
};

type FormState = {
  UserName: string;
  Name: string;
  Surname: string;
  Email: string;
  Address: string;
  Active: boolean;
  Password: string;
  ConfirmPassword: string;
  UserAccess: number;
  department: number;
};

const emptyForm: FormState = {
  UserName: "",
  Name: "",
  Surname: "",
  Email: "",
  Address: "",
  Active: true,
  Password: "",
  ConfirmPassword: "",
  UserAccess: 2,
  department: 0,
};

type Session = {
  UserID: number;
  UserName: string;
  Name: string;
  Surname: string;
  UserAccess: number;
};

const ACCESS_LABELS: Record<number, string> = { 1: "Low", 2: "Normal", 3: "High" };

export default function UsersPage() {
  const [session, setSession] = useState<Session | null>(null);
  const access = session?.UserAccess ?? 1;

  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const [filterUserName, setFilterUserName] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterSurname, setFilterSurname] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterAddress, setFilterAddress] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [filterAccess, setFilterAccess] = useState<"all" | "1" | "2" | "3">("all");
  const [filterDepartment, setFilterDepartment] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const filtersActive = filterUserName || filterName || filterSurname || filterEmail || filterAddress || filterDepartment || filterActive !== "all" || filterAccess !== "all";

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterUserName && !u.UserName.toLowerCase().startsWith(filterUserName.toLowerCase())) return false;
      if (filterName && !u.Name.toLowerCase().startsWith(filterName.toLowerCase())) return false;
      if (filterSurname && !u.Surname.toLowerCase().startsWith(filterSurname.toLowerCase())) return false;
      if (filterEmail && !u.Email.toLowerCase().startsWith(filterEmail.toLowerCase())) return false;
      if (filterAddress && !u.Address.toLowerCase().startsWith(filterAddress.toLowerCase())) return false;
      if (filterDepartment && !String(u.department).startsWith(filterDepartment)) return false;
      if (filterActive === "active" && !u.Active) return false;
      if (filterActive === "inactive" && u.Active) return false;
      if (filterAccess !== "all" && u.UserAccess !== Number(filterAccess)) return false;
      return true;
    });
  }, [users, filterUserName, filterName, filterSurname, filterEmail, filterAddress, filterActive, filterAccess, filterDepartment]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterUserName, filterName, filterSurname, filterEmail, filterAddress, filterActive, filterAccess, filterDepartment]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

  function clearFilters() {
    setFilterUserName("");
    setFilterName("");
    setFilterSurname("");
    setFilterEmail("");
    setFilterAddress("");
    setFilterActive("all");
    setFilterAccess("all");
    setFilterDepartment("");
  }

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  type PerfRecord = {
    id: string;
    userId: number;
    department: number;
    date: string;
    production: number;
    user?: { UserName: string; UserAccess?: number };
  };
  const [perfModalUser, setPerfModalUser] = useState<User | null>(null);
  const [perfRecords, setPerfRecords] = useState<PerfRecord[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfView, setPerfView] = useState<"table" | "chart">("table");
  const [perfMode, setPerfMode] = useState<"user" | "department">("user");
  const [visibleUsers, setVisibleUsers] = useState<Set<string>>(new Set());

  async function openPerformanceModal(user: User) {
    setPerfModalUser(user);
    setPerfLoading(true);
    setPerfRecords([]);
    setPerfView("table");

    // Re-fetch session to ensure we have the fresh logged-in user's access level
    let loggedInAccess = session?.UserAccess ?? 1;
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (sessionData?.UserAccess) {
        loggedInAccess = sessionData.UserAccess;
      }
    } catch {
      // keep the existing access value
    }

    const mode: "user" | "department" =
      loggedInAccess === 3 && user.UserAccess === 3 ? "department" : "user";
    const url = mode === "department"
      ? `/api/performance/department/${user.department}`
      : `/api/performance/user/${user.UserID}`;

    console.log("[Performance] Logged in user access level:", loggedInAccess);
    console.log("[Performance] Clicked user access level:", user.UserAccess);
    console.log("[Performance] Mode:", mode);
    console.log("[Performance] Calling API:", url);

    setPerfMode(mode);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data: PerfRecord[] = await res.json();
        setPerfRecords(data);
        if (mode === "department") {
          const highUsers = new Set<string>();
          for (const r of data) {
            if (r.user?.UserAccess === 3 && r.user.UserName) {
              highUsers.add(r.user.UserName);
            }
          }
          setVisibleUsers(highUsers);
        } else {
          setVisibleUsers(new Set());
        }
      }
    } finally {
      setPerfLoading(false);
    }
  }

  function closePerformanceModal() {
    setPerfModalUser(null);
    setPerfRecords([]);
  }
  const [confirmPermDeleteId, setConfirmPermDeleteId] = useState<number | null>(null);
  const [confirmingBulkPermDelete, setConfirmingBulkPermDelete] = useState(false);
  const [bulkPermDeleting, setBulkPermDeleting] = useState(false);

  const allPageSelected =
    pagedUsers.length > 0 &&
    pagedUsers.every((u) => selectedIds.has(u.UserID));

  function toggleSelectAll() {
    if (allPageSelected) {
      const newSet = new Set(selectedIds);
      pagedUsers.forEach((u) => newSet.delete(u.UserID));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      pagedUsers.forEach((u) => newSet.add(u.UserID));
      setSelectedIds(newSet);
    }
  }

  function toggleSelect(id: number) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) => fetch(`/api/users/${id}`, { method: "DELETE" }))
      );
      const count = ids.length;
      setSelectedIds(new Set());
      setConfirmingBulkDelete(false);
      await loadUsers();
      setSuccessMessage(`Successfully deleted ${count} user${count === 1 ? "" : "s"}.`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handlePermanentDelete(id: number) {
    await fetch(`/api/users/${id}?permanent=true`, { method: "DELETE" });
    setConfirmPermDeleteId(null);
    await loadUsers();
    setWarningMessage("User permanently deleted and cannot be recovered");
    setTimeout(() => setWarningMessage(""), 4000);
  }

  async function handleBulkPermanentDelete() {
    setBulkPermDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) => fetch(`/api/users/${id}?permanent=true`, { method: "DELETE" }))
      );
      const count = ids.length;
      setSelectedIds(new Set());
      setConfirmingBulkPermDelete(false);
      await loadUsers();
      setWarningMessage(`${count} user${count === 1 ? "" : "s"} permanently deleted and cannot be recovered`);
      setTimeout(() => setWarningMessage(""), 4000);
    } finally {
      setBulkPermDeleting(false);
    }
  }

  type RowResult = {
    row: number;
    UserName: string;
    Name: string;
    Surname: string;
    Email: string;
    Address: string;
    Active: boolean;
    UserAccess: number;
    department: number;
    status: string;
  };

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<FormState[]>([]);
  const [importing, setImporting] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [uploadResults, setUploadResults] = useState<RowResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadUsers(deleted = showDeleted) {
    const res = await fetch(`/api/users?deleted=${deleted}`);
    setUsers(await res.json());
  }

  useEffect(() => {
    loadUsers(showDeleted);
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setSession(data));
  }, [showDeleted]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    const needsPassword = editingId === null || form.Password !== "";
    if (needsPassword) {
      if (editingId === null && !form.Password) {
        setFormError("Password is required");
        setLoading(false);
        return;
      }
      if (form.Password.length > 0 && form.Password.length < 8) {
        setFormError("Password must be at least 8 characters");
        setLoading(false);
        return;
      }
      if (form.Password !== form.ConfirmPassword) {
        setFormError("Passwords do not match");
        setLoading(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        UserName: form.UserName,
        Name: form.Name,
        Surname: form.Surname,
        Email: form.Email,
        Address: form.Address,
        Active: form.Active,
        UserAccess: form.UserAccess,
        department: form.department,
      };
      if (form.Password) {
        payload.Password = form.Password;
      }

      let res: Response;
      if (editingId === null) {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Something went wrong");
        return;
      }
      setForm(emptyForm);
      setEditingId(null);
      setFormError("");
      setModalOpen(false);
      await loadUsers();
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(user: User) {
    setEditingId(user.UserID);
    setForm({
      UserName: user.UserName,
      Name: user.Name,
      Surname: user.Surname,
      Email: user.Email,
      Address: user.Address,
      Active: user.Active,
      Password: "",
      ConfirmPassword: "",
      UserAccess: user.UserAccess,
      department: user.department,
    });
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    await loadUsers();
  }

  async function handleRestore(id: number) {
    await fetch(`/api/users/${id}`, { method: "PATCH" });
    await loadUsers();
    setSuccessMessage("User restored successfully");
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  function toggleShowDeleted() {
    setShowDeleted((prev) => !prev);
    setSelectedIds(new Set());
    setConfirmingBulkDelete(false);
    setConfirmingBulkPermDelete(false);
    setConfirmPermDeleteId(null);
    setCurrentPage(1);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const parsed: FormState[] = rows.map((row) => {
        const rawAccess = Number(row["UserAccess"]);
        const rawDept = Number(row["department"] ?? row["Department"]);
        return {
          UserName: String(row["UserName"] ?? ""),
          Name: String(row["Name"] ?? ""),
          Surname: String(row["Surname"] ?? ""),
          Email: String(row["Email"] ?? ""),
          Address: String(row["Address"] ?? ""),
          Active: row["Active"] === true || row["Active"] === "TRUE" || row["Active"] === "true" || row["Active"] === 1,
          Password: String(row["Password"] ?? ""),
          ConfirmPassword: String(row["Password"] ?? ""),
          UserAccess: [1, 2, 3].includes(rawAccess) ? rawAccess : 2,
          department: Number.isFinite(rawDept) ? rawDept : 0,
        };
      });

      setPreviewData(parsed);
      setUploadModalOpen(true);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: previewData }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Import failed: ${err.error}`);
        return;
      }
      const data = await res.json();
      setUploadResults(data.results);
      setUploadModalOpen(false);
      setPreviewData([]);
      setSummaryModalOpen(true);
      await loadUsers();
    } finally {
      setImporting(false);
    }
  }

  function closeUploadModal() {
    setUploadModalOpen(false);
    setPreviewData([]);
  }

  function closeSummaryModal() {
    setSummaryModalOpen(false);
    setUploadResults([]);
  }

  function downloadLog() {
    const logRows = uploadResults.map((r) => ({
      Row: r.row,
      UserName: r.UserName,
      Name: r.Name,
      Surname: r.Surname,
      Email: r.Email,
      Address: r.Address,
      Active: r.Active,
      UserAccess: r.UserAccess,
      Department: r.department,
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(logRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Upload Log");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `upload-log-${date}.xlsx`);
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <div className="flex items-center gap-3">
            {access >= 3 && !showDeleted && selectedIds.size > 0 && !confirmingBulkDelete && (
              <button
                onClick={() => setConfirmingBulkDelete(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Delete Selected ({selectedIds.size})
              </button>
            )}
            {access >= 3 && showDeleted && selectedIds.size > 0 && !confirmingBulkPermDelete && (
              <button
                onClick={() => setConfirmingBulkPermDelete(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md text-sm"
              >
                Permanently Delete Selected ({selectedIds.size})
              </button>
            )}
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="border border-red-300 hover:bg-red-50 text-red-600 font-medium px-4 py-2 rounded-md text-sm"
              >
                Clear Filters
              </button>
            )}
            {access >= 2 && (
              <button
                onClick={toggleShowDeleted}
                className={showDeleted
                  ? "border border-red-300 bg-red-50 text-red-600 font-medium px-4 py-2 rounded-md text-sm"
                  : "border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-md text-sm"
                }
              >
                {showDeleted ? "Hide Deleted" : "Show Deleted"}
              </button>
            )}
            {access >= 3 && (
              <a
                href="/performance"
                className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-md text-sm"
              >
                <BarChart2 size={16} />
                Performance
              </a>
            )}
            {access >= 3 && !showDeleted && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md"
                >
                  Upload Excel
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={openAddModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
                >
                  + Add User
                </button>
              </>
            )}
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        </div>
        {session && (
          <div className="flex justify-end mt-2">
            <span className="text-xs text-gray-400">
              Welcome, <span className="font-medium text-gray-500">{session.UserName}</span>{" "}
              ({ACCESS_LABELS[session.UserAccess] ?? "Unknown"} Access)
            </span>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              {editingId === null ? "Add New User" : `Edit User #${editingId}`}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="UserName"
                  value={form.UserName}
                  onChange={(v) => setForm({ ...form, UserName: v })}
                  required
                />
                <Field
                  label="Email"
                  type="email"
                  value={form.Email}
                  onChange={(v) => setForm({ ...form, Email: v })}
                  required
                />
                <Field
                  label="Name"
                  value={form.Name}
                  onChange={(v) => setForm({ ...form, Name: v })}
                  required
                />
                <Field
                  label="Surname"
                  value={form.Surname}
                  onChange={(v) => setForm({ ...form, Surname: v })}
                  required
                />
                <Field
                  label="Address"
                  value={form.Address}
                  onChange={(v) => setForm({ ...form, Address: v })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="number"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <Field
                    label={editingId === null ? "Password" : "Password (leave blank)"}
                    type="password"
                    value={form.Password}
                    onChange={(v) => setForm({ ...form, Password: v })}
                    required={editingId === null}
                  />
                  <Field
                    label="Confirm Password"
                    type="password"
                    value={form.ConfirmPassword}
                    onChange={(v) => setForm({ ...form, ConfirmPassword: v })}
                    required={editingId === null || form.Password.length > 0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Access
                  </label>
                  <select
                    value={form.UserAccess}
                    onChange={(e) => setForm({ ...form, UserAccess: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 - Low</option>
                    <option value={2}>2 - Normal</option>
                    <option value={3}>3 - High</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    checked={form.Active}
                    onChange={(e) =>
                      setForm({ ...form, Active: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
              {formError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-4 py-2 rounded-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {perfModalUser && (() => {
        const isDept = perfMode === "department";

        // Map username -> UserAccess for this department
        const userAccessMap = new Map<string, number>();
        for (const r of perfRecords) {
          const n = r.user?.UserName ?? "";
          if (n && r.user?.UserAccess != null) {
            userAccessMap.set(n, r.user.UserAccess);
          }
        }

        // In dept mode, only visible users count toward stats
        const visibleRecords = isDept
          ? perfRecords.filter((r) => visibleUsers.has(r.user?.UserName ?? ""))
          : perfRecords;

        const total = visibleRecords.reduce((s, r) => s + r.production, 0);

        // Per-user totals (over visible records)
        const userTotals = new Map<string, number>();
        for (const r of visibleRecords) {
          const n = r.user?.UserName ?? "";
          userTotals.set(n, (userTotals.get(n) ?? 0) + r.production);
        }
        const allDeptUsers = Array.from(
          new Set(perfRecords.map((r) => r.user?.UserName ?? "").filter(Boolean))
        ).sort();
        const visibleUserCount = visibleUsers.size || 1;

        const uniqueDates = new Set(visibleRecords.map((r) => r.date.slice(0, 10))).size || 1;
        const avg = isDept
          ? total / (visibleUserCount * uniqueDates)
          : visibleRecords.length > 0 ? total / visibleRecords.length : 0;

        let bestPerformer = "";
        let bestTotal = -1;
        userTotals.forEach((t, n) => {
          if (t > bestTotal) {
            bestTotal = t;
            bestPerformer = n;
          }
        });

        // Assign stable colors per user based on index in full dept list
        const colorFor = (name: string) => {
          const idx = allDeptUsers.indexOf(name);
          return CHART_COLORS[idx >= 0 ? idx % CHART_COLORS.length : 0];
        };

        // Chart data for dept mode: pivot into one row per date with a column per visible user
        const chartData = isDept
          ? (() => {
              const byDate = new Map<string, Record<string, string | number>>();
              for (const r of visibleRecords) {
                const fullDate = r.date.slice(0, 10);
                const d = new Date(r.date);
                const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
                if (!byDate.has(fullDate)) {
                  byDate.set(fullDate, { label, fullDate });
                }
                byDate.get(fullDate)![r.user?.UserName ?? ""] = r.production;
              }
              return Array.from(byDate.values()).sort((a, b) =>
                String(a.fullDate).localeCompare(String(b.fullDate))
              );
            })()
          : perfRecords.map((r) => {
              const d = new Date(r.date);
              return {
                label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
                fullDate: r.date.slice(0, 10),
                production: r.production,
              };
            });

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
              if (e.target === e.currentTarget) closePerformanceModal();
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-6 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isDept
                    ? `Department ${perfModalUser.department} Performance`
                    : `Performance - ${perfModalUser.UserName}`}
                </h2>
                <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPerfView("table")}
                    className={`px-3 py-1 text-sm font-medium ${
                      perfView === "table"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Table View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfView("chart")}
                    className={`px-3 py-1 text-sm font-medium border-l border-gray-300 ${
                      perfView === "chart"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Chart View
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
              {perfLoading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : perfRecords.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No performance records found</div>
              ) : (
                <>
                  {perfView === "table" ? (
                    <div className="overflow-auto flex-1 border border-gray-200 rounded-md">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <tr>
                            {isDept && <Th>UserName</Th>}
                            <Th>Date</Th>
                            <Th>Department</Th>
                            <Th>Production</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRecords.map((r) => (
                            <tr key={r.id} className="border-b border-gray-100 last:border-0">
                              {isDept && <Td>{r.user?.UserName ?? ""}</Td>}
                              <Td>{r.date.slice(0, 10)}</Td>
                              <Td>{r.department}</Td>
                              <Td>{r.production}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <h3 className="text-sm font-semibold text-gray-700 text-center mb-2">
                        {isDept
                          ? `Department ${perfModalUser.department} - Daily Production`
                          : `${perfModalUser.UserName} - Daily Production`}
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} label={{ value: "Production", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#6b7280" } }} />
                          <RTooltip
                            labelFormatter={(_, payload) => {
                              const d = payload?.[0]?.payload as { fullDate?: string } | undefined;
                              return d?.fullDate ?? "";
                            }}
                            formatter={(value, name) => [`${value} units`, String(name)] as [string, string]}
                          />
                          {isDept ? (
                            <>
                              {allDeptUsers
                                .filter((name) => visibleUsers.has(name))
                                .map((name) => (
                                  <Line
                                    key={name}
                                    type="monotone"
                                    dataKey={name}
                                    stroke={colorFor(name)}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    connectNulls
                                  />
                                ))}
                            </>
                          ) : (
                            <>
                              <ReferenceLine
                                y={avg}
                                stroke="#ef4444"
                                strokeDasharray="5 5"
                                label={{ value: `Average (${avg.toFixed(1)})`, position: "right", fill: "#ef4444", fontSize: 11 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="production"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#2563eb" }}
                                activeDot={{ r: 6 }}
                              />
                            </>
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {isDept ? (
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm flex-shrink-0">
                      <span className="font-medium text-gray-700">Total Production: {total}</span>
                      <span className="font-medium text-gray-700">Avg / User / Day: {avg.toFixed(1)}</span>
                      <span className="font-medium text-gray-700">
                        Best Performer: <span className="text-blue-700">{bestPerformer}</span> ({bestTotal})
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 flex justify-between text-sm flex-shrink-0">
                      <span className="font-medium text-gray-700">Total Production: {total}</span>
                      <span className="font-medium text-gray-700">Daily Average: {avg.toFixed(1)}</span>
                    </div>
                  )}
                  {isDept && perfView === "chart" && (
                    <div className="mt-4 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">Legend (click to toggle)</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setVisibleUsers(new Set(allDeptUsers))}
                            className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 px-2 py-1 rounded"
                          >
                            Show All
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisibleUsers(new Set())}
                            className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 px-2 py-1 rounded"
                          >
                            Hide All
                          </button>
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-20 border border-gray-200 rounded p-2 flex flex-wrap gap-x-4 gap-y-1">
                        {allDeptUsers.map((name) => {
                          const isVisible = visibleUsers.has(name);
                          const isHigh = userAccessMap.get(name) === 3;
                          const color = colorFor(name);
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                const next = new Set(visibleUsers);
                                if (next.has(name)) next.delete(name);
                                else next.add(name);
                                setVisibleUsers(next);
                              }}
                              className={`inline-flex items-center gap-1.5 text-xs ${
                                isHigh ? "font-bold" : "font-normal"
                              } ${
                                isVisible ? "text-gray-800" : "text-gray-400 line-through"
                              }`}
                            >
                              <span
                                className="inline-block w-3 h-3 rounded-full"
                                style={{ backgroundColor: isVisible ? color : "#d1d5db" }}
                              />
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
              <div className="flex justify-end gap-3 mt-4 flex-shrink-0 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={closePerformanceModal}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeUploadModal();
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Import Preview ({previewData.length} users)
              </h2>
            </div>
            <div className="overflow-auto flex-1 border border-gray-200 rounded-md">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <Th>#</Th>
                    <Th>UserName</Th>
                    <Th>Name</Th>
                    <Th>Surname</Th>
                    <Th>Email</Th>
                    <Th>Address</Th>
                    <Th>Department</Th>
                    <Th>Active</Th>
                    <Th>Access</Th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <Td>{i + 1}</Td>
                      <Td>{row.UserName}</Td>
                      <Td>{row.Name}</Td>
                      <Td>{row.Surname}</Td>
                      <Td>{row.Email}</Td>
                      <Td>{row.Address}</Td>
                      <Td>{row.department}</Td>
                      <Td>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            row.Active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.Active ? "Yes" : "No"}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            row.UserAccess === 1
                              ? "bg-gray-100 text-gray-600"
                              : row.UserAccess === 3
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {row.UserAccess === 1 ? "Low" : row.UserAccess === 3 ? "High" : "Normal"}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={closeUploadModal}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || previewData.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-4 py-2 rounded-md"
              >
                {importing ? "Importing..." : `Import ${previewData.length} Users`}
              </button>
            </div>
          </div>
        </div>
      )}

      {summaryModalOpen && uploadResults.length > 0 && (() => {
        const successCount = uploadResults.filter((r) => r.status === "Success").length;
        const failedRows = uploadResults.filter((r) => r.status !== "Success");
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeSummaryModal();
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 p-6 max-h-[80vh] flex flex-col">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Upload Summary</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-md text-center">
                  <div className="text-2xl font-bold text-gray-900">{uploadResults.length}</div>
                  <div className="text-sm text-gray-500">Total Rows</div>
                </div>
                <div className="p-3 bg-green-50 rounded-md text-center">
                  <div className="text-2xl font-bold text-green-700">{successCount}</div>
                  <div className="text-sm text-green-600">Imported</div>
                </div>
                <div className="p-3 bg-red-50 rounded-md text-center">
                  <div className="text-2xl font-bold text-red-700">{failedRows.length}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>
              {failedRows.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Failed Rows</h3>
                  <div className="overflow-auto flex-1 border border-red-200 rounded-md mb-4">
                    <table className="w-full">
                      <thead className="bg-red-50 border-b border-red-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-red-700">Row</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-red-700">UserName</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-red-700">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedRows.map((r) => (
                          <tr key={r.row} className="border-b border-red-100 last:border-0">
                            <td className="px-4 py-2 text-sm text-gray-800">{r.row}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{r.UserName || "—"}</td>
                            <td className="px-4 py-2 text-sm text-red-600">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={downloadLog}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-md text-sm"
                >
                  Download Log
                </button>
                <button
                  type="button"
                  onClick={closeSummaryModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm font-medium">
          {successMessage}
        </div>
      )}

      {confirmingBulkDelete && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <span className="text-red-800 font-medium text-sm">
            Are you sure you want to delete {selectedIds.size} user{selectedIds.size === 1 ? "" : "s"}?
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmingBulkDelete(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium px-4 py-2 rounded-md text-sm"
            >
              {bulkDeleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      )}

      {warningMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm font-medium">
          {warningMessage}
        </div>
      )}

      {confirmingBulkPermDelete && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <span className="text-red-800 font-medium text-sm">
            Warning: This will permanently delete {selectedIds.size} user{selectedIds.size === 1 ? "" : "s"} and cannot be undone. Are you sure?
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmingBulkPermDelete(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkPermanentDelete}
              disabled={bulkPermDeleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium px-4 py-2 rounded-md text-sm"
            >
              {bulkPermDeleting ? "Deleting..." : "Yes, Permanently Delete"}
            </button>
          </div>
        </div>
      )}

      {showDeleted && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm font-medium">
          Viewing Deleted Users
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {access >= 3 && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
              )}
              <Th>UserName</Th>
              <Th>Name</Th>
              <Th>Surname</Th>
              <Th>Email</Th>
              <Th>Address</Th>
              <Th>Dep.</Th>
              <Th>Active</Th>
              <Th>Access</Th>
              <Th>Actions</Th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200">
              {access >= 3 && <th className="px-4 py-2"></th>}
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterUserName}
                  onChange={(e) => setFilterUserName(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterSurname}
                  onChange={(e) => setFilterSurname(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterAddress}
                  onChange={(e) => setFilterAddress(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2">
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </th>
              <th className="px-4 py-2">
                <select
                  value={filterAccess}
                  onChange={(e) => setFilterAccess(e.target.value as "all" | "1" | "2" | "3")}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="1">Low</option>
                  <option value="2">Normal</option>
                  <option value="3">High</option>
                </select>
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={access >= 3 ? 10 : 9}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {users.length === 0
                    ? showDeleted ? "No deleted users." : "No users yet."
                    : "No users match the current filters."}
                </td>
              </tr>
            ) : (
              pagedUsers.map((u) => (
                <tr
                  key={u.UserID}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  {access >= 3 && (
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.UserID)}
                        onChange={() => toggleSelect(u.UserID)}
                        className="w-4 h-4"
                      />
                    </td>
                  )}
                  <Td>{u.UserName}</Td>
                  <Td>{u.Name}</Td>
                  <Td>{u.Surname}</Td>
                  <Td>{u.Email}</Td>
                  <Td>{u.Address}</Td>
                  <Td>{u.department}</Td>
                  <Td>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        u.Active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.Active ? "Yes" : "No"}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        u.UserAccess === 1
                          ? "bg-gray-100 text-gray-600"
                          : u.UserAccess === 3
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {u.UserAccess === 1 ? "Low" : u.UserAccess === 3 ? "High" : "Normal"}
                    </span>
                  </Td>
                  <Td>
                    {showDeleted ? (
                      confirmPermDeleteId === u.UserID ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-red-700">
                            Permanently delete? Cannot be undone.
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePermanentDelete(u.UserID)}
                              className="text-red-600 hover:text-red-800 font-medium text-xs"
                            >
                              Yes, Permanently Delete
                            </button>
                            <button
                              onClick={() => setConfirmPermDeleteId(null)}
                              className="text-gray-500 hover:text-gray-700 font-medium text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {access >= 2 && (
                            <button
                              onClick={() => handleRestore(u.UserID)}
                              title="Restore"
                              className="text-green-600 hover:text-green-800"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}
                          {access >= 3 && (
                            <button
                              onClick={() => setConfirmPermDeleteId(u.UserID)}
                              title="Permanent Delete"
                              className="text-red-600 hover:text-red-800"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        {access < 3 && u.UserAccess === 3 ? (
                          <span
                            title="Insufficient permissions to view high access user performance"
                            className="text-gray-400 cursor-not-allowed"
                          >
                            <Lock size={18} />
                          </span>
                        ) : (
                          <button
                            onClick={() => openPerformanceModal(u)}
                            title="View Performance"
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <BarChart2 size={18} />
                          </button>
                        )}
                        {access >= 2 && !(access === 2 && u.UserAccess === 3) && (
                          <button
                            onClick={() => handleEdit(u)}
                            title="Edit"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {access >= 3 && (
                          <button
                            onClick={() => handleDelete(u.UserID)}
                            title="Delete"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredUsers.length === 0
            ? "No users to show"
            : `Showing ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filteredUsers.length)} of ${filteredUsers.length}${filtersActive ? " filtered" : ""} users`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3 py-1 text-sm font-medium rounded-md border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <PageButtons
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-1 text-sm font-medium rounded-md border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-gray-800">{children}</td>;
}

function PageButtons({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages: (number | "...")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 text-sm font-medium rounded-md border ${
              p === currentPage
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        )
      )}
    </>
  );
}
