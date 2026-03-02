import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { ArrowLeft, ShieldAlert } from "lucide-react";

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
        fetchUsers(); // רענון הטבלה
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
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8 gap-4">
          <button
            onClick={() => setScreen("welcome")}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-purple-400">
            Admin Dashboard
          </h1>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading users...</div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-gray-400">
                <tr>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Tokens</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">{user.email}</td>
                    <td className="p-4 font-bold text-purple-300">
                      {user.tokensRemaining}
                    </td>
                    <td className="p-4">
                      {user.premium ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-bold">
                          PREMIUM
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                          FREE
                        </span>
                      )}
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      <button
                        onClick={() =>
                          handleUpdateTokens(
                            user.email,
                            (user.tokensRemaining || 0) + 1,
                          )
                        }
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold"
                      >
                        +1
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateTokens(
                            user.email,
                            Math.max(0, (user.tokensRemaining || 0) - 1),
                          )
                        }
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-bold"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleUpdateTokens(user.email, 0)}
                        className="px-3 py-1 border border-white/20 hover:bg-white/10 rounded text-xs font-bold"
                      >
                        Zero
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
