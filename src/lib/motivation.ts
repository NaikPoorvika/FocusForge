export const QUOTES = [
  "Small steps every day beat giant leaps once in a while.",
  "Discipline is choosing between what you want now and what you want most.",
  "You don't have to be extreme. You just have to be consistent.",
  "Focus on being productive instead of busy.",
  "The secret of getting ahead is getting started.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Motivation gets you going; discipline keeps you growing.",
  "Don't count the days. Make the days count.",
  "Your future is created by what you do today.",
  "The expert in anything was once a beginner.",
  "Push yourself — no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "The pain of discipline is far less than the pain of regret.",
  "You are what you repeatedly do.",
  "One percent better every day.",
];

export const TIPS = [
  "Break big tasks into 25-minute focused sprints.",
  "Turn off notifications for the next hour and go deep.",
  "Review yesterday's journal before starting today.",
  "Study your weakest topic first when your energy is highest.",
  "Sleep is a performance-enhancing drug — protect 7+ hours.",
  "Teach what you learned to lock it in.",
  "Write tomorrow's top task before you sleep.",
  "Two-minute rule: if it takes under 2 minutes, do it now.",
  "Batch similar tasks together to reduce context switching.",
  "Space repetition beats cramming every single time.",
  "A 5-minute walk between sessions resets focus.",
  "Track what you do — you can't improve what you don't measure.",
  "One habit at a time until it sticks.",
  "Solve one new problem every day, no exceptions.",
];

export const FACTS = [
  "It takes the average person 66 days to form a new habit.",
  "You retain about 90% of what you teach to others.",
  "Multitasking can reduce productivity by up to 40%.",
  "The brain consolidates learning most during deep sleep.",
  "Consistent exercisers score higher on cognitive tests.",
  "A cluttered desk correlates with reduced focus.",
  "Blue light exposure delays melatonin release by ~90 minutes.",
  "Deliberate practice — not just repetition — builds real skill.",
  "Writing by hand improves memory of concepts vs typing.",
  "Chewing gum slightly boosts alertness in short bursts.",
];

export const MOTIVATION = [
  "You've already come further than the person who never started.",
  "The version of you six months from now is watching. Make them proud.",
  "Skill is a stack of tiny, boring, repeated actions.",
  "Consistency compounds. Show up again today.",
  "You'll never regret the study session you completed.",
  "Ordinary effort, extraordinary consistency = extraordinary results.",
  "Trust the process. Progress isn't always visible day-to-day.",
  "Every rep, every problem, every page adds up.",
  "The dip is where most people quit. Push through it.",
  "You don't need more time — you need more focus.",
];

export type DailyMotivation = {
  type: "quote" | "tip" | "fact" | "motivation";
  text: string;
};

function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export function dailyMotivation(date = new Date()): DailyMotivation {
  const doy = dayOfYear(date);
  const types: DailyMotivation["type"][] = ["quote", "tip", "fact", "motivation"];
  const type = types[doy % 4];
  const pool = type === "quote" ? QUOTES : type === "tip" ? TIPS : type === "fact" ? FACTS : MOTIVATION;
  return { type, text: pool[doy % pool.length] };
}
