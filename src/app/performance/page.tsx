"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Pencil, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";

type Session = {
  UserID: number;
  UserName: string;
  Name: string;
  Surname: string;
  UserAccess: number;
};

type UserOption = {
  UserID: number;
  UserName: string;
};

type Performance = {
  id: string;
  userId: number;
  department: number;
  date: string;
  production: number;
  user: UserOption;
};

type FormState = {
  userId: number | "";
  department: number | "";
  date: string;
  production: number | "";
};

const emptyForm: FormState = {
  userId: "",
  department: "",
  date: "",
  production: "",
};

const ACCESS_LABELS: Record<number, string> = { 1: "Low", 2: "Normal", 3: "High" };

export default function PerformancePage() {
  const [session, setSession] = useState<Session | null>(null);
  const access = session?.UserAccess ?? 1;

  const [records, setRecords] = useState<Performance[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [filterUser, setFilterUser] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterProd, setFilterProd] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const filtersActive = filterUser || filterDept || filterDate || filterProd;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterUser && !r.user.UserName.toLowerCase().startsWith(filterUser.toLowerCase())) return false;
      if (filterDept && !String(r.department).startsWith(filterDept)) return false;
      if (filterDate) {
        const match = filterDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
          const [, dd, mm, yyyy] = match;
          const filterIso = `${yyyy}-${mm}-${dd}`;
          const recordDate = new Date(r.date);
          const dateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, "0")}-${String(recordDate.getDate()).padStart(2, "0")}`;
          if (dateStr !== filterIso) return false;
        }
      }
      if (filterProd && !String(r.production).startsWith(filterProd)) return false;
      return true;
    });
  }, [records, filterUser, filterDept, filterDate, filterProd]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterUser, filterDept, filterDate, filterProd]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const pagedRecords = filteredRecords.slice(pageStart, pageStart + PAGE_SIZE);

  function clearFilters() {
    setFilterUser("");
    setFilterDept("");
    setFilterDate("");
    setFilterProd("");
  }

  async function loadRecords() {
    const res = await fetch("/api/performance");
    setRecords(await res.json());
  }

  async function loadUsers() {
    const res = await fetch("/api/users");
    const users = await res.json();
    setUserOptions(users.map((u: UserOption) => ({ UserID: u.UserID, UserName: u.UserName })));
  }

  useEffect(() => {
    loadRecords();
    loadUsers();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setSession(data));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    try {
      const payload = {
        userId: Number(form.userId),
        department: Number(form.department),
        date: form.date,
        production: Number(form.production),
      };

      let res: Response;
      if (editingId === null) {
        res = await fetch("/api/performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/performance/${editingId}`, {
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
      await loadRecords();
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(r: Performance) {
    setEditingId(r.id);
    setForm({
      userId: r.userId,
      department: r.department,
      date: r.date.slice(0, 10),
      production: r.production,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    await fetch(`/api/performance/${id}`, { method: "DELETE" });
    await loadRecords();
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function exportExcel() {
    const rows = filteredRecords.map((r) => {
      const d = new Date(r.date);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return {
        User: r.user.UserName,
        Department: r.department,
        Date: `${dd}/${mm}/${yyyy}`,
        Production: r.production,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `performance-${today}.xlsx`);
  }

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Performance</h1>
          <div className="flex items-center gap-3">
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="border border-red-300 hover:bg-red-50 text-red-600 font-medium px-4 py-2 rounded-md text-sm"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={exportExcel}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium px-4 py-2 rounded-md text-sm"
            >
              <Download size={16} />
              Export Excel
            </button>
            {access >= 3 && (
              <button
                onClick={openAddModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
              >
                + Add Record
              </button>
            )}
            <a
              href="/users"
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-md text-sm"
            >
              Users
            </a>
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              {editingId === null ? "Add Performance Record" : "Edit Performance Record"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: Number(e.target.value) })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select user...</option>
                    {userOptions.map((u) => (
                      <option key={u.UserID} value={u.UserID}>
                        {u.UserName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="number"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value === "" ? "" : Number(e.target.value) })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Production</label>
                  <input
                    type="number"
                    value={form.production}
                    onChange={(e) => setForm({ ...form, production: e.target.value === "" ? "" : Number(e.target.value) })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <Th>User</Th>
              <Th>Department</Th>
              <Th>Date</Th>
              <Th>Production</Th>
              <Th>Actions</Th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2">
                <input
                  type="text"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {records.length === 0 ? "No records yet." : "No records match the current filters."}
                </td>
              </tr>
            ) : (
              pagedRecords.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <Td>{r.user.UserName}</Td>
                  <Td>{r.department}</Td>
                  <Td>{new Date(r.date).toLocaleDateString("en-AU")}</Td>
                  <Td>{r.production}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {access >= 2 && (
                        <button
                          onClick={() => handleEdit(r)}
                          title="Edit"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                      {access >= 3 && (
                        <button
                          onClick={() => handleDelete(r.id)}
                          title="Delete"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredRecords.length === 0
            ? "No records to show"
            : `Showing ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filteredRecords.length)} of ${filteredRecords.length}${filtersActive ? " filtered" : ""} records`}
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
