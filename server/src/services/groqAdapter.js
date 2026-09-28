import { Groq } from 'groq-sdk';
import { config } from '../config.js';

let groqClient = null;

export function getGroqClient() {
  if (!config.groqApiKey) return null;
  if (!groqClient) {
    try {
      groqClient = new Groq({ apiKey: config.groqApiKey });
    } catch (err) {
      console.error('Groq init failed:', err);
    }
  }
  return groqClient;
}

export function getGroqStatus() {
  if (!config.groqApiKey) {
    return { available: false, status: 'disabled', reason: 'GROQ_API_KEY not configured' };
  }
  return { available: true, status: 'connected', model: 'llama-3.3-70b-versatile' };
}

export async function synthesizeNegotiationRecommendation({
  deal,
  memories = [],
  confidenceData,
  economicsData,
  patterns = []
}) {
  const groq = getGroqClient();

  if (!groq) {
    return buildDeterministicRecommendation({ deal, memories, confidenceData, economicsData });
  }

  const memoryListStr = memories.length > 0
    ? memories.map(m => `- Deal [${m.dealId}]: ${m.customer} | Strategy: ${m.strategy} | Concession: ${m.concessionPercent}% | Outcome: ${m.outcome} | Reason: ${m.outcomeReason}`).join('\n')
    : 'No comparable historical memory found for this specific customer/segment in memory bank.';

  const prompt = `You are DealMind, an evidence-grounded B2B negotiation intelligence agent.
Generate a concise, professional recommendation for a sales representative based strictly on the provided evidence.

DEAL CONTEXT:
- Customer: ${deal.customer} (${deal.segment} segment, ${deal.industry} industry)
- Deal Value: $${Number(deal.dealValue).toLocaleString()}
- Primary Objection: "${deal.objection || 'Price concern'}"
- Customer Requested Discount: ${deal.requestedDiscountPercent}%
- Competitor Pressure Present: ${deal.competitorPressure ? 'YES' : 'NO'}
- Contract Term: ${deal.contractYears || 1} year(s)

RECALLED ORGANIZATIONAL MEMORIES (${memories.length} episodes found):
${memoryListStr}

CONFIDENCE & CONFLICT ANALYSIS:
- Base Confidence: ${confidenceData.baseConfidence}
- Final Confidence: ${confidenceData.finalConfidence} (Sample: ${confidenceData.sampleWins} Wins / ${confidenceData.sampleLosses} Losses out of ${confidenceData.sampleSize} deals)
- Conflict Detected: ${confidenceData.conflictDetected ? 'YES - ' + confidenceData.conflictReason : 'NO'}

DETERMINISTIC ECONOMICS:
- Requested Concession (${deal.requestedDiscountPercent}%): $${economicsData.requestedConcession.toLocaleString()}
- Recommended Concession (${economicsData.proposedDiscountPercent}% + Support): $${economicsData.proposedConcession.toLocaleString()}
- Potential Revenue Retained: $${economicsData.concessionSavings.toLocaleString()} less in discount concession versus requested discount

INSTRUCTIONS:
1. Provide a clear, evidence-grounded primary recommendation for ${deal.customer}.
2. If memories are present, cite specific deal IDs (e.g. DEAL-003, DEAL-007). If no memories are present, explicitly state that no comparable historical deals exist for this customer and recommend conservative pricing based on standard guidelines.
3. Explain why a smaller concession (e.g. ${economicsData.proposedDiscountPercent}%) paired with support/term commitment is superior to giving the full requested ${deal.requestedDiscountPercent}% price drop.
4. DO NOT invent fake deal IDs, fake companies, or fake win statistics outside what is provided.

Return JSON format:
{
  "headline": "<10-word action headline>",
  "primaryRecommendation": "<2-3 paragraph detailed recommendation citing actual deal IDs if available>",
  "keyTakeaways": ["<point 1>", "<point 2>", "<point 3>"],
  "counterofferSuggestion": "<suggested response script to customer>"
}`;

  try {
    let chatCompletion;
    try {
      chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        temperature: 0.2
      });
    } catch (e) {
      chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        temperature: 0.2
      });
    }

    const content = chatCompletion.choices[0]?.message?.content;
    const parsed = JSON.parse(content);
    return {
      reasoningMode: 'groq-llama3.3',
      headline: parsed.headline,
      primaryRecommendation: parsed.primaryRecommendation,
      keyTakeaways: parsed.keyTakeaways || [],
      counterofferSuggestion: parsed.counterofferSuggestion || ''
    };
  } catch (err) {
    console.warn('Groq completion failed, using deterministic recommendation:', err.message);
    return buildDeterministicRecommendation({ deal, memories, confidenceData, economicsData });
  }
}

