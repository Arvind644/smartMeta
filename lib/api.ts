import { HfInference } from '@huggingface/inference'

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

export interface PageMetadata {
  id: number
  url: string
  title: string
  description: string
  keywords: string
}

function extractKeywords(content: string): string {
    // Remove common words and get unique words
    const commonWords = new Set(['and', 'the', 'for', 'in', 'to', 'of', 'a', 'with', 'by', 'on', 'your'])
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))

    // Get unique words and take top 5
    const uniqueWords = Array.from(new Set(words))
    return uniqueWords.slice(0, 5).join(', ')
  }

  function cleanDescription(text: string): string {
    return text
      .replace(/\d+\.\s+/g, '') // Remove numbered points
      .replace(/here are \d+ tips for/gi, 'Discover essential tips for') // Replace list introductions
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\s*\n\s*/g, ' ') // Remove line breaks
      .replace(/\s*\.\s*/g, '. ') // Normalize periods
      .replace(/\s*,\s*/g, ', ') // Normalize commas
      .replace(/\s+/g, ' ') // Final whitespace cleanup
      .trim()
  }


  function formatDescription(description: string): string {
    if (!description) return ''
    const cleaned = cleanDescription(description)

    // Convert list-style content into a flowing sentence
    const parts = cleaned.split(/(?:\.|\?|\!)\s+/)
    const firstTwoParts = parts.slice(0, 2)
      .map(part => part.trim())
      .filter(Boolean)
      .join('. ')

    return firstTwoParts.length > 0 ? `${firstTwoParts}.` : cleaned
  }

//   function formatTitle(title: string): string {
//     if (!title) return ''
//     // Keep title concise but complete, no ellipsis
//     return title.trim()
//   }

export async function getPages(): Promise<PageMetadata[]> {
  // In a real application, this would fetch pages from a database
  return []
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      const delay = baseDelay * Math.pow(2, i)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries reached')
}

// function fallbackMetadataGeneration(url: string, content: string): PageMetadata {
//   const title = content.split(' ').slice(0, 8).join(' ')
//   const description = content.split(' ').slice(0, 20).join(' ')
//   const keywords = content.split(' ')
//     .filter(word => word.length > 3)
//     .slice(0, 5)
//     .join(',')

//   return {
//     id: Date.now(),
//     url,
//     title: title.length > 60 ? title.slice(0, 57) + '...' : title,
//     description: description.length > 160 ? description.slice(0, 157) + '...' : description,
//     keywords,
//   }
// }

export async function generateLLMMetadata(url: string, content: string): Promise<PageMetadata> {
    const prompt = `Generate SEO metadata for the following webpage. Format your response in JSON.

  URL: ${url}
  Content: ${content}

  Requirements:
  1. Title: Create a clear, complete title that captures the main topic. Keep it concise.
  2. Description: Write a natural, flowing description (150-160 characters) that summarizes the value proposition. DO NOT use numbered points or lists. Write in complete sentences.
  3. Keywords: Extract 5 relevant keywords, separated by commas.

  Example good descriptions:
  - "Discover essential healthy eating strategies for overall well-being. Learn about balanced nutrition and smart food choices for a healthier lifestyle."
  - "Explore comprehensive tips for maintaining a healthy diet, including nutrition guidance and practical meal planning strategies."

  Bad description example (DO NOT USE):
  - "Here are 10 tips for healthy eating: 1. Eat more vegetables 2. Choose whole grains 3. Limit sugar"

  Response format:
  {
    "title": "Your complete, concise title here",
    "description": "Your natural, flowing description here",
    "keywords": "keyword1, keyword2, keyword3, keyword4, keyword5"
  }`

    try {
      const response = await retryWithBackoff(() =>
        hf.textGeneration({
          model: 'facebook/bart-large-cnn',
          inputs: prompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.7,
            top_p: 0.95,
            repetition_penalty: 1.2,
          },
        })
      )

      let metadata
      try {
        metadata = JSON.parse(response.generated_text)

        // Validate and clean the metadata
        if (!metadata.title || !metadata.description || !metadata.keywords) {
          throw new Error("Incomplete metadata")
        }

        return {
          id: Date.now(),
          url,
          title: metadata.title.trim(),
          description: formatDescription(metadata.description),
          keywords: metadata.keywords.trim(),
        }
      } catch (error) {
        console.error('Failed to parse or validate LLM response:', error)
        // Generate fallback metadata with better description
        const mainTopic = content.split('.')[0]
        const fallbackDescription = `Discover comprehensive insights about ${mainTopic.toLowerCase()}. Get expert guidance and practical strategies for better results.`

        return {
          id: Date.now(),
          url,
          title: mainTopic.trim(),
          description: formatDescription(fallbackDescription),
          keywords: extractKeywords(content),
        }
      }
    } catch (error) {
      console.error('Error generating metadata with LLM:', error)
      const mainTopic = content.split('.')[0]
      const fallbackDescription = `Explore essential information about ${mainTopic.toLowerCase()}. Find practical tips and expert recommendations for optimal outcomes.`

      return {
        id: Date.now(),
        url,
        title: mainTopic.trim(),
        description: formatDescription(fallbackDescription),
        keywords: extractKeywords(content),
      }
    }
  }

export async function analyzeContent(content: string): Promise<string[]> {
  const prompt = `Analyze the following content for SEO optimization:
${content}

Provide 3-5 suggestions to improve the content for better SEO. Format each suggestion as a separate line.`

  try {
    const response = await retryWithBackoff(() =>
      hf.textGeneration({
        model: 'facebook/bart-large-cnn',
        inputs: prompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
        },
      })
    )

    return response.generated_text.split('\n').filter(Boolean)
  } catch (error) {
    console.error('Error analyzing content with LLM:', error)
    return [
      'Ensure your content includes relevant keywords.',
      'Write a compelling meta description.',
      'Use header tags (H1, H2, etc.) to structure your content.',
      'Include internal and external links where appropriate.',
      'Optimize your images with alt text and descriptive file names.',
    ]
  }
}
