import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";

export default function App() {
  const [user, setUser] = useState(
    localStorage.getItem("token")
      ? { token: localStorage.getItem("token") }
      : null
  );
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const toggleMenu = () => setShowMenu(!showMenu);

  return (
    <Router>
      <div
        style={{ display: "flex", flexDirection: "column", height: "100vh" }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px",
            borderBottom: "1px solid gray",
            position: "relative",
          }}
        >
          <h2>Chat App</h2>
          {user && (
            <div style={{ position: "relative" }}>
              <button onClick={toggleMenu}>{user.username} ▼</button>
              {showMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    background: "white",
                    border: "1px solid gray",
                    borderRadius: 4,
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                    zIndex: 1000,
                  }}
                >
                  <Link
                    to="/profile"
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      textDecoration: "none",
                      color: "black",
                    }}
                    onClick={() => setShowMenu(false)}
                  >
                    Profile
                  </Link>
                  <div
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    onClick={() => {
                      handleLogout();
                      setShowMenu(false);
                    }}
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <Routes>
            <Route
              path="/login"
              element={
                user ? <Navigate to="/chat" /> : <Login setUser={setUser} />
              }
            />
            <Route
              path="/chat"
              element={user ? <Chat user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/profile"
              element={
                user ? <Profile user={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="*"
              element={<Navigate to={user ? "/chat" : "/login"} />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
