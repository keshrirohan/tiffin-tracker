import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Tiffin Tracker",
  description: "Privacy Policy for Tiffin Tracker",
};

const sections = [
  {
    title: "1. Information We Collect",
    content: [
      "**Account Information:** When you sign up, we collect your name and email address. If you use Google Sign-In, we receive your name, email, and profile picture from Google.",
      "**Tiffin Records:** Meal entries you create — date, meal type (lunch/dinner), status (received/not received), and price.",
      "**Billing & Payment Records:** Payment amounts, dates, and optional notes you add.",
      "**Technical Data:** Basic usage data such as session tokens stored in cookies, and app preferences (theme, notification settings) stored in your browser's local storage.",
    ],
  },
  {
    title: "2. How We Use Your Data",
    content: [
      "To provide and operate the Tiffin Tracker service — tracking meals, calculating bills, and managing payments.",
      "To authenticate you securely via email/password or Google OAuth.",
      "To send browser-based reminders (only if you explicitly enable notifications).",
      "We do not sell, rent, or share your personal data with third parties for marketing purposes.",
    ],
  },
  {
    title: "3. Google OAuth",
    content: [
      "If you choose to sign in with Google, we use Google OAuth 2.0 to authenticate you. We only request access to your basic profile (name and email).",
      "We do not access your Google Drive, Gmail, contacts, or any other Google services.",
      "You can revoke access at any time via your Google Account → Security → Third-party apps.",
    ],
  },
  {
    title: "4. Data Storage & Security",
    content: [
      "Your data is stored in MongoDB Atlas, a cloud database service with encryption at rest and in transit.",
      "Passwords are hashed using bcrypt before storage — we never store plain-text passwords.",
      "Session tokens are stored in secure, HTTP-only cookies.",
      "While we take reasonable steps to protect your data, no internet transmission is 100% secure.",
    ],
  },
  {
    title: "5. Cookies & Local Storage",
    content: [
      "**Session Cookie:** A secure HTTP-only cookie is used to keep you logged in for up to 30 days.",
      "**Local Storage:** Your theme preference (light/dark) and notification settings are stored locally in your browser. This data never leaves your device.",
      "We do not use advertising or tracking cookies.",
    ],
  },
  {
    title: "6. Third-Party Services",
    content: [
      "**MongoDB Atlas** (database hosting) — mongodb.com",
      "**Google OAuth** (authentication) — google.com",
      "**Vercel** (application hosting) — vercel.com",
      "Each service has its own privacy policy. We encourage you to review them.",
    ],
  },
  {
    title: "7. Your Rights",
    content: [
      "**Access:** You can view all your meal and payment data within the app at any time.",
      "**Deletion:** You can delete all your data from Settings → Clear All Data. This permanently removes all meal records and payments.",
      "**Account Deletion:** To permanently delete your account, email us at keshrirohan214@gmail.com.",
      "**Data Export:** You can export your billing data as PDF or CSV from the Bill page anytime.",
    ],
  },
  {
    title: "8. Children's Privacy",
    content: [
      "Tiffin Tracker is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us to have it removed.",
    ],
  },
  {
    title: "9. Changes to This Policy",
    content: [
      "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the app after changes constitutes acceptance of the revised policy.",
    ],
  },
  {
    title: "10. Contact Us",
    content: [
      "If you have any questions or requests regarding this Privacy Policy, please contact us at: keshrirohan214@gmail.com",
    ],
  },
];

function bold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900 dark:text-white">{part}</strong> : part
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 text-sm font-medium mb-6 hover:text-orange-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to App
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">🍱</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <strong className="text-gray-700 dark:text-gray-300">Tiffin Tracker</strong> &nbsp;·&nbsp; Last updated: October 29, 2026
          </p>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            We take your privacy seriously. This policy explains what data we collect, how we use it, and the choices you have.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4 pb-12">
          {sections.map((section) => (
            <div key={section.title} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">{section.title}</h2>
              <ul className="space-y-2">
                {section.content.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex gap-2">
                    <span className="text-orange-400 mt-0.5 flex-shrink-0">›</span>
                    <span>{bold(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact card */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800/40 p-5 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Questions about your privacy?</p>
            <a href="mailto:keshrirohan214@gmail.com"
              className="text-orange-500 font-semibold text-sm hover:text-orange-600 mt-1 inline-block">
              keshrirohan214@gmail.com
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
