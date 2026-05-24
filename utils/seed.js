const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { User, Faculty, Filiere, Content, Center, Faq, serializeCenter } = require('../models');

const FACULTIES = [
  {
    name: 'Faculté Sciences et Technologies',
    domaine: 'Sciences et Technologies',
    dean: 'Prof. Dr. Baraka Mushagi Olivier',
    secretary: 'Ir. Grace Muhiwa',
    description:
      "La faculté des Sciences et Technologies forme des ingénieurs et chercheurs capables d'innover dans les domaines des sciences appliquées, du génie informatique et de la technologie.",
    filieres: [
      { name: "Sciences de l'Ingénieur", duration: '5 ans', diploma: 'Master en Ingénierie' },
      { name: 'Génie Informatique', duration: '5 ans', diploma: 'Master en Informatique' },
    ],
  },
  {
    name: 'Faculté Sciences Économiques et de Gestion',
    domaine: 'Sciences Économiques et de Gestion',
    dean: 'Prof. Alain Kikandi',
    secretary: 'Adolphe Kankisingi',
    description:
      "Notre faculté forme les futurs leaders du monde économique avec un programme rigoureux en économie, gestion et finance.",
    filieres: [
      { name: 'Sciences Économiques', duration: '5 ans', diploma: 'Master en Économie' },
      { name: 'Sciences de Gestion', duration: '5 ans', diploma: 'Master en Gestion' },
    ],
  },
  {
    name: "Faculté Sciences Psychologiques et de l'Éducation",
    domaine: "Sciences Psychologiques et de l'Éducation",
    dean: 'Prof. Kahindo Kavugo Veronique',
    secretary: 'Adolphe Kankisingi',
    description:
      "Une formation complète en sciences humaines pour comprendre les mécanismes psychologiques et éducatifs.",
    filieres: [
      { name: 'Sciences Psychologiques', duration: '5 ans', diploma: 'Master en Psychologie' },
      { name: "Sciences de l'Éducation", duration: '5 ans', diploma: 'Master en Éducation' },
    ],
  },
  {
    name: 'Faculté Sciences de la Santé',
    domaine: 'Sciences de la Santé',
    dean: 'Prof. Dr. Wasso Misona Joseph',
    secretary: 'Adolphe Kankisingi',
    description:
      "Notre faculté forme des médecins et professionnels de santé engagés au service de la communauté.",
    filieres: [
      { name: 'Médecine Humaine', duration: '7 ans', diploma: 'Docteur en Médecine' },
      { name: 'Santé Publique', duration: '5 ans', diploma: 'Master en Santé Publique' },
    ],
  },
  {
    name: 'Faculté Sciences Juridiques, Politiques et Administratives',
    domaine: 'Sciences Juridiques, Politiques et Administratives',
    dean: 'Prof. Mazambi Riziki Pierre',
    secretary: 'Me. Samuel Kamasita',
    description:
      "Une formation rigoureuse en droit, sciences politiques et administration pour préparer les futurs juristes et administrateurs.",
    filieres: [
      { name: 'Sciences Juridiques', duration: '5 ans', diploma: 'Master en Droit' },
    ],
  },
  {
    name: "Faculté Sciences de l'Homme et de la Société",
    domaine: "Sciences de l'Homme et de la Société",
    dean: 'Prof. Kahindo Kavugo Veronique',
    secretary: 'Pasteur Peter Ndaliko',
    description:
      "Notre faculté offre des programmes de théologie, philosophie et sciences sociales pour former des leaders éclairés.",
    filieres: [
      { name: 'Théologie Protestante', duration: '5 ans', diploma: 'Master en Théologie' },
    ],
  },
];

