// อ่าน JSON จาก response; คืน {} เมื่ออ่านไม่ได้ (ผลลัพธ์ตรวจรูปแบบที่จุดใช้งาน)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readJson = async (r: Response): Promise<any> => r.json().catch(() => ({}));
