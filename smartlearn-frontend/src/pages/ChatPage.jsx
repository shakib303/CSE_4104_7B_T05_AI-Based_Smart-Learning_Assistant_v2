import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import api from "../utils/api";

export default function ChatPage() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem("smartlearn-chat-font-size") || "medium";
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("smartlearn-chat-theme") === "dark";
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ---------------------------------------------------------
  // THEME
  // ---------------------------------------------------------

  useEffect(() => {
    localStorage.setItem("smartlearn-chat-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("smartlearn-chat-font-size", fontSize);
  }, [fontSize]);

  // ---------------------------------------------------------
  // LOAD CHAT SESSIONS
  // ---------------------------------------------------------

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setLoadingSessions(true);

      const response = await api.get("/chat/sessions");

      const loadedSessions = response.data?.sessions || [];

      setSessions(loadedSessions);

      // Do NOT automatically open the latest chat.
      // Chat page starts with a fresh/empty conversation.
      setActiveSession(null);
      setMessages([]);
    } catch (error) {
      console.error("Failed to load chat sessions:", error);

      toast.error(error.response?.data?.error || "Unable to load recent chats");
    } finally {
      setLoadingSessions(false);
    }
  }

  // ---------------------------------------------------------
  // OPEN CHAT SESSION
  // ---------------------------------------------------------

  async function openSession(sessionId) {
    try {
      setLoading(true);

      const response = await api.get(`/chat/sessions/${sessionId}`);

      const session = response.data?.session;

      if (!session) {
        throw new Error("Session not found");
      }

      setActiveSession(session);
      setMessages(session.messages || []);
    } catch (error) {
      console.error("Failed to open session:", error);
      toast.error(error.response?.data?.error || "Unable to open chat");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // CREATE NEW CHAT
  // ---------------------------------------------------------

  async function createNewChat() {
    try {
      const response = await api.post("/chat/sessions", {
        title: "New Chat",
      });

      const newSession = response.data?.session;

      if (!newSession) {
        throw new Error("Unable to create session");
      }

      setSessions((prev) => [newSession, ...prev]);
      setActiveSession(newSession);
      setMessages([]);
      setInput("");

      setSettingsOpen(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error("Failed to create chat:", error);

      toast.error(error.response?.data?.error || "Unable to create new chat");
    }
  }

  // ---------------------------------------------------------
  // DELETE CHAT
  // ---------------------------------------------------------

  async function deleteChat(sessionId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this chat?",
    );

    if (!confirmed) return;

    try {
      await api.delete(`/chat/sessions/${sessionId}`);

      const remaining = sessions.filter((session) => session.id !== sessionId);

      setSessions(remaining);

      if (activeSession?.id === sessionId) {
        if (remaining.length > 0) {
          await openSession(remaining[0].id);
        } else {
          setActiveSession(null);
          setMessages([]);
        }
      }

      toast.success("Chat deleted");
    } catch (error) {
      console.error("Failed to delete chat:", error);

      toast.error(error.response?.data?.error || "Unable to delete chat");
    }
  }

  // ---------------------------------------------------------
  // SHARE CHAT
  // ---------------------------------------------------------

  async function shareChat(session) {
    try {
      const shareUrl = `${window.location.origin}/chat?session=${session.id}`;

      if (navigator.share) {
        await navigator.share({
          title: session.title || "SmartLearn Chat",
          text: `SmartLearn AI chat: ${session.title || "Chat"}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Chat link copied to clipboard");
      }

      setOpenMenuId(null);
    } catch (error) {
      // User cancelled native share dialog
      if (error?.name !== "AbortError") {
        console.error("Failed to share chat:", error);
        toast.error("Unable to share chat");
      }
    }
  }

  // ---------------------------------------------------------
  // SEND MESSAGE
  // ---------------------------------------------------------

  async function sendMessage() {
    const content = input.trim();

    if (!content || loading) return;

    let session = activeSession;

    try {
      setLoading(true);

      // If no active chat exists, create one first.
      if (!session) {
        const response = await api.post("/chat/sessions", {
          title: "New Chat",
        });

        session = response.data?.session;

        setActiveSession(session);
        setSessions((prev) => [session, ...prev]);
      }

      setInput("");

      // Temporary user message for instant UI update
      const temporaryUserMessage = {
        id: `temp-user-${Date.now()}`,
        role: "USER",
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, temporaryUserMessage]);

      const response = await api.post(`/chat/sessions/${session.id}/messages`, {
        content,
      });

      const userMessage = response.data?.userMessage;
      const assistantMessage = response.data?.assistantMessage;

      setMessages((prev) => {
        const withoutTemporary = prev.filter(
          (message) => message.id !== temporaryUserMessage.id,
        );

        return [...withoutTemporary, userMessage, assistantMessage];
      });

      // -------------------------------------------------------
      // IMPORTANT:
      // Backend generates the title from the FIRST question.
      // We update the sidebar from the backend response.
      // -------------------------------------------------------

      const refreshedSessionResponse = await api.get(
        `/chat/sessions/${session.id}`,
      );

      const refreshedSession = refreshedSessionResponse.data?.session;

      if (refreshedSession) {
        setActiveSession(refreshedSession);

        setSessions((prev) =>
          prev.map((item) =>
            item.id === refreshedSession.id
              ? {
                  ...item,
                  title: refreshedSession.title,
                  messageCount:
                    refreshedSession.messages?.length || item.messageCount,
                  updatedAt: refreshedSession.updatedAt,
                }
              : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      toast.error(
        error.response?.data?.error || "AI service is currently unavailable",
      );

      // Remove temporary user message if request failed
      setMessages((prev) =>
        prev.filter((message) => !message.id?.startsWith("temp-user-")),
      );

      setInput(content);
    } finally {
      setLoading(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }

  // ---------------------------------------------------------
  // ENTER TO SEND
  // ---------------------------------------------------------

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // ---------------------------------------------------------
  // AUTO SCROLL
  // ---------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // ---------------------------------------------------------
  // CLEAR CURRENT CHAT
  // ---------------------------------------------------------

  async function clearCurrentChat() {
    if (!activeSession) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear all messages from this chat?\n\nThis action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await api.delete(`/chat/sessions/${activeSession.id}/messages`);

      // Clear messages from frontend
      setMessages([]);

      // Update session message count in sidebar
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                messageCount: 0,
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
      );

      // Update active session
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [],
              messageCount: 0,
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );

      // Close settings
      setSettingsOpen(false);

      toast.success("Chat messages cleared");
    } catch (error) {
      console.error("Failed to clear chat:", error);

      toast.error(
        error.response?.data?.error || "Unable to clear chat messages",
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // FONT SIZE
  // ---------------------------------------------------------

  const messageFontSize = {
    small: 13,
    medium: 15,
    large: 17,
  }[fontSize];

  // ---------------------------------------------------------
  // THEME COLORS
  // ---------------------------------------------------------

  const theme = darkMode
    ? {
        page: "#07111f",
        sidebar: "#0b1728",
        panel: "#0f1c2e",
        message: "#111f33",
        input: "#0d1929",
        border: "#203047",
        text: "#e7eef8",
        muted: "#91a4bb",
        subtle: "#64748b",
        primary: "#3b82f6",
        primaryHover: "#2563eb",
        userMessage: "#2563eb",
        userText: "#ffffff",
        aiText: "#e7eef8",
        hover: "#15253a",
        shadow: "rgba(0,0,0,.35)",
      }
    : {
        page: "#f5f7fb",
        sidebar: "#ffffff",
        panel: "#ffffff",
        message: "#ffffff",
        input: "#ffffff",
        border: "#e2e8f0",
        text: "#172033",
        muted: "#64748b",
        subtle: "#94a3b8",
        primary: "#2563eb",
        primaryHover: "#1d4ed8",
        userMessage: "#2563eb",
        userText: "#ffffff",
        aiText: "#172033",
        hover: "#f1f5f9",
        shadow: "rgba(15,23,42,.08)",
      };

  // ---------------------------------------------------------
  // FORMAT DATE
  // ---------------------------------------------------------

  function formatDate(date) {
    if (!date) return "";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return "";

    return value.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  // ---------------------------------------------------------
  // SORT RECENT CHATS
  // ---------------------------------------------------------

  const sortedSessions = [...sessions].sort(
    (a, b) =>
      new Date(b.updatedAt || b.updated_at || 0) -
      new Date(a.updatedAt || a.updated_at || 0),
  );

  // ---------------------------------------------------------
  // MESSAGE COMPONENT
  // ---------------------------------------------------------

  function Message({ message }) {
    const isUser = message.role === "USER" || message.role === "user";

    const content = message.content || message.text || "";

    return (
      <div
        style={{
          display: "flex",
          justifyContent: isUser ? "flex-end" : "flex-start",
          marginBottom: 22,
          padding: "0 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isUser ? "row-reverse" : "row",
            gap: 11,
            maxWidth: "850px",
            width: isUser ? "auto" : "100%",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 34,
              height: 34,
              minWidth: 34,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 700,
              color: "#ffffff",
              background: isUser
                ? theme.primary
                : "linear-gradient(135deg,#0f766e,#2563eb)",
              boxShadow: `0 4px 14px ${theme.shadow}`,
            }}
          >
            {isUser ? "U" : "S"}
          </div>

          {/* Message */}
          <div
            style={{
              padding: isUser ? "12px 16px" : "15px 18px",
              borderRadius: isUser
                ? "18px 5px 18px 18px"
                : "5px 18px 18px 18px",
              background: isUser ? theme.userMessage : theme.message,
              color: isUser ? theme.userText : theme.aiText,
              border: isUser ? "none" : `1px solid ${theme.border}`,
              boxShadow: isUser
                ? `0 5px 18px ${theme.shadow}`
                : `0 3px 12px ${theme.shadow}`,
              fontSize: messageFontSize,
              lineHeight: 1.75,
              minWidth: 0,
              overflowWrap: "break-word",
            }}
          >
            {isUser ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
            ) : (
              <div className="smartlearn-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // EMPTY STATE
  // ---------------------------------------------------------

  function EmptyState() {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 30,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 680,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              margin: "0 auto 22px",
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 30,
              fontWeight: 800,
              background: "linear-gradient(135deg,#2563eb,#0f766e)",
              boxShadow: "0 12px 30px rgba(37,99,235,.25)",
            }}
          >
            S
          </div>

          <h1
            style={{
              margin: 0,
              color: theme.text,
              fontSize: 28,
              fontWeight: 750,
            }}
          >
            How can I help you study?
          </h1>

          <p
            style={{
              marginTop: 10,
              color: theme.muted,
              fontSize: 15,
            }}
          >
            Ask SmartLearn AI about concepts, assignments, programming,
            mathematics, exam preparation, or study strategies.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              marginTop: 25,
            }}
          >
            {[
              "Explain a difficult concept",
              "Help me prepare for an exam",
              "Solve a problem step by step",
              "Create a study plan",
            ].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setInput(item);
                  inputRef.current?.focus();
                }}
                style={{
                  border: `1px solid ${theme.border}`,
                  background: theme.panel,
                  color: theme.text,
                  padding: "10px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: theme.page,
        color: theme.text,
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        transition: "background .2s ease, color .2s ease",
      }}
    >
      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      {sidebarOpen && (
        <aside
          style={{
            width: 285,
            minWidth: 285,
            height: "100vh",
            position: "sticky",
            top: 0,
            display: "flex",
            flexDirection: "column",
            background: theme.sidebar,
            borderRight: `1px solid ${theme.border}`,
            transition: "background .2s ease",
          }}
        >
          {/* Sidebar Header */}
          <div
            style={{
              padding: "18px 16px",
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 9,
                border: "none",
                background: "transparent",
                color: theme.muted,
                cursor: "pointer",
                padding: "9px 10px",
                borderRadius: 10,
                fontSize: 13,
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.hover;
                e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = theme.muted;
              }}
            >
              <span style={{ fontSize: 18 }}>←</span>
              Return to Dashboard
            </button>

            <button
              onClick={createNewChat}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "11px 14px",
                border: "none",
                borderRadius: 12,
                background: "linear-gradient(135deg,#2563eb,#3b82f6)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 7px 18px rgba(37,99,235,.20)",
              }}
            >
              ＋ New Chat
            </button>
          </div>

          {/* Recent Chats */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "17px 10px",
            }}
          >
            <div
              style={{
                padding: "0 8px 9px",
                color: theme.subtle,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1.2,
              }}
            >
              RECENT CHATS
            </div>

            {loadingSessions ? (
              <div
                style={{
                  padding: 15,
                  color: theme.muted,
                  fontSize: 12,
                }}
              >
                Loading chats...
              </div>
            ) : sortedSessions.length === 0 ? (
              <div
                style={{
                  padding: 15,
                  color: theme.muted,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                No recent chats yet.
                <br />
                Start a new conversation.
              </div>
            ) : (
              sortedSessions.map((session) => {
                const active = activeSession?.id === session.id;

                return (
                  <div
                    key={session.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 4,
                    }}
                  >
                    <button
                      onClick={() => openSession(session.id)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: "none",
                        background: active
                          ? darkMode
                            ? "#172b45"
                            : "#eff6ff"
                          : "transparent",
                        color: active ? theme.primary : theme.text,
                        padding: "11px 10px",
                        borderRadius: 10,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          fontSize: 13,
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        {session.title || "New Chat"}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          color: theme.subtle,
                          fontSize: 10,
                        }}
                      >
                        {formatDate(session.updatedAt || session.updated_at)}
                      </div>
                    </button>

                    <div
                      style={{
                        position: "relative",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          setOpenMenuId((prev) =>
                            prev === session.id ? null : session.id,
                          );
                        }}
                        title="Chat options"
                        style={{
                          border: "none",
                          background:
                            openMenuId === session.id
                              ? theme.hover
                              : "transparent",
                          color: theme.subtle,
                          width: 30,
                          height: 34,
                          borderRadius: 8,
                          cursor: "pointer",
                          fontSize: 17,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ⋮
                      </button>

                      {openMenuId === session.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 38,
                            width: 175,
                            background: theme.panel,
                            border: `1px solid ${theme.border}`,
                            borderRadius: 12,
                            padding: 5,
                            boxShadow: `0 12px 35px ${theme.shadow}`,
                            zIndex: 50,
                          }}
                        >
                          {/* Open */}
                          <button
                            onClick={() => {
                              openSession(session.id);
                              setOpenMenuId(null);
                            }}
                            style={{
                              width: "100%",
                              border: "none",
                              background: "transparent",
                              color: theme.text,
                              padding: "10px 11px",
                              borderRadius: 8,
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: 12,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = theme.hover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            💬 Open chat
                          </button>

                          {/* Share */}
                          <button
                            onClick={() => shareChat(session)}
                            style={{
                              width: "100%",
                              border: "none",
                              background: "transparent",
                              color: theme.text,
                              padding: "10px 11px",
                              borderRadius: 8,
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: 12,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = theme.hover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            🔗 Share chat
                          </button>

                          {/* Rename */}
                          <button
                            onClick={async () => {
                              setOpenMenuId(null);

                              const newTitle = window.prompt(
                                "Enter a new name for this chat:",
                                session.title || "New Chat",
                              );

                              if (newTitle === null) return;

                              const title = newTitle.trim();

                              if (!title) {
                                toast.error("Chat name cannot be empty");
                                return;
                              }

                              try {
                                const response = await api.patch(
                                  `/chat/sessions/${session.id}`,
                                  {
                                    title,
                                  },
                                );

                                const updatedSession = response.data?.session;

                                if (updatedSession) {
                                  setSessions((prev) =>
                                    prev.map((item) =>
                                      item.id === session.id
                                        ? {
                                            ...item,
                                            title: updatedSession.title,
                                            updatedAt: updatedSession.updatedAt,
                                          }
                                        : item,
                                    ),
                                  );

                                  if (activeSession?.id === session.id) {
                                    setActiveSession((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            title: updatedSession.title,
                                          }
                                        : prev,
                                    );
                                  }
                                }

                                toast.success("Chat renamed successfully");
                              } catch (error) {
                                console.error("Failed to rename chat:", error);

                                toast.error(
                                  error.response?.data?.error ||
                                    "Unable to rename chat",
                                );
                              }
                            }}
                            style={{
                              width: "100%",
                              border: "none",
                              background: "transparent",
                              color: theme.text,
                              padding: "10px 11px",
                              borderRadius: 8,
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: 12,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = theme.hover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            ✏️ Rename chat
                          </button>

                          {/* Divider */}
                          <div
                            style={{
                              height: 1,
                              background: theme.border,
                              margin: "4px 6px",
                            }}
                          />

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              deleteChat(session.id);
                            }}
                            style={{
                              width: "100%",
                              border: "none",
                              background: "transparent",
                              color: "#ef4444",
                              padding: "10px 11px",
                              borderRadius: 8,
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: 12,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = darkMode
                                ? "rgba(239,68,68,.12)"
                                : "#fef2f2";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            🗑 Delete chat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Bottom */}
          <div
            style={{
              padding: 12,
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              gap: 7,
            }}
          >
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                flex: 1,
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
                padding: 10,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ⚙ Settings
            </button>

            <button
              onClick={() => setDarkMode((prev) => !prev)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: 42,
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              {darkMode ? "☀" : "☾"}
            </button>
          </div>
        </aside>
      )}

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: theme.page,
        }}
      >
        {/* Header */}
        <header
          style={{
            height: 64,
            minHeight: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            background: theme.panel,
            borderBottom: `1px solid ${theme.border}`,
            boxShadow: `0 2px 12px ${theme.shadow}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              minWidth: 0,
            }}
          >
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              style={{
                width: 36,
                height: 36,
                border: `1px solid ${theme.border}`,
                borderRadius: 9,
                background: theme.panel,
                color: theme.text,
                cursor: "pointer",
                fontSize: 17,
              }}
            >
              ☰
            </button>

            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg,#2563eb,#0f766e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
              }}
            >
              S
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 750,
                  fontSize: 14,
                  color: theme.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeSession?.title || "SmartLearn AI"}
              </div>

              <div
                style={{
                  color: theme.muted,
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                AI Study Assistant
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              style={{
                width: 38,
                height: 38,
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 17,
              }}
            >
              {darkMode ? "☀" : "☾"}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                width: 38,
                height: 38,
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ⚙
            </button>
          </div>
        </header>

        {/* Messages */}
        <section
          style={{
            flex: 1,
            overflowY: "auto",
            paddingTop: 25,
          }}
        >
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div
                style={{
                  maxWidth: 1000,
                  margin: "0 auto",
                }}
              >
                {messages.map((message) => (
                  <Message key={message.id} message={message} />
                ))}

                {loading && (
                  <div
                    style={{
                      display: "flex",
                      gap: 11,
                      alignItems: "center",
                      padding: "0 20px 25px",
                      maxWidth: 1000,
                      margin: "0 auto",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 11,
                        background: "linear-gradient(135deg,#0f766e,#2563eb)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontWeight: 700,
                      }}
                    >
                      S
                    </div>

                    <div
                      style={{
                        padding: "12px 16px",
                        background: theme.message,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "5px 18px 18px 18px",
                        color: theme.muted,
                        fontSize: 13,
                      }}
                    >
                      SmartLearn is thinking...
                    </div>
                  </div>
                )}
              </div>

              <div ref={messagesEndRef} />
            </>
          )}
        </section>

        {/* Input Area */}
        <div
          style={{
            padding: "12px 20px 18px",
            background: theme.page,
          }}
        >
          <div
            style={{
              maxWidth: 850,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                background: theme.input,
                border: `1px solid ${theme.border}`,
                borderRadius: 17,
                padding: "8px 9px 8px 15px",
                boxShadow: `0 7px 25px ${theme.shadow}`,
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Ask SmartLearn anything..."
                rows={1}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: theme.text,
                  fontSize: messageFontSize,
                  lineHeight: 1.5,
                  maxHeight: 130,
                  padding: "8px 0",
                  fontFamily: "inherit",
                }}
              />

              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{
                  width: 42,
                  height: 42,
                  border: "none",
                  borderRadius: 12,
                  background:
                    input.trim() && !loading ? theme.primary : theme.border,
                  color: input.trim() && !loading ? "#ffffff" : theme.muted,
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                ↑
              </button>
            </div>

            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                color: theme.subtle,
                fontSize: 10,
              }}
            >
              SmartLearn AI can make mistakes. Verify important academic
              information.
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================
          SETTINGS MODAL
      ====================================================== */}

      {settingsOpen && (
        <div
          onClick={() => setSettingsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            padding: 75,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 330,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,.20)",
              overflow: "hidden",
            }}
          >
            {/* Settings Header */}
            <div
              style={{
                padding: "17px 18px",
                borderBottom: `1px solid ${theme.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 750,
                    color: theme.text,
                  }}
                >
                  Chat Settings
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    color: theme.muted,
                  }}
                >
                  Customize your SmartLearn chat
                </div>
              </div>

              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  width: 30,
                  height: 30,
                  border: "none",
                  background: theme.hover,
                  color: theme.text,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Font Size */}
            <div style={{ padding: 18 }}>
              <div
                style={{
                  color: theme.text,
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                Message Font Size
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 7,
                }}
              >
                {[
                  ["small", "A−", "Small"],
                  ["medium", "A", "Medium"],
                  ["large", "A+", "Large"],
                ].map(([value, symbol, label]) => (
                  <button
                    key={value}
                    onClick={() => setFontSize(value)}
                    style={{
                      border: `1px solid ${
                        fontSize === value ? theme.primary : theme.border
                      }`,
                      background:
                        fontSize === value
                          ? darkMode
                            ? "#172d4b"
                            : "#eff6ff"
                          : theme.panel,
                      color: fontSize === value ? theme.primary : theme.text,
                      borderRadius: 10,
                      padding: "10px 5px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                      }}
                    >
                      {symbol}
                    </div>

                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 3,
                      }}
                    >
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Appearance */}
            <div
              style={{
                padding: "0 18px 18px",
              }}
            >
              <div
                style={{
                  color: theme.text,
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                Appearance
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <button
                  onClick={() => setDarkMode(false)}
                  style={{
                    border: `1px solid ${
                      !darkMode ? theme.primary : theme.border
                    }`,
                    background: !darkMode ? "#eff6ff" : theme.panel,
                    color: !darkMode ? theme.primary : theme.text,
                    padding: 11,
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  ☀ Light
                </button>

                <button
                  onClick={() => setDarkMode(true)}
                  style={{
                    border: `1px solid ${
                      darkMode ? theme.primary : theme.border
                    }`,
                    background: darkMode ? "#172d4b" : theme.panel,
                    color: darkMode ? "#60a5fa" : theme.text,
                    padding: 11,
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  ☾ Dark
                </button>
              </div>
            </div>

            {/* Chat Management */}
            <div
              style={{
                borderTop: `1px solid ${theme.border}`,
                padding: 18,
              }}
            >
              <div
                style={{
                  color: theme.text,
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                Current Chat
              </div>

              <button
                onClick={clearCurrentChat}
                disabled={!activeSession}
                style={{
                  width: "100%",
                  border: `1px solid ${theme.border}`,
                  background: theme.panel,
                  color: activeSession ? theme.text : theme.subtle,
                  padding: 10,
                  borderRadius: 10,
                  cursor: activeSession ? "pointer" : "not-allowed",
                  textAlign: "left",
                  fontSize: 12,
                }}
              >
                🧹 Clear all messages
              </button>

              {activeSession && (
                <button
                  onClick={async () => {
                    setSettingsOpen(false);
                    await deleteChat(activeSession.id);
                  }}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    border: "1px solid #ef4444",
                    background: "transparent",
                    color: "#ef4444",
                    padding: 10,
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12,
                  }}
                >
                  🗑 Delete current chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MARKDOWN / CODE / TABLE STYLES
      ====================================================== */}

      <style>{`
        .smartlearn-markdown {
          color: inherit;
        }

        .smartlearn-markdown p {
          margin: 0 0 12px;
        }

        .smartlearn-markdown p:last-child {
          margin-bottom: 0;
        }

        .smartlearn-markdown h1,
        .smartlearn-markdown h2,
        .smartlearn-markdown h3 {
          margin: 18px 0 9px;
          line-height: 1.35;
        }

        .smartlearn-markdown h1:first-child,
        .smartlearn-markdown h2:first-child,
        .smartlearn-markdown h3:first-child {
          margin-top: 0;
        }

        .smartlearn-markdown ul,
        .smartlearn-markdown ol {
          padding-left: 23px;
          margin: 9px 0 13px;
        }

        .smartlearn-markdown li {
          margin: 4px 0;
        }

        .smartlearn-markdown strong {
          font-weight: 750;
        }

        .smartlearn-markdown code {
          font-family:
            "Cascadia Code",
            "Fira Code",
            Consolas,
            monospace;
          font-size: .9em;
        }

        .smartlearn-markdown :not(pre) > code {
          padding: 2px 5px;
          border-radius: 5px;
          background: rgba(100,116,139,.14);
        }

        .smartlearn-markdown pre {
          overflow-x: auto;
          padding: 14px;
          margin: 13px 0;
          border-radius: 10px;
          background: ${darkMode ? "#07111f" : "#f1f5f9"};
          border: 1px solid ${darkMode ? "#263852" : "#e2e8f0"};
        }

        .smartlearn-markdown pre code {
          background: transparent;
          padding: 0;
          color: ${darkMode ? "#dbeafe" : "#172033"};
        }

        .smartlearn-markdown table {
          width: 100%;
          border-collapse: collapse;
          margin: 13px 0;
          font-size: .92em;
        }

        .smartlearn-markdown th,
        .smartlearn-markdown td {
          border: 1px solid ${darkMode ? "#2a3b54" : "#dbe3ec"};
          padding: 7px 9px;
          text-align: left;
        }

        .smartlearn-markdown th {
          background: ${darkMode ? "#17253a" : "#f1f5f9"};
        }

        .smartlearn-markdown blockquote {
          margin: 12px 0;
          padding: 8px 13px;
          border-left: 3px solid ${darkMode ? "#60a5fa" : "#2563eb"};
          background: ${
            darkMode ? "rgba(37,99,235,.08)" : "rgba(37,99,235,.05)"
          };
          color: ${darkMode ? "#b8c7da" : "#475569"};
        }

        .smartlearn-markdown a {
          color: ${darkMode ? "#60a5fa" : "#2563eb"};
        }

        .smartlearn-markdown .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
          padding: 8px 0;
        }

        textarea::placeholder {
          color: ${darkMode ? "#64748b" : "#94a3b8"};
        }

        * {
          scrollbar-width: thin;
          scrollbar-color:
            ${darkMode ? "#334155" : "#cbd5e1"}
            transparent;
        }
      `}</style>
    </div>
  );
}
