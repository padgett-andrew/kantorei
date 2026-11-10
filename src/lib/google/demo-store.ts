import type {
  AbsenceRecord,
  BoardMember,
  BulletinMessage,
  ConcertEvent,
  GivingTier,
  LeadershipMember,
  MediaItem,
  PortalConfig,
  RepertoirePiece,
  ScheduleEvent,
  SeatingChart,
  SheetWarning,
  Singer,
} from '../../types/choir';

export interface SnackClaim {
  eventId: string;
  slot: 1 | 2 | 3 | 4;
  singerName: string;
  item?: string;
  updatedAt?: string;
}

export interface DemoStore {
  roster: Singer[];
  schedule: ScheduleEvent[];
  snacks: SnackClaim[];
  absences: AbsenceRecord[];
  concerts: ConcertEvent[];
  media: MediaItem[];
  config: PortalConfig;
  board: BoardMember[];
  leadership: LeadershipMember[];
  givingTiers: GivingTier[];
  repertoire: RepertoirePiece[];
  warnings: SheetWarning[];
  seatingCharts: SeatingChart[];
  messages: BulletinMessage[];
}

export const demoStore: DemoStore = {
  messages: [
    {
      id: 'msg-2026-11-07-saturday-notes',
      timestamp: '2026-11-07T16:15:00.000Z',
      fromName: 'Adam Reinwald',
      fromEmail: 'adam.reinwald@kantorei.net',
      subject: 'Quick notes for a Saturday — Sunday Rehearsal Setlist & Small Groups',
      bodyText: `Hello folks,

Quick notes for a Saturday:

   1) Setlist for Sunday:
            vocalizing with Tony - 10 mins max
            Regem Natum - 10 mins (full chorus)
            Rise Up Shepherd - 10 mins - focus on first two pages? 
            Spotless Rose (Howells) - 10 mins - first & last verse notes/rhythms
            Gaudete - 12 mins - introduce rhythmic elements
                  -- BREAK --
            Sectionals - Gloria (Argento) + Aer Enim OR Veni Emmanuel - 20 mins
            Announcements - 5 mins
            Refugee (Deignan) - 20 mins
            Lo, How a Rose (Sandstrom) - 6 mins - part assignments, trial balance first page only
            His Voice as the Sound - 10 mins


   2). In the Stillness (Beamish) small group — we’ll discuss and make sure these folks are up for it.
    Delaney + Zoey + Amanda + Lori
    Abs + Ann + Maggie + Christine
    Michael Cl + James + Jonathan P
    Cory + Joe P + Bjorn + Tony

   3) Lo, How a Rose — 8 voices in choir 1 (+ one more if needed for balance)
    Melia + Molly  (+ Karin)
    Kelly + CarlaJoy (+ Heather)
    Travis + Sam (+ Joel)
    Andrew + John D (+ Mark)
    Charlotte / Genna on high G solo

   4). Rise Up, Shepherd and Follow— at the beginning, just S1s, no solo

Need to audition a changed voice soloist for “A Spotless Rose” (Howells)

See you tomorrow at 6:30 in Shoreview!

Adam Reinwald`,
      category: 'Rehearsal_Notes',
      pinned: true,
      status: 'Pinned',
      threadId: 'thread-2026-11-07-saturday-notes',
    },
  ],
  snacks: [
    {
      eventId: 'reh-2026-11-10',
      slot: 1,
      singerName: 'Elena Rostova',
      item: 'Cider & cinnamon cookies',
    },
    {
      eventId: 'reh-2026-11-10',
      slot: 2,
      singerName: 'Marcus Vance',
      item: 'Sparkling water & pretzels',
    },
  ],
  config: {
    Choir_Name: 'Kantorei',
    Conductor_Name: 'Adam Reinwald',
    Conductor_Email: 'adam.reinwald@kantorei.net',
    Associate_Director_Email: '',
    Manager_Email: 'maggieakhavan@gmail.com',
    Attendance_Admin_Emails: 'maggieakhavan@gmail.com',
    Repertoire_Drive_Folder_ID: 'DEMO',
    Handbook_Google_Doc_ID: 'DEMO',
    Strategic_Plan_Google_Doc_ID: 'DEMO',
    Season_Pass_TT_Widget_URL: 'DEMO',
    Portal_Announcement:
      'Welcome to our Advent with Kantorei concert cycle! Rehearsals meet Sunday evenings at Shepherd of the Hills in Shoreview—please log any conflicts early so voicings for Dec 19 (Shoreview) and Dec 20 (Edina) can be finalized.',
    Calendar_Timezone: 'America/Chicago',
    YouTube_URL: 'https://www.youtube.com/@kantoreiMN',
    Instagram_URL: 'https://www.instagram.com/kantorei_mn',
    Facebook_URL: 'https://www.facebook.com/kantoreimn',
    Contact_Email: 'info@kantorei.net',
    Contact_Phone: '612-21-SINGS (612-217-4647)',
    Contact_Address: '660 23rd Ave NW, Saint Paul, MN 55112',
    Mission_Statement:
      'Expanding the worldview of artists and audiences through passionate and crafted artistic performances, partnerships, and projects.',
    Vision_Statement:
      'Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.',
    Hero_Tagline: 'Sing, Laugh, Cry. Be Real…Together.',
    Hero_Subtitle:
      'Kantorei is an a cappella chamber choir based in the Minnesota Twin Cities. Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.',
    Hero_Video_URL: 'https://www.youtube.com/watch?v=GIvF19VzNPE',
    Hero_Image_URL: '',
    About_Header_Title:
      'Vocal health, effortless sound, and singing for a lifetime.',
    Auditions_Blurb:
      'We welcome inquiries from experienced Twin Cities choral singers across all voice parts (SATB · general sections and split parts) who share our commitment to vocal health, independent preparation, and expressive a cappella ensemble singing.',
    Auditions_Timing_Note:
      'We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) to fill out a roster of singers for the coming season. Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview. Inquiries and submissions are warmly welcomed year-round. Come sing with us!',
    Auditions_Rehearsal_Cadence:
      'Kantorei rehearses Sunday evenings at rotating venues across the Twin Cities metro area (typically 6–8 rehearsals per concert cycle), beginning each season with a community retreat.',
    Auditions_Process_Note:
      'Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview.',
    Auditions_Form_URL: '',
    Support_Hero_Title:
      'Sustain choral artistry and lifelong singing in Minnesota.',
    Support_Hero_Subtitle:
      'Every contribution to Kantorei funds performances, composer commissions, recordings shared worldwide, Friends of Kantorei community programming, and keeps ensemble membership free of mandatory singer dues.',
    Support_Gala_Title: 'Annual Kantorei Gala & Friendraisers',
    Support_Gala_Blurb:
      'Our annual Gala is Kantorei’s signature fundraising celebration—bringing singers, alumni, and patrons together for live music, hospitality, and community support. Follow us on Instagram and Facebook for upcoming Gala dates and sponsorship opportunities.',
    Support_Matching_Title: 'Employer Matching, DAFs & Checks',
    Support_Matching_Blurb:
      'Kantorei welcomes corporate matching gifts (Benevity, CyberGrants, YourCause), Donor-Advised Fund grants, and gifts of appreciated securities. Contact [info@kantorei.net](mailto:info@kantorei.net) or call [612-21-SINGS (612-217-4647)](tel:+16122174647) for our EIN and delivery instructions. Checks may be mailed to 660 23rd Ave NW, Saint Paul, MN 55112.',
    Support_Auditions_Title: 'Audition for Kantorei',
    Support_Auditions_Blurb:
      'Beyond financial contributions, Kantorei is sustained by the dedication and artistry of our singers. We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) to fill out our roster of singers for the coming season, rehearsing at rotating venues across the Twin Cities. Inquiries and submissions are warmly welcomed year-round. Come sing with us!',
    Tax_Exempt_Disclaimer:
      'Kantorei is a registered 501(c)(3) nonprofit arts organization in Minnesota. Contributions are tax-deductible to the fullest extent permitted by law.',
    About_History_P1:
      'Founded in 1988 by Dr. Axel Theimer, and now led by Adam Reinwald, Kantorei is one of the premier choral ensembles in Minnesota. With an integral focus on vocal health, Kantorei’s singers have set a standard in Minnesota for rich and effortless choral sound. Kantorei performs a wide range of mostly a cappella music from around the world. Most concerts include signature pieces complementing pieces from both well-known and emerging composers.',
    About_History_P2:
      'Kantorei performs primarily in Minnesota and shares recordings worldwide. Through its outreach programming, Kantorei invites audiences of all ages to share its pursuit of singing for a lifetime.',
    Newsletter_Category: 'Friends of Kantorei',
    Newsletter_Headline: 'Stay in tune with our season.',
    Newsletter_Description:
      'Receive concert announcements, early-access ticket alerts, and artistic listening guides from conductor Adam Reinwald.',
    Newsletter_Button_Text: 'Join Free',
    Footer_About_Blurb:
      'Founded in 1988 by Axel Theimer and led by Artistic Director Adam Reinwald, Kantorei is one of Minnesota’s premier choral ensembles—sharing rich, effortless a cappella sound and singing for a lifetime.',
    Home_Newsletter_Title: 'Stay in Tune with Friends of Kantorei',
    Home_Newsletter_Description:
      'Join our circle of patrons, alumni, and choral lovers. Get first access to concert tickets, conductor Adam Reinwald’s listening guides, and unreleased choral recordings.',
    Concerts_Newsletter_Title: 'Never Miss a Concert Announcement',
    Concerts_Newsletter_Description:
      'Be the first to hear about upcoming season programs, early-access ticket sales, and guest artist appearances across the Twin Cities.',
    No_Concerts_Title: 'No Upcoming Concerts',
    No_Concerts_Blurb:
      "We don't have any upcoming concerts scheduled at this time. Join our email list below to be notified as soon as new concert dates, programs, and tickets are announced.",
    Home_Spotlight_Type: '',
    Home_Spotlight_Title: 'Stay in Touch with Kantorei',
    Home_Spotlight_Description:
      "We don't have any upcoming concerts scheduled right now. Join Friends of Kantorei to receive season announcements, recording releases, and priority ticket access.",
    LGL_Form_URL: 'https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA',
  },
  board: [
    { name: 'Michael Campana', role: 'President', order: 1, active: true },
    { name: 'Joseph Cook Morey', role: 'Vice President', order: 2, active: true },
    { name: 'Jessi McKinnon', role: 'Treasurer', order: 3, active: true },
    { name: 'Molly Tengwall', role: 'Secretary', order: 4, active: true },
    { name: 'Daniel Belknap', role: 'Singer Representative', order: 5, active: true },
    { name: 'Naomi Karstad', role: 'At-Large Member', order: 6, active: true },
  ],
  leadership: [
    {
      name: 'Adam Reinwald',
      title: 'Artistic & Executive Director',
      bio: 'Appointed in 2021, Adam Reinwald is a nationally recognized vocal chamber artist, conductor, and nonprofit arts strategist with over two decades of experience in the choral arts—including work with the National Lutheran Choir and nearly two decades with the acclaimed vocal ensemble Cantus.\n\nIn demand as a coach for small- to mid-size arts organizations focusing on new media and digital branding, Adam has presented nationally at Chorus America, ACDA, and the Young Nonprofit Professionals Network.',
      order: 1,
      email: 'adam.reinwald@kantorei.net',
      active: true,
    },
    {
      name: 'Tony Rangel',
      title: 'Assistant Conductor',
      bio: 'Tony Rangel serves as Assistant Conductor, collaborating closely on ensemble preparation and directing one or more pieces on every Kantorei concert program.\n\nAn experienced choral educator and Twin Cities ensemble singer, Tony has directed the choral programs at Columbia Heights and Armstrong high schools, currently leads the choral program at Stillwater Middle School, and authors graduate-level music education courses through Forward Motion Online Learning.',
      order: 2,
      active: true,
    },
    {
      name: 'Dr. Axel Theimer',
      title: 'Founder & Artistic Director Emeritus',
      bio: 'Born in St. Johann in Tirol, Austria, and trained in the Vienna Choir Boys before earning his MFA and DMA at the University of Minnesota, Dr. Axel Theimer founded Kantorei in 1988.\n\nDirector of Choral Activities at the College of Saint Benedict and Saint John’s University for 52 years, founder of the Amadeus Chamber Symphony, Music Director of the National Catholic Youth Choir, and Executive Director of The VoiceCare Network, Dr. Theimer is a recipient of the ACDA-MN Choir Director of the Year Award (2001), MMEA Hall of Fame induction (2004), and the F. Melius Christiansen Lifetime Achievement Award (2011).',
      order: 3,
      active: true,
    },
  ],
  givingTiers: [
    {
      name: 'Friends of Kantorei',
      range: '$25 – $99',
      description: 'Supports music licensing and recognition in our concert programs.',
      order: 1,
      active: true,
    },
    {
      name: 'Chorister Circle',
      range: '$100 – $249',
      description: 'Helps keep participation free of mandatory singer dues and folder fees.',
      order: 2,
      active: true,
    },
    {
      name: 'Recording & Outreach Patron',
      range: '$250 – $499',
      description: 'Advances worldwide digital recordings and community choral partnerships.',
      order: 3,
      active: true,
    },
    {
      name: 'Director’s Circle',
      range: '$500+',
      description: 'Underwrites living composer commissions, guest collaborators, and touring.',
      order: 4,
      active: true,
    },
  ],
  roster: [
    // Artistic Leadership & Administration
    {
      email: 'adam.reinwald@kantorei.net',
      name: 'Adam Reinwald',
      voicePart: '',
      sectionGroup: '',
      role: 'Admin',
      phone: '',
      active: true,
      status: 'Active',
    },
    // Sopranos
    {
      email: 'karin.almjeld@kantorei.net',
      name: 'Karin Almjeld',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'angela.barberg@kantorei.net',
      name: 'Angela Barberg',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'lori.bartz@kantorei.net',
      name: 'Lori Bartz',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'delaney.broberg@kantorei.net',
      name: 'Delaney Broberg',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'jill.brown@kantorei.net',
      name: 'Jill Brown',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'amanda.carlson@kantorei.net',
      name: 'Amanda Carlson',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'zoey.cookmorey@kantorei.net',
      name: 'Zoey Cook Morey',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'charlotte.currier@kantorei.net',
      name: 'Charlotte Currier',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'maria.crea@kantorei.net',
      name: 'Maria Crea',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'genevievepalumbo@gmail.com',
      name: 'Genna Palumbo',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'polim0501@gmail.com',
      name: 'Maryanne Poliseno',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'mollytengwall@gmail.com',
      name: 'Molly Tengwall',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },

    // Altos
    {
      email: 'maggieakhavan@gmail.com',
      name: 'Maggie Akhavan',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Admin',
      phone: '612-718-5703',
      active: true,
      status: 'Active',
    },
    {
      email: 'whitney.delong@kantorei.net',
      name: 'Whitney DeLong',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'marlene.dingmann@kantorei.net',
      name: 'Marlene Dingmann',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'mindy.eschedor@kantorei.net',
      name: 'Mindy Eschedor',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'ruby.eskin@kantorei.net',
      name: 'Ruby Eskin',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'kellie.fitzgerald@kantorei.net',
      name: 'Kellie Fitzgerald',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'nikki.frontz@kantorei.net',
      name: 'Nikki Frontz',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'kristin.hella@kantorei.net',
      name: 'Kristin Hella',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'jessica.mckinnon@kantorei.net',
      name: 'Jessica McKinnon',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'christine.mielke@kantorei.net',
      name: 'Christine Mielke',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'shelby.mielke@kantorei.net',
      name: 'Shelby Mielke',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'ann.skempcook@kantorei.net',
      name: 'Ann Skemp-Cook',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'strand.carlajoy@gmail.com',
      name: 'CarlaJoy Strand',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'catherine.vitt@kantorei.net',
      name: 'Catherine Vitt',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },

    // Tenors
    {
      email: 'mleadcamp@gmail.com',
      name: 'Michael Campana',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'mclaver8@gmail.com',
      name: 'Michael Claver',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'peder.flaten@kantorei.net',
      name: 'Peder Flaten',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'jonathan.guyton@kantorei.net',
      name: 'Jonathan Guyton',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'james.lewis@kantorei.net',
      name: 'James Lewis',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'jonathan.posthuma@kantorei.net',
      name: 'Jonathan Posthuma',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'travis.wiertzema@kantorei.net',
      name: 'Travis Wiertzema',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'gregg.dahlke@kantorei.net',
      name: 'Gregg Dahlke',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },

    // Basses
    {
      email: 'alec.barberg@kantorei.net',
      name: 'Alec Barberg',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'djbelknap@gmail.com',
      name: 'Daniel Belknap',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '608-630-0452',
      active: true,
      status: 'Active',
    },
    {
      email: 'daniel.bridston@kantorei.net',
      name: 'Daniel Bridston',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'craig.campbell@kantorei.net',
      name: 'Craig Campbell',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'jmorey823@gmail.com',
      name: 'Joseph Cook Morey',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'ron.heil@kantorei.net',
      name: 'Ron Heil',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'jfrankelly@gmail.com',
      name: 'John Kelly',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'erik.linnell@kantorei.net',
      name: 'Erik Linnell',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Section_Leader',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'mark.neppl@kantorei.net',
      name: 'Mark Neppl',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'joe.polta@kantorei.net',
      name: 'Joe Polta',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'anthonyshanerangel@gmail.com',
      name: 'Tony Rangel',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Admin',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'sam.theisen@kantorei.net',
      name: 'Sam Theisen',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Admin',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'jeff.tunseth@kantorei.net',
      name: 'Jeff Tunseth',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'cory.westgard@kantorei.net',
      name: 'Cory Westgard',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '',
      active: true,
      status: 'Active',
    },
    {
      email: 'apadgettski@gmail.com',
      name: 'Andrew Padgett',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Admin',
      phone: '612-555-0100',
      active: true,
      status: 'Active',
    },
  ],
  schedule: [
    {
      eventId: 'reh-2026-11-08',
      date: '2026-11-08',
      time: '6:30 PM - 9:00 PM',
      type: 'Rehearsal',
      title: 'Sunday Evening Rehearsal',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: 'CarlaJoy Strand (Clementines & grapes)',
      snack2Name: 'Michael Claver (Homemade brownies - nut free)',
      snack3Name: 'Elena Rostova (Sparkling water & cups)',
      snack4Name: '',
      notes: 'Lauridsen O Magnum Mysterium (mm. 1-48), Shaw "and the swallow", Howells I & II. Fragrance-free policy.',
    },
    {
      eventId: 'reh-2026-11-15',
      date: '2026-11-15',
      time: '6:00 PM - 8:30 PM',
      type: 'Sectional',
      title: 'Sunday Split Sectionals + Tutti Rehearsal',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: 'Maryanne Poliseno (Cheese board & gluten-free crackers)',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: '6:00-6:50 PM Sectionals on Bach BWV 230 fugue; 7:00 PM tutti after snack break.',
    },
    {
      eventId: 'reh-2026-11-22',
      date: '2026-11-22',
      time: '6:00 PM - 8:30 PM',
      type: 'Rehearsal',
      title: 'Sunday Evening Rehearsal',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: 'Tuning & dynamic shaping on Lauridsen; acoustic spacing work on Advent carols.',
    },
    {
      eventId: 'reh-2026-12-06',
      date: '2026-12-06',
      time: '6:00 PM - 8:30 PM',
      type: 'Rehearsal',
      title: 'Sunday Evening Rehearsal — Full Cycle Polishing',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: 'Bring tablet (ForScore) or printed scores; check breath markings with section leaders.',
    },
    {
      eventId: 'reh-2026-12-17',
      date: '2026-12-17',
      time: '6:00 PM - 8:30 PM',
      type: 'Dress',
      title: 'Advent with Kantorei — Acoustic Dress Rehearsal',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: 'John Kelly (Apples & caramel dip)',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: 'Full concert program run-through at the venue to lock in staging and logistics (casual attire OK).',
    },
    {
      eventId: 'con-2026-12-19',
      date: '2026-12-19',
      time: '3:00 PM (1:30 PM Acoustic Call)',
      type: 'Concert',
      title: 'Advent with Kantorei — Shoreview',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: '3920 Victoria St N, Shoreview, MN. Concert black attire (fragrance-free); doors open at 2:30 PM.',
    },
    {
      eventId: 'con-2026-12-20',
      date: '2026-12-20',
      time: '3:00 PM (1:30 PM Acoustic Call)',
      type: 'Concert',
      title: 'Advent with Kantorei — Edina',
      location: 'Lutheran Church of the Good Shepherd, Edina',
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: '4801 France Ave S, Edina, MN. Post-concert greeting with audience & patrons.',
    },
  ],
  absences: [
    {
      timestamp: '2026-11-01T17:45:00.000Z',
      eventId: 'reh-2026-11-10',
      date: '2026-11-10',
      singerName: 'David O’Connell',
      singerEmail: 'david.oconnell@gmail.com',
      voicePart: 'T1',
      reason: 'Running ~20m late (traffic on I-35W)',
      submittedBy: 'Self',
      status: 'Late',
    },
    {
      timestamp: '2026-10-29T18:15:00.000Z',
      eventId: 'reh-2026-11-15',
      date: '2026-11-15',
      singerName: 'Samuel Brooks',
      singerEmail: 'samuel.brooks@outlook.com',
      voicePart: 'B1',
      reason: 'Work travel to Chicago',
      submittedBy: 'Self',
      status: 'Absent',
    },
    {
      timestamp: '2026-10-30T14:20:00.000Z',
      eventId: 'reh-2026-11-08',
      date: '2026-11-08',
      singerName: 'Maya Patel',
      singerEmail: 'maya.patel@gmail.com',
      voicePart: 'S2',
      reason: 'Family event out of town',
      submittedBy: 'Self',
      status: 'Absent',
    },
  ],
  concerts: [
    {
      slug: 'fall-2026-reflection',
      title: 'Songs of Reflection & Light',
      datesDisplay: 'Sat, October 17, 2026 7:30 PM',
      venueName: 'Central Presbyterian Church',
      venueAddress: 'St. Paul, MN',
      description:
        'A luminous evening of sacred and contemplative choral works opening our 2026–2027 season in Minnesota.',
      ttEventSeriesId: 'DEMO_SERIES_ID',
      status: 'On_Sale', // In the past by date -> automatically resolved to 'Past'
    },
    {
      slug: 'advent-with-kantorei',
      title: 'Advent with Kantorei',
      datesDisplay:
        'Sat, December 19, 3:00 PM (Shoreview) & Sun, December 20, 3:00 PM (Edina)',
      venueName:
        'Shepherd of the Hills Lutheran Church, Shoreview · Lutheran Church of the Good Shepherd, Edina',
      venueAddress: 'Shoreview & Edina, MN',
      description:
        'Gather in candlelight and winter stillness for Kantorei’s beloved Advent tradition—weaving luminous a cappella carols from around the world, cherished signature works, and radiant music by contemporary and emerging composers.',
      ttEventSeriesId: 'DEMO_SERIES_ID',
      status: 'On_Sale',
      heroImageUrl: '/images/advent-with-kantorei.webp',
      posterImageUrl: '/images/advent-lantern.jpg',
    },
    {
      slug: 'spring-2027',
      title: 'Voices Across Borders',
      datesDisplay: 'Sat, March 20, 7:30 PM & Sun, March 21, 3:00 PM',
      venueName: 'Twin Cities Sanctuary Venues (TBA)',
      venueAddress: 'Minneapolis & St. Paul, MN',
      description:
        'Unaccompanied choral masterworks from the Baltic states, Latin America, and the Upper Midwest—pairing beloved ensemble signature pieces with vibrant works by emerging voices.',
      ttEventSeriesId: 'DEMO_SERIES_ID',
      status: 'Upcoming',
    },
    {
      slug: 'may-2027',
      title: 'Singing for a Lifetime',
      datesDisplay: 'Sat, May 15, 7:30 PM & Sun, May 16, 3:00 PM',
      venueName: 'Twin Cities Sanctuary Venues (TBA)',
      venueAddress: 'Minneapolis & St. Paul, MN',
      description:
        'Our season finale celebrating community outreach, intergenerational choral artistry, and the effortless, resonant sound that has defined Kantorei in Minnesota since 1988.',
      ttEventSeriesId: 'DEMO_SERIES_ID',
      status: 'Upcoming',
    },
    {
      slug: 'summer-gala-2027',
      title: 'Summer Choral Gala & Benefit',
      datesDisplay: 'Sat, June 19, 2027 6:30 PM',
      venueName: 'Twin Cities Acoustic Hall',
      venueAddress: 'Minneapolis, MN',
      description:
        'An intimate benefit evening supporting Kantorei’s singer fellowship and lifelong singing programs. In-progress draft visible only to administrators.',
      ttEventSeriesId: 'DEMO_SERIES_ID',
      status: 'Draft',
    },
  ],
  media: [
    {
      id: 'yt-yvarechcha',
      title: "Y'varech'cha (May the Lord Bless You)",
      subtitle: 'Composed by Gerald Cohen · Kantorei MN',
      youtubeUrl: 'https://www.youtube.com/watch?v=ca0DYRHzUms',
      category: 'Featured Recording',
      description:
        'Sacred blessing from the album From Such Sparks, performed by Kantorei under Artistic Director Adam Reinwald.',
    },
    {
      id: 'yt-from-such-sparks',
      title: 'From Such Sparks',
      subtitle: 'Choral Music of Gerald Cohen · Kantorei MN',
      youtubeUrl: 'https://www.youtube.com/watch?v=krhArol4Ph0',
      category: 'Album & Lyric Video',
      description:
        'Studio recording collaboration sharing Kantorei’s artistry with listeners worldwide across YouTube and streaming platforms.',
    },
    {
      id: 'yt-dickinson',
      title: 'Two Dickinson Poems ("Look Back on Time")',
      subtitle: 'Composed by Jonathan Posthuma · Look Back on Time Album',
      youtubeUrl: 'https://www.youtube.com/watch?v=gDHhtv4zFE4',
      category: 'Album & Lyric Video',
      description:
        'From the album Look Back on Time: Choral Music of Jonathan Posthuma, performed by Kantorei under Artistic Director Adam Reinwald.',
    },
    {
      id: 'yt-o-nata-lux',
      title: 'O nata lux, from Lux Aeterna',
      subtitle: 'Morten Lauridsen · Kantorei MN',
      youtubeUrl: 'https://www.youtube.com/watch?v=LRirpnojhRE',
      category: 'Concert Video',
      description:
        'Unaccompanied sacred lines highlighting Kantorei’s signature vocal warmth and acoustic blend.',
    },
    {
      id: 'yt-opening-window',
      title: 'Opening the Window',
      subtitle: 'Composed by Jonathan Posthuma · Kantorei MN',
      youtubeUrl: 'https://www.youtube.com/watch?v=r9KFwejGdMM',
      category: 'Album & Lyric Video',
      description:
        'Expansive contemporary a cappella writing highlighting Kantorei’s hallmark vocal warmth and effortless blend.',
    },
    {
      id: 'yt-poem-is-a-home',
      title: 'A Poem is a Home',
      subtitle: 'Music & Lyrics by Jonathan Posthuma · Kantorei MN',
      youtubeUrl: 'https://www.youtube.com/watch?v=eXlT64Q5pp0',
      category: 'Album & Lyric Video',
      description:
        'Contemporary Minnesota choral storytelling inviting deep meaning and belonging.',
    },
  ],
  repertoire: [
    {
      folderId: 'notes-advent-2026',
      title: 'Advent with Kantorei (Dec) — Director Notes',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-doc-advent-markings',
          name: "Director's Markings, Concert Order & Reference Recordings (Advent).docx",
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          sizeBytes: 38_400,
          isPdf: false,
          isAudio: false,
          isDoc: true,
          canExportPdf: true,
        },
      ],
    },
    {
      folderId: 'piece-aer-enim',
      title: 'Aer Enim — Linda Kachelmeier',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-aer-enim-score',
          name: 'Aer Enim w_ markings - Linda Kachelmeier.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 395_000,
          isPdf: true,
          isAudio: false,
        },
        {
          id: 'demo-pdf-aer-enim-percussion',
          name: 'Aer-Enim-SSAA_formatted_Percussion.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 180_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-veni',
      title: 'Veni, Emmanuel — Steele',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-veni-score',
          name: 'Veni, Emmanuel - Steele (marked).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 310_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-lo-how-a-rose',
      title: 'Lo, How a Rose — Sandström',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-lo-how-score',
          name: 'Lo-How-a-Rose (Sandstrom).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 290_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-in-the-stillness',
      title: 'In The Stillness — Beamish',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-stillness-score',
          name: 'In The Stillness (Beamish) (suggested markings).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 280_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-his-voice',
      title: 'His Voice As the Sound — Parker/Shaw',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-his-voice-score',
          name: 'His Voice As the Sound (Parker/Shaw).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 275_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-lauridsen',
      title: 'O Magnum Mysterium — Lauridsen',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-lauridsen-score',
          name: 'O Magnum Mysterium - Lauridsen w_ markings.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 428_000,
          isPdf: true,
          isAudio: false,
        },
        {
          id: 'demo-audio-lauridsen-soprano',
          name: 'Lauridsen_Soprano_S1_S2_Part_Predominant.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
        {
          id: 'demo-audio-lauridsen-bass',
          name: 'Lauridsen_Bass_B1_B2_Part_Predominant.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
      ],
    },
    {
      folderId: 'piece-gloria',
      title: 'Gloria from Masque of Angels — Argento',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-gloria-score',
          name: 'Gloria - Argento w_ markings.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 390_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-refugee',
      title: 'Refugee — Deignan',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-refugee-score',
          name: 'Refugee - Deignan (marked).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 340_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-love-came-down',
      title: 'Love Came Down at Christmas — Grundahl',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-love-came-down-score',
          name: 'Love Came Down at Christmas (Grundahl).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 300_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-spotless-rose',
      title: 'A Spotless Rose — Howells',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-howells-rose-score',
          name: 'Howells-A-Spotless-Rose (marked ATR).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 320_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-rise-up-shepherd',
      title: 'Rise Up, Shepherd, And Follow — Christiansen',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-rise-up-score',
          name: 'Rise Up, Shepherd, And Follow - Christiansen w_ markings.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 330_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-regem-natum',
      title: 'Regem Natum — Gallus',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-regem-natum-score',
          name: 'Regem Natum (Gallus).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 250_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'piece-sametz',
      title: 'Gaudete — Sametz',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-sametz-score',
          name: 'Gaudete - Sametz (marked).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 395_000,
          isPdf: true,
          isAudio: false,
        },
        {
          id: 'demo-audio-sametz-tutti',
          name: 'Sametz_Gaudete_All_Parts_Reference.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
      ],
    },
    {
      folderId: 'piece-times-they-are-a-changin',
      title: 'The Times They Are A Changin — Podd',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-times-score',
          name: 'The Times They Are A Changin (arr. Podd SATB).pdf',
          mimeType: 'application/pdf',
          sizeBytes: 360_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
    {
      folderId: 'notes-muertos-2026',
      title: 'Día de los Muertos (Oct) — Director Notes',
      concertId: 'dia-de-los-muertos-2026',
      concertTitle: 'Día de los Muertos (Oct)',
      files: [
        {
          id: 'demo-doc-muertos-markings',
          name: "Director's Markings & Concert Order — Día de los Muertos",
          mimeType: 'application/vnd.google-apps.document',
          isPdf: false,
          isAudio: false,
          isDoc: true,
          canExportPdf: true,
        },
      ],
    },
    {
      folderId: 'piece-bach',
      title: '01 — J.S. Bach: Lobet den Herrn, BWV 230',
      concertId: 'dia-de-los-muertos-2026',
      concertTitle: 'Día de los Muertos (Oct)',
      files: [
        {
          id: 'demo-pdf-bach-score',
          name: 'Bach_BWV230_Lobet_den_Herrn_SATB_Marked_Breath_Edition.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 690_000,
          isPdf: true,
          isAudio: false,
        },
        {
          id: 'demo-audio-bach-bass',
          name: 'Bach_BWV230_Bass_B1_B2_Fugue_Tempo_88bpm.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
        {
          id: 'demo-audio-bach-soprano',
          name: 'Bach_BWV230_Soprano_S1_S2_Fugue_Tempo_88bpm.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
      ],
    },
    {
      folderId: 'piece-howells',
      title: '02 — Herbert Howells: Requiem (Movements I–VI)',
      concertId: 'dia-de-los-muertos-2026',
      concertTitle: 'Día de los Muertos (Oct)',
      files: [
        {
          id: 'demo-pdf-howells-score',
          name: 'Howells_Requiem_Full_Score_With_Rehearsal_Letters.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 910_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
  ],
  warnings: [],
  seatingCharts: [
    {
      id: 'chart-2026-advent-shoreview',
      season: '2026–2027',
      concertSlug: 'advent-with-kantorei',
      concertTitle: 'Advent with Kantorei',
      title: 'Advent with Kantorei — Shoreview Sanctuary',
      description:
        'Kantorei standard 50-member, 3-row formation at Shepherd of the Hills. Row 1: 16 seats, Row 2: 17 seats, Row 3: 17 seats with center aisle.',
      status: 'Published',
      createdAt: '2026-10-15T12:00:00.000Z',
      updatedAt: '2026-11-01T15:30:00.000Z',
      rows: [
        {
          rowNumber: 1,
          name: 'Row 1',
          seats: [
            {
              seatIndex: 1,
              singerEmail: 'polim0501@gmail.com',
              singerName: 'Maryanne Poliseno',
              voicePart: 'S1',
            },
            {
              seatIndex: 2,
              singerEmail: 'claire.lindqvist@icloud.com',
              singerName: 'Claire Lindqvist',
              voicePart: 'S1',
            },
            {
              seatIndex: 3,
              singerEmail: 'hannah.berg@yahoo.com',
              singerName: 'Hannah Bergstrom',
              voicePart: 'S1',
            },
            {
              seatIndex: 4,
              singerEmail: 'sarah.jenkins@example.com',
              singerName: 'Sarah Jenkins',
              voicePart: 'S1',
            },
            {
              seatIndex: 5,
              singerEmail: 'emily.larson@example.com',
              singerName: 'Emily Larson',
              voicePart: 'S1',
            },
            {
              seatIndex: 6,
              singerEmail: 'chloe.bennett@example.com',
              singerName: 'Chloe Bennett',
              voicePart: 'S1',
            },
            {
              seatIndex: 7,
              singerEmail: 'maya.patel@gmail.com',
              singerName: 'Maya Patel',
              voicePart: 'S2',
            },
            {
              seatIndex: 8,
              singerEmail: 'jessica.walsh@example.com',
              singerName: 'Jessica Walsh',
              voicePart: 'S2',
            },
            { seatIndex: 0, isAisle: true },
            {
              seatIndex: 9,
              singerEmail: 'maggieakhavan@gmail.com',
              singerName: 'Maggie Akhavan',
              voicePart: 'A1',
            },
            {
              seatIndex: 10,
              singerEmail: 'strand.carlajoy@gmail.com',
              singerName: 'CarlaJoy Strand',
              voicePart: 'A1',
            },
            {
              seatIndex: 11,
              singerEmail: 'nadia.okafor@gmail.com',
              singerName: 'Nadia Okafor',
              voicePart: 'A1',
            },
            {
              seatIndex: 12,
              singerEmail: 'allison.foster@example.com',
              singerName: 'Allison Foster',
              voicePart: 'A1',
            },
            {
              seatIndex: 13,
              singerEmail: 'rebecca.vance@example.com',
              singerName: 'Rebecca Vance',
              voicePart: 'A1',
            },
            {
              seatIndex: 14,
              singerEmail: 'kendra.nelson@example.com',
              singerName: 'Kendra Nelson',
              voicePart: 'A1',
            },
            {
              seatIndex: 15,
              singerEmail: 'rachel.kim@outlook.com',
              singerName: 'Rachel Kim',
              voicePart: 'A2',
            },
            {
              seatIndex: 16,
              singerEmail: 'eleanor.zhang@example.com',
              singerName: 'Eleanor Zhang',
              voicePart: 'A2',
            },
          ],
        },
        {
          rowNumber: 2,
          name: 'Row 2',
          seats: [
            {
              seatIndex: 1,
              singerEmail: 'megan.oconnor@example.com',
              singerName: "Megan O'Connor",
              voicePart: 'S2',
            },
            {
              seatIndex: 2,
              singerEmail: 'olivia.thorne@example.com',
              singerName: 'Olivia Thorne',
              voicePart: 'S2',
            },
            {
              seatIndex: 3,
              singerEmail: 'grace.vanderwaal@example.com',
              singerName: 'Grace Vanderwaal',
              voicePart: 'S2',
            },
            {
              seatIndex: 4,
              singerEmail: 'lauren.miller@example.com',
              singerName: 'Lauren Miller',
              voicePart: 'S2',
            },
            {
              seatIndex: 5,
              singerEmail: 'bethany.wright@example.com',
              singerName: 'Bethany Wright',
              voicePart: 'A2',
            },
            {
              seatIndex: 6,
              singerEmail: 'samantha.flores@example.com',
              singerName: 'Samantha Flores',
              voicePart: 'A2',
            },
            {
              seatIndex: 7,
              singerEmail: 'danielle.cooper@example.com',
              singerName: 'Danielle Cooper',
              voicePart: 'A2',
            },
            {
              seatIndex: 8,
              singerEmail: 'natalie.brooks@example.com',
              singerName: 'Natalie Brooks',
              voicePart: 'A2',
            },
            { seatIndex: 0, isAisle: true },
            {
              seatIndex: 9,
              singerEmail: 'mclaver8@gmail.com',
              singerName: 'Michael Claver',
              voicePart: 'T1',
            },
            {
              seatIndex: 10,
              singerEmail: 'lucas.meyer@gmail.com',
              singerName: 'Lucas Meyer',
              voicePart: 'T1',
            },
            {
              seatIndex: 11,
              singerEmail: 'kevin.anderson@example.com',
              singerName: 'Kevin Anderson',
              voicePart: 'T1',
            },
            {
              seatIndex: 12,
              singerEmail: 'peter.lindgren@example.com',
              singerName: 'Peter Lindgren',
              voicePart: 'T1',
            },
            {
              seatIndex: 13,
              singerEmail: 'marcus.vance@example.com',
              singerName: 'Marcus Vance',
              voicePart: 'T1',
            },
            {
              seatIndex: 14,
              singerEmail: 'adam.reinwald@kantorei.net',
              singerName: 'Adam Reinwald',
              voicePart: 'B1',
            },
            {
              seatIndex: 15,
              singerEmail: 'jfrankelly@gmail.com',
              singerName: 'John Kelly',
              voicePart: 'B1',
            },
            {
              seatIndex: 16,
              singerEmail: 'samuel.brooks@outlook.com',
              singerName: 'Samuel Brooks',
              voicePart: 'B1',
            },
            {
              seatIndex: 17,
              singerEmail: 'benjamin.hayes@example.com',
              singerName: 'Benjamin Hayes',
              voicePart: 'B1',
            },
          ],
        },
        {
          rowNumber: 3,
          name: 'Row 3',
          seats: [
            {
              seatIndex: 1,
              singerEmail: 'julian.cho@icloud.com',
              singerName: 'Julian Cho',
              voicePart: 'T2',
            },
            {
              seatIndex: 2,
              singerEmail: 'brian.gallagher@example.com',
              singerName: 'Brian Gallagher',
              voicePart: 'T2',
            },
            {
              seatIndex: 3,
              singerEmail: 'david.evans@example.com',
              singerName: 'David Evans',
              voicePart: 'T2',
            },
            {
              seatIndex: 4,
              singerEmail: 'zachary.chen@example.com',
              singerName: 'Zachary Chen',
              voicePart: 'T2',
            },
            {
              seatIndex: 5,
              singerEmail: 'thomas.bradley@example.com',
              singerName: 'Thomas Bradley',
              voicePart: 'T2',
            },
            {
              seatIndex: 6,
              singerEmail: 'sean.omalley@example.com',
              singerName: "Sean O'Malley",
              voicePart: 'T2',
            },
            { seatIndex: 7 },
            { seatIndex: 8 },
            { seatIndex: 0, isAisle: true },
            {
              seatIndex: 9,
              singerEmail: 'andrew@kantorei.net',
              singerName: 'Andrew Padgett',
              voicePart: 'B2',
            },
            {
              seatIndex: 10,
              singerEmail: 'daniel.richardson@example.com',
              singerName: 'Daniel Richardson',
              voicePart: 'B2',
            },
            {
              seatIndex: 11,
              singerEmail: 'eric.gustafson@example.com',
              singerName: 'Eric Gustafson',
              voicePart: 'B2',
            },
            {
              seatIndex: 12,
              singerEmail: 'william.sterling@example.com',
              singerName: 'William Sterling',
              voicePart: 'B2',
            },
            {
              seatIndex: 13,
              singerEmail: 'nathan.cole@example.com',
              singerName: 'Nathan Cole',
              voicePart: 'B2',
            },
            {
              seatIndex: 14,
              singerEmail: 'timothy.harris@example.com',
              singerName: 'Timothy Harris',
              voicePart: 'B2',
            },
            {
              seatIndex: 15,
              singerEmail: 'christopher.bell@example.com',
              singerName: 'Christopher Bell',
              voicePart: 'B1',
            },
            {
              seatIndex: 16,
              singerEmail: 'patrick.murphy@example.com',
              singerName: 'Patrick Murphy',
              voicePart: 'B1',
            },
            { seatIndex: 17 },
          ],
        },
      ],
    },
    {
      id: 'chart-2027-spring-cathedral',
      season: '2026–2027',
      concertSlug: 'spring-2027',
      concertTitle: 'Voices Across Borders',
      title: 'Spring 2027 — Cathedral Acoustic Blended Formation',
      description:
        'Draft mixed quartet placement for Cathedral acoustics. Testing SATB vocal blend across rows.',
      status: 'Draft',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-02T10:00:00.000Z',
      rows: [
        {
          rowNumber: 1,
          name: 'Row 1',
          seats: [
            {
              seatIndex: 1,
              singerEmail: 'polim0501@gmail.com',
              singerName: 'Maryanne Poliseno',
              voicePart: 'S1',
            },
            {
              seatIndex: 2,
              singerEmail: 'maggieakhavan@gmail.com',
              singerName: 'Maggie Akhavan',
              voicePart: 'A1',
            },
            {
              seatIndex: 3,
              singerEmail: 'mclaver8@gmail.com',
              singerName: 'Michael Claver',
              voicePart: 'T1',
            },
            {
              seatIndex: 4,
              singerEmail: 'jfrankelly@gmail.com',
              singerName: 'John Kelly',
              voicePart: 'B1',
            },
          ],
        },
        {
          rowNumber: 2,
          name: 'Row 2',
          seats: [
            {
              seatIndex: 1,
              singerEmail: 'claire.lindqvist@icloud.com',
              singerName: 'Claire Lindqvist',
              voicePart: 'S1',
            },
            {
              seatIndex: 2,
              singerEmail: 'strand.carlajoy@gmail.com',
              singerName: 'CarlaJoy Strand',
              voicePart: 'A1',
            },
            {
              seatIndex: 3,
              singerEmail: 'lucas.meyer@gmail.com',
              singerName: 'Lucas Meyer',
              voicePart: 'T1',
            },
            {
              seatIndex: 4,
              singerEmail: 'andrew@kantorei.net',
              singerName: 'Andrew Padgett',
              voicePart: 'B2',
            },
          ],
        },
        {
          rowNumber: 3,
          name: 'Row 3',
          seats: [
            {
              seatIndex: 1,
              singerEmail: 'maya.patel@gmail.com',
              singerName: 'Maya Patel',
              voicePart: 'S2',
            },
            {
              seatIndex: 2,
              singerEmail: 'rachel.kim@outlook.com',
              singerName: 'Rachel Kim',
              voicePart: 'A2',
            },
            {
              seatIndex: 3,
              singerEmail: 'julian.cho@icloud.com',
              singerName: 'Julian Cho',
              voicePart: 'T2',
            },
            {
              seatIndex: 4,
              singerEmail: 'samuel.brooks@outlook.com',
              singerName: 'Samuel Brooks',
              voicePart: 'B2',
            },
          ],
        },
      ],
    },
  ],
};

export function generateDemoPdfBytes(title: string): Uint8Array {
  const safeTitle = title.replace(/[()\\]/g, '');
  const streamContent = [
    'BT',
    '/F1 20 Tf',
    '54 730 Td',
    `(Kantorei Rehearsal Score Edition) Tj`,
    '/F1 13 Tf',
    '0 -28 Td',
    `(${safeTitle}) Tj`,
    '/F1 10 Tf',
    '0 -24 Td',
    '(ForScore / Tablet Ready Stream - Sandbox Demo Preview) Tj',
    '0 -32 Td',
    '(Connect Repertoire_Drive_Folder_ID in Config to stream live PDFs from Google Drive.) Tj',
    'ET',
    '0.6 w',
    '54 610 m 558 610 l S',
    '54 602 m 558 602 l S',
    '54 594 m 558 594 l S',
    '54 586 m 558 586 l S',
    '54 578 m 558 578 l S',
    '54 530 m 558 530 l S',
    '54 522 m 558 522 l S',
    '54 514 m 558 514 l S',
    '54 506 m 558 506 l S',
    '54 498 m 558 498 l S',
    '54 578 m 54 610 l S',
    '306 578 m 306 610 l S',
    '558 578 m 558 610 l S',
    '54 498 m 54 530 l S',
    '306 498 m 306 530 l S',
    '558 498 m 558 530 l S',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

export function generateDemoWavBytes(fileId: string): Uint8Array {
  const sampleRate = 22050;
  const durationSeconds = 4;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  const lower = fileId.toLowerCase();
  const leadFreq = lower.includes('soprano')
    ? 587.33
    : lower.includes('alto')
      ? 440.0
      : lower.includes('tenor')
        ? 369.99
        : 146.83;

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope =
      Math.min(1, t / 0.15) * Math.min(1, (durationSeconds - t) / 0.35);
    const lead = 0.55 * Math.sin(2 * Math.PI * leadFreq * t) + 0.15 * Math.sin(4 * Math.PI * leadFreq * t);
    const chord =
      0.12 * Math.sin(2 * Math.PI * 293.66 * t) +
      0.1 * Math.sin(2 * Math.PI * 369.99 * t) +
      0.1 * Math.sin(2 * Math.PI * 440.0 * t);
    const sample = Math.max(-1, Math.min(1, (lead + chord) * envelope * 0.75));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  return new Uint8Array(buffer);
}

