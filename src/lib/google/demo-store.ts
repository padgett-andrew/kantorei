import type {
  AbsenceRecord,
  ConcertEvent,
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
  repertoire: RepertoirePiece[];
  warnings: SheetWarning[];
  seatingCharts: SeatingChart[];
}

export const demoStore: DemoStore = {
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
  },
  roster: [
    {
      email: 'andrew@kantorei.net',
      name: 'Andrew Padgett',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Admin',
      phone: '612-555-0100',
      active: true,
      status: 'Active',
    },
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
      email: 'polim0501@gmail.com',
      name: 'Maryanne Poliseno',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Section_Leader',
      phone: '612-555-0118',
      active: true,
      status: 'Active',
    },
    {
      email: 'claire.lindqvist@icloud.com',
      name: 'Claire Lindqvist',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Section_Leader',
      phone: '612-555-0112',
      active: true,
      status: 'Active',
    },
    {
      email: 'maya.patel@gmail.com',
      name: 'Maya Patel',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '651-555-0134',
      active: true,
      status: 'Active',
    },
    {
      email: 'hannah.berg@yahoo.com',
      name: 'Hannah Bergstrom',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0177',
      active: true,
      status: 'Active',
    },
    {
      email: 'strand.carlajoy@gmail.com',
      name: 'CarlaJoy Strand',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Section_Leader',
      phone: '612-555-0148',
      active: true,
      status: 'Active',
    },
    {
      email: 'rachel.kim@outlook.com',
      name: 'Rachel Kim',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '651-555-0191',
      active: true,
      status: 'Active',
    },
    {
      email: 'nadia.okafor@gmail.com',
      name: 'Nadia Okafor',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '612-555-0163',
      active: true,
      status: 'Active',
    },
    {
      email: 'mclaver8@gmail.com',
      name: 'Michael Claver',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Section_Leader',
      phone: '612-555-0122',
      active: true,
      status: 'Active',
    },
    {
      email: 'julian.cho@icloud.com',
      name: 'Julian Cho',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '651-555-0185',
      active: true,
      status: 'Active',
    },
    {
      email: 'lucas.meyer@gmail.com',
      name: 'Lucas Meyer',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '612-555-0159',
      active: true,
      status: 'Active',
    },
    {
      email: 'jfrankelly@gmail.com',
      name: 'John Kelly',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Section_Leader',
      phone: '612-555-0199',
      active: true,
      status: 'Active',
    },
    {
      email: 'samuel.brooks@outlook.com',
      name: 'Samuel Brooks',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '651-555-0141',
      active: true,
      status: 'Active',
    },
    {
      email: 'sarah.jenkins@example.com',
      name: 'Sarah Jenkins',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0201',
      active: true,
      status: 'Active',
    },
    {
      email: 'emily.larson@example.com',
      name: 'Emily Larson',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0202',
      active: true,
      status: 'Active',
    },
    {
      email: 'chloe.bennett@example.com',
      name: 'Chloe Bennett',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '651-555-0203',
      active: true,
      status: 'Active',
    },
    {
      email: 'jessica.walsh@example.com',
      name: 'Jessica Walsh',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0204',
      active: true,
      status: 'Active',
    },
    {
      email: 'megan.oconnor@example.com',
      name: "Megan O'Connor",
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '651-555-0205',
      active: true,
      status: 'Active',
    },
    {
      email: 'olivia.thorne@example.com',
      name: 'Olivia Thorne',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0206',
      active: true,
      status: 'Active',
    },
    {
      email: 'grace.vanderwaal@example.com',
      name: 'Grace Vanderwaal',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '651-555-0207',
      active: true,
      status: 'Active',
    },
    {
      email: 'lauren.miller@example.com',
      name: 'Lauren Miller',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0208',
      active: true,
      status: 'Active',
    },
    {
      email: 'allison.foster@example.com',
      name: 'Allison Foster',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '651-555-0209',
      active: true,
      status: 'Active',
    },
    {
      email: 'rebecca.vance@example.com',
      name: 'Rebecca Vance',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '612-555-0210',
      active: true,
      status: 'Active',
    },
    {
      email: 'kendra.nelson@example.com',
      name: 'Kendra Nelson',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '651-555-0211',
      active: true,
      status: 'Active',
    },
    {
      email: 'eleanor.zhang@example.com',
      name: 'Eleanor Zhang',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '612-555-0212',
      active: true,
      status: 'Active',
    },
    {
      email: 'bethany.wright@example.com',
      name: 'Bethany Wright',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '651-555-0213',
      active: true,
      status: 'Active',
    },
    {
      email: 'samantha.flores@example.com',
      name: 'Samantha Flores',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '612-555-0214',
      active: true,
      status: 'Active',
    },
    {
      email: 'danielle.cooper@example.com',
      name: 'Danielle Cooper',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '651-555-0215',
      active: true,
      status: 'Active',
    },
    {
      email: 'natalie.brooks@example.com',
      name: 'Natalie Brooks',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '612-555-0216',
      active: true,
      status: 'Active',
    },
    {
      email: 'kevin.anderson@example.com',
      name: 'Kevin Anderson',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '651-555-0217',
      active: true,
      status: 'Active',
    },
    {
      email: 'peter.lindgren@example.com',
      name: 'Peter Lindgren',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '612-555-0218',
      active: true,
      status: 'Active',
    },
    {
      email: 'marcus.vance@example.com',
      name: 'Marcus Vance',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '651-555-0219',
      active: true,
      status: 'Active',
    },
    {
      email: 'brian.gallagher@example.com',
      name: 'Brian Gallagher',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '612-555-0220',
      active: true,
      status: 'Active',
    },
    {
      email: 'david.evans@example.com',
      name: 'David Evans',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '651-555-0221',
      active: true,
      status: 'Active',
    },
    {
      email: 'zachary.chen@example.com',
      name: 'Zachary Chen',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '612-555-0222',
      active: true,
      status: 'Active',
    },
    {
      email: 'thomas.bradley@example.com',
      name: 'Thomas Bradley',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '651-555-0223',
      active: true,
      status: 'Active',
    },
    {
      email: 'sean.omalley@example.com',
      name: "Sean O'Malley",
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '612-555-0224',
      active: true,
      status: 'Active',
    },
    {
      email: 'benjamin.hayes@example.com',
      name: 'Benjamin Hayes',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '651-555-0225',
      active: true,
      status: 'Active',
    },
    {
      email: 'christopher.bell@example.com',
      name: 'Christopher Bell',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '612-555-0226',
      active: true,
      status: 'Active',
    },
    {
      email: 'patrick.murphy@example.com',
      name: 'Patrick Murphy',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '651-555-0227',
      active: true,
      status: 'Active',
    },
    {
      email: 'daniel.richardson@example.com',
      name: 'Daniel Richardson',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '612-555-0228',
      active: true,
      status: 'Active',
    },
    {
      email: 'eric.gustafson@example.com',
      name: 'Eric Gustafson',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '651-555-0229',
      active: true,
      status: 'Active',
    },
    {
      email: 'william.sterling@example.com',
      name: 'William Sterling',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '612-555-0230',
      active: true,
      status: 'Active',
    },
    {
      email: 'nathan.cole@example.com',
      name: 'Nathan Cole',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '651-555-0231',
      active: true,
      status: 'Active',
    },
    {
      email: 'timothy.harris@example.com',
      name: 'Timothy Harris',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '612-555-0232',
      active: true,
      status: 'Active',
    },
    {
      email: 'jordan.alverez@example.com',
      name: 'Jordan Alverez',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '612-555-0109',
      active: false,
      status: 'On_Leave',
    },
    {
      email: 'former.member@example.com',
      name: 'Elena Rostova',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0104',
      active: false,
      status: 'Inactive',
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
      notes: 'Full concert program run-through at the venue to lock in risers and logistics (casual attire OK).',
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
  ],
  media: [
    {
      id: 'yt-dickinson',
      title: 'Two Dickinson Poems ("Look Back on Time")',
      subtitle: 'Composed by Jonathan Posthuma · Look Back on Time Album',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=Two+Dickinson+Poems',
      category: 'Album & Lyric Video',
      description:
        'From the album Look Back on Time: Choral Music of Jonathan Posthuma, performed by Kantorei under Artistic Director Adam Reinwald.',
    },
    {
      id: 'yt-opening-window',
      title: 'Opening the Window',
      subtitle: 'Composed by Jonathan Posthuma · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=Opening+the+Window',
      category: 'Album & Lyric Video',
      description:
        'Expansive contemporary a cappella writing highlighting Kantorei’s hallmark vocal warmth and effortless blend.',
    },
    {
      id: 'yt-from-such-sparks',
      title: 'From Such Sparks',
      subtitle: 'Choral Music of Gerald Cohen · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=From+Such+Sparks+Gerald+Cohen',
      category: 'Featured Recording',
      description:
        'Studio recording collaboration sharing Kantorei’s artistry with listeners worldwide across YouTube and streaming platforms.',
    },
    {
      id: 'yt-missa-brevis',
      title: 'Kyrie, from Missa Brevis',
      subtitle: 'Composed by Hyun Kook · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=Kyrie+Missa+Brevis+Hyun+Kook',
      category: 'Concert Video',
      description:
        'Soaring unaccompanied sacred lines from around the world.',
    },
    {
      id: 'yt-brahms-liebeslieder',
      title: 'Liebeslieder Waltzes',
      subtitle: 'Johannes Brahms · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=Liebeslieder+Waltzes+Brahms',
      category: 'Concert Video',
      description:
        'Romantic chamber repertoire balancing intimacy, buoyancy, and healthy vocal ease.',
    },
    {
      id: 'yt-poem-is-a-home',
      title: 'A Poem is a Home',
      subtitle: 'Music & Lyrics by Jonathan Posthuma · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=A+Poem+is+a+Home',
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

