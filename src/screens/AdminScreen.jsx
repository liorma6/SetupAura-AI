import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { ArrowLeft, ShieldAlert, Plus, Minus, Trash2 } from "lucide-react";

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
        headers: { "admin-email": verifiedEmail },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [verifiedEmail]);

  const handleUpdateTokens = async (email, newTokens) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/update-tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "admin-email": verifiedEmail,
        },
        body: JSON.stringify({ targetEmail: email, newTokens }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to update tokens", err);
    }
  };

  if (verifiedEmail !== "liorma6@gmail.com") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center flex-col text-white">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <button
          onClick={() => setScreen("welcome")}
          className="mt-4 text-purple-400 hover:underline"
        >
          Return Home
        </button>
      </div>
    );
  }

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
          <h1 className="text-xl md:text-2xl font-bold text-purple-400 uppercase tracking-wider">
            Admin Dashboard
          </h1>
        </div>

        {loading ? (
          <div className="text-gray-400 animate-pulse">
            Loading users database...
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {/* Wrapper for horizontal scrolling on small screens */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-black/60 text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="p-4 font-bold uppercase tracking-tighter">
                      User Email
                    </th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-center">
                      Tokens
                    </th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-center">
                      Status
                    </th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4 font-medium max-w-[200px] truncate">
                        {user.email}
                      </td>
                      <td className="p-4 text-center font-black text-purple-300 text-lg">
                        {user.tokensRemaining}
                      </td>
                      <td className="p-4 text-center">
                        {user.premium ? (
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-black border border-emerald-500/30">
                            PREMIUM
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500/10 text-gray-500 rounded-md text-[10px] font-bold border border-white/5">
                            FREE
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() =>
                              handleUpdateTokens(
                                user.email,
                                (user.tokensRemaining || 0) + 1,
                              )
                            }
                            className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-all active:scale-90"
                            title="Add Token"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateTokens(
                                user.email,
                                Math.max(0, (user.tokensRemaining || 0) - 1),
                              )
                            }
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-90"
                            title="Remove Token"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateTokens(user.email, 0)}
                            className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/20 rounded-lg transition-all active:scale-90"
                            title="Reset to Zero"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 text-[10px] text-gray-500 text-center uppercase tracking-widest">
          Total Users: {users.length} • Authenticated as {verifiedEmail}
        </p>
      </div>
    </div>
  );
};
