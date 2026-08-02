import { useNavigate } from 'react-router-dom'
import styles from './LegalPage.module.css'

export default function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>

        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: July 2026</p>

        <section className={styles.section}>
          <h2>1. Who We Are</h2>
          <p>PollHub ("we", "us", "our") is a community polling platform. This Privacy Policy explains how we collect, use, and protect your personal information in accordance with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA).</p>
        </section>

        <section className={styles.section}>
          <h2>2. Information We Collect</h2>
          <ul>
            <li><strong>Account information:</strong> email address, username, profile picture</li>
            <li><strong>Content you create:</strong> polls, votes, comments, likes</li>
            <li><strong>Usage data:</strong> pages visited, interactions, session duration (via PostHog analytics)</li>
            <li><strong>Google sign-in data:</strong> if you use Google OAuth, we receive your Google account email and profile information</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To provide and improve the Service</li>
            <li>To send notifications you have opted into</li>
            <li>To moderate content and enforce community guidelines</li>
            <li>To analyze usage patterns and improve user experience</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul>
            <li><strong>Supabase</strong> — database and authentication hosting</li>
            <li><strong>Vercel</strong> — application hosting</li>
            <li><strong>Google</strong> — OAuth sign-in (optional)</li>
            <li><strong>Cloudflare</strong> — bot protection (Turnstile)</li>
            <li><strong>PostHog</strong> — anonymous usage analytics</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Data Retention</h2>
          <p>We retain your data for as long as your account is active. You may delete your account at any time from Settings → Account → Delete Account, which permanently removes all your data from our systems.</p>
        </section>

        <section className={styles.section}>
          <h2>6. Your Rights (PIPEDA)</h2>
          <p>Under PIPEDA, you have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Withdraw consent to data collection (by deleting your account)</li>
            <li>File a complaint with the Office of the Privacy Commissioner of Canada</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Cookies</h2>
          <p>PollHub uses essential cookies for authentication and session management. We do not use advertising cookies or sell your data to advertisers.</p>
        </section>

        <section className={styles.section}>
          <h2>8. Children's Privacy</h2>
          <p>PollHub is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.</p>
        </section>

        <section className={styles.section}>
          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify users of significant changes by posting a notice on the Service.</p>
        </section>

        <section className={styles.section}>
          <h2>10. Contact</h2>
          <p>For privacy-related questions or requests, contact us at <a href="mailto:ypmedia.contact@gmail.com">ypmedia.contact@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
