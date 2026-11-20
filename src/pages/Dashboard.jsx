import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import {
  collection, getDocs, doc, getDoc,
  addDoc, updateDoc, deleteDoc, setDoc, query, where
} from "firebase/firestore";
import { signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

// Progress Circle Component
function ProgressCircle({ percentage, size = 80, color = "#2E7D32", label = "", sublabel = "" }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percentage / 100) * circumference;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e8f5e9" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth="8" strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          fontSize={size > 80 ? "14" : "12"} fontWeight="bold" fill={color}>{percentage}%</text>
      </svg>
      {label && <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#333", textAlign: "center" }}>{label}</p>}
      {sublabel && <p style={{ margin: 0, fontSize: "11px", color: "#888", textAlign: "center" }}>{sublabel}</p>}
    </div>
  );
}

export default function Dashboard() {
  const adminUidRef = useRef(null);
  const [admin, setAdmin] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [syllabus, setSyllabus] = useState([]);
  const [students, setStudents] = useState([]);
  const [allProgress, setAllProgress] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activePage, setActivePage] = useState("home");

  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [classProgress, setClassProgress] = useState({});
  const [classSyllabus, setClassSyllabus] = useState(null);
  const [showClassDetail, setShowClassDetail] = useState(false);
  const [hoveredLesson, setHoveredLesson] = useState(null);

  const [showAddClassroom, setShowAddClassroom] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showEditTeacher, setShowEditTeacher] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [showEditParent, setShowEditParent] = useState(false);
  const [showAddSyllabus, setShowAddSyllabus] = useState(false);
  const [showEditSyllabus, setShowEditSyllabus] = useState(false);
  const [selectedSyllabus, setSelectedSyllabus] = useState(null);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editingParent, setEditingParent] = useState(null);

  const [showEditStudent, setShowEditStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({ name: "", dob: "", gender: "Boy", age: "", ic: "", classroomId: "" });

  const [showReactivateParent, setShowReactivateParent] = useState(false);
  const [reactivatingParent, setReactivatingParent] = useState(null);
  const [reactivateSelectedIds, setReactivateSelectedIds] = useState([]);

  const [showDeleteParentConfirm, setShowDeleteParentConfirm] = useState(false);
  const [deletingParent, setDeletingParent] = useState(null);
  const [deleteParentMode, setDeleteParentMode] = useState(null); // "one" | "all"
  const [deleteParentChildId, setDeleteParentChildId] = useState("");

  const [classroomForm, setClassroomForm] = useState({ name: "", ageCategory: "4", limit: "", teacherId: "", teacherName: "" });
  const [teacherForm, setTeacherForm] = useState({ firstName: "", lastName: "", ic: "", age: "", qualifications: "", specialty: "", entryYear: "", address: "", emergencyName: "", emergencyPhone: "" });
  const [parentForm, setParentForm] = useState({ firstName: "", lastName: "", ic: "", age: "", phone: "", address: "", emergencyName: "", emergencyPhone: "" });
  const [children, setChildren] = useState([{ name: "", dob: "", gender: "Boy", age: "", ic: "", classroomId: "" }]);
  const [syllabusForm, setSyllabusForm] = useState({ ageCategory: "4", lessons: [], newLesson: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const classroomsSectionRef = useRef(null);

  const [classSearch, setClassSearch] = useState("");
  const [classAgeFilter, setClassAgeFilter] = useState("all");
  const [classSort, setClassSort] = useState("name-asc");

  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherSort, setTeacherSort] = useState("name-asc");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState("all");

  const [parentSearch, setParentSearch] = useState("");
  const [parentStatusFilter, setParentStatusFilter] = useState("all");
  const [parentSort, setParentSort] = useState("active-first");

  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("all");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");

  const goToClassrooms = () => {
    setShowClassDetail(false);
    setActivePage("home");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        classroomsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) { window.location.href = "/"; return; }
      adminUidRef.current = user.uid;
      fetchAdminData(user.uid);
      fetchAllData();
    });
    return () => unsubscribe();
  }, []);

  const fetchAdminData = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) setAdmin(snap.data());
    } catch (e) { console.log(e); }
  };

  const fetchAllData = async () => {
    try {
      const classSnap = await getDocs(collection(db, "classrooms"));
      const classData = classSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClassrooms(classData);

      const usersSnap = await getDocs(collection(db, "users"));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeachers(allUsers.filter(u => u.role === "teacher"));
      setParents(allUsers.filter(u => u.role === "parent"));

      const syllabusSnap = await getDocs(collection(db, "syllabus"));
      setSyllabus(syllabusSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const studSnap = await getDocs(collection(db, "students"));
      const studData = studSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(studData);
      // Count live from actual student records rather than the classroom's stored enrolledCount,
      // which is a hand-maintained counter that can drift out of sync (e.g. batch add/remove).
      setTotalStudents(studData.filter(s => !s.deleted).length);

      // Fetch all progress
      const progSnap = await getDocs(collection(db, "progress"));
      const progMap = {};
      progSnap.docs.forEach(d => { progMap[d.id] = d.data(); });
      setAllProgress(progMap);

      // Check notifications
      checkNotifications(classData, studData, progMap, syllabusSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.log(e); }
  };

  const checkNotifications = (classData, studData, progMap, sylData) => {
    const newNotifs = [];
    classData.forEach(classroom => {
      const classStudents = studData.filter(s => s.classroomId === classroom.id && !s.deleted);
      if (classStudents.length === 0) return;
      const syl = sylData.find(s => String(s.ageCategory) === String(classroom.ageCategory));
      if (!syl) return;
      const totalLessons = syl.lessons.length;
      if (totalLessons === 0) return;
      let totalPct = 0;
      let count = 0;
      classStudents.forEach(student => {
        const prog = progMap[student.id];
        if (prog?.lessons) {
          const completed = Object.values(prog.lessons).filter(v => v === true).length;
          totalPct += (completed / totalLessons) * 100;
          count++;
        }
      });
      if (count > 0) {
        const avgPct = Math.round(totalPct / count);
        if (avgPct >= 50) {
          newNotifs.push({
            type: "progress",
            message: `🎉 Class "${classroom.name}" has reached ${avgPct}% average progress!`,
            classroomId: classroom.id,
            timestamp: new Date()
          });
        }
      }
    });
    setNotifications(newNotifs);
  };

  const handleViewClassroom = async (classroom) => {
    setSelectedClassroom(classroom);
    setClassStudents([]);
    setClassProgress({});
    setClassSyllabus(null);
    try {
      const studSnap = await getDocs(collection(db, "students"));
      const classStudentList = studSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.classroomId === classroom.id);
      setClassStudents(classStudentList);
      const progressMap = {};
      for (const student of classStudentList) {
        try {
          const progSnap = await getDoc(doc(db, "progress", student.id));
          progressMap[student.id] = progSnap.exists() ? progSnap.data() : { lessons: {} };
        } catch (e) { progressMap[student.id] = { lessons: {} }; }
      }
      setClassProgress(progressMap);
      const sylSnap = await getDocs(collection(db, "syllabus"));
      const match = sylSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(s => String(s.ageCategory) === String(classroom.ageCategory));
      setClassSyllabus(match || null);
    } catch (e) { console.log(e); }
    setShowClassDetail(true);
  };

  const handleDeleteStudent = async (studentId, studentName, classroomId, parentId) => {
    if (!window.confirm(`Remove student "${studentName}"? Their record will be kept and marked inactive, and can be reactivated later.`)) return;
    try {
      // Soft delete - mark as deleted instead of removing
      await updateDoc(doc(db, "students", studentId), {
        deleted: true,
        deletedAt: new Date()
      });
      // Update classroom count
      const cls = classrooms.find(c => c.id === classroomId);
      if (cls) {
        const newCount = Math.max((cls.enrolledCount || 1) - 1, 0);
        await updateDoc(doc(db, "classrooms", classroomId), { enrolledCount: newCount });
      }
      if (selectedClassroom && selectedClassroom.id === classroomId) {
        const updated = { ...selectedClassroom, enrolledCount: Math.max((selectedClassroom.enrolledCount || 1) - 1, 0) };
        setSelectedClassroom(updated);
        await handleViewClassroom(updated);
      }
      // If this was the parent's last active child, deactivate the parent too
      let parentAlsoDeactivated = false;
      if (parentId) {
        const remainingActiveChildren = students.filter(s => s.parentId === parentId && s.id !== studentId && !s.deleted);
        if (remainingActiveChildren.length === 0) {
          await updateDoc(doc(db, "users", parentId), { active: false, deactivatedAt: new Date() });
          parentAlsoDeactivated = true;
        }
      }
      fetchAllData();
      setSuccessMsg(parentAlsoDeactivated
        ? `Student "${studentName}" removed. This was their last active child, so the parent account was also marked inactive.`
        : `Student "${studentName}" removed from class.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) { console.log(e); }
  };

  const handleReactivateStudent = async (studentId, studentName, classroomId) => {
    try {
      await updateDoc(doc(db, "students", studentId), {
        deleted: false,
        deletedAt: null
      });
      const cls = classrooms.find(c => c.id === classroomId);
      if (cls) {
        await updateDoc(doc(db, "classrooms", classroomId), { enrolledCount: (cls.enrolledCount || 0) + 1 });
      }
      if (selectedClassroom && selectedClassroom.id === classroomId) {
        const updated = { ...selectedClassroom, enrolledCount: (selectedClassroom.enrolledCount || 0) + 1 };
        setSelectedClassroom(updated);
        await handleViewClassroom(updated);
      }
      fetchAllData();
      setSuccessMsg(`Student "${studentName}" reactivated.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) { console.log(e); }
  };

  const openEditStudent = (student) => {
    setError("");
    setEditingStudent(student);
    setStudentForm({
      name: student.name || "", dob: student.dob || "", gender: student.gender || "Boy",
      age: String(student.age || ""), ic: student.ic || "", classroomId: student.classroomId || "",
    });
    setShowEditStudent(true);
  };

  const updateStudentForm = (field, value) => {
    const updated = { ...studentForm, [field]: value };
    if (field === "ic") {
      const { age, dob } = calculateFromIC(value);
      updated.age = age || studentForm.age;
      updated.dob = dob || studentForm.dob;
    }
    setStudentForm(updated);
  };

  const handleEditStudent = async () => {
    setError("");
    if (!studentForm.name.trim()) { setError("Name is required"); return; }
    if (!studentForm.classroomId) { setError("Please select a classroom"); return; }
    setLoading(true);
    try {
      const oldClassroomId = editingStudent.classroomId;
      await updateDoc(doc(db, "students", editingStudent.id), {
        name: studentForm.name, dob: studentForm.dob, gender: studentForm.gender,
        age: parseInt(studentForm.age) || 0, ic: studentForm.ic, classroomId: studentForm.classroomId,
      });
      // If the classroom changed, move the enrollment count over
      if (oldClassroomId !== studentForm.classroomId && !editingStudent.deleted) {
        const oldCls = classrooms.find(c => c.id === oldClassroomId);
        const newCls = classrooms.find(c => c.id === studentForm.classroomId);
        if (oldCls) await updateDoc(doc(db, "classrooms", oldClassroomId), { enrolledCount: Math.max((oldCls.enrolledCount || 1) - 1, 0) });
        if (newCls) await updateDoc(doc(db, "classrooms", studentForm.classroomId), { enrolledCount: (newCls.enrolledCount || 0) + 1 });
      }
      setShowEditStudent(false);
      setEditingStudent(null);
      setSuccessMsg("Student updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchAllData();
      if (selectedClassroom) await handleViewClassroom(selectedClassroom);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleLogout = async () => { await signOut(auth); window.location.href = "/"; };

  const calculateFromIC = (ic) => {
    const cleanIC = ic.replace(/-/g, "");
    if (cleanIC.length < 6) return { age: "", dob: "" };
    const yearStr = cleanIC.substring(0, 2);
    const month = cleanIC.substring(2, 4);
    const day = cleanIC.substring(4, 6);
    const currentYear = new Date().getFullYear();
    const century = parseInt(yearStr) > parseInt(String(currentYear).substring(2)) ? 1900 : 2000;
    const birthYear = century + parseInt(yearStr);
    const dob = `${birthYear}-${month}-${day}`;
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    if (today.getMonth() + 1 < parseInt(month) || (today.getMonth() + 1 === parseInt(month) && today.getDate() < parseInt(day))) age--;
    return { age: String(age), dob };
  };

  const generateCredentials = (firstName, lastName, ic) => {
    const cleanIC = ic.replace(/-/g, "");
    const mid2 = cleanIC.substring(6, 8);
    const last4 = cleanIC.substring(8, 12);
    const sixDigits = mid2 + last4;
    const capFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const capLast = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    return {
      username: capFirst + capLast,
      email: (firstName + lastName).toLowerCase() + "@pasti.edu.my",
      password: capFirst + sixDigits,
      capFirst, capLast
    };
  };

  const validateIC = (ic) => {
  const clean = ic.replace(/-/g, "");
  return /^\d{12}$/.test(clean);
};

const validateName = (name) => {
  return /^[a-zA-Z\s]+$/.test(name.trim());
};

const validatePhone = (phone) => {
  return /^01\d{8,9}$/.test(phone);
};

const validateYear = (year) => {
  return /^\d{4}$/.test(year);
};

  // CLASSROOM
  const handleAddClassroom = async () => {
    setError("");
    if (!classroomForm.name || !classroomForm.limit) { setError("Please fill all required fields"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "classrooms"), {
        ...classroomForm, ageCategory: parseInt(classroomForm.ageCategory),
        limit: parseInt(classroomForm.limit), enrolledCount: 0, createdAt: new Date()
      });
      setShowAddClassroom(false);
      setClassroomForm({ name: "", ageCategory: "4", limit: "", teacherId: "", teacherName: "" });
      fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleEditClassroom = async () => {
    setError(""); setLoading(true);
    try {
      await updateDoc(doc(db, "classrooms", editingClassroom.id), {
        ...classroomForm, ageCategory: parseInt(classroomForm.ageCategory), limit: parseInt(classroomForm.limit),
      });
      setEditingClassroom(null); setShowAddClassroom(false); fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleDeleteClassroom = async (id) => {
    if (!window.confirm("Delete this classroom?")) return;
    await deleteDoc(doc(db, "classrooms", id)); fetchAllData();
  };

  // TEACHER
  const handleAddTeacher = async () => {
    setError("");
    if (!teacherForm.firstName || !teacherForm.lastName || !teacherForm.ic) { setError("First name, last name and IC are required"); return; }
    if (teacherForm.ic.replace(/-/g, "").length !== 12) { setError("IC must be 12 digits"); return; }
    if (teacherForm.emergencyPhone && !/^01\d{8,9}$/.test(teacherForm.emergencyPhone)) 
        {setError("Emergency phone must start with 01 and be 10-11 digits"); return;}
    setLoading(true);
    try {
      const adminEmail = admin.email;
      const adminPassword = sessionStorage.getItem("adminPass");
      if (!adminPassword) { setError("Session expired."); setLoading(false); return; }
      const { username, email, password, capFirst, capLast } = generateCredentials(teacherForm.firstName, teacherForm.lastName, teacherForm.ic);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", result.user.uid), {
        firstName: capFirst, lastName: capLast, name: capFirst + " " + capLast,
        username, email, password, ic: teacherForm.ic, age: parseInt(teacherForm.age) || 0,
        qualifications: teacherForm.qualifications, specialty: teacherForm.specialty,
        entryYear: teacherForm.entryYear, address: teacherForm.address,
        emergencyName: teacherForm.emergencyName, emergencyPhone: teacherForm.emergencyPhone,
        role: "teacher", profilePicUrl: "", createdAt: new Date(), active: true
      });
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      if (adminUidRef.current) await fetchAdminData(adminUidRef.current);
      setShowAddTeacher(false);
      setTeacherForm({ firstName: "", lastName: "", ic: "", age: "", qualifications: "", specialty: "", entryYear: "", address: "", emergencyName: "", emergencyPhone: "" });
      setSuccessMsg(`Teacher ${username} created! Password: ${password}`);
      setTimeout(() => setSuccessMsg(""), 5000);
      fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleEditTeacher = async () => {
    setError(""); setLoading(true);
    try {
      const capFirst = teacherForm.firstName.charAt(0).toUpperCase() + teacherForm.firstName.slice(1).toLowerCase();
      const capLast = teacherForm.lastName.charAt(0).toUpperCase() + teacherForm.lastName.slice(1).toLowerCase();
      await updateDoc(doc(db, "users", editingTeacher.id), {
        firstName: capFirst, lastName: capLast, name: capFirst + " " + capLast,
        qualifications: teacherForm.qualifications, specialty: teacherForm.specialty,
        entryYear: teacherForm.entryYear, address: teacherForm.address,
        emergencyName: teacherForm.emergencyName, emergencyPhone: teacherForm.emergencyPhone,
      });
      setShowEditTeacher(false); setEditingTeacher(null);
      setSuccessMsg("Teacher updated!"); setTimeout(() => setSuccessMsg(""), 3000);
      fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm("Remove this teacher? Their record will be kept and marked inactive, and can be reactivated later.")) return;
    await updateDoc(doc(db, "users", id), { active: false, deactivatedAt: new Date() });
    fetchAllData();
  };

  const handleReactivateTeacher = async (id) => {
    await updateDoc(doc(db, "users", id), { active: true, deactivatedAt: null });
    fetchAllData();
  };

  // PARENT - supports multiple children
  const handleAddParent = async () => {
    setError("");
    if (!parentForm.firstName.trim()) { setError("First name is required"); return; }
    if (!parentForm.lastName.trim()) { setError("Last name is required"); return; }
    if (!parentForm.ic.trim() || parentForm.ic.replace(/-/g, "").length !== 12) { setError("Valid IC is required (12 digits)"); return; }
    if (!parentForm.phone.trim()) { setError("Phone number is required"); return; }
    if (!validatePhone(parentForm.phone)) { setError("Phone must start with 01 and be 10-11 digits"); return; }
    if (children.length === 0 || !children[0].name.trim()) { setError("At least one child is required"); return; }
    if (!children[0].classroomId) { setError("Please select a class for child 1"); return; }
    setLoading(true);
    try {
      const adminEmail = admin.email;
      const adminPassword = sessionStorage.getItem("adminPass");
      if (!adminPassword) { setError("Session expired."); setLoading(false); return; }
      const { username, email, password, capFirst, capLast } = generateCredentials(parentForm.firstName, parentForm.lastName, parentForm.ic);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const parentUid = result.user.uid;
      const childNames = children.map(c => c.name).join(", ");
      await setDoc(doc(db, "users", parentUid), {
        firstName: capFirst, lastName: capLast, name: capFirst + " " + capLast,
        username, email, password, ic: parentForm.ic,
        age: parseInt(parentForm.age) || 0, phone: parentForm.phone || "",
        address: parentForm.address || "", emergencyName: parentForm.emergencyName || "",
        emergencyPhone: parentForm.emergencyPhone || "", childName: childNames,
        role: "parent", profilePicUrl: "", createdAt: new Date(), active: true
      });

      // Create each child
      const enrolledDeltas = {};
      for (const child of children) {
        if (!child.name.trim() || !child.classroomId) continue;
        const selectedClass = classrooms.find(c => c.id === child.classroomId);
        const classAge = selectedClass?.ageCategory || 4;
        const sylSnap = await getDocs(collection(db, "syllabus"));
        const matchSyl = sylSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(s => String(s.ageCategory) === String(classAge));
        const lessons = matchSyl?.lessons || [];
        const lessonsMap = {};
        lessons.forEach((_, i) => { lessonsMap[`L${i + 1}`] = false; });
        const studentRef = await addDoc(collection(db, "students"), {
          name: child.name, dob: child.dob || "", gender: child.gender || "Boy",
          age: parseInt(child.age) || 0, ic: child.ic || "",
          classroomId: child.classroomId, parentId: parentUid,
          verified: true, deleted: false, createdAt: new Date()
        });
        await setDoc(doc(db, "progress", studentRef.id), {
          studentId: studentRef.id, classroomId: child.classroomId,
          lessons: lessonsMap, completedCount: 0, totalLessons: lessons.length, lastUpdated: new Date()
        });
        enrolledDeltas[child.classroomId] = (enrolledDeltas[child.classroomId] || 0) + 1;
        await updateDoc(doc(db, "classrooms", child.classroomId), {
          enrolledCount: (selectedClass?.enrolledCount || 0) + enrolledDeltas[child.classroomId]
        });
      }

      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      if (adminUidRef.current) await fetchAdminData(adminUidRef.current);
      setShowAddParent(false);
      setParentForm({ firstName: "", lastName: "", ic: "", age: "", phone: "", address: "", emergencyName: "", emergencyPhone: "" });
      setChildren([{ name: "", dob: "", gender: "Boy", age: "", ic: "", classroomId: "" }]);
      setSuccessMsg(`✅ Parent ${username} registered with ${children.length} child(ren)! Password: ${password}`);
      setTimeout(() => setSuccessMsg(""), 8000);
      fetchAllData();
    } catch (e) { console.log(e); setError(e.message); }
    setLoading(false);
  };

  const handleEditParent = async () => {
    setError("");
    if (parentForm.phone && !validatePhone(parentForm.phone)) { setError("Phone must start with 01 and be 10-11 digits"); return; }
    setLoading(true);
    try {
      const capFirst = parentForm.firstName.charAt(0).toUpperCase() + parentForm.firstName.slice(1).toLowerCase();
      const capLast = parentForm.lastName.charAt(0).toUpperCase() + parentForm.lastName.slice(1).toLowerCase();
      await updateDoc(doc(db, "users", editingParent.id), {
        firstName: capFirst, lastName: capLast, name: capFirst + " " + capLast,
        phone: parentForm.phone || "", address: parentForm.address,
        emergencyName: parentForm.emergencyName, emergencyPhone: parentForm.emergencyPhone,
      });

      // Save notification for admin
      await addDoc(collection(db, "notifications"), {
        type: "parent_update",
        message: `Parent ${capFirst} ${capLast} has updated their profile details.`,
        parentId: editingParent.id,
        parentName: capFirst + " " + capLast,
        timestamp: new Date(),
        read: false
      });

      setShowEditParent(false); setEditingParent(null);
      setSuccessMsg("Parent updated! Notification sent to admin.");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchAllData();
      fetchNotifications();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    try {
      const snap = await getDocs(collection(db, "notifications"));
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
      setNotifications(notifs);
    } catch (e) { console.log(e); }
  };

  const handleDeleteParent = (id) => {
    const parent = parents.find(p => p.id === id);
    const activeChildren = students.filter(s => s.parentId === id && !s.deleted);
    if (activeChildren.length > 1) {
      // Ambiguous: could mean "one child left PASTI" or "the whole family left" - let the admin choose.
      setError("");
      setDeletingParent(parent);
      setDeleteParentMode(null);
      setDeleteParentChildId("");
      setShowDeleteParentConfirm(true);
      return;
    }
    handleDeleteParentSingle(id, activeChildren[0]);
  };

  const handleDeleteParentSingle = async (id, onlyChild) => {
    if (!window.confirm(onlyChild
      ? `Remove this parent? Their child "${onlyChild.name}" will also be marked inactive. Both can be reactivated later.`
      : "Remove this parent? Their record will be kept and marked inactive, and can be reactivated later.")) return;
    try {
      await updateDoc(doc(db, "users", id), { active: false, deactivatedAt: new Date() });
      if (onlyChild) {
        await updateDoc(doc(db, "students", onlyChild.id), { deleted: true, deletedAt: new Date() });
        const cls = classrooms.find(c => c.id === onlyChild.classroomId);
        if (cls) await updateDoc(doc(db, "classrooms", onlyChild.classroomId), { enrolledCount: Math.max((cls.enrolledCount || 1) - 1, 0) });
      }
      fetchAllData();
    } catch (e) { console.log(e); }
  };

  const handleConfirmDeleteParentOneChild = async () => {
    setError("");
    if (!deleteParentChildId) { setError("Please select which child is no longer a student"); return; }
    if (!window.confirm("Confirm: only the selected child will be marked inactive. The parent account and other children stay active.")) return;
    setLoading(true);
    try {
      const student = students.find(s => s.id === deleteParentChildId);
      await updateDoc(doc(db, "students", deleteParentChildId), { deleted: true, deletedAt: new Date() });
      const cls = classrooms.find(c => c.id === student.classroomId);
      if (cls) await updateDoc(doc(db, "classrooms", student.classroomId), { enrolledCount: Math.max((cls.enrolledCount || 1) - 1, 0) });
      setShowDeleteParentConfirm(false);
      setDeletingParent(null);
      setDeleteParentMode(null);
      setDeleteParentChildId("");
      setSuccessMsg(`Student "${student.name}" removed. Parent account remains active.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleConfirmDeleteParentAllChildren = async () => {
    setError("");
    if (!window.confirm(`Confirm: "${deletingParent.name}" and all their children will be marked inactive.`)) return;
    setLoading(true);
    try {
      const activeChildren = students.filter(s => s.parentId === deletingParent.id && !s.deleted);
      const enrolledDeltas = {};
      for (const child of activeChildren) {
        await updateDoc(doc(db, "students", child.id), { deleted: true, deletedAt: new Date() });
        const cls = classrooms.find(c => c.id === child.classroomId);
        enrolledDeltas[child.classroomId] = (enrolledDeltas[child.classroomId] || 0) + 1;
        if (cls) await updateDoc(doc(db, "classrooms", child.classroomId), { enrolledCount: Math.max((cls.enrolledCount || 1) - enrolledDeltas[child.classroomId], 0) });
      }
      await updateDoc(doc(db, "users", deletingParent.id), { active: false, deactivatedAt: new Date() });
      setSuccessMsg(`Parent "${deletingParent.name}" and all ${activeChildren.length} child(ren) marked inactive.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setShowDeleteParentConfirm(false);
      setDeletingParent(null);
      setDeleteParentMode(null);
      fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const openReactivateParent = (p) => {
    setError("");
    setReactivatingParent(p);
    setReactivateSelectedIds([]);
    setChildren([]);
    setShowReactivateParent(true);
  };

  const toggleReactivateStudentId = (id) => {
    setReactivateSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirmReactivateParent = async () => {
    setError("");
    const newChildren = children.filter(c => c.name.trim() || c.classroomId);
    for (const c of newChildren) {
      if (!c.name.trim()) { setError("Every new child needs a name"); return; }
      if (!c.classroomId) { setError(`Please select a class for "${c.name}"`); return; }
    }
    if (reactivateSelectedIds.length === 0 && newChildren.length === 0) {
      setError("Select at least one existing child to restore, or add a new child");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", reactivatingParent.id), { active: true, deactivatedAt: null });

      const enrolledDeltas = {};

      // Restore chosen previously-removed children
      for (const studentId of reactivateSelectedIds) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;
        await updateDoc(doc(db, "students", studentId), { deleted: false, deletedAt: null });
        const cls = classrooms.find(c => c.id === student.classroomId);
        enrolledDeltas[student.classroomId] = (enrolledDeltas[student.classroomId] || 0) + 1;
        if (cls) await updateDoc(doc(db, "classrooms", student.classroomId), { enrolledCount: (cls.enrolledCount || 0) + enrolledDeltas[student.classroomId] });
      }

      // Create any brand-new children
      for (const child of newChildren) {
        const selectedClass = classrooms.find(c => c.id === child.classroomId);
        const classAge = selectedClass?.ageCategory || 4;
        const sylSnap = await getDocs(collection(db, "syllabus"));
        const matchSyl = sylSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(s => String(s.ageCategory) === String(classAge));
        const lessons = matchSyl?.lessons || [];
        const lessonsMap = {};
        lessons.forEach((_, i) => { lessonsMap[`L${i + 1}`] = false; });
        const studentRef = await addDoc(collection(db, "students"), {
          name: child.name, dob: child.dob || "", gender: child.gender || "Boy",
          age: parseInt(child.age) || 0, ic: child.ic || "",
          classroomId: child.classroomId, parentId: reactivatingParent.id,
          verified: true, deleted: false, createdAt: new Date()
        });
        await setDoc(doc(db, "progress", studentRef.id), {
          studentId: studentRef.id, classroomId: child.classroomId,
          lessons: lessonsMap, completedCount: 0, totalLessons: lessons.length, lastUpdated: new Date()
        });
        enrolledDeltas[child.classroomId] = (enrolledDeltas[child.classroomId] || 0) + 1;
        await updateDoc(doc(db, "classrooms", child.classroomId), {
          enrolledCount: (selectedClass?.enrolledCount || 0) + enrolledDeltas[child.classroomId]
        });
      }

      setShowReactivateParent(false);
      setSuccessMsg(`Parent ${reactivatingParent.name} reactivated.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      setReactivatingParent(null);
      setReactivateSelectedIds([]);
      setChildren([{ name: "", dob: "", gender: "Boy", age: "", ic: "", classroomId: "" }]);
      fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // SYLLABUS
  const handleAddSyllabus = async () => {
    setError("");
    if (syllabusForm.lessons.length === 0) { setError("Add at least one lesson"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "syllabus"), {
        ageCategory: parseInt(syllabusForm.ageCategory), lessons: syllabusForm.lessons,
        totalLessons: syllabusForm.lessons.length, createdAt: new Date()
      });
      setShowAddSyllabus(false); setSyllabusForm({ ageCategory: "4", lessons: [], newLesson: "" }); fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleEditSyllabus = async () => {
    setError(""); setLoading(true);
    try {
      await updateDoc(doc(db, "syllabus", selectedSyllabus.id), {
        lessons: syllabusForm.lessons, totalLessons: syllabusForm.lessons.length,
      });
      setShowEditSyllabus(false); setSelectedSyllabus(null); fetchAllData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleDeleteSyllabus = async (id) => {
    if (!window.confirm("Delete this syllabus?")) return;
    await deleteDoc(doc(db, "syllabus", id)); fetchAllData();
  };

  const addLesson = () => {
    if (!syllabusForm.newLesson.trim()) return;
    setSyllabusForm(prev => ({ ...prev, lessons: [...prev.lessons, prev.newLesson.trim()], newLesson: "" }));
  };

  const removeLesson = (index) => {
    setSyllabusForm(prev => ({ ...prev, lessons: prev.lessons.filter((_, i) => i !== index) }));
  };

  const updateChild = (index, field, value) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "ic") {
      const { age, dob } = calculateFromIC(value);
      updated[index].age = age || updated[index].age;
      updated[index].dob = dob || updated[index].dob;
    }
    setChildren(updated);
  };

  const addChild = () => {
    setChildren([...children, { name: "", dob: "", gender: "Boy", age: "", ic: "", classroomId: "" }]);
  };

  const removeChild = (index) => {
    if (children.length === 1) return;
    setChildren(children.filter((_, i) => i !== index));
  };

  const removeNewChild = (index) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  // Live enrolled count from actual student records (avoids drift in the stored enrolledCount field)
  const getClassEnrolledCount = (classroomId) => students.filter(s => s.classroomId === classroomId && !s.deleted).length;

  // Calculate class progress percentage
  const getClassProgressPct = (classroomId) => {
    const classStudentList = students.filter(s => s.classroomId === classroomId && !s.deleted);
    if (classStudentList.length === 0) return 0;
    const syl = syllabus.find(s => {
      const cls = classrooms.find(c => c.id === classroomId);
      return String(s.ageCategory) === String(cls?.ageCategory);
    });
    if (!syl || syl.lessons.length === 0) return 0;
    let totalPct = 0;
    classStudentList.forEach(student => {
      const prog = allProgress[student.id];
      if (prog?.lessons) {
        const completed = Object.values(prog.lessons).filter(v => v === true).length;
        totalPct += (completed / syl.lessons.length) * 100;
      }
    });
    return Math.round(totalPct / classStudentList.length);
  };

  const filteredClassrooms = classrooms
    .filter(c => classAgeFilter === "all" || String(c.ageCategory) === classAgeFilter)
    .filter(c => {
      const q = classSearch.trim().toLowerCase();
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.teacherName || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (classSort === "progress-desc") return getClassProgressPct(b.id) - getClassProgressPct(a.id);
      if (classSort === "progress-asc") return getClassProgressPct(a.id) - getClassProgressPct(b.id);
      if (classSort === "name-desc") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });

  const filteredTeachers = teachers
    .filter(t => {
      const q = teacherSearch.trim().toLowerCase();
      const matchesSearch = !q || (t.name || "").toLowerCase().includes(q) || (t.username || "").toLowerCase().includes(q) || (t.specialty || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (teacherStatusFilter === "all") return true;
      const isActive = t.active !== false;
      return teacherStatusFilter === "active" ? isActive : !isActive;
    })
    .sort((a, b) => teacherSort === "name-desc" ? (b.name || "").localeCompare(a.name || "") : (a.name || "").localeCompare(b.name || ""));

  const filteredParents = parents
    .filter(p => {
      const q = parentSearch.trim().toLowerCase();
      const matchesSearch = !q || (p.name || "").toLowerCase().includes(q) || (p.username || "").toLowerCase().includes(q) ||
        students.some(s => s.parentId === p.id && (s.name || "").toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (parentStatusFilter === "all") return true;
      const isActive = p.active !== false;
      return parentStatusFilter === "active" ? isActive : !isActive;
    })
    .sort((a, b) => {
      if (parentSort === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (parentSort === "name-desc") return (b.name || "").localeCompare(a.name || "");
      const aActive = a.active !== false;
      const bActive = b.active !== false;
      return bActive - aActive;
    });

  const filteredStudents = students
    .filter(s => studentClassFilter === "all" || s.classroomId === studentClassFilter)
    .filter(s => {
      if (studentStatusFilter === "all") return true;
      return studentStatusFilter === "active" ? !s.deleted : !!s.deleted;
    })
    .filter(s => {
      const q = studentSearch.trim().toLowerCase();
      if (!q) return true;
      const parent = parents.find(p => p.id === s.parentId);
      return (s.name || "").toLowerCase().includes(q) || (parent?.name || "").toLowerCase().includes(q);
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const navItems = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "staff", label: "Staff", icon: "👩‍🏫" },
    { id: "syllabus", label: "Syllabus", icon: "📚" },
    { id: "parents", label: "Parents", icon: "👨‍👩‍👧" },
    { id: "reports", label: "Reports", icon: "📋" },
    { id: "alerts", label: "Alerts", icon: notifications.length > 0 ? "🔔" : "🔔" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.topTitle}>PASTI</h1>
          <p style={styles.topSub}>Admin Portal</p>
        </div>
        <div style={styles.adminInfo}>
          <p style={styles.adminName}>{admin?.name || "Admin"}</p>
          {notifications.length > 0 && (
            <div className="pasti-notif-badge" style={styles.notifBadge} onClick={() => setActivePage("alerts")}>
              🔔 {notifications.length}
            </div>
          )}
          <button onClick={() => window.location.href = "/profile"} style={{ ...styles.logoutBtn, marginRight: "8px" }}>👤 Profile</button>
          <button onClick={handleLogout} className="pasti-btn" style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {successMsg && <div style={styles.successBar}>✅ {successMsg}</div>}

      <div key={activePage + (showClassDetail ? "-detail" : "")} className="pasti-fade-in" style={styles.content}>

        {/* HOME */}
        {activePage === "home" && !showClassDetail && (
          <div>
            <h2 style={styles.pageTitle}>Dashboard</h2>
            <div style={styles.statsRow}>
              <div className="pasti-card" style={{ ...styles.statCard, cursor: "pointer" }} onClick={() => setActivePage("students")}><div style={styles.statIcon}>👨‍🎓</div><p style={styles.statLabel}>Total Students</p><h2 style={styles.statValue}>{totalStudents}</h2></div>
              <div className="pasti-card" style={{ ...styles.statCard, cursor: "pointer" }} onClick={goToClassrooms}><div style={styles.statIcon}>🏫</div><p style={styles.statLabel}>Classrooms</p><h2 style={styles.statValue}>{classrooms.length}</h2></div>
              <div className="pasti-card" style={{ ...styles.statCard, cursor: "pointer" }} onClick={() => setActivePage("staff")}><div style={styles.statIcon}>👩‍🏫</div><p style={styles.statLabel}>Teachers</p><h2 style={styles.statValue}>{teachers.length}</h2></div>
            </div>

            {/* Progress circles by class */}
            {classrooms.length > 0 && (
              <div className="pasti-card" style={styles.section}>
                <h3 style={styles.sectionTitle}>Class Progress Overview</h3>
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center", padding: "16px 0" }}>
                  {classrooms.map(c => {
                    const pct = getClassProgressPct(c.id);
                    const color = pct >= 75 ? "#1B5E20" : pct >= 50 ? "#F57F17" : "#C62828";
                    return (
                      <div key={c.id} style={{ cursor: "pointer" }} onClick={() => handleViewClassroom(c)}>
                        <ProgressCircle percentage={pct} size={90} color={color} label={c.name} sublabel={`Age ${c.ageCategory}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div ref={classroomsSectionRef} className="pasti-card" style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Classrooms</h3>
                <button className="pasti-btn" style={styles.addBtn} onClick={() => { setError(""); setEditingClassroom(null); setClassroomForm({ name: "", ageCategory: "4", limit: "", teacherId: "", teacherName: "" }); setShowAddClassroom(true); }}>+ Add</button>
              </div>

              <div style={styles.filterBar}>
                <input className="pasti-input" style={{ ...styles.input, ...styles.searchInput, marginBottom: 0 }} placeholder="🔍 Search by class or teacher..." value={classSearch} onChange={e => setClassSearch(e.target.value)} />
                <select className="pasti-input" style={{ ...styles.input, ...styles.filterSelect, marginBottom: 0 }} value={classAgeFilter} onChange={e => setClassAgeFilter(e.target.value)}>
                  <option value="all">All Ages</option>
                  <option value="4">Age 4</option>
                  <option value="5">Age 5</option>
                  <option value="6">Age 6</option>
                </select>
                <select className="pasti-input" style={{ ...styles.input, ...styles.filterSelect, marginBottom: 0 }} value={classSort} onChange={e => setClassSort(e.target.value)}>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="progress-desc">Progress: High to Low</option>
                  <option value="progress-asc">Progress: Low to High</option>
                </select>
              </div>

              {classrooms.length === 0 ? <p style={styles.empty}>No classrooms yet.</p> : filteredClassrooms.length === 0 ? <p style={styles.empty}>No classrooms match your search/filter.</p> : filteredClassrooms.map((c) => {
                const liveEnrolled = getClassEnrolledCount(c.id);
                const enrollPct = c.limit ? Math.round((liveEnrolled / c.limit) * 100) : 0;
                const progressPct = getClassProgressPct(c.id);
                const assignedTeacher = teachers.find(t => t.id === c.teacherId);
                const teacherInactive = !!c.teacherId && assignedTeacher?.active === false;
                return (
                  <div key={c.id} className="pasti-row" style={{
                    ...styles.classCard, cursor: "pointer",
                    ...(teacherInactive ? { border: "1.5px solid #ef9a9a", background: "#fff5f5" } : {})
                  }} onClick={() => handleViewClassroom(c)}>
                    <div style={styles.classLeft}>
                      <div style={styles.classIconEl}>🏫</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={styles.className}>{c.name} (Age {c.ageCategory})</h4>
                        <p style={styles.classInfo}>👩‍🏫 {c.teacherName || "-"} | 👨‍🎓 {liveEnrolled}/{c.limit || 0}</p>
                        {teacherInactive && (
                          <p style={{ margin: "2px 0", fontSize: "12px", color: "#c62828", fontWeight: "600" }}>
                            ⚠️ Teacher no longer serving — assign a new teacher
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                          <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${enrollPct}%` }} /></div>
                          <span style={{ fontSize: "11px", color: "#888" }}>{enrollPct}% enrolled</span>
                        </div>
                      </div>
                      <ProgressCircle percentage={progressPct} size={64} color={progressPct >= 50 ? "#2E7D32" : "#F57F17"} />
                    </div>
                    <div style={styles.classActions}>
                      <button className="pasti-icon-btn" style={styles.editBtn} onClick={(e) => { e.stopPropagation(); setError(""); setEditingClassroom(c); setClassroomForm({ name: c.name, ageCategory: String(c.ageCategory), limit: String(c.limit), teacherId: c.teacherId || "", teacherName: c.teacherName || "" }); setShowAddClassroom(true); }}>✏️</button>
                      <button className="pasti-icon-btn" style={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDeleteClassroom(c.id); }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CLASSROOM DETAIL */}
        {activePage === "home" && showClassDetail && selectedClassroom && (
          <div>
            <div style={styles.detailHeader}>
              <button className="pasti-btn" style={styles.backBtn} onClick={() => setShowClassDetail(false)}>← Back</button>
              <div style={{ flex: 1 }}>
                <h2 style={styles.pageTitle}>{selectedClassroom.name} — Progress</h2>
                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>Age {selectedClassroom.ageCategory} | 👩‍🏫 {selectedClassroom.teacherName || "-"}</p>
                {(() => {
                  const assignedTeacher = teachers.find(t => t.id === selectedClassroom.teacherId);
                  const teacherInactive = !!selectedClassroom.teacherId && assignedTeacher?.active === false;
                  return teacherInactive ? (
                    <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#c62828", fontWeight: "600" }}>
                      ⚠️ Teacher no longer serving — assign a new teacher
                    </p>
                  ) : null;
                })()}
              </div>
              {classSyllabus && (
                <ProgressCircle
                  percentage={(() => {
                    const active = classStudents.filter(s => !s.deleted);
                    if (!active.length || !classSyllabus) return 0;
                    let total = 0;
                    active.forEach(s => {
                      const prog = classProgress[s.id];
                      const done = classSyllabus.lessons.filter((_, i) => prog?.lessons?.[`L${i + 1}`] === true).length;
                      total += (done / classSyllabus.lessons.length) * 100;
                    });
                    return Math.round(total / active.length);
                  })()}
                  size={80} color="#2E7D32" label="Class Avg" />
              )}
            </div>

            {!classSyllabus ? (
              <div style={{ background: "#fff3e0", color: "#e65100", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
                ⚠️ No syllabus for Age {selectedClassroom.ageCategory}. Create one in Syllabus page!
              </div>
            ) : (
              <div style={{ background: "#e8f5e9", color: "#1B5E20", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px" }}>
                📚 {classSyllabus.totalLessons} lessons | Hover L1, L2... to see names
              </div>
            )}

            {classStudents.length === 0 ? (
              <div className="pasti-card" style={styles.section}><p style={styles.empty}>No students yet.</p></div>
            ) : (
              <div style={{ overflowX: "auto", background: "white", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: "8px" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, textAlign: "left", minWidth: "180px", position: "sticky", left: 0, background: "#f8f8f8" }}>Student</th>
                      {classSyllabus?.lessons.map((lessonName, i) => (
                        <th key={i} style={{ ...styles.th, color: "#2E7D32", position: "relative", minWidth: "42px" }}
                          onMouseEnter={() => setHoveredLesson(i)} onMouseLeave={() => setHoveredLesson(null)}>
                          L{i + 1}
                          {hoveredLesson === i && <div style={styles.tooltip}>{lessonName}</div>}
                        </th>
                      ))}
                      <th style={{ ...styles.th, minWidth: "80px" }}>Progress</th>
                      <th style={{ ...styles.th, minWidth: "60px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student, idx) => {
                      const prog = classProgress[student.id];
                      const lessons = classSyllabus?.lessons || [];
                      const completed = lessons.filter((_, i) => prog?.lessons?.[`L${i + 1}`] === true).length;
                      const total = lessons.length;
                      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                      const isDeleted = student.deleted;
                      return (
                        <tr key={student.id} style={{ background: isDeleted ? "#fafafa" : idx % 2 === 0 ? "white" : "#fafffe", opacity: isDeleted ? 0.4 : 1 }}>
                          <td style={{ ...styles.td, textAlign: "left", fontWeight: "500", position: "sticky", left: 0, background: isDeleted ? "#fafafa" : idx % 2 === 0 ? "white" : "#fafffe" }}>
                            {student.name}
                            <span style={{ fontSize: "11px", color: "#999", marginLeft: "4px" }}>{student.gender}</span>
                            {isDeleted && <span style={{ fontSize: "10px", color: "#c62828", marginLeft: "6px", background: "#ffebee", padding: "1px 6px", borderRadius: "8px" }}>Removed</span>}
                          </td>
                          {lessons.map((_, i) => (
                            <td key={i} style={styles.td}>{prog?.lessons?.[`L${i + 1}`] === true ? "✅" : "⬜"}</td>
                          ))}
                          <td style={styles.td}>
                            <ProgressCircle percentage={pct} size={48} color={pct >= 50 ? "#2E7D32" : "#F57F17"} />
                          </td>
                          <td style={styles.td}>
                            {isDeleted ? (
                              <button className="pasti-btn" style={styles.reactivateBtn} onClick={() => handleReactivateStudent(student.id, student.name, selectedClassroom.id)}>♻️</button>
                            ) : (
                              <>
                                <button className="pasti-icon-btn" style={styles.editBtn} onClick={() => openEditStudent(student)}>✏️</button>
                                <button className="pasti-icon-btn" style={styles.deleteBtn} onClick={() => handleDeleteStudent(student.id, student.name, selectedClassroom.id, student.parentId)}>🗑️</button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STUDENTS DIRECTORY */}
        {activePage === "students" && (
          <div>
            <div style={styles.detailHeader}>
              <button className="pasti-btn" style={styles.backBtn} onClick={() => setActivePage("home")}>← Back</button>
              <div style={{ flex: 1 }}>
                <h2 style={styles.pageTitle}>All Students</h2>
                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>{filteredStudents.length} of {students.length} students</p>
              </div>
            </div>

            <div className="pasti-card" style={styles.section}>
              <div style={styles.filterBar}>
                <input className="pasti-input" style={{ ...styles.input, ...styles.searchInput, marginBottom: 0 }} placeholder="🔍 Search by student or parent name..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                <select className="pasti-input" style={{ ...styles.input, ...styles.filterSelect, marginBottom: 0 }} value={studentClassFilter} onChange={e => setStudentClassFilter(e.target.value)}>
                  <option value="all">All Classes</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} (Age {c.ageCategory})</option>)}
                </select>
                <select className="pasti-input" style={{ ...styles.input, ...styles.filterSelect, marginBottom: 0 }} value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Not Active only</option>
                </select>
              </div>

              {students.length === 0 ? <p style={styles.empty}>No students yet.</p> : filteredStudents.length === 0 ? <p style={styles.empty}>No students match your search/filter.</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, textAlign: "left" }}>Student</th>
                        <th style={styles.th}>Gender</th>
                        <th style={styles.th}>Age</th>
                        <th style={styles.th}>Classroom</th>
                        <th style={styles.th}>Parent</th>
                        <th style={styles.th}>Parent Phone</th>
                        <th style={styles.th}>Progress</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, idx) => {
                        const classroom = classrooms.find(c => c.id === s.classroomId);
                        const parent = parents.find(p => p.id === s.parentId);
                        const syl = syllabus.find(sy => String(sy.ageCategory) === String(classroom?.ageCategory));
                        const lessons = syl?.lessons || [];
                        const prog = allProgress[s.id];
                        const completed = lessons.filter((_, i) => prog?.lessons?.[`L${i + 1}`] === true).length;
                        const pct = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
                        return (
                          <tr key={s.id} style={{ background: s.deleted ? "#fafafa" : idx % 2 === 0 ? "white" : "#fafffe", opacity: s.deleted ? 0.5 : 1 }}>
                            <td style={{ ...styles.td, textAlign: "left", fontWeight: "500" }}>{s.name}</td>
                            <td style={styles.td}>{s.gender || "-"}</td>
                            <td style={styles.td}>{s.age || "-"}</td>
                            <td style={styles.td}>{classroom ? `${classroom.name} (Age ${classroom.ageCategory})` : "-"}</td>
                            <td style={styles.td}>{parent?.name || "-"}</td>
                            <td style={styles.td}>{parent?.phone || "-"}</td>
                            <td style={styles.td}>
                              <ProgressCircle percentage={pct} size={44} color={pct >= 50 ? "#2E7D32" : "#F57F17"} />
                            </td>
                            <td style={styles.td}>{s.deleted ? "❌ Removed" : "✅ Active"}</td>
                            <td style={styles.td}>
                              {s.deleted ? (
                                <button className="pasti-btn" style={styles.reactivateBtn} onClick={() => handleReactivateStudent(s.id, s.name, s.classroomId)}>♻️</button>
                              ) : (
                                <>
                                  <button className="pasti-icon-btn" style={styles.editBtn} onClick={() => openEditStudent(s)}>✏️</button>
                                  <button className="pasti-icon-btn" style={styles.deleteBtn} onClick={() => handleDeleteStudent(s.id, s.name, s.classroomId, s.parentId)}>🗑️</button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STAFF */}
        {activePage === "staff" && (
          <div>
            <h2 style={styles.pageTitle}>Staff Management</h2>
            <div className="pasti-card" style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Teachers ({teachers.length})</h3>
                <button className="pasti-btn" style={styles.addBtn} onClick={() => { setError(""); setTeacherForm({ firstName: "", lastName: "", ic: "", age: "", qualifications: "", specialty: "", entryYear: "", address: "", emergencyName: "", emergencyPhone: "" }); setShowAddTeacher(true); }}>+ Add Teacher</button>
              </div>

              <div style={styles.filterBar}>
                <input className="pasti-input" style={{ ...styles.input, ...styles.searchInput, marginBottom: 0 }} placeholder="🔍 Search by name or specialty..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} />
                <select className="pasti-input" style={{ ...styles.input, ...styles.filterSelect, marginBottom: 0 }} value={teacherStatusFilter} onChange={e => setTeacherStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Not Active only</option>
                </select>
                <select className="pasti-input" style={{ ...styles.input, ...styles.filterSelect, marginBottom: 0 }} value={teacherSort} onChange={e => setTeacherSort(e.target.value)}>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>

              {teachers.length === 0 ? <p style={styles.empty}>No teachers yet.</p> : filteredTeachers.length === 0 ? <p style={styles.empty}>No teachers match your search/filter.</p> : filteredTeachers.map((t) => {
                const isInactive = t.active === false;
                const assignedClasses = classrooms.filter(c => c.teacherId === t.id);
                return (
                <div key={t.id} className="pasti-row" style={{ ...styles.classCard, opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f9f9f9" : "#fafafa" }}>
                  <div style={styles.classLeft}>
                    <div style={styles.classIconEl}>👩‍🏫</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h4 style={styles.className}>{t.name}</h4>
                        {isInactive && <span style={{ fontSize: "11px", color: "#c62828", background: "#ffebee", padding: "2px 8px", borderRadius: "10px" }}>Not Active</span>}
                      </div>
                      <p style={styles.classInfo}>👤 {t.username} | 🔑 {t.password}</p>
                      <p style={styles.classInfo}>📚 {t.specialty || "-"} | 🎓 {t.qualifications || "-"}</p>
                      <p style={styles.classInfo}>🏫 {assignedClasses.length > 0 ? assignedClasses.map(c => `${c.name} (Age ${c.ageCategory})`).join(", ") : "Not assigned to a class"}</p>
                    </div>
                  </div>
                  <div style={styles.classActions}>
                    {isInactive ? (
                      <button className="pasti-btn" style={styles.reactivateBtn} onClick={() => handleReactivateTeacher(t.id)}>♻️ Reactivate</button>
                    ) : (
                      <>
                        <button className="pasti-icon-btn" style={styles.editBtn} onClick={() => { setError(""); setEditingTeacher(t); setTeacherForm({ firstName: t.firstName || "", lastName: t.lastName || "", ic: t.ic || "", age: String(t.age || ""), qualifications: t.qualifications || "", specialty: t.specialty || "", entryYear: t.entryYear || "", address: t.address || "", emergencyName: t.emergencyName || "", emergencyPhone: t.emergencyPhone || "" }); setShowEditTeacher(true); }}>✏️</button>
                        <button className="pasti-icon-btn" style={styles.deleteBtn} onClick={() => handleDeleteTeacher(t.id)}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SYLLABUS */}
        {activePage === "syllabus" && (
          <div>
            <h2 style={styles.pageTitle}>Syllabus Management</h2>
            <div className="pasti-card" style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Age Group Syllabus</h3>
                <button className="pasti-btn" style={styles.addBtn} onClick={() => { setError(""); setSyllabusForm({ ageCategory: "4", lessons: [], newLesson: "" }); setShowAddSyllabus(true); }}>+ Add Syllabus</button>
              </div>
              {syllabus.length === 0 ? <p style={styles.empty}>No syllabus yet.</p> : syllabus.map((s) => (
                <div key={s.id} className="pasti-row" style={styles.classCard}>
                  <div style={styles.classLeft}>
                    <div style={styles.classIconEl}>📚</div>
                    <div>
                      <h4 style={styles.className}>Age {s.ageCategory} Years Old</h4>
                      <p style={styles.classInfo}>📖 {s.totalLessons} lessons | First: {s.lessons?.[0] || "-"}</p>
                    </div>
                  </div>
                  <div style={styles.classActions}>
                    <button className="pasti-icon-btn" style={styles.editBtn} onClick={() => { setError(""); setSelectedSyllabus(s); setSyllabusForm({ ageCategory: String(s.ageCategory), lessons: [...s.lessons], newLesson: "" }); setShowEditSyllabus(true); }}>✏️</button>
                    <button className="pasti-icon-btn" style={styles.deleteBtn} onClick={() => handleDeleteSyllabus(s.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PARENTS */}
        {activePage === "parents" && (
          <div>
            <h2 style={styles.pageTitle}>Parents Management</h2>
            <div className="pasti-card" style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Parents ({parents.length})</h3>
                <button className="pasti-btn" style={styles.addBtn} onClick={() => { setError(""); setParentForm({ firstName: "", lastName: "", ic: "", age: "", phone: "", address: "", emergencyName: "", emergencyPhone: "" }); setChildren([{ name: "", dob: "", gender: "Boy", age: "", ic: "", classroomId: "" }]); setShowAddParent(true); }}>+ Add Parent</button>
              </div>

              <div style={styles.filterBar}>
                <input className="pasti-input" style={{ ...styles.input, ...styles.searchInput, marginBottom: 0 }} placeholder="🔍 Search by parent or child name..." value={parentSearch} onChange={e => setParentSearch(e.target.value)} />
                <select className="pasti-input" style={{ ...styles.input, ...styles.filterSelect, marginBottom: 0 }} value={parentStatusFilter} onChange={e => setParentStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Not Active only</option>
                </select>
                <select className="pasti-input" style={{ ...styles.input, ...styles.filterSelect, marginBottom: 0 }} value={parentSort} onChange={e => setParentSort(e.target.value)}>
                  <option value="active-first">Active First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>

              {parents.length === 0 ? <p style={styles.empty}>No parents yet.</p> : filteredParents.length === 0 ? <p style={styles.empty}>No parents match your search/filter.</p> : filteredParents.map((p) => {
                const parentChildren = students.filter(s => s.parentId === p.id);
                const isInactive = p.active === false;
                return (
                  <div key={p.id} className="pasti-row" style={{ ...styles.classCard, opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f9f9f9" : "#fafafa" }}>
                    <div style={styles.classLeft}>
                      <div style={styles.classIconEl}>👨‍👩‍👧</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h4 style={styles.className}>{p.name}</h4>
                          {isInactive && <span style={{ fontSize: "11px", color: "#c62828", background: "#ffebee", padding: "2px 8px", borderRadius: "10px" }}>Not Active</span>}
                        </div>
                        <p style={styles.classInfo}>👤 {p.username} | 🔑 {p.password}</p>
                        <p style={styles.classInfo}>📱 {p.phone || "-"}</p>
                        {parentChildren.map((child, i) => {
                          const childClass = classrooms.find(c => c.id === child.classroomId);
                          return (
                            <p key={i} style={{ ...styles.classInfo, color: child.deleted ? "#bbb" : "#666", textDecoration: child.deleted ? "line-through" : "none" }}>
                              👶 {child.name} | 🏫 {childClass?.name || "-"} {child.deleted ? "(removed)" : ""}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                    <div style={styles.classActions}>
                      {isInactive ? (
                        <button className="pasti-btn" style={styles.reactivateBtn} onClick={() => openReactivateParent(p)}>♻️ Reactivate</button>
                      ) : (
                        <>
                          <button className="pasti-icon-btn" style={styles.editBtn} onClick={() => {
                            setError("");
                            setEditingParent(p);
                            setParentForm({
                              firstName: p.firstName || "", lastName: p.lastName || "",
                              ic: p.ic || "", age: String(p.age || ""),
                              phone: p.phone || "", address: p.address || "",
                              emergencyName: p.emergencyName || "", emergencyPhone: p.emergencyPhone || "",
                            });
                            setShowEditParent(true);
                          }}>✏️</button>
                          <button className="pasti-icon-btn" style={styles.deleteBtn} onClick={() => handleDeleteParent(p.id)}>🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {activePage === "reports" && (
          <div>
            <h2 style={styles.pageTitle}>Progress Reports</h2>
            <ReportsView db={db} classrooms={classrooms} students={students} allProgress={allProgress} syllabus={syllabus} />
          </div>
        )}

        {/* ALERTS */}
        {activePage === "alerts" && (
          <div>
            <h2 style={styles.pageTitle}>Alerts & Notifications</h2>
            <NotificationsView db={db} />
            {notifications.length > 0 && (
              <div className="pasti-card" style={styles.section}>
                <h3 style={styles.sectionTitle}>🎯 Progress Milestones</h3>
                {notifications.filter(n => n.type === "progress").map((n, i) => (
                  <div key={i} style={{ padding: "14px 16px", background: "#e8f5e9", borderRadius: "12px", marginBottom: "10px", color: "#1B5E20", fontSize: "14px" }}>
                    {n.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating Bottom Nav */}
      <div style={styles.floatingNav}>
        {navItems.map((item) => (
          <button key={item.id} className="pasti-nav-btn" onClick={() => { setActivePage(item.id); setShowClassDetail(false); }} style={activePage === item.id ? styles.navBtnActive : styles.navBtn}>
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* CLASSROOM MODAL */}
      {showAddClassroom && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={styles.modal}>
            <h3 style={styles.modalTitle}>{editingClassroom ? "Edit Classroom" : "Create New Classroom"}</h3>
            {error && <p style={styles.errorMsg}>{error}</p>}
            <input className="pasti-input" style={styles.input} placeholder="Classroom Name *" value={classroomForm.name} onChange={e => setClassroomForm({ ...classroomForm, name: e.target.value })} />
            <select className="pasti-input" style={styles.input} value={classroomForm.ageCategory} onChange={e => setClassroomForm({ ...classroomForm, ageCategory: e.target.value })}>
              <option value="4">Age 4</option><option value="5">Age 5</option><option value="6">Age 6</option>
            </select>
            <input className="pasti-input" style={styles.input} placeholder="Student Limit *" type="number" value={classroomForm.limit} onChange={e => setClassroomForm({ ...classroomForm, limit: e.target.value })} />
            <select className="pasti-input" style={styles.input} value={classroomForm.teacherId} onChange={e => {
              const t = teachers.find(t => t.id === e.target.value);
              setClassroomForm({ ...classroomForm, teacherId: e.target.value, teacherName: t?.name || "" });
            }}>
              <option value="">Select Teacher (Optional)</option>
              {teachers.filter(t => t.active !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              {(() => {
                const current = teachers.find(t => t.id === classroomForm.teacherId);
                return current && current.active === false
                  ? <option key={current.id} value={current.id} disabled>{current.name} (Not Active)</option>
                  : null;
              })()}
            </select>
            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowAddClassroom(false); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={editingClassroom ? handleEditClassroom : handleAddClassroom} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TEACHER MODAL */}
      {showAddTeacher && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>Enroll New Teacher</h3>
            <div style={styles.infoBox}>💡 Username: <b>FirstnameLastname</b> | Password: <b>Firstname + last 6 digits of IC</b></div>
            {error && <p style={styles.errorMsg}>{error}</p>}
            <input className="pasti-input" style={styles.input} placeholder="First Name *" value={teacherForm.firstName} onChange={e => setTeacherForm({ ...teacherForm, firstName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Last Name *" value={teacherForm.lastName} onChange={e => setTeacherForm({ ...teacherForm, lastName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="IC Number * (e.g. 030305-11-1022)" value={teacherForm.ic}
              onChange={e => { const ic = e.target.value; const { age } = calculateFromIC(ic); setTeacherForm({ ...teacherForm, ic, age: age || teacherForm.age }); }} />
            <input style={{ ...styles.input, background: "#f5f5f5" }} placeholder="Age (auto-filled)" type="number" value={teacherForm.age} readOnly />
            <input className="pasti-input" style={styles.input} placeholder="Qualifications" value={teacherForm.qualifications} onChange={e => setTeacherForm({ ...teacherForm, qualifications: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Specialization Topic" value={teacherForm.specialty} onChange={e => setTeacherForm({ ...teacherForm, specialty: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Employment Entry Year" value={teacherForm.entryYear} onChange={e => setTeacherForm({ ...teacherForm, entryYear: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Address" value={teacherForm.address} onChange={e => setTeacherForm({ ...teacherForm, address: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Emergency Contact Name" value={teacherForm.emergencyName} onChange={e => setTeacherForm({ ...teacherForm, emergencyName: e.target.value })} />
           <input className="pasti-input" style={styles.input} placeholder="Emergency Contact Phone (e.g. 0123456789)" value={teacherForm.emergencyPhone} 
  onChange={e => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setTeacherForm({ ...teacherForm, emergencyPhone: val });
  }} />
            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowAddTeacher(false); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={handleAddTeacher} disabled={loading}>{loading ? "Creating..." : "Save Profile"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {showEditTeacher && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>Edit Teacher Profile</h3>
            <div style={styles.infoBox}>⚠️ IC number and age cannot be edited.</div>
            {error && <p style={styles.errorMsg}>{error}</p>}
            <input className="pasti-input" style={styles.input} placeholder="First Name *" value={teacherForm.firstName} onChange={e => setTeacherForm({ ...teacherForm, firstName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Last Name *" value={teacherForm.lastName} onChange={e => setTeacherForm({ ...teacherForm, lastName: e.target.value })} />
            <input style={{ ...styles.input, background: "#f5f5f5", color: "#999" }} value={`IC: ${teacherForm.ic}`} disabled />
            <input style={{ ...styles.input, background: "#f5f5f5", color: "#999" }} value={`Age: ${teacherForm.age}`} disabled />
            <input className="pasti-input" style={styles.input} placeholder="Qualifications" value={teacherForm.qualifications} onChange={e => setTeacherForm({ ...teacherForm, qualifications: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Specialization Topic" value={teacherForm.specialty} onChange={e => setTeacherForm({ ...teacherForm, specialty: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Employment Entry Year" value={teacherForm.entryYear} onChange={e => setTeacherForm({ ...teacherForm, entryYear: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Address" value={teacherForm.address} onChange={e => setTeacherForm({ ...teacherForm, address: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Emergency Contact Name" value={teacherForm.emergencyName} onChange={e => setTeacherForm({ ...teacherForm, emergencyName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Emergency Contact Phone (e.g. 0123456789)" value={teacherForm.emergencyPhone} 
  onChange={e => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setTeacherForm({ ...teacherForm, emergencyPhone: val });
  }} />
            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowEditTeacher(false); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={handleEditTeacher} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PARENT MODAL */}
      {showAddParent && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>Register New Parent & Children</h3>
            <div style={styles.infoBox}>💡 Username: <b>FirstnameLastname</b> | Password: <b>Firstname + last 6 digits of IC</b></div>
            {error && <p style={styles.errorMsg}>{error}</p>}

            <p style={{ fontWeight: "bold", color: "#1B5E20", marginBottom: "8px", fontSize: "14px" }}>👨‍👩‍👧 Parent Information</p>
            <input className="pasti-input" style={styles.input} placeholder="First Name *" value={parentForm.firstName} onChange={e => setParentForm({ ...parentForm, firstName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Last Name *" value={parentForm.lastName} onChange={e => setParentForm({ ...parentForm, lastName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="IC Number * (e.g. 030305-11-1022)" value={parentForm.ic}
              onChange={e => { const ic = e.target.value; const { age } = calculateFromIC(ic); setParentForm({ ...parentForm, ic, age: age || parentForm.age }); }} />
            <input style={{ ...styles.input, background: "#f5f5f5" }} placeholder="Age (auto-filled)" value={parentForm.age} readOnly />
            <input className="pasti-input" style={styles.input} placeholder="Phone Number * (e.g. 0123456789)" value={parentForm.phone}
              onChange={e => setParentForm({ ...parentForm, phone: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Address" value={parentForm.address} onChange={e => setParentForm({ ...parentForm, address: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Emergency Contact Name" value={parentForm.emergencyName} onChange={e => setParentForm({ ...parentForm, emergencyName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Emergency Contact Phone (e.g. 0123456789)" value={parentForm.emergencyPhone} onChange={e => setParentForm({ ...parentForm, emergencyPhone: e.target.value })} />

            <div style={{ height: "1px", background: "#eee", margin: "8px 0 16px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <p style={{ fontWeight: "bold", color: "#1B5E20", margin: 0, fontSize: "14px" }}>🧒 Children ({children.length})</p>
              <button style={{ ...styles.addBtn, padding: "6px 14px", fontSize: "12px" }} onClick={addChild}>+ Add Child</button>
            </div>

            {children.map((child, index) => (
              <div key={index} style={{ background: "#f8fdf8", borderRadius: "12px", padding: "16px", marginBottom: "12px", border: "1px solid #e8f5e9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <p style={{ fontWeight: "600", color: "#2E7D32", margin: 0, fontSize: "13px" }}>Child {index + 1}</p>
                  {children.length > 1 && <button className="pasti-icon-btn" style={styles.removeLessonBtn} onClick={() => removeChild(index)}>✕ Remove</button>}
                </div>
                <input className="pasti-input" style={styles.input} placeholder="Child's Full Name *" value={child.name} onChange={e => updateChild(index, "name", e.target.value)} />
                <input className="pasti-input" style={styles.input} placeholder="Child's IC (auto-fills age & DOB)" value={child.ic} onChange={e => updateChild(index, "ic", e.target.value)} />
                <input style={{ ...styles.input, background: "#f5f5f5" }} placeholder="Age (auto-filled)" value={child.age} readOnly />
                <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>Date of Birth (auto-filled)</label>
                <input className="pasti-input" style={styles.input} type="date" value={child.dob} onChange={e => updateChild(index, "dob", e.target.value)} />
                <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>Gender</label>
                <select className="pasti-input" style={styles.input} value={child.gender} onChange={e => updateChild(index, "gender", e.target.value)}>
                  <option value="Boy">Boy</option>
                  <option value="Girl">Girl</option>
                </select>
                <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>
                  Enroll in Class * {child.age ? `(Age ${child.age} classes)` : "(enter IC or age first)"}
                </label>
                <select className="pasti-input" style={styles.input} value={child.classroomId} onChange={e => updateChild(index, "classroomId", e.target.value)}>
                  <option value="">-- Select Class --</option>
                  {classrooms.filter(c => !child.age || String(c.ageCategory) === String(child.age)).map(c => {
                    const liveEnrolled = getClassEnrolledCount(c.id);
                    const isFull = liveEnrolled >= (c.limit || 0);
                    return <option key={c.id} value={c.id} disabled={isFull} style={{ color: isFull ? "#aaa" : "#222" }}>
                      {c.name} (Age {c.ageCategory}) — {liveEnrolled}/{c.limit || 0}{isFull ? " FULL" : ""}
                    </option>;
                  })}
                </select>
              </div>
            ))}

            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowAddParent(false); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={handleAddParent} disabled={loading}>{loading ? "Creating..." : "Save Profile"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PARENT MODAL */}
      {showEditParent && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>Edit Parent Profile</h3>
            <div style={styles.infoBox}>⚠️ IC and age cannot be edited. Changes will notify admin.</div>
            {error && <p style={styles.errorMsg}>{error}</p>}
            <input className="pasti-input" style={styles.input} placeholder="First Name *" value={parentForm.firstName} onChange={e => setParentForm({ ...parentForm, firstName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Last Name *" value={parentForm.lastName} onChange={e => setParentForm({ ...parentForm, lastName: e.target.value })} />
            <input style={{ ...styles.input, background: "#f5f5f5", color: "#999" }} value={`IC: ${parentForm.ic}`} disabled />
            <input style={{ ...styles.input, background: "#f5f5f5", color: "#999" }} value={`Age: ${parentForm.age}`} disabled />
            <input className="pasti-input" style={styles.input} placeholder="Phone Number (e.g. 0123456789)" value={parentForm.phone} onChange={e => setParentForm({ ...parentForm, phone: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Address" value={parentForm.address} onChange={e => setParentForm({ ...parentForm, address: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Emergency Contact Name" value={parentForm.emergencyName} onChange={e => setParentForm({ ...parentForm, emergencyName: e.target.value })} />
            <input className="pasti-input" style={styles.input} placeholder="Emergency Contact Phone" value={parentForm.emergencyPhone} onChange={e => setParentForm({ ...parentForm, emergencyPhone: e.target.value })} />
            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowEditParent(false); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={handleEditParent} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SYLLABUS MODAL */}
      {showAddSyllabus && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>Create Age Syllabus</h3>
            {error && <p style={styles.errorMsg}>{error}</p>}
            <select className="pasti-input" style={styles.input} value={syllabusForm.ageCategory} onChange={e => setSyllabusForm({ ...syllabusForm, ageCategory: e.target.value })}>
              <option value="4">Age 4</option><option value="5">Age 5</option><option value="6">Age 6</option>
            </select>
            <div style={styles.lessonInputRow}>
              <input style={{ ...styles.input, flex: 1, margin: 0 }} placeholder="Type lesson name and press Enter..." value={syllabusForm.newLesson} onChange={e => setSyllabusForm({ ...syllabusForm, newLesson: e.target.value })} onKeyDown={e => e.key === "Enter" && addLesson()} />
              <button className="pasti-btn" style={styles.addLessonBtn} onClick={addLesson}>+ Add</button>
            </div>
            <div style={styles.lessonList}>
              {syllabusForm.lessons.map((lesson, i) => (
                <div key={i} style={styles.lessonItem}>
                  <span>L{i + 1}: {lesson}</span>
                  <button className="pasti-icon-btn" style={styles.removeLessonBtn} onClick={() => removeLesson(i)}>✕</button>
                </div>
              ))}
            </div>
            <p style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>{syllabusForm.lessons.length} lessons added</p>
            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowAddSyllabus(false); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={handleAddSyllabus} disabled={loading}>{loading ? "Saving..." : "Save Syllabus"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SYLLABUS MODAL */}
      {showEditSyllabus && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>Edit Age {selectedSyllabus?.ageCategory} Syllabus</h3>
            {error && <p style={styles.errorMsg}>{error}</p>}
            <div style={styles.lessonInputRow}>
              <input style={{ ...styles.input, flex: 1, margin: 0 }} placeholder="Add new lesson..." value={syllabusForm.newLesson} onChange={e => setSyllabusForm({ ...syllabusForm, newLesson: e.target.value })} onKeyDown={e => e.key === "Enter" && addLesson()} />
              <button className="pasti-btn" style={styles.addLessonBtn} onClick={addLesson}>+ Add</button>
            </div>
            <div style={styles.lessonList}>
              {syllabusForm.lessons.map((lesson, i) => (
                <div key={i} style={styles.lessonItem}>
                  <span>L{i + 1}: {lesson}</span>
                  <button className="pasti-icon-btn" style={styles.removeLessonBtn} onClick={() => removeLesson(i)}>✕</button>
                </div>
              ))}
            </div>
            <p style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>{syllabusForm.lessons.length} lessons</p>
            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowEditSyllabus(false); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={handleEditSyllabus} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {showEditStudent && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>Edit Student</h3>
            {error && <p style={styles.errorMsg}>{error}</p>}
            <input className="pasti-input" style={styles.input} placeholder="Student's Full Name *" value={studentForm.name} onChange={e => updateStudentForm("name", e.target.value)} />
            <input className="pasti-input" style={styles.input} placeholder="IC (auto-fills age & DOB)" value={studentForm.ic} onChange={e => updateStudentForm("ic", e.target.value)} />
            <input style={{ ...styles.input, background: "#f5f5f5" }} placeholder="Age (auto-filled)" value={studentForm.age} readOnly />
            <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>Date of Birth (auto-filled)</label>
            <input className="pasti-input" style={styles.input} type="date" value={studentForm.dob} onChange={e => updateStudentForm("dob", e.target.value)} />
            <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>Gender</label>
            <select className="pasti-input" style={styles.input} value={studentForm.gender} onChange={e => updateStudentForm("gender", e.target.value)}>
              <option value="Boy">Boy</option>
              <option value="Girl">Girl</option>
            </select>
            <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>Classroom *</label>
            <select className="pasti-input" style={styles.input} value={studentForm.classroomId} onChange={e => updateStudentForm("classroomId", e.target.value)}>
              <option value="">-- Select Class --</option>
              {classrooms.filter(c => !studentForm.age || String(c.ageCategory) === String(studentForm.age) || c.id === studentForm.classroomId).map(c => {
                const liveEnrolled = getClassEnrolledCount(c.id);
                const isFull = liveEnrolled >= (c.limit || 0) && c.id !== studentForm.classroomId;
                return <option key={c.id} value={c.id} disabled={isFull} style={{ color: isFull ? "#aaa" : "#222" }}>
                  {c.name} (Age {c.ageCategory}) — {liveEnrolled}/{c.limit || 0}{isFull ? " FULL" : ""}
                </option>;
              })}
            </select>
            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowEditStudent(false); setEditingStudent(null); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={handleEditStudent} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* REACTIVATE PARENT MODAL */}
      {showReactivateParent && reactivatingParent && (
        <div className="pasti-overlay" style={styles.overlay}>
          <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={styles.modalTitle}>Reactivate {reactivatingParent.name}</h3>
            <div style={styles.infoBox}>💡 Restore one or more of their previous children, add brand-new children, or both.</div>
            {error && <p style={styles.errorMsg}>{error}</p>}

            {(() => {
              const removedChildren = students.filter(s => s.parentId === reactivatingParent.id && s.deleted);
              return removedChildren.length > 0 ? (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontWeight: "bold", color: "#1B5E20", marginBottom: "8px", fontSize: "14px" }}>👶 Restore an Existing Child</p>
                  {removedChildren.map(child => {
                    const childClass = classrooms.find(c => c.id === child.classroomId);
                    const checked = reactivateSelectedIds.includes(child.id);
                    return (
                      <label key={child.id} className="pasti-row" style={{ ...styles.confirmRow, marginTop: 0, marginBottom: "8px" }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleReactivateStudentId(child.id)} style={styles.confirmCheckbox} />
                        {child.name} — 🏫 {childClass?.name || "-"} (Age {childClass?.ageCategory || "-"})
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>This parent has no previously removed children to restore.</p>
              );
            })()}

            <div style={{ height: "1px", background: "#eee", margin: "8px 0 16px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <p style={{ fontWeight: "bold", color: "#1B5E20", margin: 0, fontSize: "14px" }}>🧒 Add New Child(ren) ({children.length})</p>
              <button style={{ ...styles.addBtn, padding: "6px 14px", fontSize: "12px" }} onClick={addChild}>+ Add Child</button>
            </div>

            {children.map((child, index) => (
              <div key={index} style={{ background: "#f8fdf8", borderRadius: "12px", padding: "16px", marginBottom: "12px", border: "1px solid #e8f5e9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <p style={{ fontWeight: "600", color: "#2E7D32", margin: 0, fontSize: "13px" }}>New Child {index + 1}</p>
                  <button className="pasti-icon-btn" style={styles.removeLessonBtn} onClick={() => removeNewChild(index)}>✕ Remove</button>
                </div>
                <input className="pasti-input" style={styles.input} placeholder="Child's Full Name *" value={child.name} onChange={e => updateChild(index, "name", e.target.value)} />
                <input className="pasti-input" style={styles.input} placeholder="Child's IC (auto-fills age & DOB)" value={child.ic} onChange={e => updateChild(index, "ic", e.target.value)} />
                <input style={{ ...styles.input, background: "#f5f5f5" }} placeholder="Age (auto-filled)" value={child.age} readOnly />
                <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>Date of Birth (auto-filled)</label>
                <input className="pasti-input" style={styles.input} type="date" value={child.dob} onChange={e => updateChild(index, "dob", e.target.value)} />
                <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>Gender</label>
                <select className="pasti-input" style={styles.input} value={child.gender} onChange={e => updateChild(index, "gender", e.target.value)}>
                  <option value="Boy">Boy</option>
                  <option value="Girl">Girl</option>
                </select>
                <label style={{ fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" }}>
                  Enroll in Class * {child.age ? `(Age ${child.age} classes)` : "(enter IC or age first)"}
                </label>
                <select className="pasti-input" style={styles.input} value={child.classroomId} onChange={e => updateChild(index, "classroomId", e.target.value)}>
                  <option value="">-- Select Class --</option>
                  {classrooms.filter(c => !child.age || String(c.ageCategory) === String(child.age)).map(c => {
                    const liveEnrolled = getClassEnrolledCount(c.id);
                    const isFull = liveEnrolled >= (c.limit || 0);
                    return <option key={c.id} value={c.id} disabled={isFull} style={{ color: isFull ? "#aaa" : "#222" }}>
                      {c.name} (Age {c.ageCategory}) — {liveEnrolled}/{c.limit || 0}{isFull ? " FULL" : ""}
                    </option>;
                  })}
                </select>
              </div>
            ))}
            {children.length === 0 && <p style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>No new children added yet — click "+ Add Child" if needed.</p>}

            <div style={styles.modalButtons}>
              <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowReactivateParent(false); setReactivatingParent(null); setError(""); }}>Cancel</button>
              <button className="pasti-btn" style={styles.saveBtn} onClick={handleConfirmReactivateParent} disabled={loading}>{loading ? "Reactivating..." : "Confirm Reactivation"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PARENT - MULTI-CHILD DOUBLE CONFIRM MODAL */}
      {showDeleteParentConfirm && deletingParent && (() => {
        const activeChildren = students.filter(s => s.parentId === deletingParent.id && !s.deleted);
        return (
          <div className="pasti-overlay" style={styles.overlay}>
            <div className="pasti-modal" style={{ ...styles.modal, maxHeight: "90vh", overflowY: "auto" }}>
              <h3 style={styles.modalTitle}>Remove {deletingParent.name}?</h3>
              <div style={styles.infoBox}>💡 This parent has {activeChildren.length} active children. Please clarify what's happening before continuing.</div>
              {error && <p style={styles.errorMsg}>{error}</p>}

              <label className="pasti-row" style={styles.confirmRow}>
                <input type="radio" name="deleteParentMode" checked={deleteParentMode === "one"} onChange={() => { setDeleteParentMode("one"); setError(""); }} style={styles.confirmCheckbox} />
                <span>Only <b>one</b> child is no longer a student. That child will be marked inactive — the parent account and other children stay active.</span>
              </label>

              {deleteParentMode === "one" && (
                <select className="pasti-input" style={{ ...styles.input, marginTop: "8px" }} value={deleteParentChildId} onChange={e => setDeleteParentChildId(e.target.value)}>
                  <option value="">-- Select the child who is leaving --</option>
                  {activeChildren.map(c => {
                    const cls = classrooms.find(cl => cl.id === c.classroomId);
                    return <option key={c.id} value={c.id}>{c.name} — 🏫 {cls?.name || "-"}</option>;
                  })}
                </select>
              )}

              <label className="pasti-row" style={styles.confirmRow}>
                <input type="radio" name="deleteParentMode" checked={deleteParentMode === "all"} onChange={() => { setDeleteParentMode("all"); setError(""); }} style={styles.confirmCheckbox} />
                <span>All {activeChildren.length} children are no longer students. The parent account <b>and</b> every child will be marked inactive.</span>
              </label>

              <div style={styles.modalButtons}>
                <button className="pasti-btn" style={styles.cancelBtn} onClick={() => { setShowDeleteParentConfirm(false); setDeletingParent(null); setDeleteParentMode(null); setDeleteParentChildId(""); setError(""); }}>Cancel</button>
                <button
                  className="pasti-btn"
                  style={styles.saveBtn}
                  disabled={loading || !deleteParentMode}
                  onClick={deleteParentMode === "all" ? handleConfirmDeleteParentAllChildren : handleConfirmDeleteParentOneChild}
                >
                  {loading ? "Saving..." : "Continue"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// Notifications View Component
function NotificationsView({ db }) {
  const [notifs, setNotifs] = useState([]);
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "notifications"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0));
        setNotifs(data);
      } catch (e) { console.log(e); }
    };
    load();
  }, [db]);

  const markRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (notifs.length === 0) return (
    <div style={{ background: "white", borderRadius: "20px", padding: "40px", textAlign: "center", color: "#bbb", marginBottom: "20px" }}>
      🔔 No notifications yet.
    </div>
  );

  return (
    <div style={{ marginBottom: "20px" }}>
      {notifs.map(n => (
        <div key={n.id} style={{ background: n.read ? "white" : "#e8f5e9", borderRadius: "12px", padding: "14px 16px", marginBottom: "10px", border: `1px solid ${n.read ? "#eee" : "#a5d6a7"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: "14px", color: "#222", fontWeight: n.read ? "400" : "600" }}>{n.message}</p>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#888" }}>
              {n.timestamp?.toDate?.()?.toLocaleString() || ""}
            </p>
          </div>
          {!n.read && (
            <button style={{ background: "#2E7D32", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }} onClick={() => markRead(n.id)}>
              Mark Read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Reports View Component
function ReportsView({ db, classrooms, students, allProgress, syllabus }) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classStudents, setClassStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classSyl, setClassSyl] = useState(null);

  const loadReport = async (classId) => {
    if (!classId) return;
    setLoading(true);
    setSelectedClassId(classId);
    const classroom = classrooms.find(c => c.id === classId);
    const filtered = students.filter(s => s.classroomId === classId);
    setClassStudents(filtered);
    const syl = syllabus.find(s => String(s.ageCategory) === String(classroom?.ageCategory));
    setClassSyl(syl || null);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ background: "white", borderRadius: "20px", padding: "24px", marginBottom: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <label style={{ fontSize: "14px", color: "#555", marginBottom: "8px", display: "block", fontWeight: "500" }}>Select Classroom</label>
        <select style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1.5px solid #ddd", fontSize: "14px", outline: "none" }}
          value={selectedClassId} onChange={e => loadReport(e.target.value)}>
          <option value="">-- Select a classroom --</option>
          {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} (Age {c.ageCategory})</option>)}
        </select>
      </div>

      {loading && <p style={{ textAlign: "center", color: "#888", padding: "40px" }}>Loading...</p>}

      {selectedClassId && !loading && classStudents.length > 0 && (
        <div>
          {/* Progress circles row */}
          <div style={{ background: "white", borderRadius: "20px", padding: "24px", marginBottom: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <h3 style={{ color: "#1B5E20", marginBottom: "16px", fontSize: "16px", fontWeight: "bold" }}>Individual Progress</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
              {classStudents.filter(s => !s.deleted).map(student => {
                const prog = allProgress[student.id];
                const lessons = classSyl?.lessons || [];
                const completed = lessons.filter((_, i) => prog?.lessons?.[`L${i + 1}`] === true).length;
                const pct = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
                const color = pct === 100 ? "#1B5E20" : pct >= 50 ? "#F57F17" : "#C62828";
                return <ProgressCircle key={student.id} percentage={pct} size={80} color={color} label={student.name} sublabel={`${completed}/${lessons.length}`} />;
              })}
            </div>
          </div>

          {/* Table */}
          <div style={{ background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <h3 style={{ color: "#1B5E20", marginBottom: "16px", fontSize: "16px", fontWeight: "bold" }}>
              📋 {classrooms.find(c => c.id === selectedClassId)?.name} — Full Report
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Student", "Gender", "Completed", "Total", "Progress", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", background: "#f8f8f8", fontSize: "13px", fontWeight: "600", color: "#555", borderBottom: "2px solid #eee", textAlign: h === "Student" ? "left" : "center" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, idx) => {
                    const prog = allProgress[student.id];
                    const lessons = classSyl?.lessons || [];
                    const completed = lessons.filter((_, i) => prog?.lessons?.[`L${i + 1}`] === true).length;
                    const pct = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
                    const status = student.deleted ? "❌ Removed" : pct === 100 ? "✅ Complete" : pct >= 50 ? "🟡 In Progress" : "🔴 Just Started";
                    return (
                      <tr key={student.id} style={{ background: student.deleted ? "#fafafa" : idx % 2 === 0 ? "white" : "#fafffe", opacity: student.deleted ? 0.5 : 1 }}>
                        <td style={{ padding: "12px", fontSize: "14px", fontWeight: "500", borderBottom: "1px solid #f5f5f5" }}>{student.name}</td>
                        <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", borderBottom: "1px solid #f5f5f5" }}>{student.gender}</td>
                        <td style={{ padding: "12px", fontSize: "14px", textAlign: "center", borderBottom: "1px solid #f5f5f5" }}>{completed}</td>
                        <td style={{ padding: "12px", fontSize: "14px", textAlign: "center", borderBottom: "1px solid #f5f5f5" }}>{lessons.length}</td>
                        <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f5f5f5" }}>
                          <ProgressCircle percentage={pct} size={52} color={pct >= 50 ? "#2E7D32" : "#F57F17"} />
                        </td>
                        <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", borderBottom: "1px solid #f5f5f5" }}>{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedClassId && !loading && classStudents.length === 0 && (
        <div style={{ background: "white", borderRadius: "20px", padding: "40px", textAlign: "center", color: "#bbb" }}>No students in this classroom yet.</div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "linear-gradient(180deg, #f4f9f4 0%, #eef3ee 100%)", fontFamily: "'Segoe UI', sans-serif", paddingBottom: "120px" },
  topBar: { background: "linear-gradient(135deg, #1B5E20, #2E7D32)", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", position: "sticky", top: 0, zIndex: 500, borderBottomLeftRadius: "22px", borderBottomRightRadius: "22px" },
  topTitle: { color: "white", fontSize: "24px", margin: 0, fontWeight: "bold", letterSpacing: "0.02em" },
  topSub: { color: "#a5d6a7", fontSize: "12px", margin: "2px 0 0 0" },
  adminInfo: { display: "flex", alignItems: "center", gap: "12px" },
  adminName: { color: "white", margin: 0, fontSize: "14px" },
  notifBadge: { background: "#C62828", color: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 10px rgba(198,40,40,0.5)" },
  logoutBtn: { background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.35)", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px" },
  successBar: { background: "#e8f5e9", color: "#1B5E20", padding: "12px 32px", fontSize: "14px", fontWeight: "500", borderBottom: "1px solid #c8e6c9" },
  content: { padding: "24px 32px" },
  pageTitle: { fontSize: "24px", fontWeight: "bold", color: "#1B5E20", margin: "0 0 20px 0" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" },
  statCard: { background: "white", borderRadius: "22px", padding: "20px", boxShadow: "0 6px 20px rgba(27,94,32,0.08)", border: "1px solid rgba(27,94,32,0.05)", textAlign: "center" },
  statIcon: { fontSize: "32px", marginBottom: "8px" },
  statLabel: { color: "#888", fontSize: "13px", margin: "0 0 6px 0" },
  statValue: { color: "#1B5E20", fontSize: "28px", fontWeight: "bold", margin: 0 },
  section: { background: "white", borderRadius: "22px", padding: "24px", boxShadow: "0 6px 20px rgba(27,94,32,0.08)", border: "1px solid rgba(27,94,32,0.05)", marginBottom: "20px" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  sectionTitle: { fontSize: "17px", fontWeight: "bold", color: "#333", margin: "0 0 0 0" },
  addBtn: { background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "white", border: "none", padding: "10px 20px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "13px", boxShadow: "0 4px 12px rgba(46,125,50,0.3)" },
  empty: { color: "#bbb", textAlign: "center", padding: "40px", fontSize: "15px" },
  classCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid #eef2ee", borderRadius: "18px", marginBottom: "12px", background: "#fafafa" },
  classLeft: { display: "flex", gap: "14px", alignItems: "center", flex: 1 },
  classIconEl: { fontSize: "28px" },
  className: { margin: "0 0 4px 0", fontSize: "15px", color: "#222", fontWeight: "600" },
  classInfo: { margin: "2px 0", fontSize: "13px", color: "#666" },
  progressBar: { height: "6px", background: "#e8f5e9", borderRadius: "3px", width: "120px" },
  progressFill: { height: "100%", background: "#2E7D32", borderRadius: "3px", transition: "width 0.4s ease" },
  classActions: { display: "flex", gap: "8px", flexShrink: 0 },
  editBtn: { background: "#e3f2fd", border: "none", width: "36px", height: "36px", borderRadius: "50%", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center" },
  deleteBtn: { background: "#ffebee", border: "none", width: "36px", height: "36px", borderRadius: "50%", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center" },
  reactivateBtn: { background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "white", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(46,125,50,0.3)" },
  confirmRow: { display: "flex", alignItems: "flex-start", gap: "10px", background: "#f4f9f4", border: "1px solid #e2ece2", borderRadius: "12px", padding: "12px 14px", fontSize: "13px", color: "#33473a", lineHeight: 1.4, marginTop: "8px", cursor: "pointer" },
  confirmCheckbox: { marginTop: "2px", width: "16px", height: "16px", accentColor: "#2E7D32", cursor: "pointer", flexShrink: 0 },
  detailHeader: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" },
  backBtn: { background: "#f0f0f0", border: "none", padding: "10px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontWeight: "500", flexShrink: 0 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 8px", background: "#f8f8f8", fontSize: "12px", fontWeight: "600", color: "#555", borderBottom: "2px solid #eee", textAlign: "center", whiteSpace: "nowrap" },
  td: { padding: "10px 6px", fontSize: "13px", color: "#444", borderBottom: "1px solid #f5f5f5", textAlign: "center" },
  tooltip: { position: "absolute", bottom: "110%", left: "50%", transform: "translateX(-50%)", background: "#1B5E20", color: "white", padding: "5px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 9999, pointerEvents: "none" },
  floatingNav: { position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.55)", backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", borderRadius: "999px", padding: "10px 14px", display: "flex", gap: "6px", boxShadow: "0 12px 40px rgba(27,94,32,0.2), 0 2px 8px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,0.6)", zIndex: 1000 },
  navBtn: { background: "transparent", border: "none", padding: "8px 16px", borderRadius: "999px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#6b8570" },
  navBtnActive: { background: "linear-gradient(135deg, #2E7D32, #43A047)", border: "none", padding: "8px 16px", borderRadius: "999px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "white", boxShadow: "0 4px 14px rgba(46,125,50,0.45)" },
  navIcon: { fontSize: "20px" },
  navLabel: { fontSize: "11px", fontWeight: "500" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(20,30,22,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  modal: { background: "white", borderRadius: "24px", padding: "28px", width: "100%", maxWidth: "500px", boxShadow: "0 24px 70px rgba(15,40,18,0.35)" },
  modalTitle: { fontSize: "20px", fontWeight: "bold", color: "#1B5E20", marginBottom: "12px" },
  infoBox: { background: "#e8f5e9", color: "#1B5E20", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", marginBottom: "16px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e2e6e2", fontSize: "14px", marginBottom: "12px", outline: "none", boxSizing: "border-box" },
  filterBar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  searchInput: { flex: "2 1 220px", width: "auto" },
  filterSelect: { flex: "1 1 160px", width: "auto", cursor: "pointer" },
  modalButtons: { display: "flex", gap: "12px", marginTop: "8px" },
  cancelBtn: { flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #ddd", background: "white", cursor: "pointer", fontSize: "14px" },
  saveBtn: { flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold", boxShadow: "0 6px 16px rgba(46,125,50,0.3)" },
  errorMsg: { background: "#ffebee", color: "#c62828", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" },
  lessonInputRow: { display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" },
  addLessonBtn: { background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "white", border: "none", padding: "12px 16px", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" },
  lessonList: { maxHeight: "200px", overflowY: "auto", marginBottom: "12px" },
  lessonItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f5f5f5", borderRadius: "10px", marginBottom: "6px", fontSize: "13px" },
  removeLessonBtn: { background: "#ffebee", color: "#c62828", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
};