-- รองรับการทำเครื่องหมายว่าส่งแล้วก่อนมีไฟล์หลักฐาน
ALTER TABLE staff ADD COLUMN marked_submitted_at TEXT;
