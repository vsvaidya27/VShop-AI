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

export default function HomePage() {
  const [transcript, setTranscript] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedIntent, setParsedIntent] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [recommendations, setRecommendations] = useState<Record<string, Product[]> | null>(null)

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
      setParsedIntent(intentData.parsedIntent)

      // Extract items from parsed intent
      //const items = extractItemsFromIntent(intentData.parsedIntent)

      // Call the products API
      const productsRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: intentData.parsedIntent,
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
      
      // Debugging: Log the productsData to check its structure
      console.log("Products API Response:", productsData);

      // Ensure productsData is an array
      if (Array.isArray(productsData)) {
        // Transform productsData into the expected Record<string, Product[]> format
        const formattedRecommendations: Record<string, Product[]> = {
          default: productsData // Assuming you want to store all products under a 'default' key
        };
        setRecommendations(formattedRecommendations);
      } else {
        console.error("Expected an array but received:", productsData);
        setError("Unexpected response format from products API.");
      }
    } catch (error) {
      console.error("Error processing transcript:", error, "Error details:", (error as Error).message)
      setError("Error processing transcript. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const ProductRecommendations = ({ recommendations }: { recommendations: Product[] }) => {
    // Debugging: Log the recommendations to check their structure
    console.log("Recommendations:", recommendations);

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(recommendations) && recommendations.length > 0 ? (
          recommendations.map((product: Product) => (
            <Card key={product.asin}>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm font-medium text-green-600">Price: ${product.price.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">ASIN: {product.asin}</p>
                </div>
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
            {recommendations?.default && (
              <ProductRecommendations recommendations={recommendations.default} />
            )}
          </div>
        )}
      </div>
    </main>
  )
}