const SAMPLE_CONTENTS = [
  {
    type: 'article',
    title: "Célébration de la Journée Internationale du Travail à l'ULPGL GOMA",
    excerpt:
      "Entre réflexion thématique et hommage aux nouveaux retraités à l'ULPGL Goma.",
    content:
      "<p>Ce vendredi 15 mai, l'ULPGL - Goma a célébré la Journée du Travail sous le thème : <b>« Travailler dans la dignité, défendre la justice sociale, préserver la Nation »</b>, un thème développé par le Prof. Mazambi Riziki.</p><p>Le moment fort a été l'hommage vibrant rendu à trois piliers de l'université admis à la retraite.</p>",
    category: 'Événement',
    coverImage: 'https://res.cloudinary.com/zaqxswcde-/image/upload/v1779010302/Journee-du-travail_rjyd5g.png',
    status: 'published',
  },
  {
    type: 'event',
    title: 'Immersion au CREDDA : ULPGL au cœur de l\'écologie',
    excerpt: "Les étudiants en droit visitent le site écologique du CREDDA pour une immersion scientifique de terrain.",
    content:
      "<p>Dans le cadre des enseignements de droit de l'environnement, les étudiants de l'ULPGL-Goma ont visité le site écologique de la clinique de droit de l'environnement au CREDDA.</p>",
    category: 'Académique',
    coverImage:
      'https://res.cloudinary.com/zaqxswcde-/image/upload/v1779010966/678965269_966177915801663_4355927111331524904_n_wrpkzf.jpg',
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    location: 'Site écologique CREDDA, Goma',
    status: 'published',
  },
  {
    type: 'activity',
    title: 'Activités culturelles et sportives — Saison 2026',
    excerpt: 'Programme complet des activités culturelles et sportives pour les étudiants.',
    content:
      "<p>Découvrez l'ensemble du programme des activités culturelles et sportives organisées par l'ULPGL pour cette nouvelle saison académique.</p>",
    category: 'Culturel',
    status: 'published',
  },
];

