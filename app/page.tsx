import { Metadata } from "next"
import DashboardComponent from "./dashboard"
import { getPages } from "@/lib/api"

export const metadata: Metadata = {
  title: "Open-Source LLM SEO Metadata Generator",
  description: "Generate SEO-optimized metadata for your webpages using open-source LLMs",
}

export default async function Page() {
  const initialPages = await getPages()

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Open-Source LLM SEO Metadata Generator</h1>
      <DashboardComponent initialPages={initialPages} />
    </main>
  )
}
