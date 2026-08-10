"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Camera,
  Database,
  GraduationCap,
  Lock,
  Mail,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import "./privacy.css";

const LAST_UPDATED = "10 August 2026";
const EFFECTIVE_DATE = "10 August 2026";
const APP_NAME = "Codeat Education";
const COMPANY = "Codeat Infotech";
const SUPPORT_PATH = "/#contact";

const SECTIONS = [
  { id: "intro", label: "Introduction" },
  { id: "who", label: "Who we are" },
  { id: "scope", label: "Who this covers" },
  { id: "data", label: "Data we collect" },
  { id: "staff", label: "Staff panel" },
  { id: "student", label: "Student panel" },
  { id: "mobile", label: "Mobile app & permissions" },
  { id: "use", label: "How we use data" },
  { id: "share", label: "Sharing & third parties" },
  { id: "security", label: "Security" },
  { id: "retention", label: "Retention & deletion" },
  { id: "children", label: "Children’s privacy" },
  { id: "rights", label: "Your rights" },
  { id: "changes", label: "Policy changes" },
  { id: "contact", label: "Contact" },
] as const;

export default function PrivacyPolicyPage() {
  const [active, setActive] = useState<string>("intro");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.35, 0.6] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  const toc = useMemo(() => SECTIONS, []);

  return (
    <div className="privacy-site">
      <header className="privacy-topbar">
        <div className="privacy-topbar-inner">
          <Link href="/" className="privacy-brand">
            <span className="privacy-brand-mark" aria-hidden>
              <BookOpen className="h-4 w-4" />
            </span>
            <span>
              <strong>{APP_NAME}</strong>
              <em>Privacy Policy</em>
            </span>
          </Link>
          <nav className="privacy-top-links" aria-label="Quick links">
            <Link href="/login">Staff / Student Login</Link>
            <Link href={SUPPORT_PATH} className="privacy-top-cta">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <main className="privacy-main">
        <section className="privacy-hero">
          <p className="privacy-eyebrow">
            <Shield className="h-3.5 w-3.5" />
            Google Play · Web · Mobile
          </p>
          <h1>Privacy Policy</h1>
          <p className="privacy-lede">
            This policy explains how {APP_NAME} ({COMPANY}) collects, uses, stores, and
            protects information when schools, staff, and students use our education
            portal and mobile application.
          </p>
          <div className="privacy-meta">
            <span>Effective: {EFFECTIVE_DATE}</span>
            <span>Last updated: {LAST_UPDATED}</span>
          </div>
          <div className="privacy-pill-row" aria-label="Covered products">
            <span>
              <Users className="h-3.5 w-3.5" /> Staff panel
            </span>
            <span>
              <GraduationCap className="h-3.5 w-3.5" /> Student panel
            </span>
            <span>
              <Smartphone className="h-3.5 w-3.5" /> Android app
            </span>
          </div>
        </section>

        <div className="privacy-layout">
          <aside className="privacy-toc" aria-label="On this page">
            <p className="privacy-toc-title">On this page</p>
            <ol>
              {toc.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={active === s.id ? "is-active" : undefined}
                    onClick={() => setActive(s.id)}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <article className="privacy-article">
            <section id="intro" className="privacy-section">
              <h2>1. Introduction</h2>
              <p>
                {APP_NAME} is a multi-school education platform used for campus
                administration, teaching operations, and student self-service. By
                accessing the website, staff portal, student portal, or Android app, you
                agree to the practices described in this Privacy Policy.
              </p>
              <p>
                If you do not agree with this policy, please do not use the Service. For
                school accounts, the school administrator remains responsible for
                obtaining any local consents required from parents/guardians of minor
                students.
              </p>
            </section>

            <section id="who" className="privacy-section">
              <h2>2. Who we are</h2>
              <div className="privacy-callout">
                <p>
                  <strong>Product:</strong> {APP_NAME} (School ERP / Education Portal)
                </p>
                <p>
                  <strong>Operator:</strong> {COMPANY}
                </p>
                <p>
                  <strong>Managed by:</strong> Codeat Infotech
                </p>
                <p>
                  <strong>Region focus:</strong> Schools in India (including Gujarat board
                  workflows)
                </p>
              </div>
              <p>
                Schools that subscribe to the platform act as controllers of their own
                student and staff records. {COMPANY} processes that data to provide the
                Service on behalf of each school.
              </p>
            </section>

            <section id="scope" className="privacy-section">
              <h2>3. Who this policy covers</h2>
              <ul>
                <li>
                  <strong>School administrators &amp; clerks</strong> — school operations,
                  scholarships, accounts, certificates, ID cards, admissions.
                </li>
                <li>
                  <strong>Teachers / staff</strong> — attendance, class lists, results
                  entry, timetable, activities, staff chat.
                </li>
                <li>
                  <strong>Students (and parents/guardians using student login)</strong> —
                  profile view, documents, exam seats, holidays, limited self-service.
                </li>
                <li>
                  <strong>CA / auditor users</strong> — financial year audit access where
                  enabled by the school.
                </li>
                <li>
                  <strong>Visitors</strong> — public pages such as login, landing, ID-card
                  scan links, and this privacy policy.
                </li>
              </ul>
            </section>

            <section id="data" className="privacy-section">
              <h2>4. Data we collect</h2>
              <p>Depending on your role and school configuration, we may process:</p>

              <h3>4.1 Account &amp; authentication</h3>
              <ul>
                <li>Name, email address, role (admin, clerk, teacher, student, CA)</li>
                <li>School code / UDISE linkage</li>
                <li>Password (stored as a secure hash — never in plain text)</li>
                <li>Login sessions, device/session identifiers, IP address, login time</li>
                <li>Email verification / OTP codes for account setup</li>
              </ul>

              <h3>4.2 Student academic &amp; personal records</h3>
              <ul>
                <li>Name, gender, date of birth, class, section, roll / GR numbers</li>
                <li>Contact mobile, address, parent/guardian names</li>
                <li>
                  Government identifiers where the school enters them for scholarships or
                  registers (for example Aadhaar / APAAR / child UID) — processed only as
                  required by that school’s workflows
                </li>
                <li>Bank details for scholarship disbursement (if entered by school)</li>
                <li>Photos / signatures used for ID cards and certificates</li>
                <li>Attendance, exam marks, report cards, seat numbers, activities</li>
              </ul>

              <h3>4.3 Staff / HR records</h3>
              <ul>
                <li>Employee profile, designation, contact details</li>
                <li>Attendance and payroll-related figures entered by the school</li>
                <li>Optional income-tax / salary statement data when that module is used</li>
              </ul>

              <h3>4.4 School operations data</h3>
              <ul>
                <li>Classes, subjects, timetable, holidays, results configuration</li>
                <li>Accounting vouchers, financial years, audit notes (if enabled)</li>
                <li>Certificates, letterheads, ID-card share links</li>
                <li>Help-desk / support messages and staff chat messages</li>
              </ul>

              <h3>4.5 Technical &amp; diagnostics</h3>
              <ul>
                <li>App version, device type/OS (mobile), browser type (web)</li>
                <li>Crash / error logs needed to keep the Service reliable</li>
                <li>Approximate network metadata (IP) for security and abuse prevention</li>
              </ul>

              <div className="privacy-note">
                <Database className="h-4 w-4" />
                <p>
                  We do <strong>not</strong> sell personal data. Schools decide which
                  modules are enabled and what records they enter.
                </p>
              </div>
            </section>

            <section id="staff" className="privacy-section">
              <h2>5. Staff panel (admin, clerk, teacher)</h2>
              <p>
                The staff-facing product helps schools run day-to-day campus work. Typical
                processing includes:
              </p>
              <ul>
                <li>Managing student and staff directories</li>
                <li>Marking / reviewing attendance and results</li>
                <li>Generating certificates, ID cards, and board-related reports</li>
                <li>Scholarship import / submission tools configured by the school</li>
                <li>Accounting books and CA audit collaboration (when licensed)</li>
                <li>Internal staff messaging and help conversations</li>
              </ul>
              <p>
                Staff accounts must use credentials issued or approved by the school.
                Staff should not share passwords and should log out on shared devices.
              </p>
            </section>

            <section id="student" className="privacy-section">
              <h2>6. Student panel</h2>
              <p>
                The student portal is a limited self-service area. Students typically can
                view information the school has already recorded, such as:
              </p>
              <ul>
                <li>Basic profile and class information</li>
                <li>Documents / notices the school makes available</li>
                <li>Exam seat numbers, holidays, and selected academic views</li>
              </ul>
              <p>
                Student accounts may start with a temporary password and email OTP
                verification. Students (or guardians) should change temporary passwords
                promptly and keep login details private.
              </p>
            </section>

            <section id="mobile" className="privacy-section">
              <h2>7. Mobile app &amp; Android permissions</h2>
              <p>
                Our Android application provides access to the same staff and student
                experiences available on the web, optimized for phones. Depending on
                features you use, the app may request:
              </p>
              <div className="privacy-perm-grid">
                <div>
                  <Smartphone className="h-4 w-4" />
                  <h3>Internet</h3>
                  <p>Required to sign in and sync school data securely.</p>
                </div>
                <div>
                  <Camera className="h-4 w-4" />
                  <h3>Camera / photos</h3>
                  <p>
                    Optional — for profile/ID photos or document capture when a school
                    feature needs an image.
                  </p>
                </div>
                <div>
                  <Lock className="h-4 w-4" />
                  <h3>Notifications</h3>
                  <p>
                    Optional — for login alerts, notices, or operational reminders if
                    enabled.
                  </p>
                </div>
                <div>
                  <Database className="h-4 w-4" />
                  <h3>Storage</h3>
                  <p>
                    Optional — to save/share downloaded PDFs such as certificates or
                    reports.
                  </p>
                </div>
              </div>
              <p>
                The app does not require continuous background location tracking for core
                school workflows. Permission prompts appear only when a feature needs
                that access.
              </p>
            </section>

            <section id="use" className="privacy-section">
              <h2>8. How we use data</h2>
              <ul>
                <li>Provide and operate school ERP features for authorised users</li>
                <li>Authenticate users and protect accounts against misuse</li>
                <li>Generate academic, administrative, and financial documents</li>
                <li>Support multi-school tenancy so one school cannot see another’s data</li>
                <li>Send transactional emails / OTPs related to account security</li>
                <li>Diagnose outages, improve reliability, and provide customer support</li>
                <li>Comply with applicable law and respond to lawful requests</li>
              </ul>
            </section>

            <section id="share" className="privacy-section">
              <h2>9. Sharing &amp; third parties</h2>
              <p>We may share information only in these cases:</p>
              <ul>
                <li>
                  <strong>Within the school tenancy</strong> — with roles the school has
                  authorised (for example a teacher seeing their class list).
                </li>
                <li>
                  <strong>Service providers</strong> — hosting, email delivery, or
                  infrastructure vendors who process data under instructions and
                  appropriate safeguards.
                </li>
                <li>
                  <strong>Government / board portals</strong> — only when a school uses
                  integrations (for example scholarship or board workflows) and submits
                  data intentionally through those tools.
                </li>
                <li>
                  <strong>Legal requirements</strong> — if required by law, regulation, or
                  valid legal process.
                </li>
              </ul>
              <p>
                Public ID-card scan links show only the limited student/staff identity
                information the school chooses to publish for verification.
              </p>
            </section>

            <section id="security" className="privacy-section">
              <h2>10. Security</h2>
              <ul>
                <li>Role-based access control (admin, clerk, teacher, student, CA)</li>
                <li>Password hashing and session-based authentication</li>
                <li>School-code scoped login for school users</li>
                <li>HTTPS transport for web and API traffic</li>
                <li>Operational monitoring and access logging for sensitive admin actions</li>
              </ul>
              <p>
                No method of transmission or storage is 100% secure. Schools and users
                must also follow good practices (strong passwords, limited shared-device
                use, timely revocation of staff who leave).
              </p>
            </section>

            <section id="retention" className="privacy-section">
              <h2>11. Retention &amp; deletion</h2>
              <p>
                We retain school data for as long as the school’s subscription / account
                remains active and as needed to provide the Service. Schools may update or
                remove student/staff records from within the portal according to their
                own policies.
              </p>
              <p>
                After a school requests account closure, or when data is no longer needed
                for the Service or legal obligations, we delete or anonymise personal data
                within a reasonable period, subject to backup cycles and mandatory
                retention rules.
              </p>
              <p>
                To request deletion of a personal account or school dataset, contact your
                school administrator first. Platform-level requests can be sent via the
                contact channel in section 15.
              </p>
            </section>

            <section id="children" className="privacy-section">
              <h2>12. Children’s privacy</h2>
              <p>
                {APP_NAME} is used by schools that may enrol children under 18. Student
                accounts and records are created and supervised by the school. We do not
                knowingly allow children to create independent consumer accounts outside
                school provisioning.
              </p>
              <p>
                Parents or guardians who want to review or correct a child’s information
                should contact the school administration. The school can update records in
                the staff panel or escalate to platform support when needed.
              </p>
            </section>

            <section id="rights" className="privacy-section">
              <h2>13. Your rights</h2>
              <p>Subject to applicable law and school policies, you may request to:</p>
              <ul>
                <li>Access personal data held about you in the Service</li>
                <li>Correct inaccurate profile or contact information</li>
                <li>Delete or restrict certain personal data where feasible</li>
                <li>Withdraw optional consents (for example notification permissions)</li>
              </ul>
              <p>
                Staff and students should normally raise requests with their school admin.
                Super-admin / platform requests can use the contact details below.
              </p>
            </section>

            <section id="changes" className="privacy-section">
              <h2>14. Changes to this policy</h2>
              <p>
                We may update this Privacy Policy to reflect product, legal, or security
                changes. The “Last updated” date at the top will change when we do. For
                material updates, we may also notify schools through the portal or email.
                Continued use of the Service after an update means you accept the revised
                policy.
              </p>
            </section>

            <section id="contact" className="privacy-section">
              <h2>15. Contact</h2>
              <p>
                For privacy questions, data requests, or Play Store / app support related
                to {APP_NAME}:
              </p>
              <div className="privacy-contact-card">
                <Mail className="h-5 w-5" />
                <div>
                  <p className="privacy-contact-title">{COMPANY} · {APP_NAME}</p>
                  <p>
                    Use the in-app / website support form, or ask your school administrator
                    to escalate to the platform team.
                  </p>
                  <div className="privacy-contact-actions">
                    <Link href={SUPPORT_PATH}>Open contact form</Link>
                    <Link href="/login">Go to login</Link>
                  </div>
                </div>
              </div>
              <p className="privacy-fineprint">
                This page is provided for transparency and Google Play Data safety /
                privacy disclosure. It is not legal advice. Schools remain responsible for
                complying with local education and data-protection obligations for the
                records they upload.
              </p>
            </section>

            <div className="privacy-end">
              <Link href="/" className="privacy-back-home">
                <ArrowLeft className="h-4 w-4" />
                Back to {APP_NAME}
              </Link>
            </div>
          </article>
        </div>
      </main>

      <footer className="privacy-footer">
        <p>© {new Date().getFullYear()} {COMPANY}. All rights reserved.</p>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Login</Link>
          <Link href="/">Home</Link>
        </div>
      </footer>

      {showTop && (
        <button
          type="button"
          className="privacy-top-btn"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