export function buildDeterministicRecommendation({ deal, memories = [], confidenceData, economicsData }) {
  const customer = deal.customer || 'Customer';
  const reqPercent = deal.requestedDiscountPercent || 20;
  const propPercent = economicsData.proposedDiscountPercent || 8;
  const savings = economicsData.concessionSavings || 0;

  if (!memories || memories.length === 0) {
    return {
      reasoningMode: 'deterministic-fallback',
      headline: `No Historical Deals Found — Counter with ${propPercent}% Discount + Support`,
      primaryRecommendation: `No comparable historical negotiation memories were found for ${customer} in the organizational memory bank.

Because evidence is limited, confidence is rated LOW. Standard negotiation protocol recommends avoiding large upfront price concessions without receiving value concessions in return (such as multi-year terms or reduced scope). Countering at ${propPercent}% retains $${savings.toLocaleString()} less in discount concession compared to the requested ${reqPercent}% price drop.`,
      keyTakeaways: [
        `No customer or segment memory found; proceeding with conservative pricing rules.`,
        `Counter with a ${propPercent}% discount paired with value-add support package.`,
        `Retains $${savings.toLocaleString()} of potential revenue compared to the requested ${reqPercent}% discount.`
      ],
      counterofferSuggestion: `"We appreciate your interest in partnering with us. While we cannot grant a ${reqPercent}% price reduction, we can offer a ${propPercent}% discount paired with dedicated support to ensure a seamless implementation."`
    };
  }

  const winsWithSupport = memories.filter(m => m.outcome === 'WON' && (m.strategy || '').toLowerCase().includes('support'));
  const winIds = winsWithSupport.map(m => m.dealId).join(', ') || 'recalled win episodes';

  const headline = `Counter with ${propPercent}% Discount + Support ($${savings.toLocaleString()} Concession Revenue Retained)`;

  const primaryRecommendation = `Based on ${confidenceData.sampleSize} historical deals for ${customer} (${confidenceData.sampleWins} WON, ${confidenceData.sampleLosses} LOST), granting direct price discounts above 15% resulted in deal losses. Conversely, pairing a smaller ${propPercent}% discount with a premium support package closed 100% of negotiations (such as ${winIds}).

Holding firm at a ${propPercent}% discount retains $${savings.toLocaleString()} of potential revenue compared with the full requested ${reqPercent}% discount. The added support package addresses ${customer}'s core technical risk concerns under competitor pressure without eroding product price integrity.`;

  const keyTakeaways = [
    `Reject the requested ${reqPercent}% direct discount; historical data shows deep price cuts do not increase win rate for ${customer}.`,
    `Pivot negotiation to value add: offering premium support closed historical deals (${winIds}).`,
    `Retains $${savings.toLocaleString()} less in discount concession compared with the requested ${reqPercent}% discount.`
  ];

  const counterofferSuggestion = `"We understand price is a priority, but we cannot grant a ${reqPercent}% direct price reduction. Based on your deployment requirements, we can offer a ${propPercent}% concession paired with our Premium Support Package included at no additional cost. This provides your team with dedicated technical onboarding while staying within budget."`;

  return {
    reasoningMode: 'deterministic-fallback',
    headline,
    primaryRecommendation,
    keyTakeaways,
    counterofferSuggestion
  };
}
