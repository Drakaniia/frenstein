/**
 * The letter — verbatim from `concept/src/components/HoverMouse.tsx` (spec 16.7,
 * master spec §3.3 + §12). This is a copy task: do not "improve" the prose.
 *
 * The heading, 8 body paragraphs and the signature are reproduced exactly.
 */

export interface Letter {
  heading: string;
  paragraphs: string[];
  signature: string;
}

export const LETTER: Letter = {
  heading: 'Happy 21st Birthday, Frenstein!',
  paragraphs: [
    "It's hard to believe how many stories have already been written on every page of your chapter. Even though not every moment is a good one, each experience\u2014both joyful and painful\u2014has shaped who you are today. Life doesn't always follow the path we expect, but every obstacle you've faced has added depth to your story and strength to your heart.",
    'As the poem says, "Don\'t overthink yet\u2014you\'ll succeed in your goals." Those words remind me that even when life feels uncertain, education will always be a light that guides us toward a better future. It teaches us that a degree is not just a piece of paper, but a symbol of our hard work, sleepless nights, and faith in ourselves. We may face doubt, fear, and even moments of exhaustion, but the journey of learning shapes who we are and who we will become.',
    "My sincere apology for the days I wasn't by your side, or when I was too stubborn to understand. Especially last year on your birthday\u2014I didn't even give you anything, not even a simple gesture to show how much I cared. I know there were times when my attitude hurt you, when my actions made you upset, and for that, I'm truly sorry.",
    'I never meant to make you feel unappreciated or unloved. Sometimes I get lost in my own thoughts and forget how my silence or mistakes can affect others. But please know that deep down, I\'ve always valued you and the moments we\'ve shared.',
    "I can't change the past, but I can promise to be better\u2014to listen more, to care more, and to show more of the gratitude you deserve. I'm hoping that you'll still forgive me, still see the good in me, and still believe that I'm trying my best to grow and make things right.",
    'But here we are today. I wish I could be by your side right now\u2014to look at you and show you just how lucky I am to have you in my life. Every moment with you feels like a reminder that even in the most ordinary days, love can make everything brighter.',
    "Remember that you are deeply loved, cherished, and supported in every step you take. You've touched my life in ways words can hardly express, and I'll always be grateful for that.",
    'May this year bring you endless happiness, success, and everything your heart desires. You deserve nothing less than the best that life can offer. And no matter where we are or how far apart we may be, my thoughts and care will always find their way to you.',
  ],
  signature: 'With all my love and best wishes! \u2665',
};

/** Total characters, computed once (spec 16.10 — the status bar count). */
export const LETTER_CHAR_COUNT = (() => {
  const body = [LETTER.heading, ...LETTER.paragraphs, LETTER.signature].join('\n\n');
  return body.length;
})();

export const LETTER_TEXT = [LETTER.heading, ...LETTER.paragraphs, LETTER.signature].join('\n\n');
