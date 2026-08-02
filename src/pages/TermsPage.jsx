import { useNavigate } from 'react-router-dom'
import styles from './LegalPage.module.css'

export default function TermsPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>

        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: July 2026</p>

        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using PollHub ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
        </section>

        <section className={styles.section}>
          <h2>2. Who Can Use PollHub</h2>
          <p>You must be at least 13 years old to use PollHub. By using the Service, you confirm that you meet this requirement.</p>
        </section>

        <section className={styles.section}>
          <h2>3. Your Account</h2>
          <p>You are responsible for maintaining the security of your account and for all activity that occurs under it. You agree to provide accurate information when creating your account and to notify us immediately of any unauthorized use.</p>
        </section>

        <section className={styles.section}>
          <h2>4. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Post spam, hate speech, harassment, or illegal content</li>
            <li>Impersonate other users or public figures</li>
            <li>Use bots or automated tools to abuse the Service</li>
            <li>Attempt to manipulate poll results through fraudulent means</li>
            <li>Upload malicious files or content</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Your Content</h2>
          <p>You retain ownership of the content you post on PollHub. By posting content, you grant PollHub a non-exclusive, royalty-free license to display and distribute your content as part of the Service. You are solely responsible for the content you post.</p>
        </section>

        <section className={styles.section}>
          <h2>6. Content Moderation</h2>
          <p>PollHub reserves the right to remove content or suspend accounts that violate these Terms, without prior notice. We are not obligated to monitor all content but may do so at our discretion.</p>
        </section>

        <section className={styles.section}>
          <h2>7. Service Changes</h2>
          <p>We reserve the right to modify, suspend, or discontinue the Service at any time without notice. We are not liable to you or any third party for any such changes.</p>
        </section>

        <section className={styles.section}>
          <h2>8. Disclaimer of Warranties</h2>
          <p>PollHub is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.</p>
        </section>

        <section className={styles.section}>
          <h2>9. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, PollHub shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
        </section>

        <section className={styles.section}>
          <h2>10. Governing Law</h2>
          <p>These Terms are governed by the laws of British Columbia, Canada, without regard to conflict of law principles.</p>
        </section>

        <section className={styles.section}>
          <h2>11. Contact</h2>
          <p>For questions about these Terms, contact us at <a href="mailto:ypmedia.contact@gmail.com">ypmedia.contact@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
