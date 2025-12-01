# 🌀 **Beginner’s Guide to Deploying the UNS Runtime and Building a UNS-Aware Custom GPT**

This tutorial is written for absolute beginners—anyone who can browse the web can follow it. You will:

1. Fork the **UNS** GitHub repository (or clone it locally if you prefer).
2. Deploy the UNS Runtime API to **Vercel’s free Hobby plan** using the included configuration.
3. Build a **Custom GPT** in ChatGPT that knows the UNS documentation and can call your deployed API.

Everything you need already exists in the repo: knowledge files, instructions, tool schema, and Vercel config. Just follow each step in order.

---

# ⚠️ **Prerequisites (No Technical Background Needed)**

| Requirement | Why you need it | How to get it |
| --- | --- | --- |
| GitHub account | Stores your fork so Vercel can deploy it | https://github.com/join |
| Vercel account (Hobby) | Hosts the UNS Runtime API for free | https://vercel.com/signup |
| ChatGPT Plus subscription | Unlocks the GPT Builder + tool integrations | https://chat.openai.com/ (Upgrade to Plus) |
| Git (optional) | Only if you want a local clone; otherwise skip | https://git-scm.com/downloads |

> **Tip:** If you are brand new, do everything in the browser. You only need Git installed if you plan to edit files locally.

---

# 📁 **Step 1 — Fork (or Clone) the UNS Repository**

1. Visit `https://github.com/ReedKimble/UNS`.
2. Click **Fork** (top-right) and accept the defaults. GitHub creates `https://github.com/<your-username>/UNS`.
3. If you prefer a local copy, click **Code → HTTPS → Copy**, then run:

	```bash
	git clone https://github.com/<your-username>/UNS.git
	cd UNS
	```

Vercel will deploy from your fork automatically—no local editing required.

---

# 🚀 **Step 2 — Deploy the UNS Runtime API on Vercel**

1. Sign in to Vercel and click **Add New… → Project** (or **Import Git Repository**).
2. Select your fork of `UNS`. Vercel scans the repo and finds `Runtime/api/vercel.json`, which already defines the build and routes.
3. In the **Environment Variables** section add one entry:

	| Name | Value |
	| --- | --- |
	| `SWAGGER_SERVER_URL` | `https://uns-yourname.vercel.app` (use your eventual deployment URL) |

	You can leave the value empty for the first deploy and update it afterward, but setting it now prevents schema links from pointing to the default domain.
4. In the **Build & Output Settings** panel, set **Build Command** to:

	```bash
	npm install && SWAGGER_SERVER_URL=$VERCEL_URL npm run build:swagger-ui
	```

	(Replace `$VERCEL_URL` with your actual domain after the first deploy if Vercel does not auto-resolve it.)
5. Click **Deploy**.
6. Wait for the build to finish (usually <2 minutes). When it succeeds, Vercel shows a URL like `https://uns-yourname.vercel.app`.
5. Open `https://uns-yourname.vercel.app/api/v1/health`. Seeing JSON output (status, version, microstates) confirms the runtime is online.

> **Troubleshooting:** If the deploy fails, click the failed deployment, read the log, and rerun. Common fixes include reconnecting GitHub or re-clicking Deploy.

---

# ✅ **Step 3 — Confirm You Can Reach the Runtime**

Before moving on, keep your deployment URL handy. You will paste it into the GPT Builder later as the base URL for tool calls.

- Save it in a note (example: `https://uns-yourname.vercel.app`).
- Bookmark the `/api/v1/health` endpoint so you can quickly check uptime.

---

# 📚 **Step 4 — Collect Every Required Knowledge File**

The GPT must ingest **all files in the `GPT/` folder** plus the additional core documents listed in `GPT/GPT-Knowledge-Files.md`. Download each file to your computer (right-click → *Save link as* or open and copy the contents). The list below is exhaustive as of this guide:

| Location | File | Purpose |
| --- | --- | --- |
| `GPT/` | `Master-Guidance.md` | Primary knowledge hub + workflow checklists |
| `GPT/` | `How-to-use-Tools.md` | Detailed runtime/API usage rules |
| `GPT/` | `Python-to-UNS.md` | Translation guide for code snippets |
| `GPT/` | `Instructions.md` | System prompt you will paste into GPT Builder |
| `GPT/` | `GPT-Knowledge-Files.md` | Index of recommended knowledge sources |
| `GPT/` | `Tool-Schema.yaml` | Unified OpenAPI schema for the runtime |
| `Runtime/Specification/` | `UNS_Runtime32_Spec.md` | Formal language + runtime spec |
| `Runtime/Specification/` | `UNS_Runtime32_Spec.json` | Machine-readable version of the spec |
| `Runtime/Implementation/` | `UNS_Model_VM_Implementation.md` | Engine details and helper behavior |
| `Runtime/Implementation/` | `UNS_Module_9_Machine_First.md` | Additional VM documentation |
| Repository root | `UNS_Guided_Discovery.md` | Grammar + walkthrough |
| Repository root | `UNS_Academic_Section.md` | Theoretical background |

