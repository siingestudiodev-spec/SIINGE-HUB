// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

const CATEGORY_OPTIONS = [
  'Activewear', "Children's Wear", 'Swimwear', 'Evening Wear',
  'Streetwear', 'Loungewear', 'Intimate Apparel', 'Leather Goods', 'Accessories',
  "Women's Wear", 'Workwear', 'Shapewear', 'Denim', 'Knit/Crochet'
]

const CERT_OPTIONS = [
  'OEKO-TEX STANDARD 100', 'ISO 45001', 'OCS100', 'UN Global Compact',
  'GRS', 'ISO9001', 'amfori BSCI', 'SMETA', 'WRAP', 'SA8000', 'ISO 14001',
  'OEKO-TEX STeP', 'bluesign®', 'GOTS'
]

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

// Keywords that indicate a contact/about page
const CONTACT_KEYWORDS = [
  'contact', 'about', 'reach', 'enquir', 'inquir', 'get-in-touch',
  'get_in_touch', 'getintouch', 'touch', 'info', 'team', 'us',
  'company', 'who-we-are', 'who_we_are', 'whoweare', 'about-us',
  'about_us', 'aboutus', 'mail', 'email',
]

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractEmails(html: string): string[] {
  const found = new Set<string>()
  for (const match of html.matchAll(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g)) {
    const email = match[1].toLowerCase()
    if (!email.includes('example') && !email.includes('domain') &&
        !email.endsWith('.png') && !email.endsWith('.jpg') && !email.endsWith('.svg')) {
      found.add(email)
    }
  }
  return [...found]
}

// Extract internal links from HTML and score them by how likely they are contact/about pages
function findContactLinks(html: string, origin: string): string[] {
  const links: { url: string; score: number }[] = []
  const seen = new Set<string>()

  // Match <a href="...">text</a>
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1].trim()
    const text = stripHtml(match[2]).toLowerCase().trim()

    // Skip anchors, mailto, tel, external social media, js
    if (href.startsWith('#') || href.startsWith('mailto:') ||
        href.startsWith('tel:') || href.startsWith('javascript:')) continue
    if (href.includes('facebook.com') || href.includes('instagram.com') ||
        href.includes('linkedin.com') || href.includes('twitter.com')) continue

    // Resolve relative URLs
    try {
      href = new URL(href, origin).href
    } catch {
      continue
    }

    // Only same-origin links
    if (!href.startsWith(origin)) continue
    if (seen.has(href)) continue
    seen.add(href)

    // Score based on URL path and link text
    const path = href.replace(origin, '').toLowerCase()
    let score = 0
    for (const kw of CONTACT_KEYWORDS) {
      if (path.includes(kw)) score += 2
      if (text.includes(kw)) score += 1
    }

    if (score > 0) links.push({ url: href, score })
  }

  // Return top 3 most relevant links
  return links
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(l => l.url)
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS })
    if (!res.ok) return ''
    return await res.text()
  } catch {
    return ''
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { url } = await req.json()
    if (!url) throw new Error('URL is required')

    const origin = new URL(url).origin

    // Step 1: fetch main page
    const mainHtml = await fetchPage(url)
    if (!mainHtml) throw new Error('Could not fetch the page')

    // Step 2: find real contact/about links from the navigation
    const contactLinks = findContactLinks(mainHtml, origin)

    // Step 3: fetch those pages in parallel
    const extraPages = await Promise.all(contactLinks.map(fetchPage))

    // Step 4: combine all HTML for email extraction and text
    const allHtml = mainHtml + extraPages.join('')
    const rawEmails = extractEmails(allHtml)

    const mainText  = stripHtml(mainHtml).slice(0, 4000)
    const extraText = stripHtml(extraPages.join('\n')).slice(0, 5000)
    const combinedText = [mainText, extraText].filter(Boolean).join('\n\n---\n\n')

    const prompt = `You are extracting structured data about a clothing/apparel manufacturer from their website.

Pages fetched: main page${contactLinks.length > 0 ? ` + ${contactLinks.join(', ')}` : ''}

Content:
${combinedText}

${rawEmails.length > 0 ? `Emails found in HTML: ${rawEmails.join(', ')}` : ''}

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "company_name": string or null,
  "country": string or null (full country name, e.g. "China", "Bangladesh", "Turkey"),
  "contact_name": string or null (primary contact person name),
  "phone": string or null,
  "email": string or null,
  "product_categories": array of strings (ONLY from: ${JSON.stringify(CATEGORY_OPTIONS)}),
  "certifications": array of strings (ONLY from: ${JSON.stringify(CERT_OPTIONS)}),
  "notes": string or null (MOQ, lead times, specialties — 2-3 lines max)
}

Rules:
- If emails were found in HTML, pick the most relevant business contact email
- Only include categories/certifications explicitly mentioned or clearly implied
- Return [] for empty arrays, null for missing fields`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const groqData = await groqRes.json()
    if (!groqRes.ok) throw new Error(groqData.error?.message ?? `Groq API error ${groqRes.status}`)

    const rawText = groqData.choices[0].message.content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')

    const extracted = JSON.parse(rawText)

    if (!extracted.email && rawEmails.length > 0) {
      extracted.email = rawEmails[0]
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
