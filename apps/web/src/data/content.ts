/**
 * OS content + config slot.
 *
 * Every personal string lives here so the owner can rewrite the jokes, notes
 * and names without touching a component. Nothing here reads the network,
 * the file system, or real storage.
 */

export const CONTENT = {
  osName: 'FrenOS XP',
  edition: 'Birthday Edition',
  version: '20.2306',

  /** The account shown on the Welcome screen and the Start menu. */
  user: {
    name: 'Frenstein',
  },

  /**
   * Demo configuration only. This client-side PIN is a simulated lock screen,
   * never real authentication; do not reuse a real credential here.
   */
  pin: '2306',
  loginHint: 'Our special number. (It is 2306.)',

  /**
   * `date` is `'MM-DD'`. It was inferred from the project folder name
   * (`nov_6_…`) — change it if her birthday is another day.
   */
  birthday: {
    label: 'Happy 21st Birthday, Frenstein!',
    date: '11-06' as string | null,
    age: 21,
  },

  /** The POST lines; a soft beep lands with each line. */
  bootLines: [
    'FrenOS Modular BIOS v20.06, An Energy Star Ally',
    'Copyright (C) 2006-2026, Made With Love, Inc.',
    '',
    'Main Processor : HEART-CORE XP @ 2306 MHz',
    'Memory Test    : 2306K OK',
    '',
    'Detecting Primary Master  ... MEMORIES (2,306 MB)',
    'Detecting Primary Slave   ... None',
    'Detecting hearts ........... 1 found (yours)',
    '',
    'Verifying DMI Pool Data .... Update Success',
    'Starting FrenOS XP Birthday Edition ...',
  ],
  bootSkipHint: 'Press any key to skip',

  /** Tray balloon shown shortly after logging on. */
  welcomeBalloon: {
    title: 'Happy Birthday, Frenstein!',
    body: 'This whole computer was made just for you. Click here to open your present.',
  },

  /** Caught a shooting star on the night or sunset wallpaper. */
  wish: {
    title: 'You caught a shooting star!',
    body: 'Close your eyes and make a wish. Mine already came true.',
  },

  /** Up, up, down, down, left, right, left, right, B, A. */
  konami: {
    title: 'Cheat code accepted',
    body: '+\u221e love. Achievement unlocked: Player 2 has entered your heart.',
  },

  /** Typing the name of the famous 2000 email virus on the desktop. */
  virus: {
    title: 'Virus alert: ILOVEYOU',
    message:
      'The ILOVEYOU virus has been detected on this computer!\n\nFile: LOVE-LETTER-FOR-YOU.TXT.vbs\nInfection level: 100%\n\nThere is no cure. Known symptoms include smiling for no reason.',
    confirm: 'Accept infection',
  },

  /** Little notes behind the heart in the tray, shown one at a time. */
  loveNotes: [
    'You make ordinary days feel like something worth remembering.',
    'Your laugh is my favourite sound in the whole world.',
    'I still smile every time your name lights up my phone.',
    'You are my favourite person to do absolutely nothing with.',
    'Every song sounds better when I think of you.',
    'Thank you for being patient with me, even when I am stubborn.',
    'You are stronger than you know and kinder than you realise.',
    'I am proud of you. Today and every day.',
    'If I could, I would give you every sunset in this computer.',
    'No matter how far apart we are, my thoughts always find their way to you.',
    'You are the best thing that ever happened to my heart.',
    'Happy birthday to the girl who makes my whole world brighter.',
  ],

  /** `Reasons I Love You.txt` in Shared Documents. Edit freely. */
  reasons: [
    'Your laugh, especially the one you try to hide.',
    'The way you care about everyone around you.',
    'How brave you are, even on the days you do not feel it.',
    'Your patience with me when I am being stubborn.',
    'The way you make ordinary days feel like an adventure.',
    'How hard you work for your dreams.',
    'Your kindness, which you give away for free.',
    'That you are my favourite person to talk to.',
    'The way you believe in me.',
    'Simply because you are you.',
  ],

  /** `A Wish For You.txt`. */
  wishText: [
    'On your birthday I wish you:',
    '',
    '  * mornings that start slowly and softly,',
    '  * friends who make you laugh until you cry,',
    '  * the courage to chase every goal you set,',
    '  * rest when you are tired, and hope when you are not,',
    '  * and a whole year that is as kind to you as you are to everyone else.',
    '',
    'Happy birthday. I love you.',
  ],

  /** `Love Coupons.txt` in Shared Documents. */
  coupons: [
    'Good for one warm hug, redeemable at any time.',
    'Good for one movie night. You pick the movie, I bring the snacks.',
    'Good for one breakfast in bed.',
    'Good for one long walk, wherever you want to go.',
    "Good for one \"you were right\", no questions asked.",
    'Good for one whole day planned by me.',
  ],

  /** The desktop assistant (a tiny heart with opinions). */
  assistant: {
    name: 'Lovey',
    greeting: 'It looks like it is your birthday! Would you like help celebrating?',
    tips: [
      'Did you know? Typing a certain three-word phrase on the desktop does something special.',
      'Try Start, then Run, and type "love".',
      'The Recycle Bin is full of things you do not need anymore.',
      'Psst. The screen saver has pictures of us.',
      'Click the little heart next to the clock. Then click it again.',
      'Old gamers know a secret code: up, up, down, down, left, right, left, right, B, A.',
      'There is a folder in Shared Documents with your name on it.',
    ],
  },

  /** Hints listed under Help and Support → "Hidden surprises". */
  secrets: [
    { title: 'Blow out the candles', hint: 'Open Happy Birthday! and make a wish.' },
    { title: 'Read the letter', hint: 'Love Letter on the desktop was written just for you.' },
    { title: 'The heart in the tray', hint: 'It always has something to say.' },
    { title: 'A famous virus', hint: 'Type the most famous email virus of 2000 on the desktop. Without spaces.' },
    { title: 'A secret code', hint: 'Up, up, down, down, left, right, left, right, B, A.' },
    { title: 'The Run box', hint: 'Start → Run… → try "love", "cake", or her name.' },
    { title: 'Shared Documents', hint: 'There is a folder in there. It is for you.' },
    { title: 'Make a wish', hint: 'Shooting stars cross the night sky now and then. Click one.' },
  ],

  /** Fixed, warm lies; flavour only. */
  photosFreeSpace: '2,306 MB free',
  myComputer: {
    drive: 'Local Disk (C:)',
    usedPercent: 87,
    capacity: '20.0 GB',
    freeSpace: '2.3 GB',
    spaceLine: 'Free Space: 2,306 MB of love',
  },

  /** These items refuse to come back. That is the joke. */
  trashItems: [
    { id: 'old_doubts', name: 'old_doubts.txt', from: 'C:\\My Heart', deleted: '2026-06-23', kind: 'Text Document', size: '1 KB' },
    { id: 'bad_days', name: 'bad_days.zip', from: 'C:\\My Heart\\Archive', deleted: '2026-06-23', kind: 'Compressed Folder', size: '365 KB' },
    { id: 'fear', name: 'fear.doc', from: 'C:\\My Heart', deleted: '2026-06-23', kind: 'Document', size: '12 KB' },
  ],
  trashRefusal: 'Some things are better left deleted. You do not need this anymore.',
  trashEmptyLine: 'Empty. Nothing left to worry about.',

  about: {
    lines: ['FrenOS XP · Birthday Edition', 'Version 20.2306', 'Built with love'],
    licensedTo: 'Frenstein',
  },

  /**
   * The Music playlist. `file` is the audio file's name (without extension)
   * in `src/assets/audio/`; `cover` is an optional image in the same folder
   * (defaults to `file`). Missing files show up greyed out until added.
   */
  musicPlaylist: [
    { id: 'seven', title: 'seven', artist: 'Taylor Swift', duration: '3:28', file: 'seven', cover: 'cover' },
    { id: 'lover', title: 'Lover', artist: 'Taylor Swift', duration: '3:41', file: 'lover', cover: 'lover' },
    { id: 'the-only-exception', title: 'The Only Exception', artist: 'Paramore', duration: '4:27', file: 'the-only-exception', cover: 'the-only-exception' },
  ],
} as const;

export type Content = typeof CONTENT;
