import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function AdminProfile() {
  const [admin, setAdmin] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", age: "", ic: "", address: "", emergencyName: "", emergencyPhone: "" });
  const [unlockIdentity, setUnlockIdentity] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) { window.location.href = "/"; return; }
      const uid = sessionStorage.getItem("adminUid") || user.uid;
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data();
        setAdmin(data);
        setForm({
          name: data.name || "",
          age: String(data.age || ""),
          ic: data.ic || "",
          address: data.address || "",
          emergencyName: data.emergencyName || "",
          emergencyPhone: data.emergencyPhone || "",
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setError("");
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.ic && form.ic.replace(/-/g, "").length !== 12) { setError("IC must be 12 digits"); return; }
    setLoading(true);
    try {
      const uid = sessionStorage.getItem("adminUid") || auth.currentUser?.uid;
      await updateDoc(doc(db, "users", uid), {
        name: form.name,
        age: parseInt(form.age) || 0,
        ic: form.ic,
        address: form.address,
        emergencyName: form.emergencyName,
        emergencyPhone: form.emergencyPhone,
      });
      setAdmin({ ...admin, ...form });
      setEditing(false);
      setUnlockIdentity(false);
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const toggleUnlockIdentity = (checked) => {
    setUnlockIdentity(checked);
    if (!checked) {
      setForm(f => ({ ...f, name: admin.name || "", age: String(admin.age || ""), ic: admin.ic || "" }));
    }
  };

  const calculateAgeFromIC = (ic) => {
    const cleanIC = ic.replace(/-/g, "");
    if (cleanIC.length < 6) return "";
    const yearStr = cleanIC.substring(0, 2);
    const month = cleanIC.substring(2, 4);
    const day = cleanIC.substring(4, 6);
    const currentYear = new Date().getFullYear();
    const century = parseInt(yearStr) > parseInt(String(currentYear).substring(2)) ? 1900 : 2000;
    const birthYear = century + parseInt(yearStr);
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    if (today.getMonth() + 1 < parseInt(month) || (today.getMonth() + 1 === parseInt(month) && today.getDate() < parseInt(day))) age--;
    return String(age);
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  if (!admin) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "#2E7D32", fontSize: "18px" }}>
      Loading...
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button className="pasti-btn" style={styles.backBtn} onClick={() => window.location.href = "/dashboard"}>← Dashboard</button>
        <h1 style={styles.topTitle}>Admin Profile</h1>
        <button className="pasti-btn" onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>

      {successMsg && <div style={styles.successBar}>✅ {successMsg}</div>}

      <div style={styles.content}>
        <div className="pasti-card pasti-fade-in" style={styles.card}>

          {/* Avatar */}
          <div style={styles.avatarSection}>
            <div style={styles.avatarPlaceholder}>
              <span style={{ fontSize: "48px" }}>👤</span>
            </div>
            <h2 style={styles.adminName}>{admin.name}</h2>
            <span style={styles.roleBadge}>Head Principal / Admin</span>
            <p style={styles.adminEmail}>{admin.email}</p>
          </div>

          {/* Info */}
          {!editing ? (
            <div style={styles.infoSection}>
              <div className="pasti-row" style={styles.infoRow}>
                <span style={styles.infoLabel}>FULL NAME</span>
                <span style={styles.infoValue}>{admin.name || "-"}</span>
              </div>
              <div className="pasti-row" style={styles.infoRow}>
                <span style={styles.infoLabel}>AGE</span>
                <span style={styles.infoValue}>{admin.age || "-"}</span>
              </div>
              <div className="pasti-row" style={styles.infoRow}>
                <span style={styles.infoLabel}>EMAIL</span>
                <span style={styles.infoValue}>{admin.email || "-"}</span>
              </div>
              <div className="pasti-row" style={styles.infoRow}>
                <span style={styles.infoLabel}>IC NUMBER</span>
                <span style={styles.infoValue}>{admin.ic || "-"}</span>
              </div>
              <div className="pasti-row" style={styles.infoRow}>
                <span style={styles.infoLabel}>ADDRESS</span>
                <span style={styles.infoValue}>{admin.address || "-"}</span>
              </div>
              <div className="pasti-row" style={styles.infoRow}>
                <span style={styles.infoLabel}>EMERGENCY CONTACT</span>
                <span style={styles.infoValue}>{admin.emergencyName || "-"}</span>
              </div>
              <div className="pasti-row" style={styles.infoRow}>
                <span style={styles.infoLabel}>EMERGENCY PHONE</span>
                <span style={styles.infoValue}>{admin.emergencyPhone || "-"}</span>
              </div>
              <button className="pasti-btn" style={styles.editBtn} onClick={() => setEditing(true)}>✏️ Edit Profile</button>
            </div>
          ) : (
            <div style={styles.infoSection}>
              {error && <p style={styles.errorMsg}>{error}</p>}

              <label style={styles.label}>Full Name {unlockIdentity && "*"}</label>
              <input className="pasti-input" style={unlockIdentity ? styles.input : styles.inputLocked} value={form.name} disabled={!unlockIdentity} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full Name" />

              <label style={styles.label}>IC Number</label>
              <input className="pasti-input" style={unlockIdentity ? styles.input : styles.inputLocked} disabled={!unlockIdentity} value={form.ic}
                onChange={e => { const ic = e.target.value; const age = calculateAgeFromIC(ic); setForm({ ...form, ic, age: age || form.age }); }}
                placeholder="e.g. 030305-11-1022" />

              <label style={styles.label}>Age (auto from IC)</label>
              <input style={styles.inputLocked} type="number" readOnly value={form.age} placeholder="Age" />

              <label style={styles.confirmRow}>
                <input type="checkbox" checked={unlockIdentity} onChange={e => toggleUnlockIdentity(e.target.checked)} style={styles.confirmCheckbox} />
                ⚠️ Name, Age and IC are core identity fields. Only tick this if the admin account holder has actually changed, then edit them above.
              </label>

              <label style={styles.label}>Address</label>
              <input className="pasti-input" style={styles.input} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" />

              <label style={styles.label}>Emergency Contact Name</label>
              <input className="pasti-input" style={styles.input} value={form.emergencyName} onChange={e => setForm({ ...form, emergencyName: e.target.value })} placeholder="Emergency Contact Name" />

              <label style={styles.label}>Emergency Contact Phone</label>
              <input className="pasti-input" style={styles.input} value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} placeholder="Emergency Contact Phone" />

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setEditing(false); setError(""); setUnlockIdentity(false); setForm(f => ({ ...f, name: admin.name || "", age: String(admin.age || ""), ic: admin.ic || "" })); }}>Cancel</button>
                <button className="pasti-btn" style={styles.saveBtn} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "linear-gradient(180deg, #f4f9f4 0%, #eef3ee 100%)", fontFamily: "'Segoe UI', sans-serif" },
  topBar: { background: "linear-gradient(135deg, #1B5E20, #2E7D32)", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", position: "sticky", top: 0, zIndex: 500, borderBottomLeftRadius: "22px", borderBottomRightRadius: "22px" },
  topTitle: { color: "white", fontSize: "20px", margin: 0, fontWeight: "bold" },
  backBtn: { background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.35)", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px" },
  logoutBtn: { background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.35)", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px" },
  successBar: { background: "#e8f5e9", color: "#1B5E20", padding: "12px 32px", fontSize: "14px", fontWeight: "500" },
  content: { padding: "32px", display: "flex", justifyContent: "center" },
  card: { background: "white", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "520px", boxShadow: "0 12px 40px rgba(27,94,32,0.1)", border: "1px solid rgba(27,94,32,0.05)" },
  avatarSection: { textAlign: "center", marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #f0f0f0" },
  avatarPlaceholder: { width: "100px", height: "100px", borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px auto", border: "3px solid #2E7D32" },
  adminName: { fontSize: "22px", fontWeight: "bold", color: "#1B5E20", margin: "0 0 6px 0" },
  roleBadge: { background: "#e8f5e9", color: "#1B5E20", padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "500" },
  adminEmail: { color: "#888", fontSize: "14px", marginTop: "8px" },
  infoSection: { display: "flex", flexDirection: "column" },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px", borderBottom: "1px solid #f5f5f5", borderRadius: "8px" },
  infoLabel: { fontSize: "12px", color: "#888", fontWeight: "600", letterSpacing: "0.05em" },
  infoValue: { fontSize: "14px", color: "#222", fontWeight: "500", textAlign: "right", maxWidth: "60%" },
  editBtn: { background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "white", border: "none", padding: "12px 24px", borderRadius: "14px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", marginTop: "20px", width: "100%", boxShadow: "0 8px 20px rgba(46,125,50,0.3)" },
  infoBox: { background: "#fff3e0", color: "#e65100", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", marginBottom: "16px" },
  label: { fontSize: "13px", color: "#666", marginBottom: "4px", display: "block", marginTop: "8px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e6e2", fontSize: "14px", marginBottom: "12px", outline: "none", boxSizing: "border-box" },
  inputLocked: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e6e2", fontSize: "14px", marginBottom: "12px", outline: "none", boxSizing: "border-box", background: "#f5f5f5", color: "#999", cursor: "not-allowed" },
  cancelBtn: { flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #ddd", background: "white", cursor: "pointer", fontSize: "14px" },
  saveBtn: { flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold", boxShadow: "0 6px 16px rgba(46,125,50,0.3)" },
  confirmRow: { display: "flex", alignItems: "flex-start", gap: "10px", background: "#f4f9f4", border: "1px solid #e2ece2", borderRadius: "12px", padding: "12px 14px", fontSize: "13px", color: "#33473a", lineHeight: 1.4, marginTop: "8px", cursor: "pointer" },
  confirmCheckbox: { marginTop: "2px", width: "16px", height: "16px", accentColor: "#2E7D32", cursor: "pointer", flexShrink: 0 },
  errorMsg: { background: "#ffebee", color: "#c62828", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" },
};