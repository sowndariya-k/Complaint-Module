# Voter Complaint Portal - Module Workflow

## 📌 Overview
This module provides a secure and transparent interface for voters to report issues regarding the voting process (e.g., technical glitches, fraud, or accessibility issues). It allows users to submit detailed complaints with evidence and track the status of their reports in real-time.

---

## 🚀 User Workflow

### 1. Filing a Complaint (Submission Phase)
*   **Step 1: Input Details**
    *   The user fills out the form with **Full Name**, **Voter ID**, **Contact Info**, and selects a specific **Complaint Type** (e.g., "Vote Tampering", "System Slow").
    *   The user selects the **Date & Time** of the incident and provides a detailed **Description**.

*   **Step 2: Upload Evidence (Optional)**
    *   The user can upload supporting documents or images (PDF, JPG, PNG) up to **5MB**.
    *   The file is securely uploaded to Firebase Storage.

*   **Step 3: Submission & Validation**
    *   The system validates all inputs (checking for valid email formats, future dates, etc.).
    *   Upon success, the data is stored in the **Firestore Database** with an initial status of **"Received"**.

*   **Step 4: Confirmation**
    *   A **Unique Complaint ID** is generated and displayed.
    *   The ID is automatically saved to the browser's **Local Storage** so it isn't lost if the page is refreshed.
    *   **Auto-Track**: The system automatically switches to the "Track Complaint" tab after 0.8 seconds to show the user their submitted status immediately.

### 2. Tracking Status (Monitoring Phase)
*   **Step 1: Enter ID**
    *   The user navigates to the "Track Complaint" tab.
    *   If they just submitted a complaint, the **Complaint ID is auto-filled**. Otherwise, they can manually paste their ID.

*   **Step 2: View Status**
    *   Clicking **"Track"** fetches the latest data from the database.
    *   The system displays the current status, submitted details, and any admin notes (Resolution or Cancellation reasons).

*   **Step 3: Visual Timeline**
    *   A progress timeline updates dynamically based on the status:
        1.  **Complaint Received**
        2.  **Under Review**
        3.  **Investigation**
        4.  **Resolved** (or **Canceled**)

*   **Step 4: Download Receipt**
    *   At any point (after submission or while tracking), the user can click **"Download Receipt"** to save a text file containing their complaint details and ID for future reference.

---

## 🛠 Technical Stack
*   **Frontend**: HTML5, CSS3, JavaScript (ES6 Modules).
*   **Database**: Google Firebase Firestore (NoSQL).
*   **File Storage**: Google Firebase Storage.

## 📂 Key Files
*   **`index.html`**: The main user interface containing the form and tracking tabs.
*   **`style.css`**: Handles the visual design, responsive layout, and animations.
*   **`js/complaint.js`**: Contains the core logic for form validation, data submission, auto-tracking, and receipt generation.
*   **`js/firebase.js`**: Handles the connection and configuration for Firebase services.