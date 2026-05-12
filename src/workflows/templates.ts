export type Topic = { id: string; label: string; helper?: string };

export type InterviewTemplate = {
  id: TemplateId;
  label: string;
  topics: Topic[];
  qFocuses: string[];
  /** Zero-based indices into topics/qFocuses for the 8 generated questions. Default first 8. */
  questionTopicIndices?: number[];
};

export type TemplateId = "company" | "minister" | "president" | "trade";

export const templateOptions: Array<{ id: TemplateId; label: string }> = [
  { id: "company", label: "Company Executive" },
  { id: "minister", label: "Government Minister" },
  { id: "president", label: "President / Prime Minister / Ambassador" },
  { id: "trade", label: "Trade Organization Leader" }
];

const TEMPLATES: InterviewTemplate[] = [
  {
    id: "company",
    label: "Company Executive",
    questionTopicIndices: [0, 1, 2, 3, 4, 5, 6, 8],
    topics: [
      { id: "t1", label: "Leader's role, vision, recent quote, recent news" },
      { id: "t2", label: "Market perception / reputation management" },
      { id: "t3", label: "Market position and competitive advantage" },
      { id: "t4", label: "Growth drivers" },
      { id: "t5", label: "Synergies with target investor market" },
      { id: "t6", label: "Success story" },
      { id: "t7", label: "Innovation" },
      { id: "t8", label: "Sustainability" },
      { id: "t9", label: "Nation's investment appeal" },
      { id: "t10", label: "Leadership history (previous roles chronological: Company — Role)" }
    ],
    qFocuses: [
      "You were appointed on [date]. How has your vision evolved since then, and which decisions have most defined your tenure?",
      "How do you work to manage your company's reputation, and how do you aim for it to be perceived by investors, partners, and users in [media country]?",
      "How do you describe your market position and key competitive advantages over other players in the sector?",
      "What are the drivers of this growth, and how are you taking advantage of it?",
      "What specific investment opportunities of your company would you highlight to [media country]-based investors, partners and clients?",
      "What aspects of your operations do you believe were most instrumental in achieving this recognition?",
      "How does this demonstrate your approach towards innovation?",
      "How does this demonstrate your approach towards sustainability?",
      "What is your message to investors from [media country] about why now is the time to invest in [country]?",
      "How have these past experiences shaped your leadership style?"
    ]
  },
  {
    id: "minister",
    label: "Government Minister",
    topics: [
      { id: "t1", label: "Vision and key decisions shaping the sector" },
      { id: "t2", label: "Sector importance to the national economy" },
      { id: "t3", label: "Sector attractiveness to investors from the media partner country" },
      { id: "t4", label: "Ministry role in facilitating foreign direct investment" },
      { id: "t5", label: "Competitive advantage of the country in the sector" },
      { id: "t6", label: "Sector growth potential" },
      { id: "t7", label: "Innovation / technology / sustainability initiatives" },
      { id: "t8", label: "Exports or sector expansion" },
      { id: "t9", label: "Managing international perceptions of the sector" },
      { id: "t10", label: "Biography and previous leadership roles (chronological only)" }
    ],
    qFocuses: [
      "What is your vision for the sector, and what key priorities are being advanced to position it as a cornerstone of [country]'s long-term economic development?",
      "How do you assess the sector's current contribution to national growth and its wider role in the economy?",
      "What specific opportunities or partnership models would you highlight for [media country]-based investors seeking to participate in [country]'s sector?",
      "How is the Ministry strengthening regulatory frameworks, incentives, and international cooperation mechanisms to attract greater foreign direct investment from partners such as [media country]?",
      "What gives [country] a competitive advantage in this sector compared to regional peers?",
      "What are the most significant growth opportunities emerging in this sector over the next three to five years?",
      "What innovation, technology, or sustainability initiatives is the Ministry driving within the sector?",
      "How is the Ministry working to expand exports and grow the sector's international footprint?",
      "What is the Ministry doing to strengthen [country]'s international reputation in this sector?",
      "How have your previous roles shaped your approach to leading this ministry?"
    ]
  },
  {
    id: "president",
    label: "President / Prime Minister / Ambassador",
    /** Eight questions: national vision through growth, then export and international perception (Template C order; innovation topic researched but not asked). */
    questionTopicIndices: [0, 1, 2, 3, 4, 5, 7, 8],
    topics: [
      { id: "t1", label: "Vision and major national decisions shaping economic direction" },
      { id: "t2", label: "Bilateral relations with the media partner country" },
      { id: "t3", label: "Bilateral trade and foreign direct investment opportunities" },
      { id: "t4", label: "Policies facilitating foreign investment" },
      { id: "t5", label: "Competitive advantage of the country" },
      { id: "t6", label: "Economic growth potential" },
      { id: "t7", label: "Innovation / technology / sustainability strategy" },
      { id: "t8", label: "Export strategy" },
      { id: "t9", label: "Managing international perceptions of the country" },
      { id: "t10", label: "Biography and previous leadership roles (chronological only)" }
    ],
    qFocuses: [
      "What is your vision for [country]'s economic development, and what decisions have most defined this direction?",
      "How do you assess the current state of bilateral relations between [country] and [media country], and where do you see the greatest opportunities for growth?",
      "What specific trade and investment opportunities would you highlight for [media country]-based investors and businesses?",
      "What tax incentives, reforms, agreements, or investment frameworks has your administration introduced to attract foreign capital?",
      "What gives [country] a competitive advantage as an investment destination within the region?",
      "What are the primary drivers of [country]'s economic growth, and how are you positioning the country to capitalise on them?",
      "What is your administration's strategy on innovation, technology, and sustainability, and how does this create opportunities for international partners?",
      "How is [country] expanding its export base and growing its presence in international markets?",
      "What message would you like to send to the international business community about [country] as a destination for investment and partnership?",
      "How have your previous roles shaped your leadership approach and your vision for [country]?"
    ]
  },
  {
    id: "trade",
    label: "Trade Organization Leader",
    topics: [
      { id: "t1", label: "Leader's appointment, vision, and strategy" },
      { id: "t2", label: "Organization mission and positioning" },
      { id: "t3", label: "Sector contribution to the economy" },
      { id: "t4", label: "Sector attractiveness to investors" },
      { id: "t5", label: "Key industry players and success stories" },
      { id: "t6", label: "Recent organization initiatives" },
      { id: "t7", label: "Innovation" },
      { id: "t8", label: "Sustainability and green initiatives" },
      { id: "t9", label: "Nation's investment appeal" },
      { id: "t10", label: "Leadership background (previous roles chronological)" }
    ],
    qFocuses: [
      "What is your strategic vision for the organization, and what are your priorities since taking the role?",
      "How do you define the organization's mission and its positioning within the sector?",
      "How significant is this sector to [country]'s economy in terms of gross domestic product, employment, and reputation?",
      "What makes this sector attractive for [media country]-based investors, and what specific opportunities exist?",
      "Which companies or initiatives within the sector best illustrate its potential for international investors?",
      "What recent initiatives has the organization launched, and what impact are they having?",
      "How is the organization driving innovation within the sector?",
      "What sustainability or green initiatives is the organization leading?",
      "What is your message to [media country] investors about why [country] is the right destination for capital?",
      "How have your previous experiences shaped your leadership style?"
    ]
  }
];

export function getTemplateById(id: TemplateId) {
  const tpl = TEMPLATES.find((t) => t.id === id);
  if (!tpl) throw new Error(`Unknown template: ${id}`);
  return tpl;
}

