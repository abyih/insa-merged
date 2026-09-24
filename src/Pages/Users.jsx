import React, { useState, useEffect, useMemo } from "react";
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  ShieldCheck,
  UserCheck,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  X,
  AlertTriangle,
  KeyRound,
  Mail,
  User,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    role: "operator",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Current logged in user
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.error || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Network error while connecting to user database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      operators: users.filter((u) => u.role === "operator").length,
      viewers: users.filter((u) => u.role === "viewer").length,
    };
  }, [users]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      username: "",
      full_name: "",
      email: "",
      role: "operator",
      password: "",
      confirmPassword: "",
    });
    setFormError("");
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role || "operator",
      password: "",
      confirmPassword: "",
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Submit Add User
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password) {
      setFormError("Username and password are required.");
      return;
    }
    if (formData.username.trim().length < 3) {
      setFormError("Username must be at least 3 characters.");
      return;
    }
    if (formData.password.length < 4) {
      setFormError("Password must be at least 4 characters.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
          role: formData.role,
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`User "${formData.username.trim()}" created successfully!`);
        setIsAddModalOpen(false);
        fetchUsers();
      } else {
        setFormError(data.error || "Failed to create user.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Network error while creating user.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setFormError("Username cannot be empty.");
      return;
    }
    if (formData.password && formData.password.length < 4) {
      setFormError("New password must be at least 4 characters.");
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        username: formData.username.trim(),
        role: formData.role,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`User "${formData.username.trim()}" updated successfully!`);
        setIsEditModalOpen(false);
        fetchUsers();

        // If current user updated their own info, update localStorage
        if (currentUser.id === selectedUser.id) {
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          window.dispatchEvent(new Event("auth-changed"));
        }
      } else {
        setFormError(data.error || "Failed to update user.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Network error while updating user.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Delete User
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`User "${selectedUser.username}" removed.`);
        setIsDeleteModalOpen(false);
        fetchUsers();
      } else {
        showNotification(data.error || "Could not delete user.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Network error deleting user.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-3 h-3" />
            Admin
          </span>
        );
      case "operator":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <UserCheck className="w-3 h-3" />
            Operator
          </span>
        );
      case "viewer":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
            <User className="w-3 h-3" />
            Viewer
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr.replace(" ", "T") + "Z");
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 ${
            notification.type === "error"
              ? "bg-red-950/90 border-red-800 text-red-200 shadow-red-950/40"
              : "bg-emerald-950/90 border-emerald-800 text-emerald-200 shadow-emerald-950/40"
          }`}
        >
          {notification.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900/90 via-zinc-900/50 to-indigo-950/30 border border-zinc-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <UsersIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-2">
              User Management
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Manage local accounts, operator roles, and platform access in the SQLite database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh User List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl backdrop-blur-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Total Users
          </div>
          <div className="text-2xl font-extrabold text-zinc-50 mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl backdrop-blur-sm">
          <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
            <Shield className="w-3 h-3" /> Administrators
          </div>
          <div className="text-2xl font-extrabold text-indigo-300 mt-1">{stats.admins}</div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl backdrop-blur-sm">
          <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Operators
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 mt-1">{stats.operators}</div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl backdrop-blur-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" /> Viewers
          </div>
          <div className="text-2xl font-extrabold text-zinc-300 mt-1">{stats.viewers}</div>
        </div>
      </div>

      {/* Controls: Search & Role Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by username, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950/70 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500 hidden sm:block" />
          <span className="text-xs text-zinc-400 hidden sm:block">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-950/70 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="operator">Operators</option>
            <option value="viewer">Viewers</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs text-zinc-400 font-medium">Loading registered users...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
            <p className="text-sm text-red-400 font-semibold">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <UsersIcon className="w-10 h-10 mx-auto text-zinc-600" />
            <p className="text-sm font-semibold text-zinc-300">No users found</p>
            <p className="text-xs text-zinc-500">
              {searchQuery || roleFilter !== "all"
                ? "Try clearing your search query or role filter."
                : "Get started by adding your first user."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Email</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Created</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filteredUsers.map((user) => {
                  const isCurrent = currentUser.id === user.id || currentUser.username === user.username;
                  const initial = user.username ? user.username[0].toUpperCase() : "U";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* User Column */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
                              user.role === "admin"
                                ? "bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white"
                                : user.role === "operator"
                                ? "bg-gradient-to-tr from-cyan-600 to-cyan-400 text-white"
                                : "bg-gradient-to-tr from-zinc-700 to-zinc-500 text-zinc-100"
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-100 text-sm">
                                {user.username}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              {user.full_name || "No name specified"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-4 px-4">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Email Column */}
                      <td className="py-4 px-4 hidden md:table-cell text-zinc-400">
                        {user.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-zinc-500" />
                            {user.email}
                          </span>
                        ) : (
                          <span className="text-zinc-600 italic">No email</span>
                        )}
                      </td>

                      {/* Created Column */}
                      <td className="py-4 px-4 hidden sm:table-cell text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {formatDate(user.created_at)}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-transparent hover:border-zinc-700 rounded-lg transition-all cursor-pointer"
                            title="Edit user details or change password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenDelete(user)}
                            disabled={user.role === "admin" && stats.admins <= 1}
                            className="p-2 hover:bg-red-950/30 text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-900/50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              user.role === "admin" && stats.admins <= 1
                                ? "Cannot delete the last remaining administrator"
                                : "Delete user"
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD USER MODAL                                                            */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-7 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-zinc-100">Create New User</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Username *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. operator_john"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="operator">Operator</option>
                    <option value="admin">Administrator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="Min 4 chars"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-800 mt-5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Creating..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT USER MODAL                                                           */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-7 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Edit User Details</h3>
                  <p className="text-[11px] text-zinc-400">Editing account: {selectedUser?.username}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Username *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="operator">Operator</option>
                    <option value="admin">Administrator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80">
                <div className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                  Change Password (optional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="password"
                      placeholder="New password (leave blank to keep)"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-800 mt-5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE USER CONFIRMATION MODAL                                            */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-zinc-100">
              Delete User Account?
            </h3>
            <p className="text-xs text-center text-zinc-400 mt-2">
              Are you sure you want to permanently delete user{" "}
              <strong className="text-zinc-200">"{selectedUser?.username}"</strong>?
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteSubmit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-900/30 cursor-pointer"
              >
                {submitting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
