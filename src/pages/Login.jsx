import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;
      const docSnap = await getDoc(doc(db, "users", uid));

      if (docSnap.exists()) {
        const role = docSnap.data().role;
        if (role === "admin") {
          sessionStorage.setItem("adminEmail", email);
sessionStorage.setItem("adminPass", password);
sessionStorage.setItem("adminUid", result.user.uid);
          window.location.href = "/dashboard";
        } else {
          setError("Access denied. This portal is for admin only.");
          auth.signOut();
        }
      } else {
        setError("Account not found in database.");
        auth.signOut();
      }
    } catch (err) {
      setError("Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.blobOne} />
      <div style={styles.blobTwo} />
      <div className="pasti-card pasti-fade-in" style={styles.card}>
        <div style={styles.logoContainer}>
          <img
            src="/pasti-logo.png"
            alt="PASTI Logo"
            style={styles.logo}
            onError={(e) => e.target.style.display = "none"}
          />
          <h1 style={styles.title}>PASTI</h1>
          <p style={styles.subtitle}>Admin Portal</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="pasti-input"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pasti-input"
              style={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            className="pasti-btn"
            style={loading ? styles.btnDisabled : styles.btn}
            disabled={loading}
          >
            {loading ? "Signing in..." : "SIGN IN"}
          </button>
        </form>

        <p style={styles.footer}>PASTI — Progress Tracking System</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #43A047 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  blobOne: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.10)",
    top: "-120px",
    left: "-100px",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  blobTwo: {
    position: "absolute",
    width: "360px",
    height: "360px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    bottom: "-140px",
    right: "-100px",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  card: {
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "24px",
    padding: "40px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.4)",
    position: "relative",
    zIndex: 1,
  },
  logoContainer: { textAlign: "center", marginBottom: "30px" },
  logo: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px" },
  title: { fontSize: "28px", fontWeight: "bold", color: "#2E7D32", margin: "0", letterSpacing: "0.02em" },
  subtitle: { color: "#666", margin: "4px 0 0 0", fontSize: "14px" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  error: { background: "#ffebee", color: "#c62828", padding: "10px 14px", borderRadius: "10px", fontSize: "14px", border: "1px solid #ffcdd2" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "14px", fontWeight: "500", color: "#333" },
  input: { padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e6e2", fontSize: "15px", outline: "none" },
  btn: { background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "white", border: "none", padding: "14px", borderRadius: "12px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginTop: "8px", boxShadow: "0 10px 24px rgba(46,125,50,0.35)" },
  btnDisabled: { background: "#aaa", color: "white", border: "none", padding: "14px", borderRadius: "12px", fontSize: "15px", fontWeight: "bold", cursor: "not-allowed", marginTop: "8px" },
  footer: { textAlign: "center", color: "#999", fontSize: "12px", marginTop: "20px" },
};