/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ShoppingCart, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"

interface Product {
  id: string // Matches Rye's "id" field
  title: string
  marketplace: string
  description: string
  vendor: string
  url: string
  isAvailable: boolean
  images: { url: string }[]
  price: {
    currency: string
    displayValue: string
    value: number
  }
  ASIN?: string
}

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
    console.log("Starting recording...")
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
        const transcriptResult = event.results[0][0].transcript
        setTranscript(transcriptResult)
      }

      recognition.onerror = (event: any) => {
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
    console.log("Processing transcript:", transcript)
    setIsProcessing(true)
    setParsedIntent(null)
    setRecommendations(null)
    try {
      // 1. Parse the user's intent
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

      // 2. Get ASINs from /api/products
      const asinsRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: intentData.parsedIntent,
          lower: priceRange[0],
          upper: priceRange[1],
        }),
      })
      const asinsData: string[] = await asinsRes.json()
      console.log("Returned ASINs:", asinsData)

      // 3. Fetch actual product details from /api/rye-list
      const listRes = await fetch("/api/rye-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asins: asinsData }),
      })
      if (!listRes.ok) {
        const errorData = await listRes.json()
        throw new Error(
          `Rye list request failed with status ${listRes.status}: ${errorData.message || "Unknown error"}`,
        )
      }
      const productsData: Product[] = await listRes.json()
      console.log("Product details:", productsData)

      setRecommendations(productsData)
    } catch (error) {
      console.error("Error processing transcript:", error)
      setError("Error processing transcript. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Updated to call /api/rye-buy
  const handleBuyNow = async (asin: string) => {
    try {
      const response = await fetch("/api/rye-buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Buy request failed: ${errorData.message || "Unknown error"}`)
      }

      const data = await response.json()
      console.log("Item bought successfully:", data)
      // You could show a success message or update UI
    } catch (error) {
      console.error("Error buying item:", error)
      setError("Error buying item. Please try again.")
    }
  }

  const ProductRecommendations = ({ recommendations }: { recommendations: Product[] }) => {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.length > 0 ? (
          recommendations.map((product, index) => (
            <Card key={product.id || product.ASIN || index} className="flex flex-col h-full">
              <CardHeader className="flex-none">
                <CardTitle className="line-clamp-2 h-12">{product.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-none">
                  <Image
                    src={product.images[0].url || "/placeholder.svg"}
                    alt={product.title}
                    className="w-full h-48 object-contain bg-white"
                    width={500}
                    height={300}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2 flex-1">{product.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm font-medium text-green-600">Price: {product.price.displayValue}</p>
                  {product.ASIN && <p className="text-xs text-gray-500">ASIN: {product.ASIN}</p>}
                </div>
                <Button
                  className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => handleBuyNow(product.ASIN || product.id)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy Now
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>No products found or an error occurred.</p>
        )}
      </div>
    )
  }

  return (
    <main className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">AI-Powered Voice Shopping Assistant</h1>
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Set Your Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <DollarSign className="h-6 w-6 text-green-500" />
              <Slider
                min={0}
                max={1000}
                step={10}
                value={priceRange}
                onValueChange={setPriceRange}
                className="flex-grow"
              />
              <span className="min-w-[100px] text-right text-lg font-semibold">
                ${priceRange[0]} - ${priceRange[1]}
              </span>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-4 justify-center mb-8">
          <Button onClick={startRecording} disabled={isRecording} size="lg" className="w-48">
            {isRecording ? "Recording..." : "Start Recording"}
          </Button>
          <Button onClick={processTranscript} disabled={!transcript || isProcessing} size="lg" className="w-48">
            {isProcessing ? "Processing..." : "Process Transcript"}
          </Button>
        </div>
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-8 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">Transcript</span>
                {transcript && <Badge variant="secondary">Recorded</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                {transcript || "No transcript available. Start recording to see the transcript."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">Parsed Intent</span>
                {parsedIntent && (
                  <Badge className="bg-green-500 text-white">
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    Shopping Intent
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parsedIntent ? (
                <p className="whitespace-pre-wrap text-gray-700">{parsedIntent}</p>
              ) : (
                <p className="text-gray-500">No intent parsed yet. Process the transcript to see the results.</p>
              )}
            </CardContent>
          </Card>
        </div>
        {recommendations && (
          <div className="mt-8">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Product Recommendations</h2>
            <ProductRecommendations recommendations={recommendations} />
          </div>
        )}
      </div>
    </main>
  )
}