This document outlines the strategy for transitioning the church’s fragmented data workflows into a unified, resilient, and edge-computing-based management system.

---

# Church Management System (CMS) - Phase 1 Specification

## 1. Problem Statement

The current administrative workflow relies on "Data Spaghetti"—a disconnected array of Google Forms, Sheets, and Docs. This has led to several critical inefficiencies:

* **Data Silos:** Member data, visitor records, and department lists (Youths, Children, Fellowship) exist in isolation.
* **Lack of Relational Integrity:** There is no "Family Unit" grouping or age-based categorization, making it impossible to query the database for "all parents in the choir" or "all youths in a specific house fellowship."
* **Manual Maintenance:** Birthday lists are static Google Docs that require manual updates. Monthly celebrant groupings are done by hand.
* **Fragile Visitor Tracking:** The transition from "Visitor" to "Member" is manual and prone to data loss.
* **Connectivity Barriers:** Current tools (Google Forms) require active internet, causing friction for Ushers or Unit Heads in areas of the building with poor reception.

---

## 2. Proposed Solution: The "Edge-First" Architecture

To ensure the system is performant, cost-effective (free-tier friendly), and resilient, the app will be built on the **Cloudflare Stack**.

### Technical Stack

* **Framework:** Next.js (App Router) for a high-performance Web/PWA experience.
* **Runtime:** Cloudflare Workers (Serverless at the edge).
* **Database:** Cloudflare D1 (SQLite-based relational DB) for structured, SQL-compliant data.
* **Storage:** Cloudflare R2 for media/photo uploads (Zero egress fees).
* **Sync:** RxDB or IndexedDB for local-first persistence (enabling offline attendance).
* **Multi-tenancy:** Every table will include a `tenant_id` (Church ID) from Day 1 to allow the platform to scale to other churches.

---

## 3. Database Schema (Phase 1 Focus)

We will normalize the existing messy data into a relational structure.

### Core Tables

1. **Churches (Tenants):** `id, name, slug, settings_json`.
2. **Members:** `id, tenant_id, family_id, first_name, last_name, gender, dob, phone, email, status (Member, Guest, Visiting)`.
3. **Departments:** `id, tenant_id, name, description` (e.g., Choir, Media, Ushers).
4. **Member_Departments:** `member_id, department_id, role (Head, Assistant, Member)`.
5. **Attendance:** `id, tenant_id, event_date, event_type (Sunday, Wednesday), headcount, recorder_id`.

---

## 4. Phase 1 Feature Breakdown

### A. New Member & Visitor Pipeline

A simplified mobile-friendly interface for the Visitation Department.

* **Field Logic:** Ability to tag new entries as `Visiting` (just passing through), `Joining` (ready to commit), or `Maybe`.
* **Auto-Promotion:** If a visitor is marked as `Joining`, they are automatically injected into the main `Members` table with a "New Member" flag for the Secretary's review.

### B. Intelligent Attendance Tracking (Offline Ready)

Ushers and Unit Heads need to record data regardless of the church's Wi-Fi stability or their mobile network.

* **Local-First Input:** Data is saved to the browser/app's local storage immediately.
* **Background Sync:** When the device reconnects to the internet, the records are "pushed" to the Cloudflare D1 database.
* **Analytics:** A dashboard for SuperAdmins to view attendance trends (Sunday vs. Mid-week) via automated graphing.

### C. Automated Celebrant Grouping

Replacing the manual Google Doc list with a dynamic query.

* **Automated Views:** A dedicated "Celebrants" tab that automatically filters members based on the current month.
* **Triggers:** Any update to a member's Date of Birth (DOB) or a new entry immediately refreshes the monthly grouping.
* **Secretary Dashboard:** One-click view for "This Week's Birthdays" and "Next Month's Celebrants."

---

## 5. Security & Privacy

* **RBAC (Role-Based Access Control):** * **Unit Heads:** Can only view/edit members within their specific department.
* **SuperAdmins (Minister/ICT):** Full system access, audit logs, and financial reports.


* **Data Backups:** Leveraging Cloudflare D1’s automated "Time Travel" backups to ensure data can be restored to any point in the last 30 days.
* **PWA Security:** Login via Phone Number + OTP or Password. SuperAdmins will have stricter session timeouts.

---

## 6. Migration Plan

1. **Data Cleaning:** Run a Python script to consolidate the disparate Google Sheets, using phone numbers as the primary key to link "Youths" and "Fellowship" records.
2. **Family Linking:** Manual or semi-automated grouping of members into `family_id` based on shared addresses or last names.
3. **Deployment:** Host the frontend on Cloudflare Pages and the API on Workers for maximum global speed and 0ms cold starts.

---

**Would you like me to write the Python script to help you clean those initial Google Sheet CSVs and prepare them for the D1 import?**
