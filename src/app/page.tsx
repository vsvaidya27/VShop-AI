"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ShoppingCart, Mic, StopCircle, Send, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Check } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"

interface Product {
  id: string
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
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setProgress((prevProgress) => (prevProgress >= 100 ? 0 : prevProgress + 10))
      }, 500)
      return () => clearInterval(interval)
    } else {
      setProgress(0)
    }
  }, [isProcessing])

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

      let formattedIntent
      try {
        formattedIntent = JSON.parse(data.parsedIntent)
      } catch (error) {
        console.error("Failed to parse parsedIntent:", error)
        formattedIntent = [data.parsedIntent]
      }
      if (formattedIntent.join(", ") === "I didn't understand, please try again.") {
        const aiMessage = { role: "assistant", content: "I didn't understand, please try again." }
        setMessages((prev) => [...prev, aiMessage])
        return
      }

      const searchMessage = `Searching for: ${formattedIntent.join(", ")}`
      const aiMessage = { role: "assistant", content: searchMessage }

      setMessages((prev) => [...prev, aiMessage])
      setParsedIntent(formattedIntent)

      const asinsRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: formattedIntent,
        }),
      })
      const asinsData: string[] = await asinsRes.json()
      console.log("Returned ASINs:", asinsData)

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

  const handleBuyNow = async (asin: string) => {
    const product = recommendations?.find((prod) => prod.ASIN === asin || prod.id === asin)
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

      setPurchasedItem(product)
      setRecommendations((prev) => prev)
    } catch (error) {
      console.error("Error buying item:", error)
      setError("Error buying item. Please try again.")
    }
  }

  const handlePlaceAnotherOrder = () => {
    setTranscript("")
    setParsedIntent(null)
    setRecommendations(null)
    setPurchasedItem(null)
    setError(null)
    setMessages([])
  }

  const PurchaseConfirmation = ({ item }: { item: any }) => {
    return (
      <Card className="max-w-2xl mx-auto bg-gray-800 text-white shadow-lg border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Check className="text-green-500" />
            Purchase Successful
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Your item has been successfully purchased and will be arriving at your address soon.</p>
          <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2 text-green-400">Purchase Details:</h3>
            <p>Item: {item?.title || "Item details not available."}</p>
            <p>Total Cost: {item?.price?.displayValue || "Cost not available."}</p>
            <Image
              src={item?.images[0]?.url || "/placeholder.svg"}
              alt={item?.title || "Product Image"}
              className="w-full h-48 object-contain bg-gray-600 mb-4 rounded-lg"
              width={500}
              height={300}
            />
          </div>
          <Button onClick={handlePlaceAnotherOrder} className="w-full bg-green-500 hover:bg-green-600 text-white">
            Place Another Order
          </Button>
        </CardContent>
      </Card>
    )
  }

  const ProductRecommendations = ({ recommendations }: { recommendations: Product[] }) => {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <AnimatePresence>
          {recommendations.length > 0 ? (
            recommendations.map((product, index) => (
              <motion.div
                key={product.id || product.ASIN || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="flex flex-col h-full bg-gray-800 text-white shadow-lg border-green-500">
                  <CardHeader className="flex-none">
                    <CardTitle className="line-clamp-2 h-12 text-green-400">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-none">
                      <Image
                        src={product.images[0].url || "/placeholder.svg"}
                        alt={product.title}
                        className="w-full h-48 object-contain bg-gray-700 rounded-lg"
                        width={500}
                        height={300}
                      />
                    </div>
                    <p className="text-sm text-gray-300 mt-2 line-clamp-2 flex-1">{product.description}</p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-sm font-medium text-green-400">Price: {product.price.displayValue}</p>
                      {product.ASIN && <p className="text-xs text-gray-400">ASIN: {product.ASIN}</p>}
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
              </motion.div>
            ))
          ) : (
            <p className="text-center text-gray-400">No products found or an error occurred.</p>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <main className="container mx-auto p-4 bg-gray-900 text-white min-h-screen">
      <div className="flex justify-start items-center w-1/2">
        <h1 className="text-4xl font-bold mb-8 text-left text-green-400">
          <DollarSign className="inline-block mr-2 text-green-500" />
          AI-Powered Smart Shopping Assistant
        </h1>
      </div>
      {purchasedItem ? (
        <PurchaseConfirmation item={purchasedItem} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Card className="mb-8 bg-gray-800 shadow-lg border-green-500">
              <CardHeader>
                <CardTitle className="text-green-400">Voice Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-4">
                  <Button
                    onClick={isRecording ? () => {} : startRecording}
                    disabled={isRecording}
                    size="lg"
                    className={`w-16 h-16 rounded-full ${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
                  >
                    {isRecording ? <StopCircle className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>
                </div>
                <Card className="mb-4 bg-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-400">
                      <span className="mr-2">Transcript</span>
                      {transcript && (
                        <Badge variant="secondary" className="bg-green-200 text-green-700">
                          Recorded
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">
                      {transcript || "No transcript available. Start recording to see the transcript."}
                    </p>
                  </CardContent>
                </Card>
                <Button
                  onClick={processTranscript}
                  disabled={!transcript || isProcessing}
                  size="lg"
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  {isProcessing ? (
                    <>
                      <span className="mr-2">Processing...</span>
                      <Progress value={progress} className="w-[100px]" />
                    </>
                  ) : (
                    "Process Transcript"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 shadow-lg border-green-500">
              <CardHeader>
                <CardTitle className="text-green-400">Chat with AI Shopping Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border border-gray-600 p-4 bg-gray-700">
                  {messages.length > 0 ? (
                    messages.map((msg, index) => (
                      <div key={index} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                        <Badge
                          variant={msg.role === "user" ? "secondary" : "default"}
                          className={`mb-2 ${msg.role === "user" ? "bg-blue-200 text-blue-700" : "bg-green-200 text-green-700"}`}
                        >
                          {msg.role === "user" ? "You" : "AI"}
                        </Badge>
                        <p
                          className={`p-3 rounded-lg inline-block max-w-[80%] shadow-sm ${msg.role === "user" ? "bg-blue-900" : "bg-green-900"}`}
                        >
                          {msg.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400">Start the conversation with the AI shopping assistant!</p>
                  )}
                </ScrollArea>
                <div className="flex mt-4">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-grow p-2 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-white"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                  />
                  <Button
                    onClick={processTranscript}
                    disabled={!transcript || isProcessing}
                    className="rounded-l-none bg-green-500 hover:bg-green-600 h-10.5"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            {error && (
              <Alert variant="destructive" className="mb-8 bg-red-900 border-red-500">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertTitle className="text-red-400">Error</AlertTitle>
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
            {/* {parsedIntent && (
              <Card className="mb-8 bg-gray-800 shadow-lg border-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-400">
                    <span className="mr-2">Parsed Intent</span>
                    <Badge className="bg-blue-200 text-blue-700">
                      <ShoppingCart className="mr-1 h-3 w-3" />
                      Shopping Intent
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-300">{parsedIntent}</p>
                </CardContent>
              </Card>
            )} */}
            {recommendations && (
              <div className="mt-5000 flex justify-end">
                <div className="w-full">
                  <h2 className="text-3xl font-bold mb-4 text-center text-green-400">Product Recommendations</h2>
                  <ProductRecommendations recommendations={recommendations} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

