import { Link } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">Keep In Touch</span>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-2 mb-12">
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: December 10, 2025</p>
          </div>

          <article className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Keep In Touch ("we," "our," or "us"). We are committed to protecting your 
                personal information and your right to privacy. This Privacy Policy explains how we 
                collect, use, disclose, and safeguard your information when you use our service.
              </p>
            </section>

            <section className="space-y-4 p-6 bg-muted/50 rounded-lg border border-border">
              <h2 className="text-2xl font-semibold text-primary">2. Data Accessed (Google User Data)</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you connect your Google account to Keep In Touch, we access the following Google user data:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Contact Names:</strong> Full names of your Google Contacts</li>
                <li><strong>Phone Numbers:</strong> Phone numbers associated with your contacts</li>
                <li><strong>Email Addresses:</strong> Email addresses associated with your contacts</li>
                <li><strong>Contact Photos:</strong> Profile photos of your contacts (if available)</li>
                <li><strong>Contact Labels/Groups:</strong> Organization labels you've assigned to contacts in Google</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We request <strong>read-only access</strong> to your Google Contacts. We also request write access 
                solely to create new contacts within your Google account when you add contacts through Keep In Touch. 
                We do not modify or delete your existing Google Contacts.
              </p>
            </section>

            <section className="space-y-4 p-6 bg-muted/50 rounded-lg border border-border">
              <h2 className="text-2xl font-semibold text-primary">3. Data Usage (How We Use Google Data)</h2>
              <p className="text-muted-foreground leading-relaxed">
                Keep In Touch accesses Google Contacts data solely to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Display your contacts within the Keep In Touch interface</li>
                <li>Generate personalized AI-powered outreach message suggestions</li>
                <li>Help you manage follow-up reminders and communication cadences</li>
                <li>Allow you to organize contacts with custom labels and notes</li>
                <li>Sync new contacts you create back to your Google Contacts</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not use your Google user data for advertising purposes or to build advertising profiles.
              </p>
            </section>

            <section className="space-y-4 p-6 bg-muted/50 rounded-lg border border-border">
              <h2 className="text-2xl font-semibold text-primary">4. Data Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Keep In Touch does not share, sell, or transfer Google user data to any third parties</strong> except as required to operate core functionality:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Supabase:</strong> Our secure database infrastructure provider (stores encrypted contact data)</li>
                <li><strong>AI Service Providers:</strong> We use AI models to generate message suggestions. Only the contact's name and your custom context notes are sent to generate personalized messages—no phone numbers, emails, or other personal identifiers are shared with AI providers.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We never sell Google user data. All third-party service providers are bound by strict data protection agreements.
              </p>
            </section>

            <section className="space-y-4 p-6 bg-muted/50 rounded-lg border border-border">
              <h2 className="text-2xl font-semibold text-primary">5. Data Storage & Protection</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>What data is stored:</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Your synced Google Contacts data (names, phone numbers, emails, photos, labels)</li>
                <li>Custom notes, conversation context, and cadence settings you create</li>
                <li>AI-generated message drafts</li>
                <li>Your account information and preferences</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>Where data is stored:</strong> Your data is stored on Supabase, a secure cloud database infrastructure with servers located in secure data centers.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>How we protect your data:</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>All data is encrypted in transit using TLS/SSL</li>
                <li>All data is encrypted at rest using AES-256 encryption</li>
                <li>Row-level security policies ensure users can only access their own data</li>
                <li>Regular security audits and monitoring</li>
                <li>Secure authentication via Google OAuth 2.0</li>
              </ul>
            </section>

            <section className="space-y-4 p-6 bg-muted/50 rounded-lg border border-border">
              <h2 className="text-2xl font-semibold text-primary">6. Data Retention & Deletion</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>How long data is stored:</strong> Your data is retained for as long as your account is active. If you do not use your account for 24 months, we may send you a reminder before deleting inactive data.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>How to request deletion:</strong> You may request deletion of all stored Google data at any time by:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Emailing us at <a href="mailto:support@keepintouchtext.com" className="text-primary hover:underline">support@keepintouchtext.com</a></li>
                <li>Deleting your account through the app settings</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>What happens when you delete:</strong> Upon receiving a deletion request or account deletion, all your Google user data is permanently removed from our systems within 30 days. This includes all synced contacts, notes, and associated data. Deletion is complete and irreversible.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Google API Services User Data Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Keep In Touch's use and transfer of information received from Google APIs adheres to the{' '}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Withdraw consent and disconnect your Google account at any time</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies to maintain your session and preferences. We do not use 
                third-party advertising cookies or tracking pixels. You can control cookie settings through your browser.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our service is not intended for children under 13 years of age. We do not knowingly 
                collect personal information from children under 13.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any 
                changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: <a href="mailto:support@keepintouchtext.com" className="text-primary hover:underline">support@keepintouchtext.com</a>
              </p>
            </section>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Keep In Touch. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
