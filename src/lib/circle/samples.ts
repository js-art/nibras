import type { LocaleText } from "@/data/atlas";

export type SampleProfile = {
  id: string;
  handle: string;
  displayName: string;
  role: "agent" | "investor";
  bio: string;
  city: string;
  focus: string;
};

export type SamplePost = {
  id: string;
  authorId: string;
  projectId: string | null;
  kind: "note" | "reading" | "ask" | "desk";
  visibility: "circle" | "followers";
  createdAt: string;
  body: LocaleText;
};

export type SampleComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

const text = (en: string, ar: string, fa: string): LocaleText => ({ en, ar, fa });

/** Labeled sample desks. Figures in their notes are readings, not yields. */
export const sampleProfiles: SampleProfile[] = [
  {
    id: "circle-layla",
    handle: "layla",
    displayName: "Layla Nasser",
    role: "agent",
    city: "Dubai",
    focus: "Business Bay, Creek Harbour",
    bio: "I read a project against the map before I talk about handover. Sample desk.",
  },
  {
    id: "circle-omar",
    handle: "omar",
    displayName: "Omar Haddad",
    role: "agent",
    city: "Dubai",
    focus: "JVC, Dubai South",
    bio: "First allocations, where the starting price sits under the coast. Sample desk.",
  },
  {
    id: "circle-nour",
    handle: "nour",
    displayName: "Nour Al Busaidi",
    role: "agent",
    city: "Muscat",
    focus: "Muscat and Sohar, in rial",
    bio: "The Oman book is quieter. I keep the rial next to the brief. Sample desk.",
  },
  {
    id: "circle-hessa",
    handle: "hessa",
    displayName: "Hessa Al Mansoori",
    role: "investor",
    city: "Abu Dhabi",
    focus: "A two-bed that can be read from handover",
    bio: "I am reading, not buying on this page. Sample investor.",
  },
  {
    id: "circle-karim",
    handle: "karim",
    displayName: "Karim El Sayed",
    role: "investor",
    city: "Dubai",
    focus: "Villas, a longer hold",
    bio: "I want the street and the light, then the price. Sample investor.",
  },
  {
    id: "circle-mina",
    handle: "mina",
    displayName: "Mina Farhadi",
    role: "investor",
    city: "Sharjah",
    focus: "A first dirham allocation",
    bio: "Looking for the gentlest entry in the Emirates book. Sample investor.",
  },
];

export const sampleFollows: ReadonlyArray<readonly [string, string]> = [
  ["circle-hessa", "circle-layla"],
  ["circle-hessa", "circle-omar"],
  ["circle-karim", "circle-nour"],
  ["circle-karim", "circle-layla"],
  ["circle-mina", "circle-omar"],
  ["circle-layla", "circle-hessa"],
  ["circle-omar", "circle-mina"],
  ["circle-nour", "circle-karim"],
];

