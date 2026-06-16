# ระบบสืบพันธุ์ของมนุษย์ · สื่อนำเสนอแบบสไลด์ (Kinetic HTML)

สื่อการเรียนรู้แบบ **single-page kinetic HTML** หัวข้อ **"ระบบสืบพันธุ์ของมนุษย์"**
วิชาสุขศึกษา ชั้น ม.6/7 · โรงเรียนอัสสัมชัญธนบุรี · งานกลุ่ม 12 คน

> 🩺 **คำชี้แจง:** เป็นสื่อเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์
> ใช้ไดอะแกรมกายวิภาคเชิงวิทยาศาสตร์ (schematic) โทนวิชาการ เหมาะกับชั้นเรียน

---

## ✨ ฟีเจอร์

- **2 โหมดการดู**: สไลด์ (Slide) และเลื่อน (Scroll) สลับได้ด้วยปุ่มหรือคีย์ `S`
- **ไดอะแกรม SVG แบบ interactive**: คลิก/แตะ hotspot ดูชื่อ (ไทย+อังกฤษ) และหน้าที่ — มีทั้งภายนอก/ภายใน ทั้งชายและหญิง
- **แอนิเมชันกระบวนการ**: การสร้างอสุจิ (spermatogenesis), การเดินทางอสุจิ → การปฏิสนธิ, รอบประจำเดือน (interactive), การสร้างไข่ (oogenesis) + การตกไข่
- **กราฟ interactive**: ฮอร์โมนเพศชายตามอายุ และฮอร์โมน 4 ชนิดในรอบประจำเดือน (ลากแถบเลื่อน "วัน")
- **Speaker notes** ต่อสไลด์ (เปิด/ปิดด้วยคีย์ `N` — เห็นเฉพาะผู้พูด)
- **หน้าต่างควบคุมลอย 2 อัน** ลากย้าย/ย่อได้ (รองรับจอสัมผัส TV ด้วย Pointer Events) สำหรับผู้พูดหลายคน
- **ป้ายผู้พูด** มุมสไลด์, เลขสไลด์อัตโนมัติ, progress bar, ปุ่ม **Motion** (ลดแอนิเมชัน), หน้า **Overview** รวมสไลด์

## ⌨️ คีย์ลัด

| คีย์ | การทำงาน |
|---|---|
| `←` `→` / `Space` / `PageUp/Down` | เลื่อนสไลด์ |
| `Home` / `End` | สไลด์แรก / สุดท้าย |
| พิมพ์เลข (เช่น `12`) | กระโดดไปสไลด์นั้น |
| `N` | เปิด/ปิดสคริปต์ผู้พูด |
| `S` | สลับโหมด Slide ↔ Scroll |
| `M` | เปิด/ปิดแอนิเมชัน (Reduce motion) |
| `O` | หน้า Overview รวมสไลด์ |
| `F` | เต็มจอ |

## 🛠️ การ build

ไม่มี dependency — ใช้ Node ล้วน:

```bash
node build.js
```

ผลลัพธ์ (self-contained ทั้งคู่ — inline CSS/JS/ฟอนต์เป็น data URI):

- **`index.html`** — สำหรับ GitHub Pages (เปิดออนไลน์ได้ทุกอุปกรณ์)
- **`dist/presentation-offline.html`** — เปิดออฟไลน์ด้วยการ **ดับเบิลคลิก** (`file://`)

build จะตรวจอัตโนมัติว่าไม่มี `type=module`, `<script src>` ภายนอก, `fetch()`, หรือ `url(http...)`

## 📂 โครงสร้าง

```
src/
  template.html        โครง HTML (มี placeholder <!--STYLES--> / <!--SCRIPTS-->)
  css/theme.css        โทเค็นดีไซน์ + ธีมสีตามส่วน
  css/app.css          layout, ระบบสไลด์, แอนิเมชัน, ควบคุม, hotspot
  js/data.js           เนื้อหา 26 สไลด์ + ทีม + อ้างอิง
  js/diagrams.js       ไดอะแกรม SVG แบบ hotspot (ชาย/หญิง ภายนอก/ภายใน)
  js/animations.js     แอนิเมชันกระบวนการ + กราฟ
  js/engine.js         kinetic engine (โหมด, นำทาง, ควบคุมลอย, โน้ต, overview)
  js/main.js           bootstrap
  assets/fonts/        ฟอนต์ Sarabun (woff2) ฝังลงไฟล์ตอน build
build.js               ตัว build (Node ล้วน)
index.html             ผลลัพธ์สำหรับ GitHub Pages
```

## 🌐 เปิดบน GitHub Pages

ตั้งค่า repo → **Settings → Pages → Source: Deploy from a branch → `main` / root**
แล้วเปิดที่ `https://<user>.github.io/reproductive-system-m6/`

## 👥 สมาชิกกลุ่ม (12 คน)

กนต์ธร #1 · ภัฏ #6 · ชิษณุพงศ์ #7 · อรณิชชา #8 · วรดร #10 · วรพล #12 ·
อรกัญญา #19 · ณพนพัธร์ #20 · กฤษดา #23 · เมธาสิทธ์ #24 · ภีมเดช #25 · อัครวินท์ #31

## 📚 อ้างอิง

กรมอนามัย กระทรวงสาธารณสุข · WHO · NIH/MedlinePlus · Cleveland Clinic · CDC ·
Tortora & Derrickson, Principles of Anatomy and Physiology (ดูสไลด์อ้างอิงในตัวสื่อ)
