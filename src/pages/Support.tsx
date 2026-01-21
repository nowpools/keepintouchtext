import { Link } from "react-router-dom";
import { ArrowLeft, Mail, HelpCircle, Shield, Bell } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import logo from "@/assets/keep-in-touch-logo.png";

const Support = () => {
  const faqs = [
    {
      question: "Do I need an account to use Keep In Touch Text?",
      answer: "An account is required to securely sync your contacts and reminders across devices.",
      icon: Shield,
    },
    {
      question: "How does Keep In Touch Text access my contacts?",
      answer: "Contacts are accessed only with your explicit permission and are used solely to help manage communication reminders.",
      icon: HelpCircle,
    },
    {
      question: "How do I stop receiving notifications?",
      answer: "You can manage or disable notifications at any time from the app settings or your device settings.",
      icon: Bell,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Keep In Touch" className="h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Keep In Touch Text — Support
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            This page provides support for the Keep In Touch Text iOS app.
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're here to help you stay connected.
          </p>
        </div>
      </section>

      {/* Support Description */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 text-center">
            <p className="text-muted-foreground leading-relaxed">
              If you have questions, need help using the Keep In Touch Text app,
              or want to report a problem, please contact our support team.
              We aim to respond to all inquiries within 24–48 business hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
              Contact Support
            </h2>
            <a
              href="mailto:support@keepintouchtext.com"
              className="flex items-center justify-center gap-3 text-primary hover:text-primary/80 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">Support Email</p>
                <p className="font-medium">support@keepintouchtext.com</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => {
              const Icon = faq.icon;
              return (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-lg px-4 data-[state=open]:bg-accent/50"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <Icon className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pl-8 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </section>

      {/* Developer Information */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Keep In Touch Text</span>
            {" "}is developed by{" "}
            <span className="font-medium text-foreground">Third Degree Leverage LLC</span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-border mt-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Third Degree Leverage LLC
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Support;
