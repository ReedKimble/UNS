# 🌀 **Beginner’s Guide to Deploying the UNS Runtime and Building a UNS-Aware Custom GPT**

This tutorial walks an absolute beginner—*someone with no programming or deployment experience*—through the complete workflow for:

1. Cloning the **UNS** GitHub repository
2. Deploying the UNS Runtime API using **Vercel's free Hobby plan**
3. Creating a **Custom GPT** that understands UNS and can call the UNS Runtime API as a tool

All required components already exist inside the repository:

* Knowledge files
* System instruction file
* Full unified API schema (`Tool-Schema.yaml`)
* Vercel deployment configuration (`vercel.json`)

This document is the definitive step-by-step guide.

---

# ⚠️ **Prerequisites for Beginners**

Before starting, you will need:

### ✔ **GitHub account**

Used to fork or clone the UNS repository.

### ✔ **Vercel account (Free Hobby Plan)**

Used to deploy the UNS Runtime as a serverless API.

### ✔ **ChatGPT Plus account**

Required to create **Custom GPTs** with tools.
*A basic ChatGPT account cannot build a GPT or connect tools.*

### ✔ Git installation (optional)

Not required unless you want to clone locally.

---

# 📁 **Step 1 — Fork or Clone the UNS Repository**

Open the repository:

```
https://github.com/ReedKimble/UNS
```

### Option A — Fork (recommended for non-developers)

1. Click **Fork** in the top-right corner.
2. Save the fork to your GitHub account.

### Option B — Clone locally (optional)

```bash
git clone https://github.com/ReedKimble/UNS.git
cd UNS
```

Vercel will deploy from your fork.

---

# 🚀 **Step 2 — Deploy the UNS Runtime API to Vercel**

### 1. Log into Vercel and choose “Import Git Repository”

Choose your *fork* of the UNS repo.

### 2. Vercel auto-detects configuration

The repository includes:

```
Runtime/api/vercel.json
```

This file tells Vercel how to:

* Route API requests
* Build and serve the runtime
* Configure output directories

**You do not need to modify any Vercel settings.**
The deployment is fully automatic.

### 3. Click **Deploy**

Vercel will:

* Install dependencies
* Configure serverless functions
* Publish your API

### 4. Note your deployment URL

It will look like:

```
https://your-uns-runtime.vercel.app
```

### 5. Test your deployment

Open:

```
https://your-uns-runtime.vercel.app/api/v1/health
```

If you see a JSON response, your API is live.

---

# 📚 **Step 3 — Gather UNS Knowledge Files for Your GPT**

The repo file:

```
GPT/GPT-Knowledge-Files.md
```

lists all files your GPT should ingest.

These files include:

* `/Runtime/Specification/UNS_Runtime32_Spec.json`
* `/Runtime/Specification/UNS_Runtime32_Spec.md`
* `/Runtime/Implementation/UNS_Model_VM_Implementation.md`
* `/Runtime/Implementation/UNS_Module_9_Machine_First.md`
* `/UNS_Guided_Discovery.md`
* `/UNS_Academic_Section.md`
* `/GPT/How-to-use-Tools.md`

Download each file.
You will upload them individually into the GPT Builder as knowledge.

---

# 🤖 **Step 4 — Create Your Custom UNS GPT**

### 1. Open GPT Builder

(Requires **ChatGPT Plus**)
Go to:

```
https://chat.openai.com/gpts/editor
```

### 2. Name your GPT

Example:

**“UNS Runtime Assistant”**

---

# 🧠 **Step 5 — Add the GPT’s System Instructions**

Open:

```
GPT/Instructions.md
```

Copy/paste the entire file into the GPT’s **Instructions** field.

This defines the GPT’s role:

* UNS modeling assistant
* Reasoning partner
* Experiment designer
* Runtime interpreter

It also instructs the GPT *when and how* to call your UNS Runtime API.

---

# 📎 **Step 6 — Upload the Knowledge Files**

In GPT Builder → **Knowledge** tab:

Upload each file listed in `GPT-Knowledge-Files.md`.

These files give the GPT:

* Full UNS semantics
* Runtime definitions
* VM implementation details
* Modeling strategies
* Example programs
* Execution rules

Without these, the GPT would not be “UNS-aware.”

---

# 🔧 **Step 7 — Add the UNS Runtime API as a Tool**

The **only API schema you need** is:

```
GPT/Tool-Schema.yaml
```

All core and helper endpoints—compile, execute, reads, health checks, state builders, transforms, etc.—are consolidated into this single YAML file.

### How to import it:

1. In GPT Builder → **Actions**
2. Click **Add Action**
3. Select **Import OpenAPI Schema**
4. Paste the entire contents of:

```
GPT/Tool-Schema.yaml
```

5. Set the **base URL** to your Vercel deployment:

```
https://your-uns-runtime.vercel.app
```

6. Save the action.

Your GPT can now call the UNS Runtime API like a function.

---

# 🧪 **Step 8 — Test Your UNS GPT**

Example prompt:

> “Create a 4-dimensional uniform UNS state, rotate it using D, execute the program, and summarize the resulting state.”

The GPT should:

1. Reason through the modeling steps
2. Write a UNS program or series of helper calls
3. Call `/api/v1/runtime/compile`
4. Call `/api/v1/runtime/execute`
5. Interpret the output in natural language

If something breaks:

* Double-check the base URL
* Ensure the tool schema imported correctly
* Confirm the Vercel deployment succeeded

---

# 📘 **Step 9 — Follow the Practices in `How-to-use-Tools.md`**

This document teaches:

* When to use composite UNS programs
* How to structure experiments
* How to read/interpret UNS states
* When to avoid unnecessary API calls
* How the assistant should summarize results
* How to check programs using `/compile` before running them

This gives the GPT expert-level UNS behavior automatically.

---

# 🎉 **You’re Fully Set Up**

You now have:

✔ A deployed UNS Runtime API
✔ A GPT that is UNS-aware
✔ Automatic tool integration
✔ Full access to UNS compile/execute/measurement capabilities
✔ A natural language interface for UNS modeling

You can now explore UNS, design experiments, construct models, and execute UNS programs through your GPT assistant.

---