export const samplePosts: SamplePost[] = [
  {
    id: "post-layla-creek",
    authorId: "circle-layla",
    projectId: "creek-atelier",
    kind: "reading",
    visibility: "circle",
    createdAt: "2026-11-10T08:00:00.000Z",
    body: text(
      "Creek Atelier is still a reading, not a finished street. I would walk the handover brief with @hessa before anyone talks about rent. #creek",
      "كريک أتيليه ما زال قراءة، لا شارعاً مكتملاً. أمشي شرح التسليم مع @hessa قبل أن يتحدث أحد عن الإيجار. #creek",
      "کریک آتلیه هنوز یک خوانش است، نه خیابانی تمام‌شده. شرح تحویل را با @hessa قدم می‌زنم پیش از آنکه کسی از اجاره حرف بزند. #creek",
    ),
  },
  {
    id: "post-layla-held",
    authorId: "circle-layla",
    projectId: "creek-atelier",
    kind: "desk",
    visibility: "followers",
    createdAt: "2026-11-12T11:30:00.000Z",
    body: text(
      "Holding the payment sheet next to the map before I answer Hessa. The first slice on the sample sheet is a reading, not a promise. #creek",
      "أُبقي ورقة الدفع بجانب الخريطة قبل أن أجيب حصة. الشريحة الأولى في الورقة النموذجية قراءة لا وعد.",
      "برگهٔ پرداخت را کنار نقشه نگه داشته‌ام پیش از جواب به حصه. قسط اول در برگهٔ نمونه یک خوانش است، نه قول. #creek",
    ),
  },
  {
    id: "post-omar-south",
    authorId: "circle-omar",
    projectId: "southlight",
    kind: "desk",
    visibility: "circle",
    createdAt: "2026-11-11T09:15:00.000Z",
    body: text(
      "Southlight is the card I open first when the brief is a gentler dirham entry. The street is the long wait. Sample note, not a live allocation. #south @mina",
      "ساوثلايت هي البطاقة التي أفتحها أولاً حين يكون الشرح دخولاً أهدأ بالدرهم. الشارع هو الانتظار الطويل. ملاحظة نموذجية، لا تخصيصاً حياً. #south @mina",
      "خانهٔ نور جنوب کارتی است که اول باز می‌کنم وقتی شرح، ورود آرام‌تر به درهم است. خیابان همان انتظار بلند است. یادداشت نمونه است، نه تخصیص زنده. #south @mina",
    ),
  },
  {
    id: "post-nour-bahr",
    authorId: "circle-nour",
    projectId: "bahr-house",
    kind: "reading",
    visibility: "circle",
    createdAt: "2026-11-09T07:40:00.000Z",
    body: text(
      "Bahr House stays in rial. I read it as a longer hold on the Muscat coast, and I do not convert it into dirham to make the number look familiar. #muscat @karim",
      "بيت البحر يبقى بالريال. أقرأه كاحتفاظ أطول على ساحل مسقط، ولا أحوّله إلى درهم كي يبدو الرقم مألوفاً. #muscat @karim",
      "خانهٔ بحر به ریال می‌ماند. آن را نگه‌داشت بلندتر در ساحل مسقط می‌خوانم و به درهم تبدیل نمی‌کنم تا عدد آشنا به نظر برسد. #muscat @karim",
    ),
  },
  {
    id: "post-hessa-ask",
    authorId: "circle-hessa",
    projectId: "creek-atelier",
    kind: "ask",
    visibility: "circle",
    createdAt: "2026-11-12T10:05:00.000Z",
    body: text(
      "@layla which page of the Creek Atelier brief should I read first if I want a two-bed that can be understood from handover? I am still only reading. #creek",
      "@layla أي صفحة من شرح كريك أتيليه أقرأها أولاً إن أردت غرفتين تُفهم من التسليم؟ ما زلت أقرأ فقط. #creek",
      "@layla کدام صفحه از شرح کریک آتلیه را اول بخوانم اگر دوخوابه‌ای می‌خواهم که از روز تحویل فهمیده شود؟ هنوز فقط دارم می‌خوانم. #creek",
    ),
  },
  {
    id: "post-karim-palm",
    authorId: "circle-karim",
    projectId: "palm-shade",
    kind: "note",
    visibility: "circle",
    createdAt: "2026-11-08T16:20:00.000Z",
    body: text(
      "Palm Shade keeps the light and makes the beach a walk. That is the trade I want to understand before a longer hold. #palm",
      "ظل النخلة يُبقي الضوء ويجعل الشاطئ مشياً. هذه المقايضة التي أريد فهمها قبل احتفاظ أطول. #palm",
      "سایهٔ نخل نور را نگه می‌دارد و ساحل را پیاده‌روی می‌کند. همین معامله را می‌خواهم پیش از نگه‌داشت بلندتر بفهمم. #palm",
    ),
  },
  {
    id: "post-mina-ask",
    authorId: "circle-mina",
    projectId: "southlight",
    kind: "ask",
    visibility: "circle",
    createdAt: "2026-11-13T13:10:00.000Z",
    body: text(
      "@omar is Southlight the first card you would put in front of someone whose budget is the bottom of the Emirates book? Sample question. #south",
      "@omar هل ساوثلايت أول بطاقة تضعها أمام من ميزانيته أسفل سجل الإمارات؟ سؤال نموذجي. #south",
      "@omar خانهٔ نور جنوب اولین کارتی است که جلوی کسی می‌گذاری که بودجه‌اش ته دفتر امارات است؟ پرسش نمونه. #south",
    ),
  },
  {
    id: "post-nour-sohar",
    authorId: "circle-nour",
    projectId: "sohar-yard",
    kind: "desk",
    visibility: "circle",
    createdAt: "2026-11-07T06:50:00.000Z",
    body: text(
      "Sohar Yard is the quieter page. I would not set it beside a Dubai marina card and pretend they are the same wait. #sohar",
      "ساحة صحار هي الصفحة الأهدأ. لا أضعها بجانب بطاقة مرسى دبي وأتظاهر أن الانتظار واحد. #sohar",
      "حیاط صحار صفحهٔ آرام‌تر است. آن را کنار کارت مارینای دبی نمی‌گذارم و وانمود نمی‌کنم انتظارشان یکی است. #sohar",
    ),
  },
];

export const sampleComments: SampleComment[] = [
  {
    id: "comment-layla-hessa",
    postId: "post-hessa-ask",
    authorId: "circle-layla",
    createdAt: "2026-11-12T12:00:00.000Z",
    body: "Start with the payment sheet and the handover year, then the two-bed line. I will keep the rent talk off this note.",
  },
  {
    id: "comment-omar-mina",
    postId: "post-mina-ask",
    authorId: "circle-omar",
    createdAt: "2026-11-13T15:00:00.000Z",
    body: "Yes — with the street wait written on the same card. It is a reading of this sample book, not today’s market.",
  },
];

export const sampleReactions: ReadonlyArray<readonly [string, string, "useful" | "question" | "watch"]> = [
  ["post-layla-creek", "circle-hessa", "useful"],
  ["post-layla-creek", "circle-karim", "watch"],
  ["post-omar-south", "circle-mina", "question"],
  ["post-nour-bahr", "circle-karim", "useful"],
];
