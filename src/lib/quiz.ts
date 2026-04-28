// Job-assignment quiz. Each option awards weighted points to one or more
// archetypes. The highest scoring archetype determines the starter job.

export type Archetype = "warrior" | "mage" | "rogue" | "cleric" | "support";

export type QuizOption = {
  id: string;
  label: string;
  weights: Partial<Record<Archetype, number>>;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
};

export const QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "初めて剣を握ったとき、あなたが感じたのは？",
    options: [
      { id: "a", label: "確かな力強さ。これは自分の役目だと思った。", weights: { warrior: 2 } },
      { id: "b", label: "重みへの違和感。もっと別のやり方がある気がした。", weights: { rogue: 1, mage: 1 } },
      { id: "c", label: "静かな緊張。誰かを守るためなら振るえる、と。", weights: { cleric: 2 } },
      { id: "d", label: "既視感。古い物語の中で、自分が剣を握る場面を読んだ気がした。", weights: { mage: 2 } },
      { id: "e", label: "苦笑。剣じゃなく、歌や言葉のほうが似合うのに。", weights: { support: 2 } },
    ],
  },
  {
    id: "q2",
    prompt: "夜の街道で、傷ついた旅人と出会った。あなたが最初にすることは？",
    options: [
      { id: "a", label: "周囲を警戒する。まだ襲撃者が近くにいるかもしれない。", weights: { warrior: 1, rogue: 1 } },
      { id: "b", label: "傷の状態を確かめ、応急手当に取りかかる。", weights: { cleric: 2 } },
      { id: "c", label: "相手の身なりや言葉から事情を読む。嘘の可能性を疑う。", weights: { rogue: 2 } },
      { id: "d", label: "詠唱の準備をする。何が来ても対応できるように。", weights: { mage: 2 } },
      { id: "e", label: "落ち着かせる言葉と、軽い歌を口ずさむ。", weights: { support: 2 } },
    ],
  },
  {
    id: "q3",
    prompt: "あなたが最も恐れるものは？",
    options: [
      { id: "a", label: "目の前の誰かを守れないこと。", weights: { warrior: 1, cleric: 2 } },
      { id: "b", label: "知らないままでいること。", weights: { mage: 2 } },
      { id: "c", label: "嘘を見抜けないこと。", weights: { rogue: 2 } },
      { id: "d", label: "退屈。何も起きない日々。", weights: { support: 2, rogue: 1 } },
      { id: "e", label: "自分が信じたものが間違っていたと知ること。", weights: { cleric: 1, mage: 1 } },
    ],
  },
  {
    id: "q4",
    prompt: "目の前の高い壁を越えなければならない。どうする？",
    options: [
      { id: "a", label: "助走をつけて体当たりで崩す。", weights: { warrior: 2 } },
      { id: "b", label: "詠唱で吹き飛ばす。", weights: { mage: 2 } },
      { id: "c", label: "横の抜け道を探す。たいてい誰かが通った跡がある。", weights: { rogue: 2 } },
      { id: "d", label: "壁の前で祈る。なぜそこに壁があるのかから考える。", weights: { cleric: 2 } },
      { id: "e", label: "通りすがりの人に手を借りる。歌と話術はあるから。", weights: { support: 2 } },
    ],
  },
  {
    id: "q5",
    prompt: "宝箱を見つけた。鍵は無く、ただ古い文字で「最後の者は何を選んだのか」と彫られている。",
    options: [
      { id: "a", label: "考えるより先に開ける。罠なら受け止める。", weights: { warrior: 2 } },
      { id: "b", label: "彫られた文字の出典を辿ってから判断する。", weights: { mage: 2 } },
      { id: "c", label: "周囲の足跡や埃の付き方を観察してから手を伸ばす。", weights: { rogue: 2 } },
      { id: "d", label: "祈ってから、慎重に開ける。", weights: { cleric: 2 } },
      { id: "e", label: "仲間に開けてもらう。自分は見届けたい。", weights: { support: 2 } },
    ],
  },
  {
    id: "q6",
    prompt: "あなたが人生で最も大切にしたいものは？",
    options: [
      { id: "a", label: "強さ。誰にも譲れない、自分の在り方。", weights: { warrior: 2 } },
      { id: "b", label: "真理。世界の隠された理由を知りたい。", weights: { mage: 2 } },
      { id: "c", label: "自由。誰にも縛られない選択肢。", weights: { rogue: 2 } },
      { id: "d", label: "信頼。人と人のあいだに生まれる絆。", weights: { cleric: 2 } },
      { id: "e", label: "喜び。誰かが笑う瞬間を増やしたい。", weights: { support: 2 } },
    ],
  },
];

const ARCHETYPE_TO_JOB: Record<Archetype, string> = {
  warrior: "見習い戦士",
  mage: "見習い魔導士",
  rogue: "見習い盗賊",
  cleric: "見習い神官",
  support: "見習い吟遊詩人",
};

export function scoreQuiz(answers: Record<string, string>): {
  scores: Record<Archetype, number>;
  topArchetype: Archetype;
  jobName: string;
} {
  const scores: Record<Archetype, number> = {
    warrior: 0,
    mage: 0,
    rogue: 0,
    cleric: 0,
    support: 0,
  };
  for (const q of QUIZ) {
    const chosenId = answers[q.id];
    const opt = q.options.find((o) => o.id === chosenId);
    if (!opt) continue;
    for (const [k, v] of Object.entries(opt.weights)) {
      scores[k as Archetype] += v as number;
    }
  }
  // tie-break order
  const ORDER: Archetype[] = ["warrior", "mage", "rogue", "cleric", "support"];
  let top: Archetype = ORDER[0];
  for (const a of ORDER) if (scores[a] > scores[top]) top = a;
  return { scores, topArchetype: top, jobName: ARCHETYPE_TO_JOB[top] };
}

const BIO_TEMPLATES: Record<Archetype, string[]> = {
  warrior: [
    "幼い頃に村を襲った獣を、年老いた剣士に救われた。剣を取った理由は、その日の景色を二度と見たくないから。",
    "戦災で生き残った最後の家族として育った。人を守るために強くあろうと、誰よりも早く朝の鍛錬を始める。",
  ],
  mage: [
    "図書室の埃を吸って育った子供だった。一度読み始めた書を閉じられず、星と元素の理に手を伸ばしてしまった。",
    "夜空に広がる名のない星座を毎晩数えて、自分だけの真理を組み立て続けている。",
  ],
  rogue: [
    "親に捨てられ、街路の影で生きてきた。誰も信じない代わりに、誰よりも早く嘘を見抜く目を得た。",
    "華やかな祝祭の裏側で、誰にも気付かれない仕事を続けてきた。報酬よりも、誰かの計算外でいることを愛している。",
  ],
  cleric: [
    "幼い妹を熱病で失った。それ以来、目の前で誰かを失わないと誓い、祈り続けている。",
    "孤児院で育てられ、自分を救ってくれた老神官の最後の願いを継いだ。",
  ],
  support: [
    "旅芸人の一座で生まれ、文字よりも先に歌を覚えた。世界のどこに行っても、唄える場所が家になる。",
    "戦場で兵士たちの心が砕ける瞬間を見てきた。剣ではなく、心を救う側に回ろうと決めた。",
  ],
};

export function pickBio(archetype: Archetype): string {
  const arr = BIO_TEMPLATES[archetype];
  return arr[Math.floor(Math.random() * arr.length)];
}
