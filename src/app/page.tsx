/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ShoppingCart, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"

interface Product {
  asin: string
  name: string
  description: string
  price: number
}

// interface ProductRecommendations {
//   [category: string]: Product[]
// }

export default function HomePage() {
  const [transcript, setTranscript] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedIntent, setParsedIntent] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [recommendations, setRecommendations] = useState<Product[] | null>(null)

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const startRecording = async () => {
    setError(null)
    setParsedIntent(null)
    setRecommendations(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        throw new Error("Your browser does not support Speech Recognition.")
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"

      recognition.onstart = () => setIsRecording(true)
      recognition.onend = () => setIsRecording(false)

      recognition.onresult = (event: any) => {
        //Fixed: Added any type to SpeechRecognitionEvent
        const transcriptResult = event.results[0][0].transcript
        setTranscript(transcriptResult)
      }

      recognition.onerror = (event: any) => {
        //Fixed: Added any type to SpeechRecognitionErrorEvent
        console.error("Speech recognition error:", event.error)
        setError(`Speech recognition error: ${event.error}`)
        setIsRecording(false)
      }

      recognition.start()
    } catch (err) {
      console.error("Error starting recording:", err)
      setError("Microphone access denied. Please allow microphone access and try again.")
      setIsRecording(false)
    }
  }

  const processTranscript = async () => {
    setIsProcessing(true)
    setParsedIntent(null)
    setRecommendations(null)
    try {
      const intentRes = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: transcript,
          priceRange: {
            min: priceRange[0],
            max: priceRange[1],
          },
        }),
      })
      if (!intentRes.ok) {
        const errorData = await intentRes.json()
        throw new Error(`API request failed with status ${intentRes.status}: ${errorData.message || "Unknown error"}`)
      }
      const intentData = await intentRes.json()
      console.log(intentData.parsedIntent)
      setParsedIntent(intentData.parsedIntent)

      // Extract items from parsed intent
      const items = extractItemsFromIntent(intentData.parsedIntent)
      console.log("items: ", items)

      // Call the products API
      const productsRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          budget: priceRange[1], // Use the upper bound of the price range as the budget
        }),
      })
      if (!productsRes.ok) {
        const errorData = await productsRes.json()
        throw new Error(
          `Products API request failed with status ${productsRes.status}: ${errorData.message || "Unknown error"}`,
        )
      }
      const productsData = await productsRes.json()
      console.log('Products API Response:', productsData)
      setRecommendations(productsData)
    } catch (error) {
      console.error("Error processing transcript:", error)
      setError("Error processing transcript. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const extractItemsFromIntent = (intent: string): string[] => {
    // This is a simple implementation. You might want to use a more sophisticated
    // method to extract items from the parsed intent, possibly using NLP techniques.
    const items = intent.match(/\b([\w\s]+?)(?=,|\sand\s|$)/g) || []
    return items.map((item) => item.trim())
  }

  const ProductRecommendations = ({ recommendations }: { recommendations: Product[] }) => {
    console.log('Rendering ProductRecommendations with:', recommendations)
    return (
      <ul className="space-y-2">
      {recommendations.map((product: Product) => (
        <li key={product.asin} className="border-b pb-2">
          <h4 className="font-semibold">{product.name}</h4>
          <p className="text-sm text-gray-600">{product.description}</p>
          <p className="text-sm font-medium">Price: ${product.price.toFixed(2)}</p>
          <p className="text-xs text-gray-500">ASIN: {product.asin}</p>
        </li>
      ))}
    </ul>
    )
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">AI-Powered Voice Shopping Assistant</h1>
      <div className="flex flex-col gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Set Your Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <DollarSign className="h-4 w-4" />
              <Slider
                min={0}
                max={1000}
                step={10}
                value={priceRange}
                onValueChange={setPriceRange}
                className="flex-grow"
              />
              <span className="min-w-[80px] text-right">
                ${priceRange[0]} - ${priceRange[1]}
              </span>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-4">
          <Button onClick={startRecording} disabled={isRecording}>
            {isRecording ? "Recording..." : "Start Recording"}
          </Button>
          <Button onClick={processTranscript} disabled={!transcript || isProcessing}>
            {isProcessing ? "Processing..." : "Process Transcript"}
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{transcript || "No transcript available. Start recording to see the transcript."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Parsed Intent</CardTitle>
          </CardHeader>
          <CardContent>
            {parsedIntent ? (
              <div>
                <Badge className="mb-2">
                  <ShoppingCart className="mr-1 h-3 w-3" />
                  Shopping Intent
                </Badge>
                <p className="whitespace-pre-wrap">{parsedIntent}</p>
              </div>
            ) : (
              <p>No intent parsed yet. Process the transcript to see the results.</p>
            )}
          </CardContent>
        </Card>
      </div>
      {recommendations && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Product Recommendations</h2>
          <ProductRecommendations recommendations={recommendations} />
        </div>
      )}
    </main>
  )
}