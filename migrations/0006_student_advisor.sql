-- ครูที่ปรึกษาของนักเรียน ใช้สำหรับแสดงและค้นหาในระบบผู้ดูแล
ALTER TABLE students ADD COLUMN advisor_name TEXT;
CREATE INDEX idx_students_advisor ON students(advisor_name);
