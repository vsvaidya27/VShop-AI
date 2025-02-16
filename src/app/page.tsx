/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Check } from "lucide-react"

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
  const [recommendations, setRecommendations] = useState<Product[] | null>(null)
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [purchasedItem, setPurchasedItem] = useState<any>(null)

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
      const userMessage = { role: "user", content: transcript }
      setMessages((prev) => [...prev, userMessage])

      const response = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`API request failed with status ${response.status}: ${errorData.message || "Unknown error"}`)
      }

      const data = await response.json()
      console.log("API Response:", data.parsedIntent)

      

      // If the response is valid, process it
      let formattedIntent
      try {
        formattedIntent = JSON.parse(data.parsedIntent)
      } catch (error) {
        console.error("Failed to parse parsedIntent:", error)
        formattedIntent = [data.parsedIntent]
      }
      // Check if the AI message indicates it didn't understand
      if (formattedIntent.join(", ") === "I didn't understand, please try again.") {
        const aiMessage = { role: "assistant", content: "I didn't understand, please try again." }
        setMessages((prev) => [...prev, aiMessage])
        return
      }

      const searchMessage = `Searching for: ${formattedIntent.join(", ")}`
      const aiMessage = { role: "assistant", content: searchMessage }

      setMessages((prev) => [...prev, aiMessage])
      setParsedIntent(formattedIntent)

      // 2. Get ASINs from /api/products
      const asinsRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: formattedIntent,
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
     // 1) Find the product from recommendations
    const product = recommendations?.find(
      (prod) => prod.ASIN === asin || prod.id === asin
    );
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
      console.log("Item bought successfully:", data);

      setPurchasedItem(product);
      setRecommendations((prev) => prev);
    } catch (error) {
      console.error("Error buying item:", error)
      setError("Error buying item. Please try again.")
    }
  }

  const handlePlaceAnotherOrder = () => {
    // Reset all states to their initial values
    setTranscript("")
    setParsedIntent(null)
    setRecommendations(null)
    setPurchasedItem(null)
    setError(null)
    setMessages([])
  }

  const PurchaseConfirmation = ({ item }: { item: any }) => {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="text-green-500" />
            Purchase Successful
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Your item has been successfully purchased and will be arriving at your address soon.</p>
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">Purchase Details:</h3>
            <p>Item: {item?.title || "Item details not available."}</p>
            <p>Total Cost: {item?.price?.displayValue || "Cost not available."}</p>
            <Image
              src={item?.images[0]?.url || "/placeholder.svg"}
              alt={item?.title || "Product Image"}
              className="w-full h-48 object-contain bg-white mb-4"
              width={500}
              height={300}
            />
          </div>
          <Button onClick={handlePlaceAnotherOrder} className="w-full">
            Place Another Order
          </Button>
        </CardContent>
      </Card>
    )
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
      {purchasedItem ? (
        <PurchaseConfirmation item={purchasedItem} />
      ) : (
      <div className="max-w-4xl mx-auto">
        <div className="overflow-y-auto h-96 border border-gray-300 p-4 mb-8 rounded-lg shadow-md bg-white">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.role === "user" ? "text-left" : "text-right"}`}>
                <p className={`font-semibold ${msg.role === "user" ? "text-blue-600" : "text--800"}`}>
                  {msg.role === "user" ? "You" : "AI Agent"}:
                </p>
                <p className="text-gray-700">{msg.content}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
          )}
        </div>
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
      )}
    </main>
  )
}