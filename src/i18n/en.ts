import type { ProgramSlug } from "@/data/programs";

export type ProgramCopy = Record<ProgramSlug, { title: string; body: string }>;

export const en = {
  meta: {
    homeTitle: "FARECOH | Transforming lives through music",
    homeDescription:
      "Educational Arts Choirs and Orchestras Foundation of Honduras. Arts education, choirs, orchestras and social prevention in Honduras.",
    aboutTitle: "About | FARECOH",
    aboutDescription:
      "Learn about FARECOH's history, mission, vision, values and board of directors.",
    programsTitle: "Programs | FARECOH",
    programsDescription:
      "Academic music, visual arts, early stimulation, choirs, orchestras and community cultural development.",
    eventsTitle: "Events | FARECOH",
    eventsDescription:
      "FARECOH cultural and charitable events with social and educational purpose in Honduras.",
    donateTitle: "Donate | FARECOH",
    donateDescription:
      "Support arts and music education in Honduras. Your contribution transforms lives through music.",
    eventTitle: "Pink Floyd Tribute | FARECOH",
    eventDescription:
      "A charitable audiovisual experience supporting FARECOH's arts and music education. August 8, 2026, Tegucigalpa.",
  },
  nav: {
    home: "Home",
    about: "About",
    programs: "Programs",
    events: "Events",
    donate: "Donate",
    skipToContent: "Skip to content",
    openMenu: "Open menu",
    mainNav: "Main navigation",
  },
  home: {
    eyebrow: "Educational Arts Choirs and Orchestras Foundation of Honduras",
    title: "Transforming lives through music.",
    bilingualSubtext: "Transformamos vidas a través de la música.",
    intro:
      "FARECOH educates through artistic prevention programs for children and youth, strengthening conduct and life skills for integral citizenship.",
    heroImageAlt: "Young artists performing on stage during a FARECOH presentation",
    heroCaption: "Arts education, stage and community in one shared experience.",
    ctaPrograms: "Explore programs",
    ctaDonate: "Support FARECOH",
    whoWeAre: {
      label: "Who we are",
      title: "Solidarity as a way of being.",
      body: "FARECOH educates through artistic prevention programs for children and youth, strengthening conduct and life skills for what we call a “solidarity social being” — a holistic approach where values, human rights and service to the country take root.",
    },
    programs: {
      label: "Programs",
      title: "Artistic prevention with excellence.",
      link: "View all programs",
    },
    impact: {
      label: "Impact",
      title: "Art, coexistence and prevention.",
      metrics: [
        { value: "9+", label: "active training programs" },
        { value: "7", label: "board members" },
        { value: "100%", label: "commitment to inclusion and prevention" },
      ],
    },
    featuredEvent: {
      label: "Upcoming event",
      cta: "View event",
    },
    donate: {
      label: "Donate",
      title: "Your support sustains the stage where change begins.",
      body: "Donations make scholarships, instruments, teacher training and public performances possible for more families.",
      cta: "Make a donation",
      note: "You can also support through instruments, volunteering, partnerships or outreach.",
    },
    partners: {
      label: "Partners",
      title: "Strategic partners",
    },
    sponsors: {
      label: "Sponsors",
      title: "Sponsors",
      placeholder: "Space reserved for allies supporting arts education in Honduras.",
    },
  },
  about: {
    label: "Institution",
    title: "A foundation in service of Honduras.",
    intro:
      "FARECOH — Educational Arts Choirs and Orchestras Foundation of Honduras — promotes excellence in the arts as a tool for social transformation.",
    history: {
      label: "History",
      title: "Pedagogical roots and social calling",
      body: "From Honduras, FARECOH has built a journey dedicated to pedagogical and occupational rescue as a model for violence prevention, integrating music, visual arts, dance and human development for children and young people.",
    },
    mission: {
      label: "Mission",
      title: "Artistic excellence in service of society",
      body: "A foundation in service of Honduran society, with excellence in the development of the arts that contribute to the integral development of the human being, integrating them into the community through exchange, prevention, cooperation, values, national identity and transformation.",
    },
    vision: {
      label: "Vision",
      title: "Leadership and model of excellence",
      body: "To be a leading foundation and model of excellence in Honduras, dedicated to pedagogical and occupational rescue as a model for violence prevention and social inclusion.",
    },
    values: {
      label: "Values",
      title: "Principles that guide our work",
      items: [
        { title: "Artistic excellence", body: "Quality and rigor in every training and stage process." },
        { title: "Social prevention", body: "Art as a tool for coexistence and transformation." },
        { title: "Inclusion", body: "Open spaces for children and young people from diverse backgrounds." },
        { title: "National identity", body: "Cultural projection of Honduras through arts education." },
        { title: "Service to the country", body: "Commitment to values, human rights and community." },
      ],
    },
    team: {
      label: "Board of directors",
      title: "Leadership team",
    },
    boardRoles: {
      president: "President",
      vicePresident: "Vice President",
      secretary: "Secretary",
      treasurer: "Treasurer",
      member1: "Board Member I",
      member2: "Board Member II",
      member3: "Board Member III",
    },
  },
  programsPage: {
    label: "Programs",
    title: "Arts training with social purpose.",
    intro:
      "Our programs develop and strengthen artistic and social skills in children and young people, creating spaces of healthy coexistence and contributing to violence prevention in community settings.",
    items: {
      "academic-music": {
        title: "Academic Music Program",
        body: "Integral musical training that develops technique, discipline and artistic sensitivity in children and young people.",
      },
      "visual-arts": {
        title: "Academic Visual Arts Program",
        body: "Development of plastic and visual languages that strengthen creative expression and aesthetic perception.",
      },
      "early-stimulation": {
        title: "Early Stimulation Program",
        body: "A program to develop cognitive skills in children through music, promoting physical, emotional, social and cognitive wellbeing.",
      },
      "special-education": {
        title: "Special Education Program",
        body: "Inclusive training adapted to special educational needs through artistic methodologies.",
      },
      "choirs-orchestras": {
        title: "Children and Youth Choirs and Orchestras",
        body: "A program for children and young people based on an integral and inclusive teaching-learning process.",
      },
      "cultural-exchanges": {
        title: "Cultural Exchanges",
        body: "Opportunity for children, young people or volunteers to participate in exchanges or summer scholarships in countries with musical agreements, strengthening artistic skills and new study opportunities.",
      },
      "dance-company": {
        title: "Dance Company",
        body: "Dance stage training integrating body expression, discipline and artistic presentation.",
      },
      "white-hands-choir": {
        title: "White Hands Choir",
        body: "Integrates children, young people and adults with physical disabilities and special educational needs into daily life and artistic activities, using music as a tool for development and inclusion.",
      },
      painting: {
        title: "Painting",
        body: "Awakens creativity in children and young people, develops cognitive abilities and skills to perceive the world from an aesthetic point of view.",
      },
    } satisfies ProgramCopy,
  },
  eventsPage: {
    label: "Events",
    title: "Cultural experiences with purpose.",
    intro:
      "Every FARECOH event is an opportunity to celebrate art, gather community and sustain educational programs.",
    upcoming: "Upcoming events",
    viewEvent: "View event",
    solidarity: "Solidarity contribution",
  },
  donatePage: {
    label: "Donate",
    title: "Your support opens a stage where change begins.",
    intro:
      "Every donation reaches choirs, orchestras, scholarships, instruments and training experiences that transform the lives of children and young people in Honduras.",
    impact: {
      label: "Impact",
      title: "Where your contribution goes",
      items: [
        { title: "Scholarships and access", body: "We enable participation for young people who would otherwise lack access to arts training." },
        { title: "Instruments and resources", body: "Acquisition and maintenance of instruments, scores and teaching materials." },
        { title: "Teacher training", body: "Training for teachers and directors who sustain the quality of our programs." },
        { title: "Community performances", body: "Concerts and cultural activities that bring art closer to more families." },
      ],
    },
    ways: {
      label: "Ways to support",
      title: "There are many ways to stand with us",
      items: [
        "Financial donation",
        "Instrument donation",
        "Artistic or administrative volunteering",
        "Institutional and corporate partnerships",
        "Event and program outreach",
      ],
    },
    form: {
      label: "Contact us",
      title: "I want to support FARECOH",
      body: "Online donations will be available soon. Leave your details and we will contact you.",
      name: "Full name",
      email: "Email address",
      message: "Message (optional)",
      submit: "Submit donation interest",
      note: "All information is treated confidentially.",
    },
    trust: {
      label: "Transparency",
      body: "FARECOH is a foundation with an educational and social calling. We work with allies, families and communities to ensure every contribution has real impact.",
    },
  },
  event: {
    eyebrow: "FARECOH presents",
    name: "Pink Floyd Tribute",
    tagline: "One night. One experience. An unforgettable journey.",
    date: "August 8, 2026",
    time: "8:00 PM",
    venue: "National School of Music",
    city: "Tegucigalpa, Honduras",
    ticketPrice: "L.500.00",
    ticketLabel: "Solidarity contribution",
    purpose: "Supporting arts and music education through FARECOH.",
    description:
      "FARECOH invites you to a different kind of night: not a commercial concert, but a cinematic experience where progressive rock meets educational purpose.",
    experience: {
      label: "Experience",
      title: "An audiovisual journey",
      body: "Light, projection and live sound converge on a dark, elegant stage. Music guides the eye; the cause gives meaning to the night.",
      points: [
        "Live interpretation of Pink Floyd classics",
        "Cinematic lighting and atmosphere design",
        "Stage narrative focused on experience",
        "Solidarity fundraising for FARECOH programs",
      ],
    },
    musicians: { label: "Cast", title: "Musicians on stage" },
    cta: {
      participate: "Participate",
      title: "Be part of the experience",
      body: "Tickets will be available soon. Contact us to express your interest or support FARECOH's educational cause.",
      button: "Contact FARECOH",
      secondary: "Support the cause",
      note: "Solidarity contribution · Non-commercial",
      viewExperience: "View experience",
      viewCast: "View cast",
    },
    heroImageAlt: "Dark stage with prismatic light during a musical tribute",
  },
  musicianRoles: {
    leadGuitar: "Lead Guitar",
    guitarist: "Guitarist",
    acousticGuitar: "Acoustic Guitar",
    drummer: "Drummer",
    percussionist: "Percussionist",
    leadVocal: "Lead Vocalist",
    bassist: "Bassist",
    saxophonist: "Saxophonist",
    backingVocals: "Backing Vocals",
  },
  footer: {
    text: "Arts education, choirs, orchestras and cultural experiences transforming lives through music.",
    explore: "Explore",
    contact: "Contact",
    rights: "© 2026 FARECOH. All rights reserved.",
    languageSwitch: "Español",
  },
  labels: {
    date: "Date",
    time: "Time",
    venue: "Venue",
    purpose: "Purpose",
  },
} as const;
