#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { importPKCS8, SignJWT } from 'jose';

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const map = {};
  if (!fs.existsSync(envPath)) return map;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

function extractId(raw = '') {
  const t = raw.trim();
  const folder = /\/folders\/([a-zA-Z0-9_-]{15,})/.exec(t);
  if (folder) return folder[1];
  const doc = /\/d\/([a-zA-Z0-9_-]{15,})/.exec(t);
  if (doc) return doc[1];
  return t;
}

const dotEnv = loadDotEnv();
const env = { ...dotEnv, ...process.env };

const clientEmail = (env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const privateKeyRaw = (env.GOOGLE_PRIVATE_KEY || '').trim();
const sheetId = extractId(env.GOOGLE_SHEET_ID || env.GOOGLE_MASTER_SHEET_ID || '');

console.log('\n======================================================');
console.log(' 🛠️   KANTOREI CHOIR GOOGLE SHEET SCHEMA PROVISIONER');
console.log('======================================================\n');

const SCHEMA_SPEC = {
  Roster: {
    headers: ['Email', 'Name', 'Voice_Part', 'Section_Group', 'Role', 'Phone', 'Active'],
    sampleRows: [
      // Artistic Leadership & Administration
      ['adam.reinwald@kantorei.net', 'Adam Reinwald', '', '', 'Admin', '', 'Active'],

      // Sopranos
      ['karin.almjeld@kantorei.net', 'Karin Almjeld', 'S1', 'Soprano', 'Singer', '', 'Active'],
      ['angela.barberg@kantorei.net', 'Angela Barberg', 'S1', 'Soprano', 'Singer', '', 'Active'],
      ['lori.bartz@kantorei.net', 'Lori Bartz', 'S2', 'Soprano', 'Singer', '', 'Active'],
      ['delaney.broberg@kantorei.net', 'Delaney Broberg', 'S1', 'Soprano', 'Singer', '', 'Active'],
      ['jill.brown@kantorei.net', 'Jill Brown', 'S2', 'Soprano', 'Singer', '', 'Active'],
      ['amanda.carlson@kantorei.net', 'Amanda Carlson', 'S1', 'Soprano', 'Singer', '', 'Active'],
      ['zoey.cookmorey@kantorei.net', 'Zoey Cook Morey', 'S2', 'Soprano', 'Singer', '', 'Active'],
      ['charlotte.currier@kantorei.net', 'Charlotte Currier', 'S1', 'Soprano', 'Singer', '', 'Active'],
      ['maria.crea@kantorei.net', 'Maria Crea', 'S2', 'Soprano', 'Singer', '', 'Active'],
      ['genevievepalumbo@gmail.com', 'Genna Palumbo', 'S1', 'Soprano', 'Singer', '', 'Active'],
      ['polim0501@gmail.com', 'Maryanne Poliseno', 'S1', 'Soprano', 'Section_Leader', '', 'Active'],
      ['mollytengwall@gmail.com', 'Molly Tengwall', 'S2', 'Soprano', 'Section_Leader', '', 'Active'],

      // Altos
      ['maggieakhavan@gmail.com', 'Maggie Akhavan', 'A1', 'Alto', 'Admin', '612-718-5703', 'Active'],
      ['whitney.delong@kantorei.net', 'Whitney DeLong', 'A2', 'Alto', 'Singer', '', 'Active'],
      ['marlene.dingmann@kantorei.net', 'Marlene Dingmann', 'A1', 'Alto', 'Singer', '', 'Active'],
      ['mindy.eschedor@kantorei.net', 'Mindy Eschedor', 'A2', 'Alto', 'Singer', '', 'Active'],
      ['ruby.eskin@kantorei.net', 'Ruby Eskin', 'A1', 'Alto', 'Singer', '', 'Active'],
      ['kellie.fitzgerald@kantorei.net', 'Kellie Fitzgerald', 'A2', 'Alto', 'Singer', '', 'Active'],
      ['nikki.frontz@kantorei.net', 'Nikki Frontz', 'A1', 'Alto', 'Singer', '', 'Active'],
      ['kristin.hella@kantorei.net', 'Kristin Hella', 'A2', 'Alto', 'Singer', '', 'Active'],
      ['jessica.mckinnon@kantorei.net', 'Jessica McKinnon', 'A1', 'Alto', 'Singer', '', 'Active'],
      ['christine.mielke@kantorei.net', 'Christine Mielke', 'A2', 'Alto', 'Singer', '', 'Active'],
      ['shelby.mielke@kantorei.net', 'Shelby Mielke', 'A1', 'Alto', 'Singer', '', 'Active'],
      ['ann.skempcook@kantorei.net', 'Ann Skemp-Cook', 'A2', 'Alto', 'Singer', '', 'Active'],
      ['strand.carlajoy@gmail.com', 'CarlaJoy Strand', 'A1', 'Alto', 'Section_Leader', '', 'Active'],
      ['catherine.vitt@kantorei.net', 'Catherine Vitt', 'A2', 'Alto', 'Section_Leader', '', 'Active'],

      // Tenors
      ['mleadcamp@gmail.com', 'Michael Campana', 'T1', 'Tenor', 'Singer', '', 'Active'],
      ['mclaver8@gmail.com', 'Michael Claver', 'T1', 'Tenor', 'Section_Leader', '', 'Active'],
      ['peder.flaten@kantorei.net', 'Peder Flaten', 'T2', 'Tenor', 'Singer', '', 'Active'],
      ['jonathan.guyton@kantorei.net', 'Jonathan Guyton', 'T1', 'Tenor', 'Singer', '', 'Active'],
      ['james.lewis@kantorei.net', 'James Lewis', 'T2', 'Tenor', 'Singer', '', 'Active'],
      ['jonathan.posthuma@kantorei.net', 'Jonathan Posthuma', 'T1', 'Tenor', 'Section_Leader', '', 'Active'],
      ['travis.wiertzema@kantorei.net', 'Travis Wiertzema', 'T2', 'Tenor', 'Section_Leader', '', 'Active'],
      ['gregg.dahlke@kantorei.net', 'Gregg Dahlke', 'T2', 'Tenor', 'Singer', '', 'Active'],

      // Basses
      ['alec.barberg@kantorei.net', 'Alec Barberg', 'B1', 'Bass', 'Singer', '', 'Active'],
      ['djbelknap@gmail.com', 'Daniel Belknap', 'B2', 'Bass', 'Singer', '608-630-0452', 'Active'],
      ['daniel.bridston@kantorei.net', 'Daniel Bridston', 'B1', 'Bass', 'Singer', '', 'Active'],
      ['craig.campbell@kantorei.net', 'Craig Campbell', 'B2', 'Bass', 'Singer', '', 'Active'],
      ['jmorey823@gmail.com', 'Joseph Cook Morey', 'B1', 'Bass', 'Singer', '', 'Active'],
      ['ron.heil@kantorei.net', 'Ron Heil', 'B2', 'Bass', 'Singer', '', 'Active'],
      ['jfrankelly@gmail.com', 'John Kelly', 'B1', 'Bass', 'Section_Leader', '', 'Active'],
      ['erik.linnell@kantorei.net', 'Erik Linnell', 'B1', 'Bass', 'Section_Leader', '', 'Active'],
      ['mark.neppl@kantorei.net', 'Mark Neppl', 'B2', 'Bass', 'Singer', '', 'Active'],
      ['joe.polta@kantorei.net', 'Joe Polta', 'B1', 'Bass', 'Singer', '', 'Active'],
      ['anthonyshanerangel@gmail.com', 'Tony Rangel', 'B2', 'Bass', 'Admin', '', 'Active'],
      ['sam.theisen@kantorei.net', 'Sam Theisen', 'B1', 'Bass', 'Admin', '', 'Active'],
      ['jeff.tunseth@kantorei.net', 'Jeff Tunseth', 'B2', 'Bass', 'Singer', '', 'Active'],
      ['cory.westgard@kantorei.net', 'Cory Westgard', 'B1', 'Bass', 'Singer', '', 'Active'],
      ['apadgettski@gmail.com', 'Andrew Padgett', 'B2', 'Bass', 'Admin', '612-555-0100', 'Active'],
    ],
    validations: [
      {
        column: 'Voice_Part',
        options: ['S', 'S1', 'S2', 'A', 'A1', 'A2', 'T', 'T1', 'T2', 'B', 'B1', 'B2'],
        message: 'Select an allowed voice part (e.g. S1, A2, T1, B2)',
      },
      {
        column: 'Section_Group',
        options: ['Soprano', 'Alto', 'Tenor', 'Bass'],
        message: 'Select a section group (Soprano, Alto, Tenor, Bass)',
      },
      {
        column: 'Role',
        options: ['Singer', 'Section_Leader', 'Admin'],
        message: 'Select a portal role (Singer, Section_Leader, Admin)',
      },
      {
        column: 'Active',
        options: ['Active', 'On_Leave', 'Inactive', 'TRUE', 'FALSE'],
        message: 'Select member status (Active, On_Leave, Inactive)',
      },
    ],
  },
  Schedule: {
    headers: [
      'Event_ID',
      'Date',
      'Time',
      'Type',
      'Title',
      'Location',
      'Snack_1_Name',
      'Snack_2_Name',
      'Snack_3_Name',
      'Snack_4_Name',
      'Notes',
    ],
    sampleRows: [
      [
        'reh-2026-11-10',
        '2026-11-10',
        '7:00 PM - 9:30 PM',
        'Rehearsal',
        'Tuesday Rehearsal',
        'Main Sanctuary',
        '',
        '',
        '',
        '',
        'Focus on movements 1-3',
      ],
    ],
    validations: [
      {
        column: 'Type',
        options: ['Rehearsal', 'Sectional', 'Retreat', 'Dress', 'Concert'],
        message: 'Select an event type (Rehearsal, Sectional, Retreat, Dress, Concert)',
      },
    ],
  },
  Absences: {
    headers: [
      'Timestamp',
      'Event_ID',
      'Date',
      'Singer_Name',
      'Singer_Email',
      'Voice_Part',
      'Reason',
      'Submitted_By',
      'Status',
    ],
    sampleRows: [],
    validations: [
      {
        column: 'Voice_Part',
        options: ['S', 'S1', 'S2', 'A', 'A1', 'A2', 'T', 'T1', 'T2', 'B', 'B1', 'B2'],
        message: 'Select an allowed voice part',
      },
      {
        column: 'Status',
        options: ['Absent', 'Late', 'Cleared'],
        message: 'Select absence status (Absent, Late, Cleared)',
      },
    ],
  },
  Concerts: {
    headers: [
      'Concert_Slug',
      'Title',
      'Dates_Display',
      'Venue_Name',
      'Venue_Address',
      'Description',
      'TT_Event_Series_ID',
      'Status',
      'Hero_Image_URL',
      'Box_Office_Note',
      'Poster_Image_URL',
    ],
    sampleRows: [
      [
        'winter-2026',
        'Light in the Winter Dark',
        'Sat Dec 12 (7:30 PM) & Sun Dec 13 (3:00 PM)',
        'Cathedral Sanctuary',
        'Minneapolis, MN',
        'Join us for an evening of choral masterworks.',
        'DEMO_SERIES_ID',
        'On_Sale',
        '',
        '',
        '',
      ],
    ],
    validations: [
      {
        column: 'Status',
        options: ['Draft', 'Upcoming', 'On_Sale', 'Past'],
        message: 'Select concert status (Draft, Upcoming, On_Sale, Past)',
      },
    ],
  },
  Config: {
    headers: ['Key', 'Value', 'Description / Where It Appears'],
    sampleRows: [
      ['Choir_Name', 'Kantorei', 'Public ensemble name displayed across navbar, footer, metadata, and page titles'],
      ['Conductor_Name', 'Adam Reinwald', 'Full display name of Artistic Director / Conductor (cascades into all blurbs via {Conductor_Name})'],
      ['Conductor_Email', 'adam.reinwald@kantorei.net', 'Artistic Director email for singer absence alerts and portal routing'],
      ['Manager_Email', 'maggieakhavan@gmail.com', 'Choir operations manager email for portal and attendance notices'],
      ['Repertoire_Drive_Folder_ID', '1tIPYJBkibVLjQOaGSzZ2y7L9UOTNOyJc', 'Google Drive folder ID containing score PDFs and rehearsal tracks'],
      ['Handbook_Google_Doc_ID', '', 'Google Doc ID for live Singer Handbook rendered inside /portal/handbook'],
      ['Strategic_Plan_Google_Doc_ID', '', 'Google Doc ID for Kantorei 2026-2036 Strategic Plan'],
      ['Season_Pass_TT_Widget_URL', 'DEMO', 'Ticket Tailor flex season pass embed URL'],
      ['Portal_Announcement', 'Welcome to the Kantorei Singer Portal.', 'Banner alert pinned to the top of the Singer Portal (/portal)'],
      ['Calendar_Timezone', 'America/Chicago', 'Timezone used to generate calendar feeds (.ics)'],
      ['YouTube_URL', 'https://www.youtube.com/@kantoreiMN', 'Official Kantorei YouTube channel URL'],
      ['Instagram_URL', 'https://www.instagram.com/kantorei_mn', 'Official Kantorei Instagram URL'],
      ['Facebook_URL', 'https://www.facebook.com/kantoreimn', 'Official Kantorei Facebook URL'],
      ['Contact_Email', 'info@kantorei.net', 'Official public contact & auditions email shown in footer and contact cards'],
      ['Contact_Phone', '612-21-SINGS (612-217-4647)', 'Official public telephone number shown in footer'],
      ['Contact_Address', '660 23rd Ave NW, Saint Paul, MN 55112', 'Official postal mailing address shown in footer'],
      [
        'Mission_Statement',
        'Expanding the worldview of artists and audiences through passionate and crafted artistic performances, partnerships, and projects.',
        'Official Mission Statement displayed on homepage and /about',
      ],
      [
        'Vision_Statement',
        'Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.',
        'Official Vision Statement displayed on homepage and /about',
      ],
      ['Hero_Tagline', 'Sing, Laugh, Cry. Be Real…Together.', 'Main headline on homepage hero'],
      [
        'Hero_Subtitle',
        'Kantorei is an a cappella chamber choir based in the Minnesota Twin Cities. Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.',
        'Lead introductory paragraph on homepage hero',
      ],
      ['Hero_Video_URL', 'https://www.youtube.com/watch?v=GIvF19VzNPE', 'YouTube video URL looped softly in homepage hero background'],
      ['Hero_Image_URL', '', 'Optional fallback background image for homepage hero'],
      ['About_Header_Title', 'Vocal health, effortless sound, and singing for a lifetime.', 'Hero title on /about page'],
      [
        'About_History_P1',
        'Founded in 1988 by Dr. Axel Theimer, and now led by {Conductor_Name}, {Choir_Name} is one of the premier choral ensembles in Minnesota. With an integral focus on vocal health, {Choir_Name}’s singers have set a standard in Minnesota for rich and effortless choral sound. {Choir_Name} performs a wide range of mostly a cappella music from around the world. Most concerts include signature pieces complementing pieces from both well-known and emerging composers.',
        'First paragraph of choir history on /about page (supports {Conductor_Name}, {Choir_Name})',
      ],
      [
        'About_History_P2',
        '{Choir_Name} performs primarily in Minnesota and shares recordings worldwide. Through its outreach programming, {Choir_Name} invites audiences of all ages to share its pursuit of singing for a lifetime.',
        'Second paragraph of choir history on /about page (supports {Choir_Name})',
      ],
      [
        'Auditions_Blurb',
        'We welcome inquiries from experienced Twin Cities choral singers across all voice parts (S1, S2, A1, A2, T1, T2, B1, B2) who share our commitment to vocal health, independent preparation, and expressive a cappella ensemble singing.',
        'Introduction paragraph on /auditions and singer intake forms',
      ],
      [
        'Auditions_Timing_Note',
        'We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) to fill out a roster of singers for the coming season. Auditions are heard by Artistic Director {Conductor_Name} and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview. Inquiries and submissions are warmly welcomed year-round. Come sing with us!',
        'Audition cycle schedule and dates on /auditions (supports {Conductor_Name})',
      ],
      [
        'Auditions_Rehearsal_Cadence',
        '{Choir_Name} rehearses Sunday evenings at rotating venues across the Twin Cities metro area (typically 6–8 rehearsals per concert cycle), beginning each season with a community retreat.',
        'Weekly rehearsal time commitment blurb on /auditions (supports {Choir_Name})',
      ],
      [
        'Auditions_Process_Note',
        'Auditions are heard by Artistic Director {Conductor_Name} and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview.',
        'Audition format and requirements note on /auditions (supports {Conductor_Name})',
      ],
      ['Auditions_Form_URL', '', 'Optional Google Form URL to embed on /auditions (leave blank to use native form)'],
      ['Support_Hero_Title', 'Sustain choral artistry and lifelong singing in Minnesota.', 'Hero headline on /support page'],
      [
        'Support_Hero_Subtitle',
        'Every contribution to {Choir_Name} funds performances, composer commissions, recordings shared worldwide, Friends of Kantorei community programming, and keeps ensemble membership free of mandatory singer dues.',
        'Subtitle on /support page explaining impact of giving (supports {Choir_Name})',
      ],
      ['Support_Gala_Title', 'Annual Kantorei Gala & Friendraisers', 'Title for annual gala card on /support'],
      [
        'Support_Gala_Blurb',
        'Our annual Gala is {Choir_Name}’s signature fundraising celebration—bringing singers, alumni, and patrons together for live music, hospitality, and community support. Follow us on Instagram and Facebook for upcoming Gala dates and sponsorship opportunities.',
        'Annual Gala event blurb on /support page (supports {Choir_Name})',
      ],
      [
        'Support_Matching_Title',
        'Employer Matching, DAFs & Checks',
        'Title for employer matching, DAFs, and check mailing instructions card on /support',
      ],
      [
        'Support_Matching_Blurb',
        '{Choir_Name} welcomes corporate matching gifts (Benevity, CyberGrants, YourCause), Donor-Advised Fund grants, and gifts of appreciated securities. Contact [{Contact_Email}](mailto:{Contact_Email}) or call [{Contact_Phone}](tel:{Contact_Phone}) for our EIN and delivery instructions. Checks may be mailed to {Contact_Address}.',
        'Full body text for employer matching, DAFs & checks on /support. Dynamic tokens: {Contact_Email}, {Contact_Phone}, {Contact_Address}, {Choir_Name}',
      ],
      [
        'Support_Auditions_Title',
        'Audition for Kantorei',
        'Title for singer audition callout card on /support',
      ],
      [
        'Support_Auditions_Blurb',
        'Beyond financial contributions, {Choir_Name} is sustained by the dedication and artistry of our singers. We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) to fill out our roster of singers for the coming season, rehearsing at rotating venues across the Twin Cities. Inquiries and submissions are warmly welcomed year-round. Come sing with us!',
        'Auditions callout blurb on /support (supports {Choir_Name})',
      ],
      [
        'Tax_Exempt_Disclaimer',
        '{Choir_Name} is a registered 501(c)(3) nonprofit arts organization in Minnesota. Contributions are tax-deductible to the fullest extent permitted by law.',
        'Legal 501(c)(3) notice displayed in site-wide footer and /support (supports {Choir_Name})',
      ],
      ['Newsletter_Category', 'Friends of Kantorei', 'Small uppercase badge above newsletter signup in footer'],
      ['Newsletter_Headline', 'Stay in tune with our season.', 'Main heading for newsletter signup in site-wide footer'],
      [
        'Newsletter_Description',
        'Receive concert announcements, early-access ticket alerts, and artistic listening guides from conductor {Conductor_Name}.',
        'Callout blurb in site-wide footer describing the Friends of Kantorei newsletter (supports {Conductor_Name})',
      ],
      ['Newsletter_Button_Text', 'Join Free', 'Submit button label on newsletter form in site-wide footer'],
      [
        'Footer_About_Blurb',
        'Founded in 1988 by Axel Theimer and led by Artistic Director {Conductor_Name}, {Choir_Name} is one of Minnesota’s premier choral ensembles—sharing rich, effortless a cappella sound and singing for a lifetime.',
        'Short organization bio displayed in site-wide footer below the logo (supports {Conductor_Name}, {Choir_Name})',
      ],
      [
        'Home_Newsletter_Title',
        'Stay in Tune with Friends of Kantorei',
        'Newsletter headline on the homepage patron community banner',
      ],
      [
        'Home_Newsletter_Description',
        'Join our circle of patrons, alumni, and choral lovers. Get first access to concert tickets, conductor {Conductor_Name}’s listening guides, and unreleased choral recordings.',
        'Newsletter description on the homepage banner (supports {Conductor_Name})',
      ],
      [
        'Concerts_Newsletter_Title',
        'Never Miss a Concert Announcement',
        'Newsletter headline on the /concerts box office page',
      ],
      [
        'Concerts_Newsletter_Description',
        'Be the first to hear about upcoming season programs, early-access ticket sales, and guest artist appearances across the Twin Cities.',
        'Newsletter description on the /concerts page',
      ],
      [
        'No_Concerts_Title',
        'No Upcoming Concerts',
        'Headline shown on the /concerts page when there are no upcoming or active performances on the schedule',
      ],
      [
        'No_Concerts_Blurb',
        "We don't have any upcoming concerts scheduled at this time. Join our email list below to be notified as soon as new concert dates, programs, and tickets are announced.",
        'Message displayed on /concerts when no upcoming performances are scheduled',
      ],
      [
        'Home_Spotlight_Type',
        '',
        'Optional homepage spotlight content: "concert", "recording", or "friends". Leave blank for auto (active concert, or Friends of Kantorei fallback if no concerts scheduled).',
      ],
      [
        'Home_Spotlight_Media_ID',
        '',
        'Optional Media_ID from Media tab to spotlight on the homepage (e.g. yt-dickinson). Defaults to latest recording if Home_Spotlight_Type is recording.',
      ],
      [
        'Home_Spotlight_Title',
        'Stay in Touch with Kantorei',
        'Headline for the homepage spotlight card when showing the Friends of Kantorei fallback state',
      ],
      [
        'Home_Spotlight_Description',
        "We don't have any upcoming concerts scheduled right now. Join Friends of Kantorei to receive season announcements, recording releases, and priority ticket access.",
        'Callout description for the homepage spotlight card when showing the Friends of Kantorei fallback state',
      ],
      ['LGL_Form_URL', 'https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA', 'Little Green Light external donor form link'],
      ['MailerLite_API_Key', '', 'MailerLite API Bearer token for Friends of Kantorei newsletter sync (optional: can also be set via MAILERLITE_API_KEY secret)'],
      ['MailerLite_Group_ID', 'Friends of Kantorei', 'MailerLite group name or numeric ID for newsletter subscribers (auto-discovered if left blank)'],
      ['Resend_API_Key', '', 'Resend API key for portal transactional emails (OTP login, absences, auditions) (optional: can also be set via RESEND_API_KEY secret)'],
      ['Portal_From_Email', 'Kantorei Portal <onboarding@resend.dev>', 'Verified sender email address in Resend for portal alerts'],
      ['Sandbox_Override_Email', '', 'Optional test email to redirect all outgoing Resend emails to during development/testing'],
      ['TT_Webhook_Secret', '', 'Ticket Tailor webhook signing secret for verifying order opt-in webhooks (or set via TICKET_TAILOR_WEBHOOK_SECRET secret)'],
      ['Ticket_Tailor_API_Key', '', 'Ticket Tailor REST API key for auto-fetching live box office events (or set via TICKET_TAILOR_API_KEY secret)'],
    ],
  },
  Board: {
    headers: ['Name', 'Role', 'Order', 'Bio_Notes', 'Active'],
    sampleRows: [
      ['Michael Campana', 'President & Chair', '1', '', 'TRUE'],
      ['Joe Cook Morey', 'Vice-President & Vice Chair', '2', '', 'TRUE'],
      ['Kressen Anderson', 'Treasurer', '3', '', 'TRUE'],
      ['Molly Tengwall', 'Secretary', '4', '', 'TRUE'],
      ['Genna Palumbo', 'Singer Representative', '5', '', 'TRUE'],
      ['Dan Belknap', 'At-Large Member', '6', '', 'TRUE'],
      ['Naomi Karstad', 'At-Large Member', '7', '', 'TRUE'],
    ],
    validations: [
      {
        column: 'Active',
        options: ['TRUE', 'FALSE'],
        message: 'Select TRUE or FALSE',
      },
    ],
  },
  Leadership: {
    headers: ['Name', 'Title', 'Bio', 'Order', 'Email', 'Image_URL', 'Active'],
    sampleRows: [
      [
        'Adam Reinwald',
        'Artistic & Executive Director',
        'Appointed in 2021, Adam Reinwald is a nationally recognized vocal chamber artist, conductor, and nonprofit arts strategist with over two decades of experience in the choral arts—including work with the National Lutheran Choir and nearly two decades with the acclaimed vocal ensemble Cantus.\n\nIn demand as a coach for small- to mid-size arts organizations focusing on new media and digital branding, Adam has presented nationally at Chorus America, ACDA, and the Young Nonprofit Professionals Network.',
        '1',
        'adam.reinwald@kantorei.net',
        '/images/leadership/adam-reinwald.webp',
        'TRUE',
      ],
      [
        'Tony Rangel',
        'Assistant Conductor',
        'Tony Rangel serves as Assistant Conductor, collaborating closely on ensemble preparation and directing one or more pieces on every Kantorei concert program.\n\nAn experienced choral educator and Twin Cities ensemble singer, Tony has directed the choral programs at Columbia Heights and Armstrong high schools, currently leads the choral program at Stillwater Middle School, and authors graduate-level music education courses through Forward Motion Online Learning.',
        '2',
        '',
        '/images/leadership/tony-rangel.webp',
        'TRUE',
      ],
      [
        'Dr. Axel Theimer',
        'Founder & Artistic Director Emeritus',
        'Born in St. Johann in Tirol, Austria, and trained in the Vienna Choir Boys before earning his MFA and DMA at the University of Minnesota, Dr. Axel Theimer founded Kantorei in 1988.\n\nDirector of Choral Activities at the College of Saint Benedict and Saint John’s University for 52 years, founder of the Amadeus Chamber Symphony, Music Director of the National Catholic Youth Choir, and Executive Director of The VoiceCare Network, Dr. Theimer is a recipient of the ACDA-MN Choir Director of the Year Award (2001), MMEA Hall of Fame induction (2004), and the F. Melius Christiansen Lifetime Achievement Award (2011).',
        '3',
        '',
        '/images/leadership/axel-theimer.webp',
        'TRUE',
      ],
    ],
    validations: [
      {
        column: 'Active',
        options: ['TRUE', 'FALSE'],
        message: 'Select TRUE or FALSE',
      },
    ],
  },
  Giving_Tiers: {
    headers: ['Tier_Name', 'Amount_Range', 'Description', 'Order', 'Active'],
    sampleRows: [
      [
        'Friends of Kantorei',
        '$25 – $99',
        'Supports music licensing and recognition in our concert programs.',
        '1',
        'TRUE',
      ],
      [
        'Chorister Circle',
        '$100 – $249',
        'Helps keep participation free of mandatory singer dues and folder fees.',
        '2',
        'TRUE',
      ],
      [
        'Recording & Outreach Patron',
        '$250 – $499',
        'Advances worldwide digital recordings and community choral partnerships.',
        '3',
        'TRUE',
      ],
      [
        'Director’s Circle',
        '$500+',
        'Underwrites living composer commissions, guest collaborators, and touring.',
        '4',
        'TRUE',
      ],
    ],
    validations: [
      {
        column: 'Active',
        options: ['TRUE', 'FALSE'],
        message: 'Select TRUE or FALSE',
      },
    ],
  },
  Media: {
    headers: ['Media_ID', 'Title', 'Subtitle', 'YouTube_URL', 'Category', 'Description'],
    sampleRows: [],
    validations: [
      {
        column: 'Category',
        options: ['Concert Video', 'Featured Recording', 'Album & Lyric Video'],
        message: 'Select a category or enter custom text',
      },
    ],
  },
  Seating_Charts: {
    headers: [
      'Chart_ID',
      'Season',
      'Concert_Slug',
      'Title',
      'Description',
      'Status',
      'Layout_JSON',
      'Created_At',
      'Updated_At',
    ],
    sampleRows: [],
    validations: [
      {
        column: 'Status',
        options: ['Draft', 'Published'],
        message: 'Select seating chart status (Draft, Published)',
      },
    ],
  },
  Snacks: {
    headers: ['Event_ID', 'Slot', 'Singer_Name', 'Item', 'Updated_At'],
    sampleRows: [],
    validations: [
      {
        column: 'Slot',
        options: ['1', '2', '3', '4'],
        message: 'Select snack slot (1, 2, 3, 4)',
      },
    ],
  },
  Subscribers: {
    headers: ['Timestamp', 'Email', 'Name', 'Source', 'Status'],
    sampleRows: [
      [
        '2026-10-15T14:22:00.000Z',
        'patron@example.com',
        'Eleanor Vance',
        'Website_Footer',
        'Active',
      ],
      [
        '2026-10-28T19:10:00.000Z',
        'choralfan@gmail.com',
        'David Miller',
        'Ticket_Tailor',
        'Active',
      ],
    ],
    validations: [
      {
        column: 'Status',
        options: ['Active', 'Unsubscribed'],
        message: 'Select subscriber status (Active, Unsubscribed)',
      },
    ],
  },
  Messages: {
    headers: [
      'Message_ID',
      'Timestamp',
      'From_Name',
      'From_Email',
      'Subject',
      'Body_Text',
      'Category',
      'Pinned',
      'Status',
      'Thread_ID',
    ],
    sampleRows: [
      [
        'msg-2026-11-07-saturday-notes',
        '2026-11-07T16:15:00.000Z',
        'Adam Reinwald',
        'adam.reinwald@kantorei.net',
        'Quick notes for a Saturday — Sunday Rehearsal Setlist & Small Groups',
        `Hello folks,

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
        'Rehearsal_Notes',
        'TRUE',
        'Pinned',
        'thread-2026-11-07-saturday-notes',
      ],
    ],
    validations: [
      {
        column: 'Category',
        options: [
          'Rehearsal_Notes',
          'Part_Assignments',
          'Logistics',
          'Announcement',
          'Discussion',
        ],
        message: 'Select dispatch category',
      },
      {
        column: 'Pinned',
        options: ['TRUE', 'FALSE'],
        message: 'Pin dispatch to top of bulletin board (TRUE / FALSE)',
      },
      {
        column: 'Status',
        options: ['Published', 'Pinned', 'Archived'],
        message: 'Select dispatch visibility status',
      },
    ],
  },
};

if (!clientEmail || !privateKeyRaw || !sheetId || sheetId === 'DEMO') {
  console.log('ℹ️   Running in DEMO mode or missing Google credentials.');
  console.log('   Here is the canonical schema layout for the Choir Google Sheet:\n');
  for (const [tab, spec] of Object.entries(SCHEMA_SPEC)) {
    console.log(`   📄 [${tab}]`);
    console.log(`      Columns: ${spec.headers.join(', ')}`);
    if (spec.validations && spec.validations.length > 0) {
      for (const v of spec.validations) {
        console.log(`      🔘 Dropdown on "${v.column}": [${v.options.join(', ')}]`);
      }
    }
    console.log('');
  }
  console.log('Set your credentials in .env to provision live sheets automatically.\n');
  process.exit(0);
}

async function getAccessToken() {
  const normalizedPem = privateKeyRaw.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(normalizedPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errText}`);
  }

  const payload = await res.json();
  return payload.access_token;
}

async function run() {
  try {
    process.stdout.write('🔑 Authenticating with Google Cloud...');
    const token = await getAccessToken();
    console.log(' Connected!\n');

    console.log(`🔍 Inspecting Google Spreadsheet ID: ${sheetId}...`);
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Failed to read spreadsheet metadata (${metaRes.status}): ${errText}`);
    }

    const meta = await metaRes.json();
    console.log(`   Spreadsheet Title: "${meta.properties?.title || 'Choir Sheet'}"`);

    const existingSheets = meta.sheets || [];
    const sheetMap = new Map();
    for (const s of existingSheets) {
      sheetMap.set(s.properties.title, s.properties.sheetId);
    }

    console.log(`   Existing Tabs: ${Array.from(sheetMap.keys()).join(', ')}\n`);

    for (const [tabName, spec] of Object.entries(SCHEMA_SPEC)) {
      if (!sheetMap.has(tabName)) {
        console.log(`➕ Creating missing tab [${tabName}]...`);

        // 1. Add sheet
        const addRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: tabName,
                      gridProperties: {
                        frozenRowCount: 1,
                      },
                    },
                  },
                },
              ],
            }),
          }
        );

        if (!addRes.ok) {
          console.error(`   ⚠️ Failed to create sheet [${tabName}]:`, await addRes.text());
          continue;
        }

        // 2. Write headers & default rows
        const valuesToWrite = [spec.headers, ...(spec.sampleRows || [])];
        const writeRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
            `${tabName}!A1`
          )}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${tabName}!A1`,
              majorDimension: 'ROWS',
              values: valuesToWrite,
            }),
          }
        );

        if (writeRes.ok) {
          console.log(`   ✅ Created [${tabName}] with ${spec.headers.length} canonical headers.`);
        }
      } else {
        // Tab exists: check headers
        const headRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
            `${tabName}!A1:Z1`
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (headRes.ok) {
          const headData = await headRes.json();
          const currentHeaders = headData.values?.[0] || [];
          const missing = spec.headers.filter(
            (h) => !currentHeaders.some((ch) => ch.trim().toLowerCase() === h.toLowerCase())
          );

          if (missing.length === 0) {
            console.log(`✅ [${tabName}] is healthy (all ${spec.headers.length} headers present).`);
          } else {
            console.log(`⚠️  [${tabName}] is missing columns: ${missing.join(', ')}`);
            // Non-destructively append missing column headers to row 1
            const updatedHeaders = [...currentHeaders, ...missing];
            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
                `${tabName}!A1`
              )}?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  range: `${tabName}!A1`,
                  majorDimension: 'ROWS',
                  values: [updatedHeaders],
                }),
              }
            );
            console.log(`   ✅ Appended missing columns to [${tabName}].`);
          }
        }
      }
    }

    // Refresh sheet metadata so we have updated sheet IDs for newly created tabs
    const refreshedMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const refreshedMeta = await refreshedMetaRes.json();
    const updatedSheetMap = new Map();
    for (const s of refreshedMeta.sheets || []) {
      updatedSheetMap.set(s.properties.title, s.properties.sheetId);
    }

    console.log('\n🔽 Provisioning In-Cell Dropdowns & Data Validation Rules...');
    const validationRequests = [];

    for (const [tabName, spec] of Object.entries(SCHEMA_SPEC)) {
      if (!spec.validations || spec.validations.length === 0) continue;
      const targetSheetId = updatedSheetMap.get(tabName);
      if (targetSheetId === undefined) continue;

      const headRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
          `${tabName}!A1:Z1`
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!headRes.ok) continue;
      const headData = await headRes.json();
      const currentHeaders = (headData.values?.[0] || []).map((h) => h.trim().toLowerCase());

      for (const v of spec.validations) {
        const colIdx = currentHeaders.indexOf(v.column.trim().toLowerCase());
        if (colIdx === -1) {
          console.warn(`   ⚠️ Column "${v.column}" not found in [${tabName}], skipping validation.`);
          continue;
        }

        validationRequests.push({
          tabName,
          column: v.column,
          optionCount: v.options.length,
          request: {
            setDataValidation: {
              range: {
                sheetId: targetSheetId,
                startRowIndex: 1, // Row 2 downward (skipping header row 0)
                startColumnIndex: colIdx,
                endColumnIndex: colIdx + 1,
              },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: v.options.map((opt) => ({ userEnteredValue: opt })),
                },
                inputMessage: v.message,
                strict: false,
                showCustomUi: true,
              },
            },
          },
        });
      }
    }

    if (validationRequests.length > 0) {
      const batchRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: validationRequests.map((vr) => vr.request),
          }),
        }
      );

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        console.error(`   ⚠️ Failed to apply dropdown validation rules: ${errText}`);
      } else {
        for (const vr of validationRequests) {
          console.log(`   🔘 [${vr.tabName}] Dropdown configured for "${vr.column}" (${vr.optionCount} options)`);
        }
        console.log(`   ✅ Successfully configured ${validationRequests.length} interactive dropdown rules!`);
      }
    }

    // Harmonize legacy 'TRUE' values in Roster to 'Active' for clean dropdown display
    try {
      const rosterRowsRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
          'Roster!A2:G'
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (rosterRowsRes.ok) {
        const rosterRows = (await rosterRowsRes.json()).values || [];
        let needsUpdate = false;
        const patchedRows = rosterRows.map((r) => {
          if (r[6] === 'TRUE' || r[6] === 'true') {
            needsUpdate = true;
            const copy = [...r];
            copy[6] = 'Active';
            return copy;
          }
          return r;
        });

        if (needsUpdate) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
              'Roster!A2:G'
            )}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                range: 'Roster!A2:G',
                majorDimension: 'ROWS',
                values: patchedRows,
              }),
            }
          );
          console.log('\n✨ Harmonized existing Roster active rows to display the "Active" dropdown pill.');
        }
      }
    } catch (harmonizeErr) {
      console.warn('   ⚠️ Could not harmonize existing Roster rows:', harmonizeErr.message);
    }

    // Non-destructively harmonize Config tab with Column C (Description) and any missing canonical keys
    try {
      const configRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
          'Config!A1:C'
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (configRes.ok) {
        const configData = await configRes.json();
        const configValues = configData.values || [];
        const currentHeaders = configValues[0] || [];
        const dataRows = configValues.slice(1);

        // 1. Ensure Header row has Column C: 'Description / Where It Appears'
        if (currentHeaders.length < 3 || !currentHeaders[2]?.toLowerCase().includes('description')) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
              'Config!C1'
            )}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                range: 'Config!C1',
                majorDimension: 'ROWS',
                values: [['Description / Where It Appears']],
              }),
            }
          );
          console.log('   ✅ Added "Description / Where It Appears" column header to [Config].');
        }

        // 2. Build map of existing keys and their row indices
        const existingKeyMap = new Map();
        dataRows.forEach((row, idx) => {
          const key = (row[0] || '').trim();
          if (key) {
            existingKeyMap.set(key.toLowerCase(), { rowIndex: idx + 2, row });
          }
        });

        // 3. For existing keys, fill in missing descriptions; for missing keys, collect to append
        const updateBatch = [];
        const rowsToAppend = [];

        for (const [key, defVal, desc] of SCHEMA_SPEC.Config.sampleRows) {
          const existing = existingKeyMap.get(key.toLowerCase());
          if (!existing) {
            rowsToAppend.push([key, defVal, desc]);
          } else {
            // If Support_Matching_Blurb doesn't have dynamic tokens yet, upgrade it
            if (key === 'Support_Matching_Blurb' && existing.row[1] && !existing.row[1].includes('{')) {
              updateBatch.push({
                range: `Config!B${existing.rowIndex}:C${existing.rowIndex}`,
                values: [[defVal, desc]],
              });
            } else if (!existing.row[2] || existing.row[2].trim() === '' || existing.row[2] !== desc) {
              // Update description to keep admin notes fresh
              updateBatch.push({
                range: `Config!C${existing.rowIndex}`,
                values: [[desc]],
              });
            }
          }
        }

        if (updateBatch.length > 0) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                valueInputOption: 'USER_ENTERED',
                data: updateBatch,
              }),
            }
          );
          console.log(`\n✨ Annotated ${updateBatch.length} existing [Config] keys with admin location descriptions.`);
        }

        if (rowsToAppend.length > 0) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
              'Config!A:C'
            )}:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                majorDimension: 'ROWS',
                values: rowsToAppend,
              }),
            }
          );
          console.log(`✨ Added ${rowsToAppend.length} missing canonical keys (newsletter, blurbs, copy) to [Config].`);
        }

        // 4. Format Config column widths and enable text wrapping for readability
        const configSheetId = updatedSheetMap.get('Config');
        if (configSheetId !== undefined) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                requests: [
                  {
                    updateDimensionProperties: {
                      range: {
                        sheetId: configSheetId,
                        dimension: 'COLUMNS',
                        startIndex: 0,
                        endIndex: 1,
                      },
                      properties: { pixelSize: 240 },
                      fields: 'pixelSize',
                    },
                  },
                  {
                    updateDimensionProperties: {
                      range: {
                        sheetId: configSheetId,
                        dimension: 'COLUMNS',
                        startIndex: 1,
                        endIndex: 3,
                      },
                      properties: { pixelSize: 460 },
                      fields: 'pixelSize',
                    },
                  },
                  {
                    repeatCell: {
                      range: {
                        sheetId: configSheetId,
                        startRowIndex: 1,
                        startColumnIndex: 1,
                        endColumnIndex: 3,
                      },
                      cell: {
                        userEnteredFormat: {
                          wrapStrategy: 'WRAP',
                        },
                      },
                      fields: 'userEnteredFormat.wrapStrategy',
                    },
                  },
                ],
              }),
            }
          );
          console.log('✨ Configured [Config] column widths (240px key, 460px value & notes) and word wrapping.');
        }
      }
    } catch (configHarmonizeErr) {
      console.warn('   ⚠️ Could not harmonize Config tab:', configHarmonizeErr.message);
    }

    // Optionally synchronize full canonical Roster rows to Choir Sheet (--sync-roster)
    if (process.argv.includes('--sync-roster')) {
      try {
        console.log('\n👥 Synchronizing full canonical Roster to Choir Sheet...');
        // Clear old rows first to avoid trailing stale entries
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
            'Roster!A2:G'
          )}:clear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const syncRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
            'Roster!A2:G'
          )}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: 'Roster!A2:G',
              majorDimension: 'ROWS',
              values: SCHEMA_SPEC.Roster.sampleRows,
            }),
          }
        );
        if (syncRes.ok) {
          console.log(`   ✅ Wrote ${SCHEMA_SPEC.Roster.sampleRows.length} active singers to [Roster]!`);
        } else {
          console.error('   ⚠️ Failed to sync roster rows:', await syncRes.text());
        }
      } catch (syncErr) {
        console.error('   ⚠️ Error synchronizing roster:', syncErr.message);
      }
    }

    console.log('\n======================================================');
    console.log('🎉 Google Sheet Schema & Dropdown Provisioning Complete!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Provisioning failed:', err.message);
    process.exit(1);
  }
}

run();
