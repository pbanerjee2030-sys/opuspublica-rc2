export interface BookAuthor {
  name: string;
  role: string;
}

export interface BookTestimonial {
  quote: string;
  author: string;
  title: string;
}

export interface Book {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  coverImage: string;
  authors: BookAuthor[];
  isbn: string;
  publicationDate: string;
  pages: number;
  language: string;
  format: string;
  price: string;
  description: string;
  longDescription: string;
  tableOfContents: string[];
  testimonials: BookTestimonial[];
  categories: string[];
  tags: string[];
  status: string;
  hasSample?: boolean;
  samplePath?: string;
  downloadPath?: string;
  externalUrl?: string;
  isAvailable?: boolean;
  author?: string;
  formats?: { name: string; price: string; isbn: string }[];
}

export interface Address {
  label: string;
  icon: string;
  address: string;
  note?: string;
}

export const addresses: Address[] = [
  {
    label: "Headquarters",
    icon: "Building2",
    address: "Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands",
    note: "Advocacy Unified Network"
  },
  {
    label: "Registered Office",
    icon: "MapPin",
    address: "85 MOUNT HOPE RD, MAHOPAC NY 10541-0000, USA"
  },
  {
    label: "SAARC Office",
    icon: "Globe",
    address: "Anamnagar, Kathmandu, Nepal"
  }
];

export const books: Book[] = [
  {
    id: 1,
    slug: "grace-timekeepers",
    title: "GRACE: Timekeepers of Ancient Cultural Legacy",
    subtitle: "Preserving the World's Ancient Cultural Traditions",
    coverImage: "/books/grace-cover.jpg",
    authors: [
      { name: "Francisca Oliviera", role: "Lead Author" },
      { name: "Priyasa Banerjee", role: "Author" },
      { name: "Sam Polkar", role: "Author" },
      { name: "Chidinma Adebayo", role: "Author" },
      { name: "Ayako Yokuba", role: "Author" }
    ],
    isbn: "9798227366276",
    publicationDate: "2024",
    pages: 240,
    language: "English",
    format: "Paperback, E-book",
    price: "$25.99",
    description: "GRACE: Timekeepers of Ancient Cultural Legacy offers a profound exploration of the urgent need to preserve ancient cultures and traditions in the face of mounting global challenges.",
    longDescription: "Through a richly detailed narrative, this book introduces GRACE's founding mission and its growing influence on the global stage.",
    tableOfContents: [
      "The Genesis of GRACE",
      "The Global Threat to Ancient Cultures",
      "GRACE's Operational Structure",
      "Preservation and Documentation Techniques",
      "Research and Education Initiatives",
      "International Advocacy and Policy Work",
      "Technology Integration in Cultural Preservation",
      "Global Collaboration: A Key to Success",
      "Ethical Dimensions of Cultural Preservation",
      "The Future of Ancient Cultural Preservation"
    ],
    testimonials: [
      {
        quote: "A landmark work in the field of cultural preservation. GRACE offers hope for safeguarding humanity's shared heritage.",
        author: "Dr. Rajendran Govender",
        title: "Social Anthropologist, IBSA and Ford Fellow"
      },
      {
        quote: "A meticulously researched and beautifully presented volume that transcends the boundaries of mere historical documentation.",
        author: "Dr. Mathieu Martin",
        title: "Photographer, Anthropologist, Switzerland"
      }
    ],
    categories: ["Cultural Heritage", "Preservation", "Technology", "Global Affairs"],
    tags: ["cultural preservation", "ancient heritage", "digital archiving", "global heritage"],
    status: "Available Now",
    isAvailable: true
  },
  {
    id: 2,
    slug: "echoes-of-the-himalayas",
    title: "Echoes of the Himalayas: Poems of Awe & Spiritual Discovery",
    subtitle: "Poems of Awe and Spiritual Discovery",
    coverImage: "/books/echoes-cover.jpg",
    authors: [
      { name: "Verender Bangroo", role: "Author" }
    ],
    isbn: "9798232056490",
    publicationDate: "2025",
    pages: 210,
    language: "English",
    format: "Paperback, E-book",
    price: "$21.99",
    description: "A remarkable fusion of cultural immersion, encounters, and recollections conveyed with lyrical gentleness.",
    longDescription: "The poems offer readers a broad range of themes, from the resiliency of indigenous peoples to the holiness of the mountains.",
    tableOfContents: [
      "Exalted Aspects - Himalayan Eco-Culture",
      "Family, Friends, and Kinship Values",
      "Displacement and Transmigration Woes",
      "Culinary Traditions Embedded in Socio-Cultural Matrix",
      "Occupational Undertakings and Traditions",
      "Pilgrims - A Journey into the Spiritual Realm",
      "Temples - Faith and Ritual Expressions"
    ],
    testimonials: [
      {
        quote: "A superbly produced anthology that effectively conveys the deep relationship that exists between culture, nature, and the human soul.",
        author: "Arindam Bhattacharya",
        title: "Chairman, Advocacy Unified Network"
      },
      {
        quote: "Through Verender Bangroo's moving poetry, discover the enchantment and charm of the Himalayas.",
        author: "Hafizullah Mir",
        title: "Writer, Srinagar"
      }
    ],
    categories: ["Poetry", "Himalayas", "Spiritual", "Cultural Heritage"],
    tags: ["himalayas", "poetry", "spiritual discovery", "cultural heritage"],
    status: "Available Now",
    isAvailable: true
  },
  {
    id: 3,
    slug: "bhagavad-gita-ballot-box",
    title: "From the Bhagavad Gita to the Ballot Box",
    subtitle: "Applying Krishna's Teachings to Politics",
    coverImage: "/books/bhagavad-cover.jpg",
    authors: [
      { name: "Arindam Bhattacharya", role: "Author" }
    ],
    isbn: "9798230447689",
    publicationDate: "2024",
    pages: 465,
    language: "English",
    format: "Paperback, E-book",
    price: "$65.99",
    description: "A timeless scripture meets modern governance in this thought-provoking book that reimagines the Bhagavad Gita's wisdom.",
    longDescription: "Through a compelling narrative, this book delves into the intersections of spirituality and statecraft.",
    tableOfContents: [
      "From the Bhagavad Gita to the Ballot Box: An Introduction",
      "The Relevance of Ancient Wisdom in Modern Politics",
      "Unveiling the Teachings of Krishna in the Bhagavad Gita",
      "The Evolution of Political Systems",
      "Ethical Leadership: Lessons from Krishna's Guidance",
      "Duty, Dharma, and the Responsibilities of Political Leaders",
      "The Quest for Wisdom: Applying Krishna's Teachings to Decision-Making",
      "Governance for the Greater Good",
      "Pursuit of Justice and Equality in Politics",
      "Sustainable Policies and Environmental Stewardship"
    ],
    testimonials: [
      {
        quote: "A groundbreaking work that bridges ancient wisdom with contemporary governance. Bhattacharya offers a transformative perspective on ethical leadership.",
        author: "Prof. (Dr.) Richa Kamboj",
        title: "Artist, Art Historian, Art Critic"
      },
      {
        quote: "An essential read for political thinkers, policymakers, and anyone interested in the fusion of wisdom and governance.",
        author: "Dr. Abid Ahmad Bhat",
        title: "Award-winning writer and translator"
      }
    ],
    categories: ["Politics", "Philosophy", "Leadership", "Spirituality"],
    tags: ["bhagavad gita", "political leadership", "ethical governance", "karma"],
    status: "Available Now",
    isAvailable: true
  }
];
