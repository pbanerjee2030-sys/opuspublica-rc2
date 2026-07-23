import ContactClient from './ContactClient';

export const metadata = {
  title: 'Contact | Opus Publica',
  description: 'Get in touch with Opus Publica. Connect with us across the globe via our offices in The Hague, New York, Durban, and Kathmandu.',
  alternates: {
    canonical: 'https://opuspublica.com/contact',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
