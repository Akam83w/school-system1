import { Database } from 'sqlite3';

// تأكد من اسم ملف قاعدة البيانات الخاص بك، غالباً هو school.db
const db = new Database('./school.db');

const hash = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/zBkqquzaqMvGqR2qX.X8yM9J2u'; 

db.serialize(() => {
  db.run(`INSERT INTO admins (username, passwordHash, name, role) VALUES ('admin', '${hash}', 'مدير المدرسة', 'admin')`, (err) => {
    if (err) console.log("خطأ (ربما المدير موجود مسبقاً):", err.message);
    else console.log("✓ تم إضافة المدير بنجاح!");
  });
});

db.close();
