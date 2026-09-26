# STUDENT PROJECT TEMPLATE

**<u>Campus Makers</u>**

**Software Requirements Specification**

**Instructor:** Lara Nichols-Brown

**Term:** Fall 2026

**Section:** 11

**The Engineering Team:**

1. Sai Deekshitha - Scrum Master
2. Celeste - Product Manager
3. Jarek - Lead Engineer
4. Hunter - Tester

**Project Assets:**

-   **GitHub:** [https://github.com/CampusMakers/CampusMakers](https://github.com/CampusMakers/CampusMakers)

-   **Deployment:** [Link to Live Site]

**Document History:**

| Last date changed:   | Who:  | What was changed:  |
|---|---|---|
| 09/24/2026  | Jarek  | Added product vision and buyer user stories.  |
| 09/24/2026  | Hunter  | Added project tracker conventions and code style guides to CONTRIBUTING.md  |
| 09/25/2026  | Deekshitha  | Added user stories for a student maker.  |
| 09/25/2026  | Hunter  | Added user stories for site administrator  |
| 09/25/2026  | Deekshitha  | Added user stories for a local community member.  |

**Campus Makers**

**Software Requirements Specification (SRS)**

**Course: CSC3100**

**Date: [Submission Date]**

**<u>Table of Contents</u>**

1.  **<u>Introduction ………………………………………………………………………….. [Page #]</u>**

    -   **<u>1.1 Project Purpose</u>**

    -   **<u>1.2 Intended Audience</u>**

    -   **<u>1.3 Project Scope</u>**

2.  **<u>user storeies …………………………………………………………………………. [Page #]</u>**

    -   **<u>2.1 User Features (The "Shall" Statements)</u>**

    -   **<u>2.2 Admin Features</u>**

3.  **<u>Functional Requirements………………………………………………. [Page #]</u>**

4.  **<u>Non-Functional Requirements …………………………………….. [Page #]</u>**

    -   **<u>4.1 Data Integrity & Security</u>**

    -   **<u>4.2 Performance & Usability</u>**

5.  **<u>System Architecture ………………………………………………………. [Page #]</u>**

    -   **<u>5.1 REST API Endpoints</u>**

    -   **<u>5.2 Database Schema (MySQL)</u>**

6.  **<u>User Interface (UI) ……………………………………………………………. [Page #]</u>**

    -   **<u>6.1 Wireframes / Mockups</u>**

7.  **<u>Data Requirements …………………………………………………………… [Page #]</u>**

    -   **<u>7.1 List of persistent data</u>**

8.  **<u>Traceability Matrix ……………………………………………………….. [Page #]</u>**

9.  **<u>Appendices …………………………………………………………………………… [Page #]</u>**


1.  **<u>Introduction</u>**

-   <u>**Problem Statement:** What specific problem are you solving?</u>

-   <u>**Target Audience:** Who are the stakeholders?</u>

-   <u>**scope:** what is the scope of this project?</u>
  
  For college students who want to buy, sell, and discover student-made crafts/products, campus makers is a campus-based online marketplace which connects student creators and buyers within their college. Unlike general online marketplaces, our product focuses on individual campus communities and helps students discover local creators, products, services, and selling events on campus. 

2.  **<u>user stories</u>**

*<u>User stories follow the format: **"As a [Type of User], I want to [Action] so that [Value/Benefit]."**…</u>*

-   <u>**US-01:** Student Maker</u>

-   <u>**US-02:** Buyer</u>

-   <u>**US-03:** Site Administrator</u>

-   <u>**US-04:** Local Community Member</u>

| ID | Requirement | Priority |
|---|---|---|
| US-01.1  | As a student maker, I want to upload my products, pictures, and pricing and collaborate with other makers so that I can get more users and promote my creations.  | 1  |
| US-01.2  | As a student maker, I want to manage my store profile and contact information, so that I can ensure my information is protected and that my customer base has the most up-to-date contact information and store details.  | 4  |
| US-01.3  | As a student maker, I want to set an availability calendar, so my customers know when I am available for services (nails, hair, etc.)    | 4  |
| US-02.1  | As a buyer, I want to browse products/crafts listed by student sellers so that I can discover unique items available within my campus community.  | 4  |
| US-02.2  | As a buyer, I want to search and filter marketplace listing by categories, price, and other relevant topics so that I can quickly find products that match what I am looking for.  |   |
| US-02.3  | As a buyer, I want to purchase an item using an available and secure payment method so that I can conveniently buy products from student sellers through Campus Makers.  |   |
| US-03.1  | As a site administrator, I want to delete spam/rule-breaking listings to guarantee user safety and integrity.  |   |
| US-03.2  | As a site administrator, I want to view site and purchase analytics so future tasks can be optimized for user needs.  |   |
| US-03.3  | As a site administrator, I want to edit user account information so incorrect details can be fixed, ensuring site accuracy.  |   |
| US-04.1  |   |   |
| US-04.2  |   |   |
| US-04.3  |   |   |   

3.  **<u>Functional requirements</u>**

*The system shall…*

**<u>4. Non-Functional Requirements</u>**

-   <u>**Integrity:** handling errors and bad data</u>

-   <u>**Security:** Implement bcrypt for password hashing and environment variables for DB credentials.</u>

-   <u>**usability**:</u>

**<u>5. System Architecture</u>**

-   <u>**REST Endpoints:** (List METHOD | URL | DESCRIPTION)</u>

-   **<u>List your planned endpoints based on your REST slide:</u>**

    -   **<u>GET /api/resources — Fetches collection.</u>**

    -   **<u>POST /api/resources — Creates a new resource.</u>**

-   <u>**UML:** (Attach a diagram)</u>

6.  **<u>User Interface (UI)</u>**

    a.  **<u>5.1 Wireframes / Mockups</u>**

7.  **<u>Data Requirements</u>**

8.  **<u>Traceability Matrix</u>**

9.  **<u>AI Usage & Disclosure (Mandatory)</u>**

-   <u>**Model(s) Used:**</u>

-   **<u>prompts used during coding:</u>**
