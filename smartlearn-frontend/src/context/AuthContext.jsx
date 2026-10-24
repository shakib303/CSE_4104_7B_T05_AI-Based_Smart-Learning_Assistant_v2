import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("sla-token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => {
        localStorage.removeItem("sla-token");
        delete api.defaults.headers.common.Authorization;
      })
      .finally(() => setLoading(false));
  }, []);
  const apply = (t) => {
    localStorage.setItem("sla-token", t);
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
  };
  const login = async (email, password, role) => {
    const path =
      role === "TEACHER"
        ? "/auth/teacher-login"
        : role === "ADMIN"
          ? "/auth/admin-login"
          : "/auth/student-login";
    const { data } = await api.post(path, { email, password });
    apply(data.accessToken);
    setUser(data.user);
    return data.user;
  };
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  };
  const logout = () => {
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("sla-token");
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  };
  const updateUser = (patch) => setUser((u) => ({ ...u, ...patch }));
  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
