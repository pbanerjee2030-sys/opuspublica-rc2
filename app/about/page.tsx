import AboutClient from './AboutClient';

export const metadata = {
  title: 'About | Opus Publica',
  description: 'Opus Publica is a leading global platform for public policy research and publishing, dedicated to advancing knowledge that drives real-world impact.',
  alternates: {
    canonical: 'https://opuspublica.com/about',
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
