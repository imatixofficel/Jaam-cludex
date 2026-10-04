<div align="center">

# ☕ جام | Jaam

### به نام خداوند دادار پاک
### پدید آور آدم از آب و خاک

**Jaam — See the Truth | جام — ببین حقیقت رو**
*Claude × Matrix — Unlimited AI Bridge*

</div>

---

## 📖 داستان جام

«جام» برگرفته از **جام جهان‌نما** (جام جم) در ادبیات فارسی است؛ جامی که همه‌ی جهان در آن دیده می‌شد.
جام یک پروکسی محلی است که به **Claude Code** اجازه می‌دهد به‌جای سرورهای Anthropic به هر سرویس سازگار با OpenAI (OpenAI، Gemini، DeepSeek، Groq و...) وصل شود.

> «سال‌ها دل طلب جام جم از ما می‌کرد / وآنچه خود داشت ز بیگانه تمنا می‌کرد» — حافظ

## ✨ امکانات

- 🔌 اتصال Claude Code به هر سرویس سازگار با OpenAI
- 🌐 پنل وب شیشه‌ای با تم بنفش و فونت وزیر (Vazirmatn)
- 🛠️ پشتیبانی از Tool Calling و استریم (SSE)
- 🖼️ شخصی‌سازی پس‌زمینه با `public/background.jpg`

## 🚀 نصب

پیش‌نیاز: Node.js نسخه ۱۸ یا بالاتر

```bash
npm install
npm start
```

یا نصب سراسری:

```bash
npm install -g .
jaam
```

بعد از اجرا، پنل روی `http://localhost:8787` باز می‌شود.

## ⚙️ تنظیمات

1. در پنل، سرویس مقصد را انتخاب کنید (OpenAI، Gemini، DeepSeek، Groq یا سفارشی).
2. API Key و نام مدل را وارد کنید.
3. روی **ذخیره و فعال‌سازی** بزنید.

## 🔗 اتصال Claude Code

لینوکس / مک:
```bash
export ANTHROPIC_BASE_URL=http://localhost:8787
export ANTHROPIC_AUTH_TOKEN=jaam
claude
```

ویندوز (CMD):
```cmd
set ANTHROPIC_BASE_URL=http://localhost:8787
set ANTHROPIC_AUTH_TOKEN=jaam
claude
```

ویندوز (PowerShell):
```powershell
$env:ANTHROPIC_BASE_URL="http://localhost:8787"
$env:ANTHROPIC_AUTH_TOKEN="jaam"
claude
```

## 📋 سرویس‌ها

| سرویس | Base URL | مدل پیشنهادی |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.5-pro` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| سفارشی | دلخواه | دلخواه |

## 🎨 شخصی‌سازی تم

عکس خود را با نام `background.jpg` در پوشه `public` بگذارید؛ پنل خودکار از آن استفاده می‌کند.

## 🛠️ عیب‌یابی

- **پورت اشغال است:** در `.env` مقدار `PORT=9090` بگذارید.
- **Claude Code وصل نمی‌شود:** `ANTHROPIC_BASE_URL` باید در همان ترمینالی تنظیم شود که `claude` را اجرا می‌کنید.
- **خطای API Key:** کلید و فعال بودن سرویس مقصد را بررسی کنید.

## ⚠️ هشدار

- کیفیت نتیجه به مدل مقصد بستگی دارد و ممکن است با Claude یکسان نباشد.
- شرایط استفاده‌ی هر سرویس را رعایت کنید؛ مسئولیت استفاده با کاربر است.
- کلید API فقط در فایل محلی `config.json` ذخیره می‌شود و به جز سرویس انتخابی شما به جایی ارسال نمی‌شود.

## 📜 مجوز

MIT — فایل `LICENSE` را ببینید.

---

<div align="center">

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   ☕  جام — Jaam                                      ║
║   ببین حقیقت رو | See the Truth                      ║
║   Claude × Matrix — Unlimited AI Bridge              ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

### 🌟 ارتباط با ما

<a href="https://t.me/Imatix7"><img src="https://img.shields.io/badge/Telegram-@Imatix7-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"></a>
<a href="https://github.com/imatixofficel"><img src="https://img.shields.io/badge/GitHub-imatixofficel-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"></a>

ساخته شده با ❤️ توسط imatix

</div>
