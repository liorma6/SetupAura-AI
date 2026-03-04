import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  ArrowLeft,
  ShieldAlert,
  Plus,
  Minus,
  Trash2,
  Crown,
  User,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;

export const AdminScreen = () => {
  const { setScreen, verifiedEmail } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          "admin-secret": localStorage.getItem("setupaura_admin_secret") || "",
        },
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateTokens = async (email, tokens) => {
    await fetch(`${API_URL}/api/admin/update-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "admin-secret": localStorage.getItem("setupaura_admin_secret") || "",
      },
      body: JSON.stringify({ targetEmail: email, newTokens: tokens }),
    });
    fetchUsers();
  };

  const togglePremium = async (email, currentStatus) => {
    await fetch(`${API_URL}/api/admin/toggle-premium`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "admin-secret": localStorage.getItem("setupaura_admin_secret") || "",
      },
      body: JSON.stringify({ targetEmail: email, isPremium: !currentStatus }),
    });
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center mb-8 gap-4">
          <button
            onClick={() => setScreen("welcome")}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-purple-400 uppercase tracking-widest">
            SetupAura Admin
          </h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-black/60 text-gray-400 border-b border-white/10 text-xs">
                <tr>
                  <th className="p-4 uppercase">User Email</th>
                  <th className="p-4 uppercase text-center">Tokens</th>
                  <th className="p-4 uppercase text-center">
                    Status (Click to toggle)
                  </th>
                  <th className="p-4 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-sm font-medium">{user.email}</td>
                    <td className="p-4 text-center font-bold text-purple-300">
                      {user.tokensRemaining}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => togglePremium(user.email, user.premium)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border transition-all active:scale-95 ${
                          user.premium
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                            : "bg-gray-500/10 text-gray-500 border-white/5 hover:bg-white/10"
                        }`}
                      >
                        {user.premium ? (
                          <Crown size={12} />
                        ) : (
                          <User size={12} />
                        )}
                        {user.premium ? "PREMIUM" : "FREE"}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() =>
                            updateTokens(
                              user.email,
                              (user.tokensRemaining || 0) + 1,
                            )
                          }
                          className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() =>
                            updateTokens(
                              user.email,
                              Math.max(0, (user.tokensRemaining || 0) - 1),
                            )
                          }
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          onClick={() => updateTokens(user.email, 0)}
                          className="p-2 bg-red-600/20 text-red-400 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
