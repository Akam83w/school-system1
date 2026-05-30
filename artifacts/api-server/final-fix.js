import Database from 'better-sqlite3';

// افتح قاعدة البيانات
const db = new Database('./school.db');

// أضف المستخدم
const hash = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/zBkqquzaqMvGqR2qX.X8yM9J2u';

try {
    const stmt = db.prepare("INSERT INTO admins (username, passwordHash, name, role) VALUES (?, ?, ?, ?)");
    stmt.run('admin', hash, 'مدير المدرسة', 'admin');
    console.log("✓ تم إضافة المدير بنجاح!");
} catch (e) {
    console.log("خطأ (ربما موجود مسبقاً):", e.message);
}