// Synchronisé avec frontend/src/utils/utils.statiquedata.ts (export const centers)
const SAMPLE_CENTERS = [
  {
    slug: 'cripe',
    title: 'CRIPE',
    description:
      "Le CRIPE (Centre de Recherche en Psychologie et en Éducation) est un centre de recherche multidisciplinaire qui se consacre à l'étude des processus psychologiques et éducatifs. Il vise à comprendre les mécanismes d'apprentissage, les interactions sociales, et les facteurs influençant le développement humain. Le CRIPE mène des recherches innovantes pour améliorer les pratiques éducatives et promouvoir le bien-être psychologique.",
    profile: '',
    direction: null,
    domaineInterventions: ['Sciences Psychologiques et de l\'Éducation'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
  {
    slug: 'comite-ethique-recherche',
    title: 'Comité d\'éthique de recherche',
    description:
      "Le Comité d'éthique de recherche est chargé d'évaluer les projets de recherche afin de garantir le respect des normes éthiques. Il veille à la protection des participants et à l'intégrité des recherches menées au sein de l'université.",
    profile: '',
    direction: null,
    domaineInterventions: ['Éthique de la recherche'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
  {
    slug: 'bersac',
    title: 'BERSAC',
    description:
      "Le BERSAC (Bureau d'Études et de Recherche en Sciences de l'Éducation) est un centre de recherche qui se consacre à l'analyse des pratiques éducatives et à l'évaluation des politiques éducatives. Il vise à fournir des recommandations basées sur des données probantes pour améliorer le système éducatif.",
    profile: '',
    direction: null,
    domaineInterventions: ['Sciences de l\'Éducation'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
  {
    slug: 'high-tech',
    title: 'High Tech',
    description:
      "Le centre High Tech se concentre sur l'intégration des technologies de l'information dans l'éducation. Il vise à promouvoir l'utilisation des outils numériques pour améliorer l'apprentissage et l'enseignement.",
    profile: '',
    direction: null,
    domaineInterventions: ['Technologies de l\'information'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
  {
    slug: 'crega',
    title: 'CREGA',
    description:
      "Le CREGA (Centre de Recherche en Éducation et en Gestion des Apprenants) est un centre de recherche qui se concentre sur la gestion des apprenants et l'amélioration des pratiques éducatives. Il vise à soutenir les enseignants et les formateurs dans leur travail.",
    profile: '',
    direction: null,
    domaineInterventions: ['Sciences de l\'Éducation'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
  {
    slug: 'caj-clinique-juridique',
    title: 'CAJ – Clinique juridique',
    description:
      "La Clinique juridique (CAJ) offre des services juridiques aux étudiants et à la communauté. Elle permet aux étudiants en droit de mettre en pratique leurs connaissances tout en aidant ceux qui en ont besoin.",
    profile: '',
    direction: null,
    domaineInterventions: ['Droit'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
  {
    slug: 'centre-de-recherche-en-didactique-universitaire',
    title: 'CRDU',
    description:
      "Le CRDU (Centre de Recherche en Didactique Universitaire) se consacre à l'étude et à l'amélioration des pratiques d'enseignement supérieur. Il vise à soutenir les enseignants dans leur développement professionnel et à promouvoir l'innovation pédagogique.",
    profile: '',
    direction: null,
    domaineInterventions: ['Droit'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
  {
    slug: 'credda',
    title: 'CREDDA',
    description:
      "Le Centre de Recherche sur la Démocratie et le Développement en Afrique (CREDDA) est un cadre de réflexion regroupant l'élite intellectuelle africaine. Il sert de courroie de transmission entre la population et ses représentants pour promouvoir des solutions pratiques aux défis du développement.",
    profile:
      "Lancé en 2008, le Centre de Recherche CREDDA-ULPGL s'est construit un agenda qui ne cesse de rencontrer les besoins de ses partenaires. Ses différentes expertises au service de toutes les bourses ne cessent de porter des résultats escomptés. Des universités, des Organismes internationaux, des Organisations de la Société Civile, des Associations membres des réseaux des jeunes et des femmes, des cours et tribunaux et des institutions d'appui à la démocratie bénéficient de notre accompagnement en vue d'affuter leurs stratégies de travail dans les domaines spécifiques. Des projets ont été réalisés avec succès par l'équipe professionnelle de CREDDA-ULPGL dans les domaines d'étude et collecte des données, d'analyse et traitement des données, de conception-élaboration-exécution-suivi et évaluation des projets. <br />Les atouts du CREDDA-ULPGL, en tant que cabinet-conseil et d'orientation dans les domaines de son intervention, forgent son agenda. À cela il faut ajouter l'organisation des séminaires et conférences, des formations professionnelles, et l'encadrement de la jeunesse. Au-delà, CREDDA/ULPGL est devenu une passerelle entre la population et les institutions publiques et privées en fournissant des données fiables et vérifiables renseignant des politiques publiques et des programmes des partenaires internationaux en vue de rencontrer les besoins sociaux de base des différentes couches de la population (les personnes déplacées, les personnes vivant avec handicap, les personnes des milieux défavorisés,…) pour le bien-être de toutes et de tous. Tout cela se réalise dans le respect strict de certaines règles de l'art, de l'éthique et de la déontologie professionnelle.",
    direction: {
      name: 'Prof. Dr. Kennedy Kihangi Bindu',
      role: 'Directeur du CREDDA',
      slug: 'prof-dr-kennedy-kihangi-bindu',
      description:
        "Le continent Africain est confronté à des crises (pauvreté, conflits armés, mauvaise gouvernance, violations massives des droits de l'homme et du droit international humanitaire, …) qui obligent sans atermoiement de solutions intelligentes africaines. Le caractère fragile des institutions étatiques postcoloniales doit être surmonté aussi urgemment que possible dans le sens du « le schéma et le plan directeur visant à transformer l'Afrique en puissance mondiale de l'avenir (Agenda 2063 de l'Union Africaine) ». Ces crises sont des opportunités à la portée de l'intelligentsia pour la promotion de la recherche, la paix et le développement. Une meilleure vie est encore possible en Afrique",
      email: ['sgac@ulpgl.net'],
      phone: ['+243 824 174 956'],
    },
    domaineInterventions: [
      'Études et collectes des données',
      'Analyse des données',
      'Gestion et coordination des projets',
      'Partenariat | réseautage | networking',
    ],
    etudesRealisees: [
      "Vulgarisation sur l'éducation aux droits humains",
      "Programme d'anglais",
      'Monitoring judiciaire et pénitentiaire',
      "Sensibilisation sur la protection de l'environnement dans un contexte des conflits armés",
    ],
    partenaires: [
      "Uhaki safi programme de renforcement de la justice à l'Est",
      'Harvard humanitarian initiative',
      'Association des barreaux américains (ABA)',
    ],
    contacts: ['+243 824 174 956', 'www.credda-ulpgl.org'],
  },
  {
    slug: 'cime',
    title: 'CIME',
    description:
      "Le CIME (Centre Informatique et Management d'entreprise) est un centre de recherche qui se consacre à l'innovation pédagogique. Il vise à développer de nouvelles approches et méthodes d'enseignement pour répondre aux besoins des apprenants.",
    profile: '',
    direction: {
      name: 'Ir. Ajuamungu Muibombe Michael',
      role: 'Directeur de la DNTIC et CIME',
      slug: 'ir-ajuamungu-muibombe-michael',
      description: '',
      email: ['ammichaj@ulpgl.net', 'ammichaj@gmail.com'],
      phone: ['+243 997 841 542'],
    },
    domaineInterventions: ['Sciences de l\'Éducation', 'Informatique et management'],
    etudesRealisees: [],
    partenaires: [],
    contacts: ['ammichaj@ulpgl.net', '+243 997 841 542'],
  },
  {
    slug: 'carepd',
    title: 'CAREPD',
    description:
      "Le centre Africain de Recherche et d'Education à la paix Démocratie a été créé en 1994 dans le contexte particulier de crise dans la Région des Grands Lacs : la fuite vers Goma en RDC de plus ou moins 700 000 réfugiés rwandais. Ayant été effrayé par la situation déshumanisante et désesperée que menaient la plupart des refugiés (faim, violence, etc.), la CAREPD fut ainsi créée en septembre 1994 en tant que cadre de réflexion sur la paix avec une vocation éducative et thérapeutique visant la prévention des violences, la transformation des conflits et la guérison des victimes liées aux conflits dans la région des grands lacs africains.",
    profile: '',
    direction: null,
    domaineInterventions: [
      'Education à la paix',
      'Renforcements des capacités des aumoniers FARDC',
      'Ateliers tables rondes',
      'Conférences et colloques',
      'Recherches et publications',
    ],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
];

const FAQS = [
  { question: "Où se situe l'ULPGL Goma ?", answer: "L'ULPGL Goma est située dans la ville de Goma, Avenue du Lac, N°2 Quartier Himbi II, C. Goma, V. Goma" },
  { question: "Quels sont les délais de dépôt des candidatures ?", answer: "Les inscriptions pour la rentrée académique se déroulent généralement entre août et octobre, selon le calendrier publié par l'université." },
  { question: "Comment puis-je m'inscrire à l'ULPGL Goma ?", answer: "Vous pouvez vous inscrire en vous rendant au secrétariat académique ou via la plateforme d'inscription en ligne lorsqu'elle est ouverte." },
  { question: "Quels documents sont requis pour l'inscription ?", answer: "Un diplôme d'État ou une attestation de réussite, une copie de la carte d'identité, quatre photos passeport et les frais d'inscription." },
  { question: "L'université propose-t-elle des bourses ou facilités de paiement ?", answer: "Oui, certaines bourses internes et des facilités de paiement peuvent être accordées selon les conditions fixées par l'administration." },
  { question: "Quels programmes sont offerts à l'ULPGL Goma ?", answer: "L'université propose plusieurs programmes en licence et master, notamment en informatique, économie, droit, médecine, théologie et sciences sociales." },
  { question: "Y a-t-il un test d'admission ?", answer: "Oui, certaines facultés organisent un test d'admission ou un entretien pour évaluer les compétences et la motivation du candidat." },
  { question: "Comment fonctionne le système LMD à l'ULPGL Goma ?", answer: "Le système LMD (Licence-Master-Doctorat) est appliqué via des cours en crédits, des travaux pratiques, des séminaires et des évaluations continues." },
  { question: "Disposez-vous d'un laboratoire informatique ?", answer: "Oui, l'ULPGL Goma possède plusieurs laboratoires, dont un laboratoire informatique moderne pour les travaux pratiques." },
  { question: "Proposez-vous un logement pour les étudiants ?", answer: "L'ULPGL Goma ne dispose pas de cités universitaires, mais oriente les étudiants vers des options de logement autour du campus." },
  { question: "Comment obtenir mon relevé de côtes ou attestation ?", answer: "Les documents académiques peuvent être retirés au secrétariat académique sur demande et après vérification du dossier." },
  { question: "Offrez-vous des cours en ligne ?", answer: "Oui, certaines formations utilisent une plateforme e-learning pour compléter les cours en présentiel." },
];

async function seedDatabase() {
  console.log('Seeding database...');

  // Faculties + Filieres
  for (const fac of FACULTIES) {
    const slug = slugify(fac.name, { lower: true, strict: true });
    const [faculty] = await Faculty.findOrCreate({
      where: { slug },
      defaults: {
        name: fac.name,
        slug,
        domaine: fac.domaine,
        dean: fac.dean,
        secretary: fac.secretary,
        description: fac.description,
      },
    });
    for (const fil of fac.filieres) {
      const fslug = slugify(fil.name, { lower: true, strict: true });
      await Filiere.findOrCreate({
        where: { facultyId: faculty.id, slug: fslug },
        defaults: { ...fil, slug: fslug, facultyId: faculty.id },
      });
    }
  }

  // Users
  const adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  const [admin] = await User.findOrCreate({
    where: { email: process.env.ADMIN_EMAIL },
    defaults: {
      name: process.env.ADMIN_NAME || 'Super Admin',
      email: process.env.ADMIN_EMAIL,
      password: adminPasswordHash,
      role: 'super_admin',
    },
  });
  // Update password in case env changed
  const adminMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, admin.password);
  if (!adminMatch) {
    admin.password = adminPasswordHash;
    await admin.save();
  }

  // Faculty publisher attached to first faculty
  const firstFaculty = await Faculty.findOne();
  const publisherHash = await bcrypt.hash(process.env.PUBLISHER_PASSWORD, 10);
  const [publisher] = await User.findOrCreate({
    where: { email: process.env.PUBLISHER_EMAIL },
    defaults: {
      name: 'Publieur Faculté',
      email: process.env.PUBLISHER_EMAIL,
      password: publisherHash,
      role: 'faculty_publisher',
      facultyId: firstFaculty?.id,
    },
  });
  const pubMatch = await bcrypt.compare(process.env.PUBLISHER_PASSWORD, publisher.password);
  if (!pubMatch) {
    publisher.password = publisherHash;
    await publisher.save();
  }

  // Sample contents (only if none exist)
  const count = await Content.count();
  if (count === 0) {
    for (const c of SAMPLE_CONTENTS) {
      const cslug = slugify(c.title, { lower: true, strict: true });
      await Content.create({
        ...c,
        slug: cslug,
        authorId: admin.id,
        facultyId: firstFaculty?.id,
        publishedAt: new Date(),
      });
    }
  }

  // Centres de recherche — sync par slug (aligné sur le frontend statique)
  for (const c of SAMPLE_CENTERS) {
    const payload = serializeCenter({
      slug: c.slug,
      title: c.title,
      description: c.description,
      profile: c.profile || '',
      coverImage: c.coverImage || null,
      images: c.images || [],
      direction: c.direction ?? null,
      domaineInterventions: c.domaineInterventions || [],
      etudesRealisees: c.etudesRealisees || [],
      partenaires: c.partenaires || [],
      contacts: c.contacts || [],
      authorId: admin.id,
      status: 'published',
      publishedAt: new Date(),
    });
    const [center, created] = await Center.findOrCreate({
      where: { slug: c.slug },
      defaults: payload,
    });
    if (!created) {
      await center.update(payload);
    }
  }

  const faqCount = await Faq.count();
  if (faqCount === 0) {
    for (let i = 0; i < FAQS.length; i++) {
      await Faq.create({ ...FAQS[i], sortOrder: i + 1, isActive: true });
    }
  }

  console.log('✅ Seed completed');
}

module.exports = { seedDatabase };