> **Remember:** Even though `Instructions.md` will be pasted into another field, you still upload a copy to the GPT Knowledge section so the GPT can cite it.

---

# 🤖 **Step 5 — Open GPT Builder and Start a New GPT**

1. Log into ChatGPT with your Plus account and visit `https://chat.openai.com/gpts/editor`.
2. Click **Create**. On the left, set a descriptive name (e.g., *“UNS Runtime Assistant”*) and optional logo.
3. In the **Instructions** panel, delete any placeholder text.

---

# 🧠 **Step 6 — Paste the Official Instructions**

1. Open `GPT/Instructions.md` from your downloaded files.
2. Copy everything (Ctrl+A → Ctrl+C).
3. In GPT Builder → **Instructions**, paste the text (Ctrl+V). This enforces the UNS modeling persona, API usage rules, and response format.
4. Click outside the box to save. The builder auto-saves, but you can press **Cmd/Ctrl+S** for good measure.

---

# 📎 **Step 7 — Upload Knowledge Files (All of Them)**

1. Switch to the **Knowledge** tab.
2. Click **Upload file** and add each file listed in Step 4. Upload one file at a time so the builder keeps their names.
3. After uploading, verify the list contains **every file from the table**, including `Instructions.md` and `Tool-Schema.yaml`.
4. Optionally group them into folders inside the builder for clarity (e.g., *Specifications*, *Guides*).

> **Why this matters:** The GPT references these files to stay in sync with the runtime. Omitting even one can cause outdated guidance or invalid UNS code.

---

# 🔧 **Step 8 — Add the UNS Runtime API as a Tool**

1. Go to the **Actions** tab and click **Add Action**.
2. Choose **Import OpenAPI schema**.
3. Paste the entire contents of `GPT/Tool-Schema.yaml` into the schema field.
4. Set the **Base URL** to your Vercel deployment (e.g., `https://uns-yourname.vercel.app`).
5. Name the action (e.g., *UNS Runtime API*) and save.
6. The builder now lists every runtime endpoint (compile, execute, read, helper keywords, etc.).

> **Pro tip:** If you redeploy later (new URL), edit this action and swap the base URL instead of re-importing the schema.

---

# 🧪 **Step 9 — Smoke-Test Your Custom GPT**

1. Switch to the **Preview** pane in GPT Builder.
2. Send a test prompt such as:

	> “Create a uniform state, apply `D(8, psi)`, run it with 32 microstates, and summarize the bindings.”

3. The GPT should outline a plan, call `/api/v1/runtime/compile`, then `/api/v1/runtime/execute`, and describe the result.
4. If calls fail, check:
	- The action’s base URL matches your Vercel deployment.
	- The deployment’s `/api/v1/health` endpoint is reachable.
	- The schema was pasted exactly from `Tool-Schema.yaml`.

---

# 📘 **Step 10 — Follow the Runtime Best Practices**

Keep `GPT/Master-Guidance.md` and `GPT/How-to-use-Tools.md` nearby. Encourage GPT users to:

- Compile code before executing to catch syntax issues (`/api/v1/runtime/compile`).
- Use helper endpoints when only a single keyword result is required (const, lift, D, etc.).
- Respect scalar vs. UValue rules (e.g., `read(value | state)` demands a UValue on the left, `MIX` expects a scalar alpha).
- Surface novels, clamping, and microstate assumptions in explanations.
- When runs produce large traces, call `/api/v1/runtime/execute` with `summary_mode=true` and follow up with `/runtime/export` or `/runtime/import` to stream only the sections you need.

These practices produce valid UNS programs on the first try.

---

# 🎉 **Finished! What You Now Have**

- ✅ A running UNS Runtime API on Vercel.
- ✅ A Custom GPT that knows every official UNS document.
- ✅ Tooling wired up through the single `Tool-Schema.yaml` schema.
- ✅ Automated compile/execute/read workflows triggered from natural language.

From here you can explore experiments, build regression suites, and share the GPT with teammates. If the runtime or docs change, redeploy the API and re-upload updated files so the GPT always reflects the latest UNS behavior.

---
