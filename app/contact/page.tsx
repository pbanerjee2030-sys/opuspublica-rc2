import ContactClient from './ContactClient';

export const metadata = {
  title: 'Contact | Opus Publica',
  description: 'Get in touch with Opus Publica. Connect with our offices in The Hague, New York, and Kathmandu, or send us a message directly.',
  alternates: {
    canonical: 'https://opuspublica.com/contact',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
