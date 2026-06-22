export interface Journal {
  id: number;
  slug: string;
  title: string;
  desc: string;
  fullDescription: string;
  focusAreas: string[];
  issn?: string;
  callToAction?: string;
  hasPDF?: boolean;
  pdfPath?: string;
  featuredContent?: string;
}

export interface BookAuthor {
  name: string;
  role: string;
}

export interface BookTestimonial {
  quote: string;
  author: string;
  title: string;
}

export interface BookFormatDetail {
  name: string;
  price: string;
  isbn: string;
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
  author?: string; // fallback
  formats?: BookFormatDetail[];
}

export interface Address {
  label: string;
  icon: string;
  address: string;
  note?: string;
}

export const journals: Journal[] = [
  {
    id: 1,
    slug: "cybersec-journal",
    title: "CyberSec Journal",
    desc: "Exploring cybersecurity challenges, policies, and emerging threats in the digital age.",
    fullDescription: "CyberSec Journal is a premier academic publication dedicated to the critical examination of cybersecurity challenges, policies, and emerging threats in our increasingly digital world. As technology continues to evolve at an unprecedented pace, the need for rigorous research and analysis in cybersecurity has never been more urgent. This journal serves as a vital platform for scholars, policymakers, practitioners, and industry leaders to share cutting-edge research, innovative solutions, and thought-provoking perspectives on the most pressing cybersecurity issues of our time.",
    focusAreas: [
      "Cybersecurity Policy and Governance",
      "Critical Infrastructure Protection",
      "Data Privacy and Protection",
      "Artificial Intelligence and Cybersecurity",
      "Cyber Warfare and International Security",
      "Digital Forensics and Incident Response",
      "Cybersecurity Education and Workforce Development"
    ],
    callToAction: "Read the Latest Issue"
  },
  {
    id: 2,
    slug: "migration-matters",
    title: "Migration Matters",
    desc: "Journal of International Labour and Human Trafficking",
    fullDescription: "Migration Matters is a leading scholarly journal dedicated to the comprehensive analysis of international migration, labour mobility, and human trafficking. As migration continues to reshape the global landscape, this journal provides critical insights into the complex interplay between migration patterns, policy responses, and human rights. Through rigorous research and interdisciplinary perspectives, Migration Matters advances understanding of one of the most pressing humanitarian and policy challenges of our time.",
    focusAreas: [
      "International Labour Migration",
      "Human Trafficking and Modern Slavery",
      "Refugee and Asylum Policy",
      "Migration Governance",
      "Migrant Rights and Protection",
      "Integration and Social Cohesion",
      "Climate-Induced Migration"
    ],
    hasPDF: true,
    pdfPath: "/pdfs/migration-matters.pdf",
    featuredContent: "This issue features the comprehensive research paper 'Migration Matters: A Multi-Dimensional Analysis of Policy Responses and Implications' by Arindam Bhattacharya, examining the complex relationship between migration, security threats, and human rights through a multi-dimensional analysis of policy responses and implications."
  },
  {
    id: 3,
    slug: "world-trade-finance-journal",
    title: "The World Trade and Finance Journal",
    desc: "Analysis of global trade dynamics, financial systems, and economic policy.",
    fullDescription: "The World Trade and Finance Journal is the definitive publication for scholars, policymakers, and financial professionals seeking to understand and navigate the complexities of the global economy. As international trade and financial systems undergo rapid transformation, this journal provides authoritative analysis and rigorous research on the most critical issues shaping global commerce and economic policy. Through a commitment to academic excellence and practical relevance, the journal advances understanding of the interconnected forces driving economic globalization.",
    focusAreas: [
      "International Trade Policy",
      "Global Financial Systems",
      "Economic Development",
      "Monetary Policy and Central Banking",
      "Foreign Direct Investment",
      "Trade Agreements and Disputes",
      "Sustainable Finance"
    ],
    callToAction: "Read the Latest Issue"
  },
  {
    id: 4,
    slug: "ecolaw-journal",
    title: "EcoLaw Journal",
    desc: "Environmental Law and Global Concerns",
    fullDescription: "EcoLaw Journal is a leading publication at the intersection of environmental law, policy, and global sustainability. As the world confronts unprecedented environmental challenges, this journal provides critical analysis and innovative solutions to the most pressing ecological issues of our time. Through rigorous legal scholarship, interdisciplinary research, and policy-focused analysis, EcoLaw Journal advances the understanding and implementation of environmental law and governance.",
    focusAreas: [
      "Climate Change Law and Policy",
      "Biodiversity and Conservation Law",
      "Environmental Justice",
      "International Environmental Agreements",
      "Sustainable Development Law",
      "Pollution Control and Regulation",
      "Indigenous Rights and Environmental Protection"
    ],
    callToAction: "Read the Latest Issue"
  },
  {
    id: 5,
    slug: "global-perspectives",
    title: "Global Perspectives on Politics and Diplomacy",
    desc: "International relations, diplomatic strategies, and political theory.",
    issn: "3050-4589",
    fullDescription: "Global Perspectives on Politics and Diplomacy is a premier academic journal that examines the complex dynamics of international relations, diplomatic strategies, and political theory. As the global order evolves and new challenges emerge, this journal provides a forum for scholars, diplomats, and policy analysts to explore the shifting landscapes of power, governance, and international cooperation. Through rigorous scholarship and diverse perspectives, the journal advances understanding of the forces shaping our interconnected world.",
    focusAreas: [
      "International Relations Theory",
      "Diplomatic Studies",
      "Global Governance",
      "Conflict Resolution and Peacebuilding",
      "Geopolitics and Strategic Studies",
      "Human Rights and International Law",
      "Regional Studies and Comparative Politics"
    ],
    callToAction: "Read the Latest Issue"
  },
  {
    id: 6,
    slug: "voice-rights",
    title: "Voice & Rights",
    desc: "A Journal on Democracy and Civil Liberties",
    fullDescription: "Voice & Rights is a distinguished journal dedicated to the study and advancement of democracy, civil liberties, and human rights. In an era of democratic backsliding, rising authoritarianism, and growing threats to fundamental freedoms, this journal provides critical analysis and advocacy for the principles that underpin open, just, and equitable societies. Through rigorous research and diverse perspectives, Voice & Rights advances understanding of the challenges and opportunities facing democratic governance and civil liberties around the world.",
    focusAreas: [
      "Democratic Theory and Practice",
      "Civil Liberties and Human Rights",
      "Constitutional Law",
      "Freedom of Expression and Press Freedom",
      "Civil Society and Social Movements",
      "Electoral Systems and Political Participation",
      "Human Rights Advocacy"
    ],
    callToAction: "Read the Latest Issue"
  },
  {
    id: 7,
    slug: "expressions",
    title: "Expressions",
    desc: "A Journal of Art and Culture",
    issn: "3050-4538",
    fullDescription: "Expressions is a scholarly journal dedicated to the exploration and celebration of art, culture, and creative expression. As the cultural landscape evolves and new forms of artistic expression emerge, this journal provides a forum for scholars, artists, and cultural practitioners to examine the role of creativity in society and the preservation of cultural heritage. Through interdisciplinary perspectives and rigorous scholarship, Expressions advances understanding of the arts and their transformative power.",
    focusAreas: [
      "Contemporary Art and Criticism",
      "Cultural Heritage Preservation",
      "Visual Culture and Media Studies",
      "Performing Arts and Cultural Expression",
      "Indigenous Art and Culture",
      "Museum and Curatorial Studies",
      "Arts Policy and Practice"
    ],
    hasPDF: true,
    pdfPath: "/pdfs/expressions-sustainable-art.pdf",
    featuredContent: "This issue features the research paper 'Sustainable Art and Cultural Heritage: Balancing Conservation and Innovation' by Priyasa Banerjee, examining the delicate balance between conservation and innovation in preserving sustainable art and cultural heritage through a mixed-methods approach including literature review, case studies, interviews, and surveys."
  },
  {
    id: 8,
    slug: "conflict-peace-studies",
    title: "The Journal of Conflict and Peace Studies",
    desc: "Conflict resolution, peacebuilding, and international security.",
    fullDescription: "The Journal of Conflict and Peace Studies is a leading publication dedicated to the scholarly examination of conflict, peacebuilding, and international security. As violent conflict continues to devastate communities and threaten global stability, this journal provides critical analysis and innovative solutions for preventing, managing, and resolving conflict. Through rigorous research and diverse perspectives, the journal advances understanding of the root causes of conflict and the pathways to sustainable peace.",
    focusAreas: [
      "Conflict Resolution and Mediation",
      "Peacebuilding and Post-Conflict Reconstruction",
      "International Security and Peacekeeping",
      "Conflict Analysis and Early Warning",
      "Nonviolent Resistance and Civil Resistance",
      "Reconciliation and Transitional Justice",
      "Security Sector Reform"
    ],
    hasPDF: true,
    pdfPath: "/pdfs/conflict-peace-studies.pdf",
    featuredContent: "This issue features the research paper 'Examining the Jurisdictional Challenges Faced by the International Criminal Court Under the Rome Statute' by Arindam Bhattacharya, offering a comprehensive comparative analysis of the ICC's jurisdictional challenges across case studies including Darfur, Uganda, the Democratic Republic of the Congo, and Libya."
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
    description: "GRACE: Timekeepers of Ancient Cultural Legacy offers a profound exploration of the urgent need to preserve ancient cultures and traditions in the face of mounting global challenges. From the collapse of historical sites due to urban sprawl to the loss of traditional knowledge systems, the book paints a vivid picture of the critical threats facing cultural heritage today. But more than that, it presents innovative solutions that utilize the latest technological advancements such as AI-driven tools, 3D scanning, and virtual reality to preserve the legacies of the past for future generations.",
    longDescription: "Through a richly detailed narrative, this book introduces GRACE's founding mission and its growing influence on the global stage. Readers will embark on a journey through GRACE's partnerships with governments, cultural institutions, NGOs, and local communities across continents, discovering inspiring case studies of how heritage is being preserved in both digital and physical forms. Whether it's the successful restoration of cultural artifacts or community-led initiatives that breathe life into endangered traditions, GRACE: Timekeepers of Ancient Cultural Legacy offers a glimpse into the diverse ways ancient legacies are being safeguarded.",
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
    hasSample: true,
    samplePath: "/samples/grace-sample.pdf",
    downloadPath: "/downloads/grace-full.pdf",
    externalUrl: "#",
    isAvailable: true,
    formats: [
      { name: "Paperback", price: "$25.99", isbn: "9798227366276" },
      { name: "Ebook", price: "$12.99", isbn: "9798227567499" }
    ]
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
    description: "A remarkable fusion of cultural immersion, encounters, and recollections conveyed with lyrical gentleness, this collection of poems focuses on the nature and culture of the Himalayan region. These poems capture the special relationship between the nature and the communities that live in these magnificent mountains, steeped in centuries-old customs, and go beyond simply describing the Himalayas' natural grandeur.",
    longDescription: "The poems offer readers a broad range of themes, from the resiliency of indigenous peoples to the holiness of the mountains, capturing the rich diversity of the Himalayan region. Every poetry attests to the mutually beneficial relationship that exists in this area between people, gods, and nature. The diversity of languages, cultures, and traditions that coexist here is reflected in the collection's voices.",
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
    hasSample: true,
    samplePath: "/samples/echoes-sample.pdf",
    downloadPath: "/downloads/echoes-full.pdf",
    externalUrl: "#",
    isAvailable: true,
    formats: [
      { name: "Paperback", price: "$21.99", isbn: "9798232056490" },
      { name: "Ebook", price: "$9.99", isbn: "9798230002963" }
    ]
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
    description: "A timeless scripture meets modern governance in this thought-provoking book that reimagines the Bhagavad Gita's wisdom in the realm of contemporary politics. From the Bhagavad Gita to the Ballot Box explores how Krishna's teachings on duty, ethics, and leadership offer profound insights for today's policymakers, diplomats, and leaders navigating an increasingly complex world.",
    longDescription: "Through a compelling narrative, this book delves into the intersections of spirituality and statecraft, demonstrating how principles like dharma (righteous action), strategic decision-making, and moral responsibility can shape just and effective governance. Drawing from historical examples and modern political landscapes, it presents a visionary perspective on leadership that is both ethical and pragmatic. With global relevance and a fresh interpretation of an ancient philosophy, this book is an essential read for political thinkers, policymakers, and anyone interested in the fusion of wisdom and governance.",
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
      "Sustainable Policies and Environmental Stewardship",
      "Compassion and Social Welfare in Governance",
      "Conflict Resolution: Krishna's Approach to Peaceful Diplomacy",
      "Non-violence and Ethics in Political Engagement",
      "Balancing Personal Convictions and Political Pragmatism",
      "Spirituality, Religion, and Civic Engagement",
      "Faith-based Organizations: Agents of Positive Change",
      "Values-based Activism and Grassroots Movements",
      "Empowering Individuals: The Impact of Krishna's Teachings",
      "Politics in the Modern Era: Challenges and Evolving Paradigms",
      "Embracing Krishna's Wisdom for a Better Political Future"
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
    hasSample: true,
    samplePath: "/samples/bhagavad-sample.pdf",
    downloadPath: "/downloads/bhagavad-full.pdf",
    externalUrl: "#",
    isAvailable: true,
    formats: [
      { name: "Paperback", price: "$65.99", isbn: "9798230447689" },
      { name: "Ebook", price: "$25.99", isbn: "9798230724995" }
    ]
  }
];

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
  },
];
