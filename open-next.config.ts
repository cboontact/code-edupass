import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// แอปนี้เป็น dynamic ทั้งหมด ไม่ใช้ incremental cache จึงไม่ต้องใช้ R2 สำหรับ cache
// (R2 ใช้เก็บหลักฐานเท่านั้น)
export default defineCloudflareConfig({});
