const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { User, Faculty, Filiere, Content, Center, serializeCenter } = require('../models');

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

const SAMPLE_CENTERS = [
  {
    slug: 'credda',
    title: 'CREDDA',
    description: "Le Centre de Recherche sur la Démocratie et le Développement en Afrique (CREDDA) est un cadre de réflexion regroupant l'élite intellectuelle africaine. Il sert de courroie de transmission entre la population et ses représentants pour promouvoir des solutions pratiques aux défis du développement.",
    profile: "Lancé en 2008, le Centre de Recherche CREDDA-ULPGL s'est construit un agenda qui ne cesse de rencontrer les besoins de ses partenaires. Ses différentes expertises au service de toutes les bourses ne cessent de porter des résultats escomptés. Des universités, des Organismes internationaux, des Organisations de la Société Civile, des Associations membres des réseaux des jeunes et des femmes, des cours et tribunaux et des institutions d'appui à la démocratie bénéficient de notre accompagnement en vue d'affuter leurs stratégies de travail dans les domaines spécifiques.",
    direction: {
      name: 'Prof. Dr. Kennedy Kihangi Bindu',
      role: 'Directeur du CREDDA',
      slug: 'prof-dr-kennedy-kihangi-bindu',
      description: "Le continent Africain est confronté à des crises qui obligent sans atermoiement de solutions intelligentes africaines.",
      email: ['credda@ulpgl.net'],
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
      'Uhaki safi programme de renforcement de la justice à l\'Est',
      'Harvard humanitarian initiative',
      'Association des barreaux américains (ABA)',
    ],
    contacts: ['+243 824 174 956', 'www.credda-ulpgl.org'],
  },
  {
    slug: 'cripe',
    title: 'CRIPE',
    description: "Le CRIPE (Centre de Recherche en Psychologie et en Éducation) est un centre de recherche multidisciplinaire qui se consacre à l'étude des processus psychologiques et éducatifs.",
    profile: '',
    direction: null,
    domaineInterventions: ['Sciences Psychologiques et de l\'Éducation'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
  {
    slug: 'bersac',
    title: 'BERSAC',
    description: "Le BERSAC (Bureau d'Études et de Recherche en Sciences de l'Éducation) est un centre de recherche qui se consacre à l'analyse des pratiques éducatives et à l'évaluation des politiques éducatives.",
    domaineInterventions: ['Sciences de l\'Éducation'],
    etudesRealisees: [],
    partenaires: [],
    contacts: [],
  },
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

  // Sample centers (only if none exist)
  const centerCount = await Center.count();
  if (centerCount === 0) {
    for (const c of SAMPLE_CENTERS) {
      await Center.create(serializeCenter({
        ...c,
        images: c.images || [],
        authorId: admin.id,
        status: 'published',
        publishedAt: new Date(),
      }));
    }
  }

  console.log('✅ Seed completed');
}

module.exports = { seedDatabase };
