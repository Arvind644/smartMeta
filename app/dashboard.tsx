"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PageMetadata, generateLLMMetadata, analyzeContent } from "@/lib/api"

interface DashboardProps {
  initialPages: PageMetadata[]
}

export default function DashboardComponent({ initialPages }: DashboardProps) {
  const [pages, setPages] = useState<PageMetadata[]>(initialPages)
  const [url, setUrl] = useState("")
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [llmSuggestions, setLlmSuggestions] = useState<string[]>([])

  const { toast } = useToast()

  const generateMetadata = async () => {
    if (!url || !content) {
      toast({
        title: "Missing information",
        description: "Please provide both URL and content.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const newPage = await generateLLMMetadata(url, content)

      if (!newPage.title || !newPage.description || !newPage.keywords) {
        throw new Error("Incomplete metadata generated")
      }

      setPages([...pages, newPage])
      resetForm()
      toast({
        title: "Metadata generated successfully",
        description: "LLM-powered metadata has been added to your pages.",
      })
    } catch {
      toast({
        title: "Error generating metadata",
        description: "Failed to generate complete metadata. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setUrl("")
    setContent("")
  }

  const getSeoScore = (page: PageMetadata) => {
    let score = 0
    if (page.title.length >= 50 && page.title.length <= 60) score++
    if (page.description.length >= 150 && page.description.length <= 160) score++
    if (page.keywords.split(",").length >= 3) score++
    return score
  }

  const handleAnalyzeContent = async () => {
    if (!content) {
      toast({
        title: "Missing content",
        description: "Please provide content to analyze.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const suggestions = await analyzeContent(content)
      setLlmSuggestions(suggestions)
      toast({
        title: "Content analyzed successfully",
        description: "LLM-powered suggestions are now available.",
      })
    } catch {
      toast({
        title: "Error analyzing content",
        description: "An error occurred while analyzing the content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Page</CardTitle>
          <CardDescription>Enter page details to generate LLM-powered SEO metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Page URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Page URL"
          />
          <Textarea
            placeholder="Page content (for LLM analysis)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            aria-label="Page content"
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={generateMetadata} disabled={isLoading || !url || !content}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate LLM Metadata
          </Button>
          <Button onClick={handleAnalyzeContent} variant="outline" disabled={isLoading || !content}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Analyze Content
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pages Metadata</CardTitle>
          <CardDescription>View and manage LLM-generated SEO metadata for your pages</CardDescription>
        </CardHeader>
        <CardContent>
          {pages.length > 0 ? (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">URL</TableHead>
                    <TableHead className="w-[250px]">Title</TableHead>
                    <TableHead className="w-[300px]">Description</TableHead>
                    <TableHead className="w-[200px]">Keywords</TableHead>
                    <TableHead>SEO Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="max-w-[200px] truncate">
                        {page.url}
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        {page.title}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {page.description || "No description available"}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {page.keywords}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeoScore(page) === 3 ? "default" : "secondary"}>
                          {getSeoScore(page)}/3
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No pages added yet. Generate metadata to see results.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LLM-Powered SEO Suggestions</CardTitle>
          <CardDescription>Improve your content based on LLM analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {llmSuggestions.length > 0 ? (
            <ul className="space-y-2">
              {llmSuggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={index}
                  icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                  text={suggestion}
                />
              ))}
            </ul>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No LLM suggestions available. Analyze your content to get personalized recommendations.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SuggestionItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start space-x-2">
      {icon}
      <span>{text}</span>
    </li>
  )
}
